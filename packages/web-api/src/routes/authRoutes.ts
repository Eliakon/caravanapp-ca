import express, { Request, Response } from 'express';
import {
  FilterAutoMongoKeys,
  OAuth2Client,
  Session,
  User,
  UserSettings,
} from '@caravan/buddy-reading-types';
import {
  DiscordOAuth2Url,
  OAuth2TokenResponseData,
  ReadingDiscordBot,
} from '../services/discord';
import SessionModel from '../models/session';
import UserModel from '../models/user';
import { generateSlugIds } from '../common/url';
import { getAvailableSlugIds, getUserByDiscordId } from '../services/user';
import {
  getReferralDoc,
  createReferralActionByDoc,
} from '../services/referral';
import { getUserSettings, createUserSettings } from '../services/userSettings';
import { getSession, getSessionFromUserId } from '../services/session';
import { validateSessionPermissions } from '../common/session';
import {
  DISCORD_PERMISSIONS,
  DEFAULT_EMAIL_SETTINGS,
} from '../common/globalConstantsAPI';

const router = express.Router();

export function destroySession(req: Request, res: Response) {
  req.session = null;
  res.clearCookie('userId');
}

router.get('/discord/login', (req, res) => {
  const { state } = req.query;
  if (!state) {
    res.status(400).send('OAuth2 state required.');
    return;
  }
  res.redirect(DiscordOAuth2Url(state, req.headers.host));
});

router.get('/discord/validatePermissions', async (req, res) => {
  const { userId } = req.session;
  if (!userId) {
    return res
      .status(400)
      .send('Require a logged in user to complete this request.');
  }
  try {
    const sessionDoc = await getSessionFromUserId(userId, 'discord');
    if (!sessionDoc) {
      throw new Error(
        `SessionDoc in validatePermissions is null { userId: ${userId} }`
      );
    }
    const validSessionPermissions = validateSessionPermissions(sessionDoc);
    if (!validSessionPermissions) {
      console.log(
        `User ${userId} has invalid Discord session permissions, redirect to Discord auth.`
      );
    }
    return res.status(200).send({ authRequired: !validSessionPermissions });
  } catch (err) {
    console.error(`Validating sessionDoc failed: { userId: ${userId} }`, err);
    return res.status(500).send({ authRequired: true });
  }
});

function convertTokenResponseToModel(
  obj: OAuth2TokenResponseData,
  client: OAuth2Client,
  userId: string
) {
  const model: FilterAutoMongoKeys<Session> = {
    accessToken: obj.access_token,
    accessTokenExpiresAt: Date.now() + obj.expires_in * 1000,
    refreshToken: obj.refresh_token,
    scope: obj.scope,
    tokenType: obj.token_type,
    client,
    userId,
  };
  return model;
}

// router.post(
//   '/discord/disconnect',
//   isAuthenticatedButNotNecessarilyOnboarded,
//   async (req, res, next) => {
//     const { token } = req.session;
//     await SessionModel.findOneAndDelete({ accessToken: token });
//     destroySession(req, res);
//   }
// );

router.get('/discord/callback', async (req, res) => {
  const { code, error, error_description: errorDescription, state } = req.query;
  if (error) {
    res.redirect(`/?error=${error}&error_description=${errorDescription}`);
    return;
  }
  let successfulAuthentication = true;
  let tokenResponseData = await ReadingDiscordBot.getToken(
    code,
    req.headers.host
  );

  if (tokenResponseData.error) {
    const encodedErrorMessage = encodeURIComponent(
      tokenResponseData.error_description
    );
    destroySession(req, res);
    res.redirect(`/?error=${encodedErrorMessage}`);
    console.error(`Failed to authenticate: ${encodedErrorMessage}`);
    return;
  }
  let { access_token: accessToken } = tokenResponseData;
  const discordUserData = await ReadingDiscordBot.getMe(accessToken);
  const discordClient = ReadingDiscordBot.getInstance();
  const guild = discordClient.guilds.first();

  let userDoc = await getUserByDiscordId(discordUserData.id);
  if (userDoc) {
    // Do any user updates here.

    // Temporarily, check if we have an email for this user.
    // TODO: Once every user in production has an email in settings, we can remove these checks.
    const userSettingsDoc = await getUserSettings(userDoc.id);
    if (userSettingsDoc && !userSettingsDoc.email && discordUserData.email) {
      // User settings exists but we don't have an email saved yet; add one.
      userSettingsDoc.email = discordUserData.email;
      userSettingsDoc.save();
    } else if (!userSettingsDoc && discordUserData.email) {
      // User settings does not yet exist; add one with an email.
      const newUserSettings: FilterAutoMongoKeys<UserSettings> = {
        userId: userDoc.id,
        email: discordUserData.email,
        emailSettings: DEFAULT_EMAIL_SETTINGS,
      };
      createUserSettings(newUserSettings);
    }
  } else {
    const slugs = generateSlugIds(discordUserData.username);
    const availableSlugs = await getAvailableSlugIds(slugs);
    let currentSlugId = 0;
    while (!userDoc && currentSlugId < availableSlugs.length) {
      const userInstance: Pick<
        User,
        'discordId' | 'urlSlug' | 'selectedGenres' | 'questions' | 'shelf'
      > = {
        discordId: discordUserData.id,
        urlSlug: availableSlugs[currentSlugId],
        selectedGenres: [],
        questions: [],
        shelf: { notStarted: [], read: [] },
      };
      const userModel = new UserModel(userInstance);
      // TODO: handle slug failure due to time windowing
      try {
        userDoc = await userModel.save();
        console.log(
          `Created new user: {id: ${userDoc.id}, discordId: ${userDoc.discordId}}`
        );
      } catch (err) {
        userDoc = undefined;
        console.error(`Failed to create user: `, err);
      }
      currentSlugId++;
    }
    if (!userDoc || currentSlugId + 1 > availableSlugs.length) {
      throw new Error(
        `User creation failed. UserDoc: ${userDoc}, Discord: ${discordUserData.id}`
      );
    }

    const { referredTempUid } = req.session;
    if (referredTempUid) {
      // The person was referred.
      getReferralDoc(referredTempUid).then(currentReferredDoc => {
        if (currentReferredDoc) {
          currentReferredDoc.userId = userDoc.id;
        }
        createReferralActionByDoc(currentReferredDoc, 'login');
      });
      req.session.referredTempUid = undefined;
      res.clearCookie('refClickComplete');
    }

    // Init user settings
    const newUserSettings: FilterAutoMongoKeys<UserSettings> = {
      userId: userDoc.id,
      email: discordUserData.email,
      emailSettings: DEFAULT_EMAIL_SETTINGS,
    };
    createUserSettings(newUserSettings);
  }

  try {
    const currentSessionModel = await getSession(accessToken);
    if (currentSessionModel) {
      if (currentSessionModel.client !== 'discord') {
        return res
          .status(401)
          .send(
            `Unauthorized: invalid source for session ${currentSessionModel.client}`
          );
      }
      const accessTokenExpiresAt: number = currentSessionModel.get(
        'accessTokenExpiresAt'
      );
      // Check if the user has provided any new Discord permissions.
      // If so, update their session doc.
      const discordPermissions = DISCORD_PERMISSIONS.join(' ');
      if (currentSessionModel.scope !== discordPermissions) {
        currentSessionModel.update({ scope: discordPermissions });
      }
      const isExpired = Date.now() > accessTokenExpiresAt;
      if (isExpired) {
        // Begin token refresh
        console.log(
          `Refreshing access token for user {id: ${userDoc.id}, discordId: ${userDoc.discordId}}`
        );
        const refreshToken: string = currentSessionModel.get('refreshToken');
        tokenResponseData = await ReadingDiscordBot.refreshAccessToken(
          refreshToken
        );
        accessToken = tokenResponseData.access_token;
        const modelInstance = convertTokenResponseToModel(
          tokenResponseData,
          'discord',
          userDoc.id
        );
        currentSessionModel.update(modelInstance).exec();
        console.log(
          `Updated access token for user {id: ${userDoc.id}, discordId: ${userDoc.discordId}}`
        );
      }
      // else validated
    } else {
      // New user, nice!
      const modelInstance = convertTokenResponseToModel(
        tokenResponseData,
        'discord',
        userDoc.id
      );
      const sessionModel = new SessionModel(modelInstance);
      sessionModel.save();
      console.log(
        `Created a new session for user {id: ${userDoc.id}, discordId: ${userDoc.discordId}}`
      );
    }
  } catch (err) {
    // to check if it fails here
    const encodedErrorMessage = encodeURIComponent(err);
    destroySession(req, res);
    res.redirect(`/?error=${encodedErrorMessage}`);
    console.error(
      `Failed to manage session on Discord callback {id: ${userDoc.id}, discordId: ${userDoc.discordId}}. Error: ${encodedErrorMessage}.`
    );
    return;
  }

  try {
    await guild.addMember(discordUserData.id, {
      accessToken,
    });
    console.log(
      `Added user {id: ${userDoc.id}, discordId: ${userDoc.discordId}} to guild ${guild.id}.`
    );
  } catch (err) {
    console.error(`Couldn't add user to guild: ${userDoc.id}`);
    successfulAuthentication = false;
  }

  if (successfulAuthentication) {
    req.session.token = accessToken;
    req.session.userId = userDoc.id;
    const numDaysBeforeExpiry = 30;
    const numMillisecondsBeforeExpiry =
      1000 * 60 * 60 * 24 * numDaysBeforeExpiry;
    res.cookie('userId', userDoc.id, {
      expires: new Date(Date.now() + numMillisecondsBeforeExpiry),
    });
    res.redirect(`/?state=${state}`);
    console.log(
      `Successful authentication {id: ${userDoc.id}, discordId: ${userDoc.discordId}}.`
    );
  } else {
    destroySession(req, res);
    res.redirect(`/?error=Could+not+authenticate`);
  }
});

export default router;

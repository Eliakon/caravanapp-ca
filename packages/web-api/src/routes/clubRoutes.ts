import express from 'express';
import {
  ChannelCreationOverwrites,
  ChannelData,
  Guild,
  GuildChannel,
  TextChannel,
  VoiceChannel,
  GuildMember,
  PermissionResolvable,
} from 'discord.js';
import { check, validationResult } from 'express-validator';
import {
  Club,
  FilterAutoMongoKeys,
  ReadingState,
  Services,
  ShelfEntry,
  User,
  CurrBookAction,
  ReadingSpeed,
  GroupVibe,
} from '@caravan/buddy-reading-types';
import { Omit } from 'utility-types';
import ClubModel from '../models/club';
import UserModel from '../models/user';
import { isAuthenticated } from '../middleware/auth';
import { ReadingDiscordBot } from '../services/discord';
import { ClubDoc, UserDoc } from '../../typings';
import { getUser } from '../services/user';

const router = express.Router();

const isInChannel = (member: GuildMember, club: ClubDoc) =>
  !member.user.bot &&
  (member.highestRole.name !== 'Admin' || club.ownerDiscordId === member.id);

const getCountableMembersInChannel = (
  discordChannel: GuildChannel,
  club: ClubDoc
) =>
  (discordChannel as TextChannel | VoiceChannel).members.filter(m =>
    isInChannel(m, club)
  );

const getUserChannels = (guild: Guild, discordId: string) => {
  const channels = guild.channels.filter(c => {
    const cTyped = c as TextChannel | VoiceChannel;
    return (
      (c.type === 'text' || c.type === 'voice') &&
      cTyped.members.some(m => m.id === discordId)
    );
  });
  return channels;
};

async function getChannelMembers(guild: Guild, club: ClubDoc) {
  let discordChannel = guild.channels.find(c => c.id === club.channelId);
  if (discordChannel.type !== 'text' && discordChannel.type !== 'voice') {
    return;
  }
  const guildMembersArr = getCountableMembersInChannel(
    discordChannel,
    club
  ).array();
  const guildMemberDiscordIds = guildMembersArr.map(m => m.id);
  const users = await UserModel.find({
    discordId: { $in: guildMemberDiscordIds },
    isBot: { $eq: false },
  });
  const guildMembers = guildMembersArr
    .map(mem => {
      const user = users.find(u => u.discordId === mem.id);
      if (user) {
        const userObj: User = user.toObject();
        const result = {
          ...userObj,
          name: userObj.name ? userObj.name : mem.user.username,
          discordUsername: mem.user.username,
          discordId: mem.id,
          photoUrl:
            user.photoUrl ||
            mem.user.avatarURL ||
            mem.user.displayAvatarURL ||
            mem.user.defaultAvatarURL,
        };
        return result;
      } else {
        // Handle case where a user comes into discord without creating an account
        // i.e. create a shadow account
        console.error('Create a shadow account');
        return null;
      }
    })
    .filter(g => g !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
  return guildMembers;
}

// TODO: Need to add checks here: Is the club full? Is the club unlisted? => Don't return
router.get('/', async (req, res, next) => {
  const { after, pageSize, readingSpeed } = req.query;
  const { userId } = req.session;
  let user: UserDoc | undefined;
  if (userId) {
    user = await getUser(userId);
  }
  try {
    // Calculate number of documents to skip
    const query: any = {
      unlisted: { $eq: false },
    };
    if (after) {
      query._id = { $lt: after };
    }
    if (readingSpeed) {
      query.readingSpeed = { $eq: readingSpeed };
    }
    const size = Number.parseInt(pageSize || 0);
    const limit = Math.min(Math.max(size, 10), 50);
    const clubs = await ClubModel.find(query)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    // Don't return full clubs
    if (!clubs) {
      res.sendStatus(404);
      return;
    }
    const client = ReadingDiscordBot.getInstance();
    const guild = client.guilds.first();
    const clubsWithMemberCounts: Services.GetClubs['clubs'] = clubs
      .map(clubDoc => {
        let discordChannel: GuildChannel | null = guild.channels.find(
          c => c.id === clubDoc.channelId
        );
        if (!discordChannel) {
          return null;
        }
        const memberCount = getCountableMembersInChannel(
          discordChannel,
          clubDoc
        ).size;
        const club: Omit<Club, 'createdAt' | 'updatedAt'> & {
          createdAt: string;
          updatedAt: string;
        } = {
          ...clubDoc.toObject(),
          createdAt:
            clubDoc.createdAt instanceof Date
              ? clubDoc.createdAt.toISOString()
              : clubDoc.createdAt,
          updatedAt:
            clubDoc.updatedAt instanceof Date
              ? clubDoc.updatedAt.toISOString()
              : clubDoc.updatedAt,
        };
        const obj: Services.GetClubs['clubs'][0] = {
          ...club,
          guildId: guild.id,
          memberCount,
        };
        return obj;
      })
      .filter(c => c !== null);
    const result: Services.GetClubs = {
      clubs: clubsWithMemberCounts,
    };
    res.status(200).json(result);
  } catch (err) {
    console.error('Failed to get all clubs.', err);
    return next(err);
  }
});

// Get a club
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const clubDoc = await ClubModel.findById(id);
    if (!clubDoc) {
      res.sendStatus(404);
      return;
    }
    if (clubDoc.channelSource === 'discord') {
      const client = ReadingDiscordBot.getInstance();
      const guild = client.guilds.first();
      const guildMembers = await getChannelMembers(guild, clubDoc);

      const clubWithDiscord: Services.GetClubById = {
        _id: clubDoc.id,
        name: clubDoc.name,
        ownerId: clubDoc.ownerId,
        ownerDiscordId: clubDoc.ownerDiscordId,
        shelf: clubDoc.shelf,
        bio: clubDoc.bio,
        members: guildMembers,
        maxMembers: clubDoc.maxMembers,
        vibe: clubDoc.vibe,
        readingSpeed: clubDoc.readingSpeed,
        guildId: guild.id,
        channelSource: clubDoc.channelSource,
        channelId: clubDoc.channelId,
        unlisted: clubDoc.unlisted,
        createdAt:
          clubDoc.createdAt instanceof Date
            ? clubDoc.createdAt.toISOString()
            : clubDoc.createdAt,
        updatedAt:
          clubDoc.updatedAt instanceof Date
            ? clubDoc.updatedAt.toISOString()
            : clubDoc.updatedAt,
      };
      res.status(200).send(clubWithDiscord);
    } else {
      res
        .status(500)
        .send(`Error: unknown channelSource: ${clubDoc.channelSource}`);
      return;
    }
  } catch (err) {
    if (err.name) {
      switch (err.name) {
        case 'CastError':
          res.sendStatus(404);
          return;
        default:
          break;
      }
    }
    console.log(`Failed to get club ${id}`, err);
    return next(err);
  }
});

// Gets all of the clubs the specified user is currently in.
// Will get unlisted clubs iff the request is made by the user.
router.get('/user/:userId', async (req, res, next) => {
  const { after, pageSize } = req.query;
  const { userId } = req.params;
  let user: UserDoc | undefined;

  const currentUser = req.session.userId
    ? await UserModel.findById(req.session.userId)
    : null;

  if (userId) {
    user = await getUser(userId);
  } else {
    res.status(400).send("Require a user id for get user's clubs");
    return;
  }
  const client = ReadingDiscordBot.getInstance();
  const guild = client.guilds.first();
  const { discordId } = user;
  const channels = getUserChannels(guild, discordId);
  const channelIds = channels.map(c => c.id);
  try {
    const clubDocs = await ClubModel.find({
      channelSource: 'discord',
      channelId: {
        $in: channelIds,
      },
    });
    if (!clubDocs) {
      res.status(404).send(`No clubs exist for user ${userId}`);
      return;
    }
    const clubsWithMemberCount = clubDocs
      .map(clubDoc => {
        let discordChannel: GuildChannel | null = guild.channels.find(
          c => c.id === clubDoc.channelId
        );
        if (!discordChannel) {
          return null;
        }

        // If the club is unlisted
        if (
          clubDoc.unlisted &&
          (!currentUser ||
            !(discordChannel as TextChannel).members.some(
              m => m.id === currentUser.discordId
            ))
        ) {
          return null;
        }
        const memberCount = getCountableMembersInChannel(
          discordChannel,
          clubDoc
        ).size;
        return { ...clubDoc.toObject(), memberCount };
      })
      .filter(x => x != null);
    res.status(200).json(clubsWithMemberCount);
  } catch (err) {
    console.log('Failed to get clubs for user ' + user._id);
    return next(err);
  }
});

// Return clubs from array of clubId's.
router.post(
  '/clubsById',
  check('clubIds').isArray(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArr = errors.array();
      return res.status(422).json({ errors: errorArr });
    }
    const { clubIds } = req.body;
    try {
      const clubs = await ClubModel.find({
        _id: {
          $in: clubIds,
        },
      });
      if (!clubs) {
        res.sendStatus(404);
        return;
      }
      const client = ReadingDiscordBot.getInstance();
      const guild = client.guilds.first();
      const guildMembersPromises: Promise<{
        club: ClubDoc;
        guildMembers: any[];
      }>[] = [];
      let guildErr: Error | null = null;
      clubs.forEach(c => {
        if (c.channelSource === 'discord') {
          guildMembersPromises.push(
            getChannelMembers(guild, c).then(r => {
              return { club: c, guildMembers: r };
            })
          );
        } else {
          guildErr = new Error(
            `Error: unknown channelSource: ${c.channelSource}`
          );
        }
      });
      if (guildErr) {
        res
          .status(500)
          // TODO: Check if it's appropriate to send errors like this.
          .send(guildErr);
        return;
      }

      const allGuildMembers = await Promise.all(guildMembersPromises);
      const clubsWithMemberObjs = allGuildMembers.map(gmObj => {
        if (gmObj.club.channelSource === 'discord') {
          return {
            ...gmObj.club.toObject(),
            members: gmObj.guildMembers,
            guildId: guild.id,
          };
        }
        // TODO: Add other channel sources
      });
      res.status(200).send(clubsWithMemberObjs);
    } catch (err) {
      console.log('Failed to get clubs.', err);
      return next(err);
    }
  }
);

interface CreateChannelInput {
  nsfw?: boolean;
  invitedUsers?: string[];
}

interface CreateClubBody
  extends CreateChannelInput,
    Omit<Club, 'ownerId' | 'channelId'> {}

const knownHttpsRedirects = ['http://books.google.com/books/'];

// Create club
router.post('/', isAuthenticated, async (req, res, next) => {
  try {
    const { userId, token } = req.session;
    const discordClient = ReadingDiscordBot.getInstance();
    const guild = discordClient.guilds.first();

    const body: CreateClubBody = req.body;
    const invitedUsers = body.invitedUsers || [];
    // Ensure exactly one instance of the owner is here
    invitedUsers.filter(u => u !== req.user.discordId);
    invitedUsers.push(req.user.discordId);
    const channelCreationOverwrites = invitedUsers.map(user => {
      const allowed: PermissionResolvable = [
        'VIEW_CHANNEL',
        'SEND_MESSAGES',
        'READ_MESSAGES',
        'SEND_TTS_MESSAGES',
      ];
      if (user === req.user.discordId) {
        allowed.push('MANAGE_MESSAGES');
      }
      return {
        id: user,
        allow: allowed,
      } as ChannelCreationOverwrites;
    });

    // Make all channels unlisted (might have to handle Genre channels differently in the future)
    channelCreationOverwrites.push({
      id: guild.defaultRole.id,
      deny: ['VIEW_CHANNEL'],
    });

    const newChannel: ChannelData = {
      type: 'text',
      name: body.name,
      nsfw: body.nsfw || false,
      userLimit: body.maxMembers,
      permissionOverwrites: channelCreationOverwrites,
    };
    const channel = (await guild.createChannel(
      newChannel.name,
      newChannel
    )) as TextChannel;

    const shelf = body.shelf.map(item => {
      if (
        item &&
        item.coverImageURL &&
        knownHttpsRedirects.find(url => item.coverImageURL.startsWith(url))
      ) {
        const newItem: CreateClubBody['shelf'][0] = {
          ...item,
          coverImageURL: item.coverImageURL.replace('http:', 'https:'),
        };
        return newItem;
      }
      return item;
    });

    const clubModelBody: Omit<FilterAutoMongoKeys<Club>, 'members'> = {
      name: body.name,
      bio: body.bio,
      maxMembers: body.maxMembers,
      readingSpeed: body.readingSpeed,
      shelf,
      ownerId: userId,
      ownerDiscordId: req.user.discordId,
      channelSource: body.channelSource,
      channelId: channel.id,
      unlisted: body.unlisted,
      vibe: body.vibe,
    };

    const club = new ClubModel(clubModelBody);
    const newClub = await club.save();

    const result: Services.CreateClubResult = {
      //@ts-ignore
      club: newClub,
      discord: newChannel,
    };

    res.status(201).send(result);
  } catch (err) {
    console.log('Failed to create new club', err);
    return next(err);
  }
});

const READING_SPEEDS: ReadingSpeed[] = ['slow', 'moderate', 'fast'];
const GROUP_VIBES: GroupVibe[] = [
  'chill',
  'first-timers',
  'learning',
  'nerdy',
  'power',
];

// Modify a club
router.put(
  '/:id',
  isAuthenticated,
  check('newClub.bio', 'Bio must be a string less than 300 chars in length.')
    .isString()
    .isLength({ max: 300 }),
  check(
    'newClub.maxMembers',
    'Max members must be an integer between 1 and 1000 inclusive'
  ).isInt({ gt: 1, lt: 1000 }),
  check(
    'newClub.name',
    'Name must be a string between 2 and 150 chars in length'
  )
    .isString()
    .isLength({ min: 2, max: 150 }),
  check(
    'newClub.readingSpeed',
    `Reading speed must be one of ${READING_SPEEDS.join(', ')}`
  ).isIn(READING_SPEEDS),
  check('newClub.unlisted', 'Unlisted must be a boolean').isBoolean(),
  check('newClub.vibe', `Vibe must be one of ${GROUP_VIBES.join(', ')}`).isIn(
    GROUP_VIBES
  ),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArr = errors.array();
      console.warn(
        `User {id: ${req.user._id}, name: ${
          req.user.name
        }} failed club update.\n${errorArr.toString()}\n${req.body}`
      );
      res.status(422).json({ errors: errorArr });
      return;
    }
    const clubId = req.params.id;
    const newClub: Services.GetClubById = req.body.newClub;
    // TODO: The user can still cheat this. Need to first get the existing club by id and check against that.
    if (req.user._id.toHexString() !== newClub.ownerId) {
      console.warn(
        `User ${req.user._id} attempted to edit club ${clubId} without valid permission.`
      );
      res.status(422).send('Only the club owner may update a club!');
      return;
    }
    if (newClub.maxMembers < newClub.members.length) {
      console.warn(
        `User ${req.user._id} attempted to set max members on club ${clubId} to a value less than its current member count.`
      );
      res
        .status(422)
        .send(
          `You cannot set max members (${newClub.maxMembers}) to be smaller than the current number of members (${newClub.members.length}).`
        );
      return;
    }
    const updateObj: Pick<
      FilterAutoMongoKeys<Club>,
      'bio' | 'maxMembers' | 'name' | 'readingSpeed' | 'unlisted' | 'vibe'
    > = {
      bio: newClub.bio,
      maxMembers: newClub.maxMembers,
      name: newClub.name,
      readingSpeed: newClub.readingSpeed,
      unlisted: newClub.unlisted,
      vibe: newClub.vibe,
    };
    let result: ClubDoc;
    try {
      result = await ClubModel.findByIdAndUpdate(clubId, updateObj, {
        new: true,
      });
      if (result) {
        res.status(200).send(result);
      } else {
        console.warn(
          `User ${req.user._id} attempted to edit club ${clubId} but the club was not found.`
        );
        res.status(404).send(`Unable to find club ${clubId}`);
      }
    } catch (err) {
      console.error('Failed to save club data', err);
      res.status(400).send('Failed to save club data');
    }
  }
);

// Delete a club
router.delete('/:clubId', isAuthenticated, async (req, res) => {
  const { user } = req;
  const { clubId } = req.params;

  let clubDoc: ClubDoc;
  try {
    clubDoc = await ClubModel.findById(clubId);
  } catch (err) {
    res.status(400).send(`Could not find club ${clubId}`);
    return;
  }

  const discordClient = ReadingDiscordBot.getInstance();
  const guild = discordClient.guilds.first();
  const channel: GuildChannel = guild.channels.find(
    c => c.id === clubDoc.channelId
  );
  if (!channel) {
    res.status(400).send(`Channel was deleted, clubId: ${clubId}`);
    return;
  }

  const memberInChannel = (channel as VoiceChannel | TextChannel).members.find(
    m => m.id === user.discordId
  );
  if (memberInChannel && memberInChannel.hasPermission('MANAGE_CHANNELS')) {
    try {
      const deletedChannel = await channel.delete();
      console.log(
        `Deleted discord channel {${channel.id}, ${channel.name}} by user ${user.id}`
      );
      clubDoc = await clubDoc.remove();
      console.log(
        `Deleted club {${clubDoc.id},${clubDoc.name}} with channel {${channel.id}, ${channel.name}} by user ${user.id}`
      );
      res.status(204).send(`Deleted channel ${deletedChannel.id}`);
    } catch (err) {
      console.log(
        `Failed to delete club {${clubDoc.id},${clubDoc.name}} with channel {${channel.id}, ${channel.name}} by user ${user.id}`
      );
      res.status(500).send(err);
    }
  } else {
    res.status(401).send("You don't have permission to delete this channel.");
    console.log(
      `User ${user.id} failed to authenticate to delete club {${clubDoc.id},${clubDoc.name}} with channel {${channel.id}, ${channel.name}} by user ${user.id}`
    );
  }
});

// Update a club's currently read book
router.put(
  '/:id/updatebook',
  isAuthenticated,
  check('newEntry').isBoolean(),
  check('prevBookId').isString(),
  check('currBookAction').isString(),
  check('wantToRead').isArray(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorArr = errors.array();
      return res.status(422).json({ errors: errorArr });
    }
    const clubId = req.params.id;
    const {
      newBook,
      newEntry,
      prevBookId,
      currBookAction,
      wantToRead,
    } = req.body;
    let wantToReadArr = wantToRead as FilterAutoMongoKeys<ShelfEntry>[];
    let resultPrev, resultNew;
    if (currBookAction !== 'current') {
      if (prevBookId) {
        switch (currBookAction as CurrBookAction) {
          case 'delete':
            resultPrev = await ClubModel.update(
              { _id: clubId },
              { $pull: { shelf: { _id: prevBookId } } }
            );
            break;
          case 'notStarted':
          case 'read':
            const prevCondition = {
              _id: clubId,
              'shelf._id': prevBookId,
            };
            const prevUpdate = {
              'shelf.$.readingState': currBookAction,
              'shelf.$.updatedAt': new Date(),
            };
            try {
              resultPrev = await ClubModel.findOneAndUpdate(
                prevCondition,
                prevUpdate,
                {
                  new: true,
                }
              );
            } catch (err) {
              return res.status(400).send(err);
            }
            break;
          default:
            return res
              .status(400)
              .send('Invalid value passed for currBookAction!');
        }
      }
      let newCondition, newUpdate;
      const newReadingState: ReadingState = 'current';
      if (!newEntry) {
        newCondition = {
          _id: clubId,
          'shelf._id': newBook._id,
        };
        newUpdate = {
          $set: {
            'shelf.$.readingState': newReadingState,
            'shelf.$.updatedAt': new Date(),
          },
        };
      } else {
        newCondition = {
          _id: clubId,
        };
        newUpdate = {
          $addToSet: {
            shelf: {
              ...newBook,
              readingState: newReadingState,
              publishedDate: newBook.publishedDate
                ? new Date(newBook.publishedDate)
                : undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        };
      }
      try {
        resultNew = await ClubModel.findOneAndUpdate(newCondition, newUpdate, {
          new: true,
        });
      } catch (err) {
        return res.status(400).send(err);
      }
    }
    // TODO: typing here is a bitch.
    let updateObject: any[] = [];
    if (wantToReadArr.length > 0) {
      const wtrReadingState: ReadingState = 'notStarted';
      updateObject = wantToReadArr.map(b => {
        return {
          ...b,
          readingState: wtrReadingState,
          publishedDate: b.publishedDate
            ? new Date(b.publishedDate)
            : undefined,
          updatedAt: new Date(),
        };
      });
    }
    const wtrCondition = {
      _id: clubId,
    };
    const wtrUpdate = {
      $push: { shelf: { $each: updateObject } },
    };
    let resultWTR;
    try {
      let removeWTR = await ClubModel.update(
        { _id: clubId },
        {
          $pull: {
            shelf: { readingState: 'notStarted', _id: { $ne: prevBookId } },
          },
        }
      );
      resultWTR = await ClubModel.findOneAndUpdate(wtrCondition, wtrUpdate, {
        new: true,
      });
    } catch (err) {
      return res.status(400).send(err);
    }
    if (resultWTR) {
      return res.status(200).send({ resultWTR });
    } else if (resultNew) {
      return res.status(200).send({ resultNew });
    }
    return res.sendStatus(400);
  }
);

// Modify current user's club membership
router.put(
  '/:clubId/membership',
  isAuthenticated,
  check('isMember').isBoolean(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    const userId = req.user._id;
    const userDiscordId = req.user.discordId;
    const { clubId } = req.params;
    const { isMember } = req.body;

    let club: ClubDoc;
    try {
      club = await ClubModel.findById(clubId);
    } catch (err) {
      res.status(400).send(`Could not find club ${clubId}`);
      return;
    }

    const isOwner = club.ownerId === userId.toHexString();

    const discordClient = ReadingDiscordBot.getInstance();
    const guild = discordClient.guilds.first();
    const channel: GuildChannel = guild.channels.find(
      c => c.id === club.channelId
    );
    if (!channel) {
      res.status(400).send(`Channel was deleted, clubId: ${clubId}`);
      return;
    }

    const memberInChannel = (channel as
      | VoiceChannel
      | TextChannel).members.find(m => m.id === userDiscordId);
    if (isMember) {
      // Trying to add to members
      const { size } = getCountableMembersInChannel(channel, club);
      if (memberInChannel) {
        // already a member
        res.status(401).send("You're already a member of the club!");
        return;
      } else if (size >= club.maxMembers) {
        res
          .status(401)
          .send(
            `There are already ${size}/${club.maxMembers} people in the club.`
          );
        return;
      } else {
        const permissions = (channel as
          | VoiceChannel
          | TextChannel).memberPermissions(memberInChannel);
        if (permissions && permissions.hasPermission('READ_MESSAGES')) {
          res.status(401).send('You already have access to the channel!');
          return;
        }
        await (channel as VoiceChannel | TextChannel).overwritePermissions(
          userDiscordId,
          {
            READ_MESSAGES: true,
            SEND_MESSAGES: true,
            SEND_TTS_MESSAGES: true,
            MANAGE_MESSAGES: isOwner,
          }
        );
      }
    } else {
      if (isOwner) {
        res.status(401).send('An owner cannot leave a club.');
        return;
      }
      if (!memberInChannel) {
        res.status(401).send("You're not a member of the club already!");
        return;
      }
      await (channel as VoiceChannel | TextChannel).overwritePermissions(
        userDiscordId,
        {
          READ_MESSAGES: false,
          SEND_MESSAGES: false,
          SEND_TTS_MESSAGES: false,
          MANAGE_MESSAGES: false,
        }
      );
    }
    const members = await getChannelMembers(guild, club);
    res.status(200).send(members);
  }
);

export default router;

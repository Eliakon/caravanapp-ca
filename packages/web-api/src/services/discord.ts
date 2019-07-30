import axios from 'axios';
import btoa from 'btoa';
import Discord from 'discord.js';
import fetch from 'node-fetch';
import { User } from '@caravan/buddy-reading-types';
import { getUser } from './user';

const DiscordRedirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT);
const DiscordPermissions = ['identify', 'guilds.join', 'gdm.join'].join('%20');

const DiscordApiUrl = 'https://discordapp.com/api';
const DiscordBotSecret = process.env.DISCORD_BOT_SECRET;
const DiscordClientId = process.env.DISCORD_CLIENT_ID;
const DiscordClientSecret = process.env.DISCORD_CLIENT_SECRET;
const DiscordBase64Credentials = btoa(
  `${DiscordClientId}:${DiscordClientSecret}`
);

const getDiscordRedirectUri = (host: string) => {
  if (process.env.GAE_ENV === 'production') {
    // For max security, do no accept header as part of redirect url in production
    return DiscordRedirectUri;
  }
  // In staging environments and local environments, meh.
  const prefix = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return encodeURIComponent(`${prefix}://${host}/api/auth/discord/callback`);
};

const DiscordOAuth2Url = (state: string, host: string) => {
  const redirectUri = getDiscordRedirectUri(host);
  return `${DiscordApiUrl}/oauth2/authorize?client_id=${DiscordClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${DiscordPermissions}&state=${state}`;
};
const GetDiscordTokenCallbackUri = (code: string, host: string) => {
  const redirectUri = getDiscordRedirectUri(host);
  return `${DiscordApiUrl}/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri ||
    DiscordRedirectUri}`;
};
const GetDiscordTokenRefreshCallbackUri = (refreshToken: string) =>
  `${DiscordApiUrl}/oauth2/token?client_id=${DiscordClientId}&client_secret=${DiscordClientSecret}&grant_type=refresh_token&refresh_token=${refreshToken}&redirect_uri=${DiscordRedirectUri}&scope=${DiscordPermissions}`;

const PrimaryGuild = process.env.DISCORD_GUILD;

interface DiscordUserResponseData {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  mfa_enabled?: boolean;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
}

interface OAuth2TokenResponseData {
  access_token: string;
  /** Time until expiration (seconds) */
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: 'Bearer';

  error?: string;
  error_description?: string;
}

// Singleton pattern
const ReadingDiscordBot = (() => {
  let instance: Discord.Client;

  function createInstance() {
    const discordClient = new Discord.Client();
    discordClient.login(DiscordBotSecret);
    return discordClient;
  }

  return {
    getInstance: () => {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },

    getMe: async (accessToken: string) => {
      const userResponse = await axios.get(`${DiscordApiUrl}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return userResponse.data as DiscordUserResponseData;
    },

    getToken: async (code: string, host: string) => {
      const tokenUri = GetDiscordTokenCallbackUri(code, host);
      const tokenResponse = await fetch(tokenUri, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${DiscordBase64Credentials}`,
        },
      });
      return (await tokenResponse.json()) as OAuth2TokenResponseData;
    },

    refreshAccessToken: async (refreshToken: string) => {
      const refreshTokenUri = GetDiscordTokenRefreshCallbackUri(refreshToken);
      const tokenResponse = await fetch(refreshTokenUri, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${DiscordBase64Credentials}`,
        },
      });
      return (await tokenResponse.json()) as OAuth2TokenResponseData;
    },
  };
})();

export const giveDiscordRole = async (userId: string, role: string) => {
  const user = await getUser(userId);
  if (!user) {
    console.error(
      `Attempted to give user ${userId} a Discord role, but could not find them in db.`
    );
    return;
  }
  const client = ReadingDiscordBot.getInstance();
  const guild = client.guilds.first();
  const guildMember = guild.members.find(m => m.id === user.discordId);
  if (!guildMember) {
    console.error(`Did not find user ${userId} in the Discord guild`);
    return;
  }
  console.log(`Giving user ${userId} Discord role ${role}`);
  guildMember.addRole(role);
};

// class ReadingDiscordClient {
//   private readonly accessToken: string;
//   constructor(accessToken: string) {
//     this.accessToken = accessToken;
//   }

//   async getUser() {
//     const userResponse = await axios.get(`${DiscordApiUrl}/users/@me`, {
//       headers: { Authorization: `Bearer ${this.accessToken}` },
//     });
//     return userResponse.data as DiscordUserResponseData;
//   }

//   async getPrimaryGuildChannels() {
//     try {
//       const channelsResponse = await axios.get(
//         `${DiscordApiUrl}/guilds/${PrimaryGuild}/channels`,
//         {
//           headers: { Authorization: `Bot ${DiscordBotSecret}` },
//         }
//       );
//       return channelsResponse;
//     } catch (err) {
//       console.error(err);
//       throw err;
//     }
//   }

//   async joinPrimaryGuild(user: UserDoc) {
//     try {
//       const joinResponse = await axios.put(
//         `${DiscordApiUrl}/guilds/${PrimaryGuild}/members/${user.discordId}`,
//         {
//           headers: { Authorization: `Bot ${DiscordBotSecret}` },
//           access_token: this.accessToken,
//           // nick: user.discord.username,
//           // roles: [],
//           // mute: false,
//           // deaf: false,
//         }
//       );
//       return joinResponse.data as any;
//     } catch (err) {
//       console.error(err);
//       throw err;
//     }
//   }
// }

export {
  DiscordApiUrl,
  DiscordBase64Credentials,
  ReadingDiscordBot,
  DiscordClientId,
  DiscordClientSecret,
  DiscordOAuth2Url,
  DiscordUserResponseData,
  GetDiscordTokenCallbackUri,
  GetDiscordTokenRefreshCallbackUri,
  OAuth2TokenResponseData,
};

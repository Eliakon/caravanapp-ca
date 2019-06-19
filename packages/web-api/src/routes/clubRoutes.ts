import express from 'express';
import {
  TextChannel,
  VoiceChannel,
  GuildChannel,
  GuildMember,
  ChannelData,
  ChannelCreationOverwrites,
} from 'discord.js';
import { check, validationResult } from 'express-validator/check';
import { FilterAutoMongoKeys } from '@caravan/buddy-reading-types';
import { Omit } from 'utility-types';
import ClubModel from '../models/club';
import { isAuthenticated } from '../middleware/auth';
import { ReadingDiscordBot } from '../services/discord';
import { ClubDoc } from '../../typings/@caravan/buddy-reading-web-api';
import { Club } from '@caravan/buddy-reading-types';

const router = express.Router();

// TODO: Need to add checks here: Is the club full? Is the club private? => Don't return
// TODO: Paginate/feed-ify
router.get('/', async (req, res, next) => {
  try {
    const clubs = await ClubModel.find({});
    // Don't return full clubs
    // Don't return private clubs
    if (clubs) {
      res.status(200).json(clubs);
    }
  } catch (err) {
    console.error('Failed to get all clubs.', err);
    return next(err);
  }
});

interface ClubWithDiscord extends ClubDoc {
  members: GuildMember[];
}

// Get a club
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const club = await ClubModel.findById(id);
    if (!club) {
      res.status(404).send(null);
      return;
    }
    if (club.channelSource === 'discord') {
      const client = ReadingDiscordBot.getInstance();
      const guild = client.guilds.first();
      let discordChannel = guild.channels.find(c => c.id === club.channelId);
      if (discordChannel.type !== 'text' && discordChannel.type !== 'voice') {
        return;
      }
      const guildMembers = (discordChannel as
        | TextChannel
        | VoiceChannel).members.array();
      const clubWithDiscord = { ...club, members: guildMembers };
      res.status(200).json(clubWithDiscord);
    }
  } catch (err) {
    if (err.name) {
      switch (err.name) {
        case 'CastError':
          res.status(404).send(null);
          return;
        default:
          break;
      }
    }
    console.log(`Failed to get club ${id}`, err);
    return next(err);
  }
});

router.get('/my-clubs', isAuthenticated, async (req, res, next) => {
  const discordId = req.user.discord.id;
  const client = ReadingDiscordBot.getInstance();
  const guild = client.guilds.first();

  const relevantChannels: GuildChannel[] = [];

  guild.channels.forEach(channel => {
    switch (channel.type) {
      case 'text':
        const textChannel = channel as TextChannel;
        if (textChannel.members.has(discordId)) {
          relevantChannels.push(textChannel);
        }
      case 'voice':
        const voiceChannel = channel as VoiceChannel;
        if (voiceChannel.members.has(discordId)) {
          relevantChannels.push(voiceChannel);
        }
      default:
        return;
    }
  });
  res.status(200).json(relevantChannels);
});

interface CreateChannelInput {
  nsfw?: boolean;
  invitedUsers?: string[];
}

interface CreateClubBody
  extends CreateChannelInput,
    Omit<Club, 'ownerId' | 'channelId'> {}

// Create club
router.post('/', isAuthenticated, async (req, res, next) => {
  try {
    const { userId, token } = req.session;
    const discordClient = ReadingDiscordBot.getInstance();
    const guild = discordClient.guilds.first();

    const body: CreateClubBody = req.body;
    const channelCreationOverwrites = (body.invitedUsers || []).map(user => {
      return {
        id: user,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGES'],
      } as ChannelCreationOverwrites;
    });

    // Make all channels private (might have to handle Genre channels differently in the future)
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

    guild.addMember(req.user.discord.id, {
      accessToken: token,
    });

    const clubModelBody: Omit<FilterAutoMongoKeys<Club>, 'members'> = {
      name: body.name,
      bio: body.bio,
      maxMembers: body.maxMembers,
      readingSpeed: body.readingSpeed,
      shelf: body.shelf,
      ownerId: userId,
      channelSource: body.channelSource,
      channelId: channel.id,
      private: body.private,
      vibe: body.vibe,
    };

    const club = new ClubModel(clubModelBody);
    const newClub = await club.save();

    const result = {
      club: newClub,
      discord: newChannel,
    };

    res.status(201).send(result);
  } catch (err) {
    console.log('Failed to create new club', err);
    return next(err);
  }
});

// Modify a club
router.put('/:id', isAuthenticated, async (req, res, next) => {
  const editedClub = req.body;
  try {
    const doc = await ClubModel.findByIdAndUpdate(req.params.id, editedClub, {
      new: true,
    }).exec();
    res.sendStatus(200);
  } catch (err) {
    console.log(`Failed to modify club ${req.params.id}`, err);
    return next(err);
  }
});

// Delete a club
router.delete('/:id', isAuthenticated, async (req, res, next) => {
  try {
    const record = await ClubModel.remove({ _id: req.params.id });
    res.sendStatus(204);
  } catch (err) {
    console.log(`Failed to delete club ${req.params.id}`, err);
    return next(err);
  }
});

// Modify current user's club membership
router.put(
  '/:id/membership',
  isAuthenticated,
  check('isMember').isBoolean(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    const userId = req.user._id;
    const clubId = req.params.id;
    const { isMember } = req.body;
    // try {
    //   if (isMember) {
    //     const condition = { _id: clubId, 'members.userId': { $ne: userId } };
    //     const update = {
    //       $addToSet: {
    //         members: {
    //           userId,
    //           role: 'member',
    //           createdAt: new Date(),
    //           updatedAt: new Date(),
    //         },
    //       },
    //     };
    //     const result = await ClubModel.findOneAndUpdate(condition, update, {
    //       new: true,
    //     });
    //     const userMembership = result.members.find(mem =>
    //       mem.userId.equals(userId)
    //     );
    //     res.status(200).json(userMembership);
    //   } else if (!isMember) {
    //     const update = {
    //       $pull: {
    //         members: {
    //           userId,
    //         },
    //       },
    //     };
    //     const result = await ClubModel.findByIdAndUpdate(clubId, update);
    //     res.sendStatus(200);
    //   }
    // } catch (err) {
    //   res.status(400).send(err);
    // }
  }
);

export default router;

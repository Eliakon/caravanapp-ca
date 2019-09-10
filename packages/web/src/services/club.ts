import axios from 'axios';
import {
  Services,
  ShelfEntry,
  FilterAutoMongoKeys,
  ReadingState,
  ActiveFilter,
  ClubWUninitSchedules,
  UserWithInvitableClubs,
  User,
  ClubWithRecommendation,
} from '@caravan/buddy-reading-types';
import { getRandomInviteMessage } from '../common/getRandomInviteMessage';

const clubRoute = '/api/club';
const discordRoute = '/api/discord';

export async function getAllClubs(
  userId?: string,
  after?: string,
  pageSize?: number,
  activeFilter?: ActiveFilter,
  search?: string
) {
  const res = await axios.get<Services.GetClubs>(clubRoute, {
    params: {
      userId,
      after,
      pageSize,
      activeFilter,
      search,
    },
  });
  return res;
}

export async function getUserClubRecommendations(
  userId: string,
  pageSize?: number,
  clubsReceivedIds?: string[]
) {
  const clubsReceivedIdsStr = clubsReceivedIds
    ? clubsReceivedIds.join()
    : undefined;
  const res = await axios.get<ClubWithRecommendation[]>(
    `${clubRoute}/userRecommendations`,
    {
      params: {
        userId,
        pageSize,
        clubsReceivedIds: clubsReceivedIdsStr,
      },
    }
  );
  return res;
}

export async function getClub(clubId: string) {
  const res = await axios.get<Services.GetClubById | null>(
    `${clubRoute}/${clubId}`
  );
  const club = res.data;
  return club;
}

export async function getClubsByIdNoMembers(clubIds: string[]) {
  const res = await axios.post<Services.GetClubs>(
    `${clubRoute}/getClubsByIdNoMembers`,
    {
      clubIds,
    }
  );
  return res;
}

export async function getClubsByIdWMembers(clubIds: string[]) {
  const res = await axios.post<Services.GetClubById[]>(
    `${clubRoute}/getClubsByIdWMembers`,
    {
      clubIds,
    }
  );
  const clubs = res.data;
  return clubs;
}

export async function getUserClubsWithMembers(
  userId: string,
  after?: string,
  pageSize?: number,
  activeFilter?: ActiveFilter
) {
  const res = await axios.get<Services.GetClubById[]>(
    `${clubRoute}/wMembers/user/${userId}`,
    {
      params: {
        after,
        pageSize,
        activeFilter,
      },
    }
  );
  return res;
}

export async function getClubMembers(clubId: string) {
  const res = await axios.get<User[]>(`${clubRoute}/members/${clubId}`, {
    params: {
      clubId,
    },
  });
  return res;
}

export async function modifyMyClubMembership(
  clubId: string,
  isMember: boolean
) {
  const res = await axios.put(`${clubRoute}/${clubId}/membership`, {
    isMember,
  });
  return res;
}

export async function deleteClub(clubId: string) {
  const res = await axios.delete(`${clubRoute}/${clubId}`);
  return res;
}

export async function updateShelf(
  clubId: string,
  newShelf: {
    [key in ReadingState]: (ShelfEntry | FilterAutoMongoKeys<ShelfEntry>)[];
  }
) {
  const res = await axios.put(`${clubRoute}/${clubId}/shelf`, {
    newShelf,
  });
  return res;
}

export async function createClub(body: Services.CreateClubProps) {
  const res = await axios.post<Services.CreateClubResult | null>(
    clubRoute,
    body
  );
  return res;
}

export async function modifyClub(
  newClub: Services.GetClubById | ClubWUninitSchedules
) {
  const { _id } = newClub;
  const res = await axios.put(`${clubRoute}/${_id}`, {
    newClub,
  });
  return res;
}

export async function inviteToClub(
  currentUser: User,
  userToInvite: UserWithInvitableClubs,
  clubName: string,
  clubId: string
) {
  const messageContent = getRandomInviteMessage(
    currentUser.name || currentUser.urlSlug || 'A Caravan user',
    clubName,
    clubId
  );
  const res = await axios.post(
    `${discordRoute}/members/${userToInvite.user.discordId}/messages`,
    {
      messageContent,
    }
  );
  return res;
}

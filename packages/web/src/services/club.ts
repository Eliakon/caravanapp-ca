import axios from 'axios';
import {
  Services,
  ChannelSource,
  ShelfEntry,
  ReadingSpeed,
  User,
  FilterAutoMongoKeys,
  CurrBookAction,
} from '@caravan/buddy-reading-types';

const clubRoute = '/api/club';

interface CreateClubProps {
  name: string;
  shelf?: any;
  bio: string;
  maxMembers: string;
  vibe: string;
  readingSpeed: string;
  channelSource: ChannelSource;
  private: boolean;
}

export async function getAllClubs(
  after?: string,
  pageSize?: number,
  readingSpeed?: ReadingSpeed
) {
  const res = await axios.get<Services.GetClubs>(clubRoute, {
    params: {
      after,
      pageSize,
      readingSpeed,
    },
  });
  return res;
}

export async function getClub(clubId: string) {
  const res = await axios.get<Services.GetClubById | null>(
    `${clubRoute}/${clubId}`
  );
  const club = res.data;
  return club;
}

export async function getClubsById(clubIds: string[]) {
  const res = await axios.post<Services.GetClubById[]>(
    `${clubRoute}/clubsById`,
    {
      clubIds,
    }
  );
  const clubs = res.data;
  return clubs;
}

export async function getUserClubs(user: User) {
  const res = await axios.post<Services.GetClubs['clubs']>(
    `${clubRoute}/getUserClubs`,
    { user }
  );
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

export async function updateCurrentlyReadBook(
  clubId: string,
  newBook: FilterAutoMongoKeys<ShelfEntry> | ShelfEntry,
  newEntry: boolean,
  prevBookId: string | null,
  currBookAction: CurrBookAction,
  wantToRead: (ShelfEntry | FilterAutoMongoKeys<ShelfEntry>)[]
) {
  const res = await axios.put(`${clubRoute}/${clubId}/updateBook`, {
    newBook,
    newEntry,
    prevBookId,
    currBookAction,
    wantToRead,
  });
  return res;
}

export async function createClub(props: CreateClubProps) {
  const body = {
    name: props.name,
    shelf: props.shelf,
    bio: props.bio,
    maxMembers: props.maxMembers,
    vibe: props.vibe,
    readingSpeed: props.readingSpeed,
    private: props.private,
    channelSource: props.channelSource,
  };

  const res = await axios.post<Services.CreateClubResult | null>(
    clubRoute,
    body
  );
  return res;
}

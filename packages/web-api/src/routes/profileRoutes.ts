import express from 'express';
import { Services, Genres } from '@caravan/buddy-reading-types';
import GenreModel from '../models/genre';
import { getGenreDoc } from '../services/genre';

const router = express.Router();

router.get('/genres', async (req, res, next) => {
  try {
    const genreDoc = await getGenreDoc();
    if (!genreDoc) {
      res.status(500).send('No genres found, oops!');
      return;
    }
    const obj: Genres = genreDoc.toObject();
    const resData: Services.GetGenres = {
      genres: obj.genres,
      mainGenres: obj.mainGenres,
    };
    res.status(200).json(resData);
  } catch (err) {
    console.error('Failed to get genres.', err);
    return next(err);
  }
});

export default router;

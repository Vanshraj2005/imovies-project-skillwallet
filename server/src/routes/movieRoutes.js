/**
 * Movie Routes
 * Handles GET /api/v1/movies and GET /api/v1/movies/:id
 */
const express = require('express');
const { getMovies, getMovieById, createMovie } = require('../controllers/movieController');

const router = express.Router();

router.get('/', getMovies);
router.get('/:id', getMovieById);
router.post('/', createMovie);

module.exports = router;

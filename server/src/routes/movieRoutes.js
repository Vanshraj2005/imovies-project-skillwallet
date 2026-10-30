/**
 * Movie Routes
 * /api/v1/movies
 */
const express = require('express');
const {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
} = require('../controllers/movieController');
const { getSmartMatchRecommendations } = require('../controllers/recommendationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public discovery endpoints
router.get('/', getMovies);
router.get('/recommendations/smartmatch', getSmartMatchRecommendations);
router.get('/:id', getMovieById);

// Admin-only management endpoints
router.post('/', protect, authorize('ADMIN'), createMovie);
router.put('/:id', protect, authorize('ADMIN'), updateMovie);
router.delete('/:id', protect, authorize('ADMIN'), deleteMovie);

module.exports = router;

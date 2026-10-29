/**
 * Show Routes
 * /api/v1/shows
 */
const express = require('express');
const {
  getShows,
  getShowById,
  createShow,
  updateShow,
  deleteShow,
} = require('../controllers/showController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public
router.get('/', getShows);
router.get('/:id', getShowById);

// Admin-only
router.post('/', protect, authorize('ADMIN'), createShow);
router.put('/:id', protect, authorize('ADMIN'), updateShow);
router.delete('/:id', protect, authorize('ADMIN'), deleteShow);

module.exports = router;


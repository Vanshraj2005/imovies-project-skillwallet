/**
 * Seat & Show Inventory Routes
 * /api/v1/seats
 */
const express = require('express');
const {
  getShowSeatLayout,
  holdSeats,
  releaseSeats,
  recommendSeats,
} = require('../controllers/seatController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/show/:showId', getShowSeatLayout);
router.post('/hold', protect, holdSeats);
router.post('/release', protect, releaseSeats);
router.get('/recommend', recommendSeats);
router.post('/recommend', recommendSeats);

module.exports = router;


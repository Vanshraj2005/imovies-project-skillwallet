/**
 * Seat & Show Inventory Routes
 * /api/v1/seats
 */
const express = require('express');
const {
  getShowSeatLayout,
  holdSeats,
  releaseSeats,
} = require('../controllers/seatController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/show/:showId', getShowSeatLayout);
router.post('/hold', protect, holdSeats);
router.post('/release', protect, releaseSeats);

module.exports = router;

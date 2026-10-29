/**
 * Booking Routes
 * /api/v1/bookings
 */
const express = require('express');
const {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getAllBookingsAdmin,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Authenticated Customer Endpoints
router.post('/', protect, createBooking);
router.get('/', protect, getUserBookings);
router.get('/admin/all', protect, authorize('ADMIN'), getAllBookingsAdmin);
router.get('/:id', protect, getBookingById);
router.post('/:id/cancel', protect, cancelBooking);

module.exports = router;

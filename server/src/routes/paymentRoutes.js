/**
 * Payment Routes
 * /api/v1/payments
 */
const express = require('express');
const {
  processPayment,
  getPaymentsByBooking,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/process', protect, processPayment);
router.get('/booking/:bookingId', protect, getPaymentsByBooking);

module.exports = router;


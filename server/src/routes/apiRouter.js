/**
 * API Central Router
 * Aggregates all feature endpoints under /api/v1 and /api
 */
const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const movieRoutes = require('./movieRoutes');
const theatreRoutes = require('./theatreRoutes');
const showRoutes = require('./showRoutes');
const seatRoutes = require('./seatRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const notificationRoutes = require('./notificationRoutes');
const adminRoutes = require('./adminRoutes');
const foodRoutes = require('./foodRoutes');
const groupPlanRoutes = require('./groupPlanRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/movies', movieRoutes);
router.use('/theatres', theatreRoutes);
router.use('/shows', showRoutes);
router.use('/seats', seatRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/food', foodRoutes);
router.use('/group-plans', groupPlanRoutes);

module.exports = router;

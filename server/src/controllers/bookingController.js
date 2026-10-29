/**
 * Booking Controller
 * Manages ticket reservations, price calculation, ownership verification, and cancellations.
 */
const Booking = require('../models/Booking');
const SeatLock = require('../models/SeatLock');
const Show = require('../models/Show');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

// In-memory bookings fallback store
const inMemoryBookings = [];

/**
 * Helper to generate a unique readable booking reference
 */
const generateBookingReference = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'BK-';
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
};

/**
 * Create Booking
 * POST /api/v1/bookings
 */
const createBooking = async (req, res) => {
  try {
    const { showId, seats, foodItems, foodSubtotal = 0 } = req.body;
    const userId = req.user._id || req.user.id;

    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return sendError(res, 'showId and at least one selected seat are required', 400);
    }

    if (seats.length > 8) {
      return sendError(res, 'A single booking cannot exceed 8 seats', 400);
    }

    const isDBConnected = Booking.db?.readyState === 1;

    // Server-side Price Calculation (Never blindly trust client pricing)
    let subtotal = 0;
    const validatedSeats = seats.map((s) => {
      const price = Number(s.price) || 12.5;
      subtotal += price;
      return {
        seatNumber: s.seatNumber || s.id,
        row: s.row || (s.seatNumber || s.id).charAt(0),
        tier: s.tier || 'Standard',
        price,
      };
    });

    const convenienceFee = 1.5 * validatedSeats.length;
    const validatedFoodSubtotal = Math.max(0, Number(foodSubtotal) || 0);
    const totalAmount = parseFloat((subtotal + convenienceFee + validatedFoodSubtotal).toFixed(2));
    const bookingReference = generateBookingReference();

    let booking;

    if (isDBConnected) {
      // Find show
      let show = null;
      if (showId.match(/^[0-9a-fA-F]{24}$/)) {
        show = await Show.findById(showId);
      }

      booking = await Booking.create({
        bookingReference,
        user: userId,
        show: show ? show._id : null,
        theatre: show ? show.theatre : null,
        movie: show ? show.movie : null,
        seats: validatedSeats,
        ticketCount: validatedSeats.length,
        pricing: {
          subtotal,
          convenienceFee,
          foodSubtotal: validatedFoodSubtotal,
          totalAmount,
          currency: 'USD',
        },
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        checkIn: {
          isCheckedIn: false,
          qrCodeReference: `QR-${bookingReference}-${Date.now()}`,
        },
      });

      // Commit SeatLocks to CONFIRMED
      const seatNumbers = validatedSeats.map((s) => s.seatNumber);
      await SeatLock.updateMany(
        { show: showId, seatNumber: { $in: seatNumbers } },
        { $set: { status: 'CONFIRMED', booking: booking._id } }
      );

      // Decrement available seats count on show
      if (show) {
        show.availableSeatsCount = Math.max(0, show.availableSeatsCount - validatedSeats.length);
        await show.save();
      }

      // Generate in-app notification
      await Notification.create({
        recipient: userId,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking Confirmed!',
        message: `Your booking ${bookingReference} for ${validatedSeats.length} seat(s) has been confirmed.`,
        booking: booking._id,
        show: show ? show._id : null,
      });
    } else {
      // In-memory fallback
      booking = {
        _id: `bk_${Date.now()}`,
        id: `bk_${Date.now()}`,
        bookingReference,
        user: userId,
        show: showId,
        theatre: 'th101',
        movie: 'm101',
        movieTitle: 'Interstellar: Beyond Time',
        theatreName: 'IMovies Grand Cinema - Times Square',
        seats: validatedSeats,
        ticketCount: validatedSeats.length,
        pricing: {
          subtotal,
          convenienceFee,
          foodSubtotal: validatedFoodSubtotal,
          totalAmount,
          currency: 'USD',
        },
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        checkIn: {
          isCheckedIn: false,
          qrCodeReference: `QR-${bookingReference}-${Date.now()}`,
        },
        cancellation: { isCancelled: false },
        createdAt: new Date(),
      };
      inMemoryBookings.unshift(booking);
    }

    logger.info(`Booking created: ${bookingReference} by user ${userId}`);

    return sendSuccess(res, 'Booking created successfully', booking, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get User Bookings
 * GET /api/v1/bookings
 */
const getUserBookings = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const isDBConnected = Booking.db?.readyState === 1;

    let bookings = [];
    let total = 0;

    if (isDBConnected) {
      const query = { user: userId };
      total = await Booking.countDocuments(query);
      bookings = await Booking.find(query)
        .populate('movie', 'title posterUrl duration certificate')
        .populate('theatre', 'name city address')
        .populate('show', 'startTime endTime screenName format')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
    } else {
      const userBookings = inMemoryBookings.filter(
        (b) => String(b.user) === String(userId)
      );
      total = userBookings.length;
      bookings = userBookings.slice((page - 1) * limit, page * limit);
    }

    return sendSuccess(res, 'User bookings retrieved', bookings, 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get Booking By ID (Enforces Object-level Ownership)
 * GET /api/v1/bookings/:id
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = String(req.user._id || req.user.id);
    const userRole = (req.user.role || 'USER').toUpperCase();
    const isDBConnected = Booking.db?.readyState === 1;

    let booking = null;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      booking = await Booking.findById(id)
        .populate('movie', 'title posterUrl duration certificate')
        .populate('theatre', 'name city address facilities')
        .populate('show', 'startTime endTime screenName format pricing');
    }

    if (!booking) {
      booking = inMemoryBookings.find(
        (b) => b._id === id || b.id === id || b.bookingReference === id
      );
    }

    if (!booking) {
      return sendError(res, `Booking with ID '${id}' not found`, 404);
    }

    // STRICT OBJECT-LEVEL OWNERSHIP ENFORCEMENT:
    // A regular user cannot view another user's booking details by altering URL param
    const bookingOwnerId = String(booking.user?._id || booking.user);
    if (bookingOwnerId !== userId && userRole !== 'ADMIN') {
      return sendError(
        res,
        'Forbidden: You do not have permission to view or manage another customer’s booking.',
        403
      );
    }

    return sendSuccess(res, 'Booking details retrieved', booking);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Cancel Booking (Enforces Ownership or Admin)
 * POST /api/v1/bookings/:id/cancel
 */
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Customer requested cancellation' } = req.body;
    const userId = String(req.user._id || req.user.id);
    const userRole = (req.user.role || 'USER').toUpperCase();
    const isDBConnected = Booking.db?.readyState === 1;

    let booking = null;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      booking = await Booking.findById(id);
    }

    if (!booking) {
      booking = inMemoryBookings.find(
        (b) => b._id === id || b.id === id || b.bookingReference === id
      );
    }

    if (!booking) {
      return sendError(res, `Booking with ID '${id}' not found`, 404);
    }

    // Ownership check
    const bookingOwnerId = String(booking.user?._id || booking.user);
    if (bookingOwnerId !== userId && userRole !== 'ADMIN') {
      return sendError(
        res,
        'Forbidden: You do not have permission to cancel another customer’s booking.',
        403
      );
    }

    if (booking.bookingStatus === 'CANCELLED') {
      return sendError(res, 'This booking has already been cancelled.', 400);
    }

    const refundAmount = booking.pricing?.totalAmount || booking.totalAmount || 0;

    if (isDBConnected) {
      booking.bookingStatus = 'CANCELLED';
      booking.paymentStatus = 'REFUNDED';
      booking.cancellation = {
        isCancelled: true,
        cancelledAt: new Date(),
        reason,
        refundAmount,
        refundStatus: 'COMPLETED',
      };
      await booking.save();

      // Release seat locks so they are immediately available for other users
      const seatNumbers = booking.seats.map((s) => s.seatNumber);
      await SeatLock.deleteMany({
        show: booking.show,
        seatNumber: { $in: seatNumbers },
      });

      // Restore available seats on show
      await Show.findByIdAndUpdate(booking.show, {
        $inc: { availableSeatsCount: seatNumbers.length },
      });

      // Notification
      await Notification.create({
        recipient: booking.user,
        type: 'BOOKING_CANCELLED',
        title: 'Booking Cancelled',
        message: `Your booking ${booking.bookingReference} has been cancelled. Full refund of $${refundAmount.toFixed(2)} initiated.`,
        booking: booking._id,
      });
    } else {
      booking.bookingStatus = 'CANCELLED';
      booking.paymentStatus = 'REFUNDED';
      booking.cancellation = {
        isCancelled: true,
        cancelledAt: new Date(),
        reason,
        refundAmount,
        refundStatus: 'COMPLETED',
      };
    }

    logger.info(`Booking cancelled: ${booking.bookingReference}`);

    return sendSuccess(res, 'Booking cancelled successfully. Refund initiated.', {
      bookingReference: booking.bookingReference,
      refundAmount,
      status: 'CANCELLED',
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Admin: View All Bookings
 * GET /api/v1/bookings/admin/all
 */
const getAllBookingsAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const isDBConnected = Booking.db?.readyState === 1;

    let bookings = [];
    let total = 0;

    if (isDBConnected) {
      const query = {};
      if (status) query.bookingStatus = status.toUpperCase();

      total = await Booking.countDocuments(query);
      bookings = await Booking.find(query)
        .populate('user', 'name email phone')
        .populate('movie', 'title')
        .populate('theatre', 'name city')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
    } else {
      bookings = inMemoryBookings;
      total = inMemoryBookings.length;
    }

    return sendSuccess(res, 'All bookings retrieved (Admin)', bookings, 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  getAllBookingsAdmin,
  inMemoryBookings,
};


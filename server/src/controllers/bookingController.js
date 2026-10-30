/**
 * Booking Controller
 * Manages ticket reservations, price calculation, seat lock transitions,
 * real-time broadcasts, QR check-ins, and cancellations.
 */
const crypto = require('crypto');
const Booking = require('../models/Booking');
const SeatLock = require('../models/SeatLock');
const Show = require('../models/Show');
const Notification = require('../models/Notification');
const { broadcastSeatBooked, broadcastSeatReleased } = require('../sockets/socketManager');
const { inMemoryLocks } = require('./seatController');
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
    const { showId, seats, foodItems, foodSubtotal = 0, paymentMethod = 'Dev Mock Card' } = req.body;
    const userId = req.user._id || req.user.id;

    if (!showId || !Array.isArray(seats) || seats.length === 0) {
      return sendError(res, 'showId and at least one selected seat are required', 400);
    }

    if (seats.length > 8) {
      return sendError(res, 'A single booking cannot exceed 8 seats', 400);
    }

    const isDBConnected = Booking.db?.readyState === 1;
    const now = new Date();

    // 1. Authoritative Server-side Price Calculation (Never blindly trust client pricing)
    let subtotal = 0;
    const validatedSeats = seats.map((s) => {
      const seatNum = String(s.seatNumber || s.id || s).trim().toUpperCase();
      const row = s.row || seatNum.charAt(0);
      const isVip = ['A', 'B'].includes(row);
      const isExecutive = ['C', 'D'].includes(row);
      const tier = s.tier || (isVip ? 'VIP' : isExecutive ? 'Executive' : 'Standard');

      // Authoritative pricing based on tier
      const tierPrice = tier === 'VIP' ? 16.5 : tier === 'Executive' ? 14.5 : 12.5;
      subtotal += tierPrice;

      return {
        seatNumber: seatNum,
        row,
        tier,
        price: tierPrice,
      };
    });

    const convenienceFee = parseFloat((1.5 * validatedSeats.length).toFixed(2));
    const validatedFoodSubtotal = Math.max(0, parseFloat((Number(foodSubtotal) || 0).toFixed(2)));
    const totalAmount = parseFloat((subtotal + convenienceFee + validatedFoodSubtotal).toFixed(2));
    const bookingReference = generateBookingReference();
    const seatNumbers = validatedSeats.map((s) => s.seatNumber);

    // 2. Validate seat holds before confirming
    if (isDBConnected) {
      const activeLocks = await SeatLock.find({
        show: showId,
        seatNumber: { $in: seatNumbers },
      });

      // Verify each seat: must either be HELD by this user with expiresAt > now, or available
      for (const seatNum of seatNumbers) {
        const lock = activeLocks.find((l) => l.seatNumber === seatNum);
        if (lock) {
          if (lock.status === 'CONFIRMED') {
            return sendError(res, `Seat ${seatNum} has already been booked by another customer.`, 409);
          }
          if (lock.status === 'HELD') {
            if (lock.expiresAt <= now) {
              return sendError(res, `Seat hold for ${seatNum} has expired. Please re-select your seats.`, 400);
            }
            if (String(lock.user) !== String(userId)) {
              return sendError(res, `Seat ${seatNum} is currently held by another customer.`, 409);
            }
          }
        }
      }
    } else {
      for (const seatNum of seatNumbers) {
        const key = `${showId}:${seatNum}`;
        const lock = inMemoryLocks.get(key);
        if (lock) {
          if (lock.status === 'CONFIRMED') {
            return sendError(res, `Seat ${seatNum} has already been booked.`, 409);
          }
          if (lock.status === 'HELD') {
            if (lock.expiresAt <= now) {
              return sendError(res, `Seat hold for ${seatNum} has expired. Please re-select your seats.`, 400);
            }
            if (String(lock.user) !== String(userId)) {
              return sendError(res, `Seat ${seatNum} is held by another user.`, 409);
            }
          }
        }
      }
    }

    // 3. Create confirmed booking record
    const qrHash = crypto.createHash('sha256').update(`${bookingReference}-${userId}-${Date.now()}`).digest('hex').substring(0, 12);
    const qrCodeReference = `IMOVIES-TICKET-${bookingReference}-${qrHash.toUpperCase()}`;

    let booking;

    if (isDBConnected) {
      let show = null;
      if (String(showId).match(/^[0-9a-fA-F]{24}$/)) {
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
          subtotal: parseFloat(subtotal.toFixed(2)),
          convenienceFee,
          foodSubtotal: validatedFoodSubtotal,
          totalAmount,
          currency: 'USD',
        },
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        cancellation: {
          isCancelled: false,
          cancellationStatus: 'NONE',
          refundStatus: 'NOT_APPLICABLE',
        },
        checkIn: {
          isCheckedIn: false,
          qrCodeReference,
        },
      });

      // Transition SeatLocks to CONFIRMED
      const lockOperations = validatedSeats.map((s) => ({
        updateOne: {
          filter: { show: showId, seatNumber: s.seatNumber },
          update: {
            $set: {
              show: showId,
              seatNumber: s.seatNumber,
              user: userId,
              status: 'CONFIRMED',
              tier: s.tier,
              price: s.price,
              booking: booking._id,
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // persist
            },
          },
          upsert: true,
        },
      }));

      await SeatLock.bulkWrite(lockOperations);

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
        message: `Your booking ${bookingReference} for ${validatedSeats.length} seat(s) has been confirmed. Enjoy your movie!`,
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
          subtotal: parseFloat(subtotal.toFixed(2)),
          convenienceFee,
          foodSubtotal: validatedFoodSubtotal,
          totalAmount,
          currency: 'USD',
        },
        bookingStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        cancellation: {
          isCancelled: false,
          cancellationStatus: 'NONE',
          refundStatus: 'NOT_APPLICABLE',
        },
        checkIn: {
          isCheckedIn: false,
          qrCodeReference,
        },
        createdAt: new Date(),
      };

      // Transition in-memory locks to CONFIRMED
      for (const s of validatedSeats) {
        const key = `${showId}:${s.seatNumber}`;
        inMemoryLocks.set(key, {
          show: showId,
          seatNumber: s.seatNumber,
          user: userId,
          status: 'CONFIRMED',
          tier: s.tier,
          price: s.price,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      }

      inMemoryBookings.unshift(booking);
    }

    // Broadcast seat_booked event to all clients in the show room
    broadcastSeatBooked(showId, {
      seatNumbers,
      bookingReference,
    });

    logger.info(`Booking confirmed: ${bookingReference} (${seatNumbers.join(', ')}) for $${totalAmount}`);

    return sendSuccess(res, 'Booking created and confirmed successfully', booking, 201);
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
        .populate('movie', 'title posterUrl duration certificate rating')
        .populate('theatre', 'name city address')
        .populate('show', 'startTime endTime screenName format pricing')
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
        .populate('movie', 'title posterUrl duration certificate rating synopsis')
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
 * Cancel Booking (Enforces Ownership or Admin, Releases Seats, and Emits Socket Event)
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

    if (booking.bookingStatus === 'CHECKED_IN' || booking.checkIn?.isCheckedIn) {
      return sendError(res, 'Cannot cancel a ticket that has already been checked in at the cinema.', 400);
    }

    const refundAmount = booking.pricing?.totalAmount || booking.totalAmount || 0;
    const seatNumbers = booking.seats.map((s) => (typeof s === 'object' ? s.seatNumber : s));

    if (isDBConnected) {
      booking.bookingStatus = 'CANCELLED';
      booking.paymentStatus = 'REFUNDED';
      booking.cancellation = {
        isCancelled: true,
        cancellationStatus: 'CANCELLED',
        cancelledAt: new Date(),
        reason,
        refundAmount,
        refundStatus: 'COMPLETED',
      };
      await booking.save();

      // Release seat locks so they are immediately available for other users
      await SeatLock.deleteMany({
        show: booking.show,
        seatNumber: { $in: seatNumbers },
      });

      // Restore available seats on show
      if (booking.show) {
        await Show.findByIdAndUpdate(booking.show, {
          $inc: { availableSeatsCount: seatNumbers.length },
        });
      }

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
        cancellationStatus: 'CANCELLED',
        cancelledAt: new Date(),
        reason,
        refundAmount,
        refundStatus: 'COMPLETED',
      };

      for (const s of seatNumbers) {
        inMemoryLocks.delete(`${booking.show}:${s}`);
      }
    }

    // Broadcast seat_released event via Socket.IO
    if (booking.show) {
      broadcastSeatReleased(String(booking.show), { seatNumbers });
    }

    logger.info(`Booking cancelled: ${booking.bookingReference} (Seats released: ${seatNumbers.join(', ')})`);

    return sendSuccess(res, 'Booking cancelled successfully. Refund initiated.', {
      bookingReference: booking.bookingReference,
      refundAmount,
      bookingStatus: 'CANCELLED',
      paymentStatus: 'REFUNDED',
      status: 'CANCELLED',
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * QR Ticket Check-In API for Theatre Staff
 * POST /api/v1/bookings/check-in
 *
 * Guarantees atomic check-in prevention:
 * Rejects double-scans / duplicate check-ins even under concurrent simultaneous scans.
 */
const checkInBooking = async (req, res) => {
  try {
    const { bookingReference, qrCodeReference } = req.body;
    const staffId = req.user._id || req.user.id;

    if (!bookingReference && !qrCodeReference) {
      return sendError(res, 'bookingReference or qrCodeReference is required for check-in', 400);
    }

    const isDBConnected = Booking.db?.readyState === 1;
    const now = new Date();

    if (isDBConnected) {
      const filter = {};
      if (bookingReference) filter.bookingReference = String(bookingReference).trim().toUpperCase();
      if (qrCodeReference) filter['checkIn.qrCodeReference'] = String(qrCodeReference).trim();

      // First find the booking to check existence and status
      const existing = await Booking.findOne(filter)
        .populate('movie', 'title duration')
        .populate('theatre', 'name')
        .populate('show', 'startTime screenName');

      if (!existing) {
        return sendError(res, 'Invalid ticket: No booking found matching the provided reference.', 404);
      }

      if (existing.bookingStatus === 'CANCELLED' || existing.cancellation?.isCancelled) {
        return sendError(res, `Check-in rejected: Booking ${existing.bookingReference} has been cancelled.`, 400);
      }

      if (existing.checkIn?.isCheckedIn) {
        return sendError(
          res,
          `Duplicate scan rejected: Ticket ${existing.bookingReference} was already checked in at ${new Date(existing.checkIn.checkedInAt).toLocaleString()}.`,
          400
        );
      }

      // Atomic conditional update: ONLY update if isCheckedIn is still false
      const updated = await Booking.findOneAndUpdate(
        {
          _id: existing._id,
          'checkIn.isCheckedIn': false,
        },
        {
          $set: {
            'checkIn.isCheckedIn': true,
            'checkIn.checkedInAt': now,
            'checkIn.checkedInBy': staffId,
            bookingStatus: 'CHECKED_IN',
          },
        },
        { new: true }
      )
        .populate('movie', 'title duration')
        .populate('theatre', 'name')
        .populate('show', 'startTime screenName');

      if (!updated) {
        return sendError(
          res,
          `Duplicate scan rejected: Ticket ${existing.bookingReference} was just checked in concurrently.`,
          400
        );
      }

      logger.info(`Ticket checked in successfully: ${updated.bookingReference} by staff ${staffId}`);

      return sendSuccess(res, 'Ticket check-in approved and recorded', {
        bookingReference: updated.bookingReference,
        movieTitle: updated.movie?.title,
        screenName: updated.show?.screenName,
        seats: updated.seats.map((s) => s.seatNumber),
        ticketCount: updated.ticketCount,
        checkedInAt: updated.checkIn.checkedInAt,
        status: updated.bookingStatus,
      });
    } else {
      // In-Memory Fallback
      const booking = inMemoryBookings.find(
        (b) =>
          (bookingReference && b.bookingReference === String(bookingReference).trim().toUpperCase()) ||
          (qrCodeReference && b.checkIn?.qrCodeReference === String(qrCodeReference).trim())
      );

      if (!booking) {
        return sendError(res, 'Invalid ticket: No booking found matching the provided reference.', 404);
      }

      if (booking.bookingStatus === 'CANCELLED') {
        return sendError(res, `Check-in rejected: Booking ${booking.bookingReference} has been cancelled.`, 400);
      }

      if (booking.checkIn?.isCheckedIn) {
        return sendError(
          res,
          `Duplicate scan rejected: Ticket ${booking.bookingReference} was already checked in at ${new Date(booking.checkIn.checkedInAt).toLocaleString()}.`,
          400
        );
      }

      booking.checkIn.isCheckedIn = true;
      booking.checkIn.checkedInAt = now;
      booking.checkIn.checkedInBy = staffId;
      booking.bookingStatus = 'CHECKED_IN';

      return sendSuccess(res, 'Ticket check-in approved and recorded', {
        bookingReference: booking.bookingReference,
        movieTitle: booking.movieTitle || 'Feature Film',
        screenName: 'Audi 1',
        seats: booking.seats.map((s) => (typeof s === 'object' ? s.seatNumber : s)),
        ticketCount: booking.ticketCount,
        checkedInAt: booking.checkIn.checkedInAt,
        status: booking.bookingStatus,
      });
    }
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
    const { status, search, page = 1, limit = 20 } = req.query;
    const isDBConnected = Booking.db?.readyState === 1;

    let bookings = [];
    let total = 0;

    if (isDBConnected) {
      const query = {};
      if (status && status !== 'ALL') query.bookingStatus = status.toUpperCase();
      if (search && search.trim()) {
        const q = search.trim();
        query.$or = [
          { bookingReference: { $regex: q, $options: 'i' } },
          { 'customerInfo.name': { $regex: q, $options: 'i' } },
          { 'customerInfo.email': { $regex: q, $options: 'i' } },
        ];
      }

      total = await Booking.countDocuments(query);
      bookings = await Booking.find(query)
        .populate('user', 'name email phone')
        .populate('movie', 'title posterUrl duration')
        .populate('theatre', 'name city')
        .populate('show', 'startTime screenName')
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit));
    } else {
      let filtered = [...inMemoryBookings];
      if (status && status !== 'ALL') {
        filtered = filtered.filter(
          (b) => b.bookingStatus === status.toUpperCase()
        );
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(
          (b) =>
            (b.bookingReference && b.bookingReference.toLowerCase().includes(q)) ||
            (b.movieTitle && b.movieTitle.toLowerCase().includes(q)) ||
            (b.customerInfo?.name && b.customerInfo.name.toLowerCase().includes(q)) ||
            (b.customerInfo?.email && b.customerInfo.email.toLowerCase().includes(q))
        );
      }
      total = filtered.length;
      bookings = filtered.slice(
        (Number(page) - 1) * Number(limit),
        Number(page) * Number(limit)
      );
    }

    return sendSuccess(res, 'All bookings retrieved (Admin)', bookings, 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)) || 1,
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
  checkInBooking,
  getAllBookingsAdmin,
  inMemoryBookings,
};

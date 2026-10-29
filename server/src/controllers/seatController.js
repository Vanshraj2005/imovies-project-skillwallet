/**
 * Seat and Show-Inventory Controller
 * Manages physical seat layouts and database-level concurrency protection for seat holds.
 */
const Seat = require('../models/Seat');
const SeatLock = require('../models/SeatLock');
const Show = require('../models/Show');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Default seat grid generator for standard auditorium
const generateDefaultSeatMatrix = () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const seats = [];

  rows.forEach((row) => {
    const isVip = ['A', 'B'].includes(row);
    const isExecutive = ['C', 'D'].includes(row);
    const tier = isVip ? 'VIP' : isExecutive ? 'Executive' : 'Standard';
    const price = isVip ? 16.5 : isExecutive ? 14.5 : 12.5;
    const count = isVip ? 10 : 12;

    for (let num = 1; num <= count; num++) {
      const seatNumber = `${row}${num}`;
      const isAccessible = (row === 'G' && (num === 1 || num === count));

      seats.push({
        seatNumber,
        row,
        number: num,
        tier,
        price,
        isAccessible,
      });
    }
  });

  return seats;
};

// In-memory lock fallback store for environments without MongoDB running
const inMemoryLocks = new Map(); // key: `${showId}:${seatNumber}` => { user, expiresAt, status }

/**
 * Get Show Seat Availability
 * GET /api/v1/seats/show/:showId
 */
const getShowSeatLayout = async (req, res) => {
  try {
    const { showId } = req.params;
    const isDBConnected = SeatLock.db?.readyState === 1;

    let activeLocks = [];
    if (isDBConnected) {
      // Find locks that have not expired or are confirmed
      activeLocks = await SeatLock.find({
        show: showId,
        $or: [{ status: 'CONFIRMED' }, { expiresAt: { $gt: new Date() } }],
      });
    } else {
      const now = new Date();
      inMemoryLocks.forEach((lock, key) => {
        if (key.startsWith(`${showId}:`)) {
          if (lock.status === 'CONFIRMED' || lock.expiresAt > now) {
            activeLocks.push(lock);
          }
        }
      });
    }

    const lockedSeatMap = new Map();
    activeLocks.forEach((lock) => {
      lockedSeatMap.set(lock.seatNumber, {
        status: lock.status === 'CONFIRMED' ? 'RESERVED' : 'HELD',
        isHeldByCurrentUser: req.user
          ? String(lock.user) === String(req.user._id || req.user.id)
          : false,
      });
    });

    const defaultMatrix = generateDefaultSeatMatrix();
    const layout = defaultMatrix.map((seat) => {
      const lockInfo = lockedSeatMap.get(seat.seatNumber);
      return {
        ...seat,
        status: lockInfo ? lockInfo.status : 'AVAILABLE',
        isHeldByMe: lockInfo ? lockInfo.isHeldByCurrentUser : false,
      };
    });

    return sendSuccess(res, 'Seat layout retrieved successfully', {
      showId,
      totalSeats: layout.length,
      availableSeats: layout.filter((s) => s.status === 'AVAILABLE').length,
      seats: layout,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Temporarily Hold Seats
 * POST /api/v1/seats/hold
 *
 * Enforces atomic database uniqueness:
 * If any seat in seatNumbers is already held/confirmed, returns 409 Conflict.
 */
const holdSeats = async (req, res) => {
  try {
    const { showId, seatNumbers } = req.body;
    const userId = req.user._id || req.user.id;

    if (!showId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return sendError(res, 'showId and an array of seatNumbers are required', 400);
    }

    if (seatNumbers.length > 8) {
      return sendError(res, 'Cannot hold more than 8 seats in a single booking session', 400);
    }

    const isDBConnected = SeatLock.db?.readyState === 1;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes hold

    if (isDBConnected) {
      // Check if any requested seat is currently locked/confirmed
      const existing = await SeatLock.find({
        show: showId,
        seatNumber: { $in: seatNumbers },
        $or: [{ status: 'CONFIRMED' }, { expiresAt: { $gt: new Date() } }],
      });

      if (existing.length > 0) {
        // Check if user already holds these exact seats
        const conflicting = existing.filter(
          (lock) => String(lock.user) !== String(userId)
        );
        if (conflicting.length > 0) {
          const conflictingSeats = conflicting.map((c) => c.seatNumber).join(', ');
          return sendError(
            res,
            `Seat(s) ${conflictingSeats} are already reserved or held by another customer.`,
            409
          );
        }
      }

      // Upsert lock records for current user
      const operations = seatNumbers.map((seatNum) => ({
        updateOne: {
          filter: { show: showId, seatNumber: seatNum },
          update: {
            $set: {
              show: showId,
              seatNumber: seatNum,
              user: userId,
              status: 'HELD',
              expiresAt,
            },
          },
          upsert: true,
        },
      }));

      await SeatLock.bulkWrite(operations);
    } else {
      // In-memory atomic check
      const now = new Date();
      for (const seatNum of seatNumbers) {
        const key = `${showId}:${seatNum}`;
        const existing = inMemoryLocks.get(key);
        if (existing && (existing.status === 'CONFIRMED' || existing.expiresAt > now)) {
          if (String(existing.user) !== String(userId)) {
            return sendError(
              res,
              `Seat ${seatNum} is already held or booked by another customer.`,
              409
            );
          }
        }
      }

      // Claim seats
      for (const seatNum of seatNumbers) {
        const key = `${showId}:${seatNum}`;
        inMemoryLocks.set(key, {
          show: showId,
          seatNumber: seatNum,
          user: userId,
          status: 'HELD',
          expiresAt,
        });
      }
    }

    return sendSuccess(res, 'Seats held successfully for 10 minutes', {
      showId,
      seatNumbers,
      expiresAt,
      holdMinutes: 10,
    });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(
        res,
        'One or more of the selected seats was just claimed by another customer. Please choose different seats.',
        409
      );
    }
    return sendError(res, error.message, 500);
  }
};

/**
 * Release Held Seats
 * POST /api/v1/seats/release
 */
const releaseSeats = async (req, res) => {
  try {
    const { showId, seatNumbers } = req.body;
    const userId = req.user._id || req.user.id;

    if (!showId) {
      return sendError(res, 'showId is required', 400);
    }

    const isDBConnected = SeatLock.db?.readyState === 1;

    if (isDBConnected) {
      const query = { show: showId, user: userId, status: 'HELD' };
      if (Array.isArray(seatNumbers) && seatNumbers.length > 0) {
        query.seatNumber = { $in: seatNumbers };
      }
      await SeatLock.deleteMany(query);
    } else {
      if (Array.isArray(seatNumbers) && seatNumbers.length > 0) {
        seatNumbers.forEach((s) => inMemoryLocks.delete(`${showId}:${s}`));
      } else {
        inMemoryLocks.forEach((lock, key) => {
          if (key.startsWith(`${showId}:`) && String(lock.user) === String(userId) && lock.status === 'HELD') {
            inMemoryLocks.delete(key);
          }
        });
      }
    }

    return sendSuccess(res, 'Held seats released');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getShowSeatLayout,
  holdSeats,
  releaseSeats,
  inMemoryLocks,
};

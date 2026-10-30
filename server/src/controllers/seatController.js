/**
 * Seat and Show-Inventory Controller
 * Manages physical seat layouts, real-time availability, Smart Seat Advisor,
 * and database-level concurrency protection for atomic all-or-nothing seat holds.
 */
const crypto = require('crypto');
const SeatLock = require('../models/SeatLock');
const Show = require('../models/Show');
const { broadcastSeatHeld, broadcastSeatReleased } = require('../sockets/socketManager');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

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
      const isAccessible = row === 'G' && (num === 1 || num === count);

      seats.push({
        seatNumber,
        row,
        number: num,
        tier,
        price,
        isAccessible,
        type: isAccessible ? 'WHEELCHAIR' : 'STANDARD',
      });
    }
  });

  return seats;
};

// In-memory lock fallback store for environments without MongoDB running
// key: `${showId}:${seatNumber}` => { show, seatNumber, user, holdId, expiresAt, status, tier, price }
const inMemoryLocks = new Map();

/**
 * Get Show Seat Availability
 * GET /api/v1/seats/show/:showId
 */
const getShowSeatLayout = async (req, res) => {
  try {
    const { showId } = req.params;
    const userId = req.user ? String(req.user._id || req.user.id) : null;
    const isDBConnected = SeatLock.db?.readyState === 1;
    const now = new Date();

    let activeLocks = [];
    if (isDBConnected) {
      // Independent expiration check: HELD locks are valid ONLY if expiresAt > now
      activeLocks = await SeatLock.find({
        show: showId,
        $or: [
          { status: 'CONFIRMED' },
          { status: 'HELD', expiresAt: { $gt: now } },
        ],
      });
    } else {
      inMemoryLocks.forEach((lock, key) => {
        if (key.startsWith(`${showId}:`)) {
          if (lock.status === 'CONFIRMED' || (lock.status === 'HELD' && lock.expiresAt > now)) {
            activeLocks.push(lock);
          }
        }
      });
    }

    const lockedSeatMap = new Map();
    activeLocks.forEach((lock) => {
      lockedSeatMap.set(lock.seatNumber, {
        status: lock.status === 'CONFIRMED' ? 'RESERVED' : 'HELD',
        isHeldByCurrentUser: userId ? String(lock.user) === userId : false,
        expiresAt: lock.expiresAt,
        holdId: lock.holdId,
      });
    });

    const defaultMatrix = generateDefaultSeatMatrix();
    const layout = defaultMatrix.map((seat) => {
      const lockInfo = lockedSeatMap.get(seat.seatNumber);
      return {
        ...seat,
        status: lockInfo ? lockInfo.status : 'AVAILABLE',
        isHeldByMe: lockInfo ? lockInfo.isHeldByCurrentUser : false,
        holdExpiresAt: lockInfo?.expiresAt || null,
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
 * Temporarily Hold Seats (Atomic All-Or-Nothing Reservation)
 * POST /api/v1/seats/hold
 *
 * Guarantees:
 * 1. All-or-nothing: If any requested seat is already held or reserved, fails completely and holds 0 seats.
 * 2. Independent expiration: Stale holds (expiresAt <= now) are expired and claimable.
 * 3. Race condition protection: MongoDB compound unique index or in-memory transaction lock.
 * 4. Generates unique holdId and broadcasts real-time seat_held event via Socket.IO.
 */
const holdSeats = async (req, res) => {
  const { showId, seatNumbers, holdMinutes = 10 } = req.body;
  const userId = req.user._id || req.user.id;

  if (!showId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
    return sendError(res, 'showId and a non-empty array of seatNumbers are required', 400);
  }

  if (seatNumbers.length > 8) {
    return sendError(res, 'Cannot hold more than 8 seats in a single booking session', 400);
  }

  const normalizedSeats = [...new Set(seatNumbers.map((s) => String(s).trim().toUpperCase()))];
  const isDBConnected = SeatLock.db?.readyState === 1;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000);
  const holdId = `hld_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const defaultMatrix = generateDefaultSeatMatrix();
  const seatLookup = new Map(defaultMatrix.map((s) => [s.seatNumber, s]));

  try {
    if (isDBConnected) {
      // Step 1: Remove any expired temporary holds for these specific seats
      await SeatLock.deleteMany({
        show: showId,
        seatNumber: { $in: normalizedSeats },
        status: 'HELD',
        expiresAt: { $lte: now },
      });

      // Step 2: Query for any active locks on the requested seats
      const existingLocks = await SeatLock.find({
        show: showId,
        seatNumber: { $in: normalizedSeats },
        $or: [
          { status: 'CONFIRMED' },
          { status: 'HELD', expiresAt: { $gt: now } },
        ],
      });

      if (existingLocks.length > 0) {
        // Check if any seat is held by a different user or already confirmed
        const conflicting = existingLocks.filter(
          (lock) => lock.status === 'CONFIRMED' || String(lock.user) !== String(userId)
        );

        if (conflicting.length > 0) {
          const conflictingSeats = conflicting.map((c) => c.seatNumber).join(', ');
          return sendError(
            res,
            `Seat(s) ${conflictingSeats} are already held or booked by another customer. All-or-nothing hold rejected.`,
            409
          );
        }
      }

      // Step 3: Insert / update locks atomically
      const operations = normalizedSeats.map((seatNum) => {
        const meta = seatLookup.get(seatNum) || {};
        return {
          updateOne: {
            filter: { show: showId, seatNumber: seatNum },
            update: {
              $set: {
                show: showId,
                seatNumber: seatNum,
                user: userId,
                holdId,
                status: 'HELD',
                tier: meta.tier || 'Standard',
                price: meta.price || 12.5,
                expiresAt,
              },
            },
            upsert: true,
          },
        };
      });

      await SeatLock.bulkWrite(operations, { ordered: true });
    } else {
      // In-Memory Fallback: Atomic validation
      for (const seatNum of normalizedSeats) {
        const key = `${showId}:${seatNum}`;
        const existing = inMemoryLocks.get(key);
        if (existing) {
          if (existing.status === 'CONFIRMED') {
            return sendError(
              res,
              `Seat ${seatNum} is already booked. All-or-nothing hold rejected.`,
              409
            );
          }
          if (existing.status === 'HELD' && existing.expiresAt > now && String(existing.user) !== String(userId)) {
            return sendError(
              res,
              `Seat ${seatNum} is already held or booked by another customer. All-or-nothing hold rejected.`,
              409
            );
          }
        }
      }

      // Claim all requested seats
      for (const seatNum of normalizedSeats) {
        const meta = seatLookup.get(seatNum) || {};
        const key = `${showId}:${seatNum}`;
        inMemoryLocks.set(key, {
          show: showId,
          seatNumber: seatNum,
          user: userId,
          holdId,
          status: 'HELD',
          tier: meta.tier || 'Standard',
          price: meta.price || 12.5,
          expiresAt,
        });
      }
    }

    // Broadcast real-time seat_held event via Socket.IO
    broadcastSeatHeld(showId, {
      seatNumbers: normalizedSeats,
      expiresAt,
      holdId,
      userId: String(userId),
    });

    return sendSuccess(res, `Seats held successfully for ${holdMinutes} minutes`, {
      showId,
      holdId,
      seatNumbers: normalizedSeats,
      expiresAt,
      holdMinutes,
    });
  } catch (error) {
    // If a duplicate key race condition happened in MongoDB
    if (error.code === 11000) {
      if (isDBConnected) {
        // Rollback any seats that were written under this holdId
        await SeatLock.deleteMany({ show: showId, holdId }).catch(() => {});
      }
      return sendError(
        res,
        'One or more of the selected seats was just claimed by another customer. All-or-nothing hold rejected.',
        409
      );
    }
    return sendError(res, error.message, 500);
  }
};

/**
 * Release Held Seats (Idempotent)
 * POST /api/v1/seats/release
 */
const releaseSeats = async (req, res) => {
  try {
    const { showId, seatNumbers, holdId } = req.body;
    const userId = String(req.user._id || req.user.id);
    const userRole = (req.user.role || 'USER').toUpperCase();

    if (!showId) {
      return sendError(res, 'showId is required', 400);
    }

    const isDBConnected = SeatLock.db?.readyState === 1;
    let releasedSeatNumbers = [];

    if (isDBConnected) {
      const query = {
        show: showId,
        status: 'HELD',
      };

      // Strict Ownership: Non-admin users can ONLY release their own active holds
      if (userRole !== 'ADMIN') {
        query.user = userId;
      }

      if (holdId) {
        query.holdId = holdId;
      }

      if (Array.isArray(seatNumbers) && seatNumbers.length > 0) {
        query.seatNumber = { $in: seatNumbers.map((s) => String(s).toUpperCase()) };
      }

      // Find which seats will be deleted for targeted event emission
      const toRelease = await SeatLock.find(query).select('seatNumber');
      releasedSeatNumbers = toRelease.map((r) => r.seatNumber);

      if (releasedSeatNumbers.length > 0) {
        await SeatLock.deleteMany({ _id: { $in: toRelease.map((r) => r._id) } });
      }
    } else {
      inMemoryLocks.forEach((lock, key) => {
        if (key.startsWith(`${showId}:`) && lock.status === 'HELD') {
          const isOwner = String(lock.user) === userId;
          const matchUser = userRole === 'ADMIN' || isOwner;
          const matchHold = holdId ? lock.holdId === holdId : true;

          if (matchUser && matchHold) {
            if (!Array.isArray(seatNumbers) || seatNumbers.includes(lock.seatNumber)) {
              releasedSeatNumbers.push(lock.seatNumber);
              inMemoryLocks.delete(key);
            }
          }
        }
      });
    }

    // Broadcast seat_released event via Socket.IO
    if (releasedSeatNumbers.length > 0) {
      broadcastSeatReleased(showId, { seatNumbers: releasedSeatNumbers });
    }

    return sendSuccess(res, 'Held seats released successfully', {
      showId,
      releasedSeats: releasedSeatNumbers,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Smart Seat Advisor
 * POST /api/v1/seats/recommend or GET /api/v1/seats/recommend
 *
 * Algorithm:
 * Evaluates available seats based on user preference:
 * - 'center': Middle rows (C, D) and center column distance
 * - 'front': Front rows (A, B)
 * - 'back': Back rows (F, G)
 * - 'aisle': End seats of rows
 * - 'accessible': Wheelchair seats (G1, G12)
 *
 * Guarantees contiguous seats for groups when available and verifies real-time availability.
 */
const recommendSeats = async (req, res) => {
  try {
    const showId = req.body?.showId || req.query?.showId;
    const groupSize = Math.max(1, Math.min(8, Number(req.body?.groupSize || req.query?.groupSize || 2)));
    const preference = String(req.body?.preference || req.query?.preference || 'center').toLowerCase();
    const targetTier = req.body?.tier || req.query?.tier;

    if (!showId) {
      return sendError(res, 'showId is required for seat recommendations', 400);
    }

    const isDBConnected = SeatLock.db?.readyState === 1;
    const now = new Date();

    // 1. Fetch currently unavailable locks
    let lockedSeats = new Set();
    if (isDBConnected) {
      const activeLocks = await SeatLock.find({
        show: showId,
        $or: [
          { status: 'CONFIRMED' },
          { status: 'HELD', expiresAt: { $gt: now } },
        ],
      }).select('seatNumber');
      lockedSeats = new Set(activeLocks.map((l) => l.seatNumber));
    } else {
      inMemoryLocks.forEach((lock, key) => {
        if (key.startsWith(`${showId}:`)) {
          if (lock.status === 'CONFIRMED' || (lock.status === 'HELD' && lock.expiresAt > now)) {
            lockedSeats.add(lock.seatNumber);
          }
        }
      });
    }

    // 2. Generate matrix and filter available seats
    const matrix = generateDefaultSeatMatrix();
    const availableSeats = matrix.filter((s) => !lockedSeats.has(s.seatNumber));

    if (availableSeats.length < groupSize) {
      return sendError(
        res,
        `Not enough seats available. Requested ${groupSize}, but only ${availableSeats.length} remain.`,
        400
      );
    }

    // Group available seats by row
    const rowMap = new Map();
    availableSeats.forEach((seat) => {
      if (!rowMap.has(seat.row)) rowMap.set(seat.row, []);
      rowMap.get(seat.row).push(seat);
    });

    // 3. Find contiguous candidates of length `groupSize` in the same row
    const candidates = [];
    rowMap.forEach((seatsInRow, rowLabel) => {
      // Sort seats by seat number ascending
      seatsInRow.sort((a, b) => a.number - b.number);

      for (let i = 0; i <= seatsInRow.length - groupSize; i++) {
        const slice = seatsInRow.slice(i, i + groupSize);
        // Verify numbers are strictly consecutive
        let isConsecutive = true;
        for (let j = 0; j < slice.length - 1; j++) {
          if (slice[j + 1].number !== slice[j].number + 1) {
            isConsecutive = false;
            break;
          }
        }

        if (isConsecutive) {
          candidates.push({
            row: rowLabel,
            seats: slice,
            isContiguous: true,
          });
        }
      }
    });

    // If no contiguous block was found, fall back to best single row or adjacent available seats
    let selectedGroup = null;

    if (candidates.length > 0) {
      // Row preference weights:
      // Row indices: A:0, B:1, C:2, D:3, E:4, F:5, G:6
      const rowOrder = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

      const scoreCandidate = (cand) => {
        let score = 100;
        const rowIndex = rowOrder.indexOf(cand.row);
        const rowLength = ['A', 'B'].includes(cand.row) ? 10 : 12;
        const rowCenter = (rowLength + 1) / 2; // e.g. 5.5 for 10, 6.5 for 12

        // Group center column
        const avgNum = cand.seats.reduce((sum, s) => sum + s.number, 0) / cand.seats.length;
        const distanceToCenter = Math.abs(avgNum - rowCenter);

        if (preference === 'accessible') {
          // Wheelchair preference: prioritize Row G and accessible seats
          if (cand.seats.some((s) => s.isAccessible)) score += 80;
          if (cand.row === 'G') score += 50;
        } else if (preference === 'front') {
          // Rows A, B
          if (['A', 'B'].includes(cand.row)) score += 60 - rowIndex * 10;
          score -= distanceToCenter * 3;
        } else if (preference === 'back') {
          // Rows F, G
          if (['F', 'G'].includes(cand.row)) score += 60;
          score += rowIndex * 5;
          score -= distanceToCenter * 3;
        } else if (preference === 'aisle') {
          // Touch edges: num === 1 or num + groupSize - 1 === rowLength
          const startsAtAisle = cand.seats[0].number === 1;
          const endsAtAisle = cand.seats[cand.seats.length - 1].number === rowLength;
          if (startsAtAisle || endsAtAisle) score += 60;
          score -= Math.abs(rowIndex - 3) * 5; // still prefer middle rows
        } else {
          // Default: 'center' (optimal acoustic and visual sweet spot)
          // Middle rows C & D are best
          const distanceToMiddleRow = Math.abs(rowIndex - 3); // D is index 3, C is index 2
          score -= distanceToMiddleRow * 15;
          score -= distanceToCenter * 5;
        }

        // Tier bonus if requested
        if (targetTier && cand.seats.every((s) => s.tier?.toLowerCase() === targetTier.toLowerCase())) {
          score += 40;
        }

        return score;
      };

      candidates.sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
      selectedGroup = candidates[0].seats;
    } else {
      // Pick top `groupSize` available seats from best rows
      selectedGroup = availableSeats.slice(0, groupSize);
    }

    const recommendedSeatNumbers = selectedGroup.map((s) => s.seatNumber);
    const subtotal = selectedGroup.reduce((acc, s) => acc + (s.price || 12.5), 0);
    const tierSummary = [...new Set(selectedGroup.map((s) => s.tier))].join(', ');

    let explanation = `Recommended ${groupSize} contiguous ${tierSummary} seat(s) [${recommendedSeatNumbers.join(', ')}] based on your '${preference}' preference.`;
    if (preference === 'center') {
      explanation = `Recommended ${groupSize} prime viewing seats [${recommendedSeatNumbers.join(', ')}] in the auditorium center sweet spot.`;
    } else if (preference === 'accessible') {
      explanation = `Recommended ${groupSize} step-free accessible seats [${recommendedSeatNumbers.join(', ')}] in Row G.`;
    }

    return sendSuccess(res, 'Smart seat recommendation generated successfully', {
      showId,
      recommendedSeats: recommendedSeatNumbers,
      seatDetails: selectedGroup,
      groupSize,
      preference,
      subtotal,
      explanation,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getShowSeatLayout,
  holdSeats,
  releaseSeats,
  recommendSeats,
  generateDefaultSeatMatrix,
  inMemoryLocks,
};

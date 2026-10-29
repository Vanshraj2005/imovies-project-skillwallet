/**
 * SeatLock Mongoose Model
 * Manages show-specific temporary holds and confirmed seat reservations.
 *
 * CONCURRENCY PROTECTION ARCHITECTURE:
 * To eliminate race conditions and double-bookings without relying on volatile socket
 * events or application-level checks, this collection enforces a database-level compound
 * UNIQUE index on { show: 1, seatNumber: 1 }.
 *
 * If two concurrent requests attempt to reserve the same seat for the same show,
 * MongoDB physically rejects the colliding write with error E11000 (duplicate key),
 * guaranteeing strict single-owner atomicity.
 *
 * An automatic TTL index purges expired temporary holds after 10 minutes (expiresAt).
 */
const mongoose = require('mongoose');

const seatLockSchema = new mongoose.Schema(
  {
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show reference is required'],
      index: true,
    },
    seatNumber: {
      type: String,
      required: [true, 'Seat identifier is required'],
      trim: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['HELD', 'CONFIRMED'],
      default: 'HELD',
      index: true,
    },
    tier: {
      type: String,
      default: 'Standard',
    },
    price: {
      type: Number,
      default: 12.5,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL UNIQUE CONSTRAINT: Prevents conflicting reservations on the same show seat
seatLockSchema.index({ show: 1, seatNumber: 1 }, { unique: true });

// Compound index for querying a user's active session holds
seatLockSchema.index({ show: 1, user: 1, status: 1 });

// TTL Index: Automatically drops abandoned holds once expiresAt has passed
seatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SeatLock = mongoose.model('SeatLock', seatLockSchema);

module.exports = SeatLock;

/**
 * Booking Mongoose Model
 * Manages customer ticket reservations, server-verified pricing, QR references, and cancellations.
 */
const mongoose = require('mongoose');

const bookingSeatSchema = new mongoose.Schema(
  {
    seatNumber: { type: String, required: true },
    row: { type: String, required: true },
    tier: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: [true, 'Booking reference identifier is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: [true, 'Show reference is required'],
      index: true,
    },
    theatre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      required: [true, 'Theatre reference is required'],
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'Movie reference is required'],
    },
    seats: {
      type: [bookingSeatSchema],
      required: [true, 'At least one seat must be booked'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0 && v.length <= 10;
        },
        message: 'Bookings must contain between 1 and 10 seats',
      },
    },
    ticketCount: {
      type: Number,
      required: true,
      min: [1, 'Ticket count must be at least 1'],
    },
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      convenienceFee: { type: Number, required: true, default: 1.5 },
      foodSubtotal: { type: Number, default: 0, min: 0 },
      totalAmount: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'USD', uppercase: true },
    },
    bookingStatus: {
      type: String,
      enum: {
        values: ['CONFIRMED', 'CANCELLED', 'PENDING', 'CHECKED_IN'],
        message: '{VALUE} is not a valid booking status',
      },
      default: 'CONFIRMED',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['COMPLETED', 'PAID', 'REFUNDED', 'PENDING', 'FAILED'],
      default: 'PAID',
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    cancellation: {
      isCancelled: { type: Boolean, default: false },
      cancellationStatus: {
        type: String,
        enum: ['NONE', 'REQUESTED', 'CANCELLED'],
        default: 'NONE',
      },
      cancelledAt: { type: Date },
      reason: { type: String, default: '' },
      refundAmount: { type: Number, default: 0 },
      refundStatus: {
        type: String,
        enum: ['NOT_APPLICABLE', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'NOT_APPLICABLE',
      },
    },
    checkIn: {
      isCheckedIn: { type: Boolean, default: false },
      checkedInAt: { type: Date },
      checkedInBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      qrCodeReference: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, bookingStatus: 1 });
bookingSchema.index({ createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

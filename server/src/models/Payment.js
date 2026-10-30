/**
 * Payment Mongoose Model
 * Manages financial transactions, audit tracking, idempotency, and reconciliation.
 * NEVER stores raw PAN numbers or CVV codes.
 */
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: false,
      default: null,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    provider: {
      type: String,
      enum: {
        values: ['dev_mock', 'stripe', 'razorpay'],
        message: '{VALUE} is not a supported payment provider',
      },
      default: 'dev_mock',
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction identifier is required'],
      unique: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
        message: '{VALUE} is not a valid payment status',
      },
      default: 'COMPLETED',
      index: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      index: true,
    },
    paymentMethodSummary: {
      type: String,
      default: 'Dev Mock Card (Ending in 4242)',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentSchema.index({ booking: 1, status: 1 });
paymentSchema.index({ user: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;

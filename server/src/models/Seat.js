/**
 * Physical Seat Mongoose Model
 * Represents the static seat layout and hardware attributes within an auditorium.
 */
const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema(
  {
    theatre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Theatre',
      required: [true, 'Theatre reference is required'],
      index: true,
    },
    screenNumber: {
      type: Number,
      required: [true, 'Screen number is required'],
    },
    seatNumber: {
      type: String,
      required: [true, 'Seat identifier is required (e.g. A1, B5)'],
      trim: true,
      uppercase: true,
    },
    row: {
      type: String,
      required: [true, 'Row label is required (e.g. A, B)'],
      trim: true,
      uppercase: true,
    },
    number: {
      type: Number,
      required: [true, 'Seat position number is required'],
    },
    tier: {
      type: String,
      enum: ['VIP', 'Executive', 'Standard'],
      default: 'Standard',
    },
    isAccessible: {
      type: Boolean,
      default: false, // Flag for wheelchair / companion accessible spaces
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: Prevents duplicate seat numbers on the same physical screen
seatSchema.index(
  { theatre: 1, screenNumber: 1, seatNumber: 1 },
  { unique: true }
);

const Seat = mongoose.model('Seat', seatSchema);

module.exports = Seat;


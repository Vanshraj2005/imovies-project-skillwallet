/**
 * Show Mongoose Model
 * Manages scheduled movie screenings, screen formats, tier pricing, and status.
 */
const mongoose = require('mongoose');

const pricingTierSchema = new mongoose.Schema(
  {
    tier: {
      type: String,
      required: [true, 'Tier name is required (e.g. VIP, Executive, Standard)'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Tier price is required'],
      min: [0, 'Price cannot be negative'],
    },
  },
  { _id: false }
);

const showSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: [true, 'Movie reference is required'],
      index: true,
    },
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
    screenName: {
      type: String,
      required: [true, 'Screen name is required'],
      trim: true,
    },
    format: {
      type: String,
      required: [true, 'Show format is required (e.g. IMAX 2D, Dolby Atmos)'],
      default: 'Standard 2D',
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Show start time is required'],
      index: true,
    },
    endTime: {
      type: Date,
      required: [true, 'Show end time is required'],
    },
    timeZone: {
      type: String,
      default: 'UTC',
    },
    pricing: {
      type: [pricingTierSchema],
      required: [true, 'At least one pricing tier is required'],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A show must have at least one pricing tier',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['SCHEDULED', 'SELLING_FAST', 'SOLD_OUT', 'CANCELLED', 'COMPLETED'],
        message: '{VALUE} is not a valid show status',
      },
      default: 'SCHEDULED',
      index: true,
    },
    totalSeats: {
      type: Number,
      default: 120,
      min: [1, 'Total seats must be at least 1'],
    },
    availableSeatsCount: {
      type: Number,
      default: 120,
      min: [0, 'Available seats count cannot be negative'],
    },
    accessibility: {
      closedCaptioning: {
        status: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'NOT_AVAILABLE', 'UNKNOWN'], default: 'VERIFIED' },
        available: { type: Boolean, default: true },
      },
      audioDescription: {
        status: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'NOT_AVAILABLE', 'UNKNOWN'], default: 'VERIFIED' },
        available: { type: Boolean, default: true },
      },
      signLanguage: {
        status: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'NOT_AVAILABLE', 'UNKNOWN'], default: 'UNKNOWN' },
        available: { type: Boolean, default: false },
      },
      wheelchairAccessible: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for high-frequency queries
showSchema.index({ movie: 1, startTime: 1, status: 1 });
showSchema.index({ theatre: 1, startTime: 1 });
showSchema.index({ startTime: 1, status: 1 });

const Show = mongoose.model('Show', showSchema);

module.exports = Show;


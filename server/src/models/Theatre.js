/**
 * Theatre Mongoose Model
 * Manages physical cinema venues, auditoriums/screens, facilities, and accessibility.
 */
const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema(
  {
    screenNumber: {
      type: Number,
      required: [true, 'Screen number is required'],
    },
    name: {
      type: String,
      required: [true, 'Screen name is required (e.g. Audi 1 - IMAX Laser)'],
      trim: true,
    },
    format: {
      type: String,
      default: 'Standard 2D',
      trim: true,
    },
    totalCapacity: {
      type: Number,
      required: true,
      default: 120,
      min: [10, 'Capacity must be at least 10 seats'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const theatreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Theatre name is required'],
      trim: true,
      maxlength: [100, 'Theatre name cannot exceed 100 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    address: {
      street: { type: String, required: true },
      postalCode: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: 'USA' },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    screens: [screenSchema],
    facilities: {
      type: [String],
      default: ['Dolby Atmos', 'Recliner Seats', 'Concessions Bar'],
    },
    accessibility: {
      wheelchairAccessible: { type: Boolean, default: true },
      wheelchairAccess: {
        status: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'NOT_AVAILABLE', 'UNKNOWN'], default: 'VERIFIED' },
        verified: { type: Boolean, default: true },
        notes: { type: String, default: 'Step-free entrance and designated companion seating' },
      },
      assistiveListening: {
        status: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'NOT_AVAILABLE', 'UNKNOWN'], default: 'VERIFIED' },
        verified: { type: Boolean, default: true },
        notes: { type: String, default: 'Inductive loop and RF headset units available' },
      },
      elevatorAccess: {
        status: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'NOT_AVAILABLE', 'UNKNOWN'], default: 'VERIFIED' },
        verified: { type: Boolean, default: true },
        notes: { type: String, default: 'Wide elevators to all screen levels' },
      },
      accessibleParking: {
        status: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'NOT_AVAILABLE', 'UNKNOWN'], default: 'VERIFIED' },
        verified: { type: Boolean, default: true },
      },
      accessibleRestrooms: {
        status: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'NOT_AVAILABLE', 'UNKNOWN'], default: 'VERIFIED' },
        verified: { type: Boolean, default: true },
      },
      signLanguageSupport: {
        status: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'NOT_AVAILABLE', 'UNKNOWN'], default: 'UNKNOWN' },
        verified: { type: Boolean, default: false },
        notes: { type: String, default: 'Select screenings support on-screen sign language interpretation' },
      },
      details: {
        type: String,
        default: 'Full step-free entrance, dedicated companion spaces, and hearing loops.',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
theatreSchema.index({ city: 1, isActive: 1 });
theatreSchema.index({ name: 1 });
theatreSchema.index({ location: '2dsphere' });

const Theatre = mongoose.model('Theatre', theatreSchema);

module.exports = Theatre;


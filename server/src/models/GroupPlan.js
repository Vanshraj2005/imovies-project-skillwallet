/**
 * GroupPlan Mongoose Model
 * Manages Group Movie Night collaboration, secure invitation tokens,
 * voting on movies/shows, member contribution tracking, and shared booking.
 */
const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['ORGANIZER', 'MEMBER'],
      default: 'MEMBER',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    contributionPaid: {
      type: Boolean,
      default: false,
    },
    assignedSeat: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const candidateMovieSchema = new mongoose.Schema(
  {
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },
    suggestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { _id: true }
);

const candidateShowSchema = new mongoose.Schema(
  {
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      required: true,
    },
    votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { _id: true }
);

const groupPlanSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Group plan title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer user reference is required'],
      index: true,
    },
    city: {
      type: String,
      required: [true, 'City/location is required'],
      trim: true,
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },
    budget: {
      type: Number,
      default: 25.0,
      min: 0,
    },
    inviteToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    inviteExpiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['PLANNING', 'VOTING', 'DECIDED', 'BOOKED', 'CANCELLED'],
      default: 'PLANNING',
      index: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    candidateMovies: [candidateMovieSchema],
    candidateShows: [candidateShowSchema],
    selectedMovie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      default: null,
    },
    selectedShow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      default: null,
    },
    selectedSeats: {
      type: [String],
      default: [],
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    perPersonCost: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

groupPlanSchema.index({ 'members.user': 1, status: 1 });
groupPlanSchema.index({ targetDate: 1 });

const GroupPlan = mongoose.model('GroupPlan', groupPlanSchema);

module.exports = GroupPlan;


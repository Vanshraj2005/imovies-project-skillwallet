/**
 * Movie Mongoose Model
 * Cinema release records with synopsis, formats, runtimes, cast, and search indexing.
 */
const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Movie title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    tagline: {
      type: String,
      trim: true,
      default: '',
    },
    synopsis: {
      type: String,
      required: [true, 'Movie synopsis is required'],
      trim: true,
    },
    genre: {
      type: [String],
      required: [true, 'At least one genre is required'],
    },
    language: {
      type: String,
      required: [true, 'Primary language is required'],
      default: 'English',
      trim: true,
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    duration: {
      type: Number,
      required: [true, 'Movie duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [10, 'Rating cannot exceed 10'],
      default: 0,
    },
    votes: {
      type: Number,
      default: 0,
      min: [0, 'Votes count cannot be negative'],
    },
    certificate: {
      type: String,
      enum: {
        values: ['G', 'PG', 'PG-13', 'R', 'NC-17', 'U', 'UA', 'A'],
        message: '{VALUE} is not a supported certificate',
      },
      default: 'PG-13',
    },
    releaseDate: {
      type: Date,
      required: [true, 'Release date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['now_showing', 'upcoming', 'inactive'],
        message: '{VALUE} is not a valid movie status',
      },
      default: 'now_showing',
    },
    posterUrl: {
      type: String,
      required: [true, 'Poster image URL is required'],
      trim: true,
    },
    backdropUrl: {
      type: String,
      default: '',
      trim: true,
    },
    trailerUrl: {
      type: String,
      default: '',
      trim: true,
    },
    formats: {
      type: [String],
      default: ['Standard 2D', 'Dolby Atmos'],
    },
    director: {
      type: String,
      trim: true,
      default: '',
    },
    cast: [
      {
        name: { type: String, required: true },
        role: { type: String, default: '' },
        avatarUrl: { type: String, default: '' },
      },
    ],
    priceStartingAt: {
      type: Number,
      default: 12.0,
      min: [0, 'Base price cannot be negative'],
    },
    accessibility: {
      closedCaptions: { type: Boolean, default: true },
      audioDescription: { type: Boolean, default: false },
      wheelchairAccessible: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
// Full-text search index on Title, Synopsis, Director, and Genre
movieSchema.index(
  {
    title: 'text',
    synopsis: 'text',
    director: 'text',
    genre: 'text',
  },
  {
    weights: {
      title: 10,
      genre: 5,
      director: 3,
      synopsis: 1,
    },
    name: 'movie_search_index',
  }
);

// Compound indexes for sorting and filtering
movieSchema.index({ status: 1, releaseDate: -1 });
movieSchema.index({ status: 1, rating: -1 });
movieSchema.index({ genre: 1 });
movieSchema.index({ language: 1 });

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;


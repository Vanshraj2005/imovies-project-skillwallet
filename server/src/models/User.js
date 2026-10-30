/**
 * User Mongoose Model
 * Manages user identities, bcrypt password hashing, JWT generation, and preferences.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Never return password hash in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['USER', 'ADMIN'],
        message: '{VALUE} is not a valid user role',
      },
      default: 'USER',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'],
      default: 'ACTIVE',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    preferences: {
      genres: {
        type: [String],
        default: ['Sci-Fi', 'Action'],
      },
      languages: {
        type: [String],
        default: ['English'],
      },
      preferredTheatres: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Theatre',
        },
      ],
      preferredLocations: {
        type: [String],
        default: ['New York'],
      },
      approximateBudget: {
        type: Number,
        default: 25,
      },
      preferredShowTimes: {
        type: [String],
        default: ['EVENING', 'NIGHT'],
      },
      preferredFormats: {
        type: [String],
        default: ['Standard 2D', 'IMAX 2D'],
      },
    },
    accessibility: {
      wheelchairSeatingPreferred: {
        type: Boolean,
        default: false,
      },
      assistiveListening: {
        type: Boolean,
        default: false,
      },
    },
    notifications: {
      emailAlerts: {
        type: Boolean,
        default: true,
      },
      smsAlerts: {
        type: Boolean,
        default: false,
      },
    },
    refreshTokens: {
      type: [
        {
          token: { type: String, required: true },
          expiresAt: { type: Date, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ role: 1 });

// Pre-save hook: Hash password with bcrypt before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: Compare input password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: Generate short-lived JWT Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
      name: this.name,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );
};

// Instance method: Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
    },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshExpiresIn,
    }
  );
};

// Clean object representation for JSON serialization
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

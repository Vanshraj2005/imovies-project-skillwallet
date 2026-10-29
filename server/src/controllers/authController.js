/**
 * Authentication Controller
 * Handles user registration, credentials verification, JWT issuance, and sessions.
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config/env');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

// In-memory fallback user store for development or testing when MongoDB is disconnected
const inMemoryUsers = [];

/**
 * Register User
 * POST /api/v1/auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 'Please provide name, email, and password', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if MongoDB is connected
    const isDBConnected = User.db?.readyState === 1;

    let user;
    if (isDBConnected) {
      // Check for existing user in MongoDB
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return sendError(res, 'An account with this email address already exists.', 409);
      }

      // Create new user (Role defaults to USER unless explicitly permitted)
      const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
      user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password,
        phone: phone || '',
        role: assignedRole,
      });
    } else {
      // In-memory fallback
      const existingUser = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (existingUser) {
        return sendError(res, 'An account with this email address already exists.', 409);
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

      user = {
        _id: `usr_${Date.now()}`,
        id: `usr_${Date.now()}`,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone || '',
        role: assignedRole,
        status: 'ACTIVE',
        preferences: { genres: ['Sci-Fi'], languages: ['English'] },
        accessibility: { wheelchairSeatingPreferred: false },
        notifications: { emailAlerts: true },
        createdAt: new Date(),
      };
      inMemoryUsers.push(user);
    }

    // Generate Tokens
    const accessToken = jwt.sign(
      {
        id: user._id || user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id || user.id,
        email: user.email,
      },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    const userResponse = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      preferences: user.preferences,
      accessibility: user.accessibility,
    };

    logger.info(`User registered successfully: ${normalizedEmail} [${user.role}]`);

    return sendSuccess(
      res,
      'Registration successful',
      {
        user: userResponse,
        accessToken,
        refreshToken,
      },
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 'An account with this email address already exists.', 409);
    }
    return sendError(res, error.message, 500);
  }
};

/**
 * Login User
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Please provide both email and password', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isDBConnected = User.db?.readyState === 1;

    let user;
    let isPasswordMatch = false;

    if (isDBConnected) {
      user = await User.findOne({ email: normalizedEmail }).select('+password');
      if (user) {
        isPasswordMatch = await user.comparePassword(password);
      }
    } else {
      user = inMemoryUsers.find((u) => u.email === normalizedEmail);
      if (user) {
        isPasswordMatch = await bcrypt.compare(password, user.password);
      }
    }

    if (!user || !isPasswordMatch) {
      return sendError(res, 'Invalid email or password', 401);
    }

    if (user.status === 'SUSPENDED') {
      return sendError(
        res,
        'Your account has been suspended. Please contact customer support.',
        403
      );
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: user._id || user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id || user.id,
        email: user.email,
      },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    const userResponse = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      preferences: user.preferences,
      accessibility: user.accessibility,
    };

    logger.info(`User logged in: ${normalizedEmail}`);

    return sendSuccess(res, 'Login successful', {
      user: userResponse,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get Authenticated User
 * GET /api/v1/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = req.user;
    return sendSuccess(res, 'Current user profile retrieved', {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      preferences: user.preferences,
      accessibility: user.accessibility,
      notifications: user.notifications,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Refresh Access Token
 * POST /api/v1/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return sendError(res, 'Refresh token is required', 400);
    }

    const decoded = jwt.verify(token, config.jwt.refreshSecret);

    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'USER',
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return sendSuccess(res, 'Token refreshed successfully', {
      accessToken: newAccessToken,
    });
  } catch (error) {
    return sendError(res, 'Invalid or expired refresh token. Please sign in again.', 401);
  }
};

/**
 * Logout User
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  return sendSuccess(res, 'Logged out successfully');
};

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  logout,
  inMemoryUsers,
};


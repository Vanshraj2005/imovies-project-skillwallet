/**
 * User Profile and Preferences Controller
 */
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');

/**
 * Get Current User Profile
 * GET /api/v1/users/profile
 */
const getProfile = async (req, res) => {
  try {
    const isDBConnected = User.db?.readyState === 1;
    let user = req.user;

    if (isDBConnected) {
      user = await User.findById(req.user._id || req.user.id);
    }

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, 'Profile retrieved', user);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update Profile & Preferences
 * PATCH /api/v1/users/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, preferences, accessibility, notifications } = req.body;
    const isDBConnected = User.db?.readyState === 1;

    let updatedUser;
    if (isDBConnected) {
      const user = await User.findById(req.user._id || req.user.id);
      if (!user) return sendError(res, 'User not found', 404);

      if (name) user.name = name.trim();
      if (phone !== undefined) user.phone = phone.trim();
      if (preferences) user.preferences = { ...user.preferences, ...preferences };
      if (accessibility) user.accessibility = { ...user.accessibility, ...accessibility };
      if (notifications) user.notifications = { ...user.notifications, ...notifications };

      updatedUser = await user.save();
    } else {
      updatedUser = {
        ...req.user,
        name: name ? name.trim() : req.user.name,
        phone: phone !== undefined ? phone.trim() : req.user.phone,
        preferences: { ...req.user.preferences, ...preferences },
        accessibility: { ...req.user.accessibility, ...accessibility },
        notifications: { ...req.user.notifications, ...notifications },
      };
    }

    return sendSuccess(res, 'Profile updated successfully', updatedUser);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Change Password
 * PUT /api/v1/users/password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Both current password and new password are required', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters long', 400);
    }

    const isDBConnected = User.db?.readyState === 1;

    if (isDBConnected) {
      const user = await User.findById(req.user._id || req.user.id).select('+password');
      if (!user) return sendError(res, 'User not found', 404);

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return sendError(res, 'Incorrect current password', 400);
      }

      user.password = newPassword;
      await user.save();
    }

    return sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Admin: List All Users
 * GET /api/v1/users
 */
const listUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const isDBConnected = User.db?.readyState === 1;

    let users = [];
    let total = 0;

    if (isDBConnected) {
      const query = {};
      if (role) query.role = role.toUpperCase();
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      total = await User.countDocuments(query);
      users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));
    } else {
      users = [
        {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          status: 'ACTIVE',
        },
      ];
      total = 1;
    }

    return sendSuccess(res, 'Users list retrieved', users, 200, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  listUsers,
};

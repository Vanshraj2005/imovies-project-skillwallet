/**
 * Authentication Routes
 * /api/v1/auth
 */
const express = require('express');
const {
  register,
  login,
  getMe,
  refreshToken,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

module.exports = router;

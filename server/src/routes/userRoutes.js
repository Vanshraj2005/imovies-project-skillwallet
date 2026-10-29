/**
 * User Profile & Administration Routes
 * /api/v1/users
 */
const express = require('express');
const {
  getProfile,
  updateProfile,
  changePassword,
  listUsers,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.get('/', protect, authorize('ADMIN'), listUsers);

module.exports = router;

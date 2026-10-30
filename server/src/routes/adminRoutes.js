/**
 * Admin Console Routes
 * /api/v1/admin
 */
const express = require('express');
const { getOverview, getAnalytics } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', protect, authorize('ADMIN'), getOverview);
router.get('/analytics', protect, authorize('ADMIN'), getAnalytics);

module.exports = router;


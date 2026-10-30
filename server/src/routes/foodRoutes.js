/**
 * Food & Concessions Pre-Ordering Routes
 * /api/v1/food
 */
const express = require('express');
const {
  getFoodItems,
  createFoodOrder,
  getUserFoodOrders,
  updateFoodOrderStatus,
  createFoodItem,
} = require('../controllers/foodController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public catalog
router.get('/items', getFoodItems);

// Authenticated customer endpoints
router.post('/orders', protect, createFoodOrder);
router.get('/orders', protect, getUserFoodOrders);

// Admin & Staff endpoints
router.patch('/orders/:id/status', protect, authorize('ADMIN'), updateFoodOrderStatus);
router.post('/items', protect, authorize('ADMIN'), createFoodItem);

module.exports = router;

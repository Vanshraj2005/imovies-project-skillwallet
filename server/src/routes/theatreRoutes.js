/**
 * Theatre Routes
 * /api/v1/theatres
 */
const express = require('express');
const {
  getTheatres,
  getTheatreById,
  createTheatre,
  updateTheatre,
  deleteTheatre,
} = require('../controllers/theatreController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public
router.get('/', getTheatres);
router.get('/:id', getTheatreById);

// Admin-only
router.post('/', protect, authorize('ADMIN'), createTheatre);
router.put('/:id', protect, authorize('ADMIN'), updateTheatre);
router.delete('/:id', protect, authorize('ADMIN'), deleteTheatre);

module.exports = router;


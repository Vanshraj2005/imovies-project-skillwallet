/**
 * API Central Router
 * Aggregates all feature endpoints under /api/v1
 */
const express = require('express');
const healthRoutes = require('./healthRoutes');
const movieRoutes = require('./movieRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/movies', movieRoutes);

module.exports = router;

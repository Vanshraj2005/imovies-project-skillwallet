/**
 * Health Routes
 * GET /api/health and /api/v1/health
 */
const express = require('express');
const { getHealth } = require('../controllers/healthController');

const router = express.Router();

router.get('/', getHealth);

module.exports = router;

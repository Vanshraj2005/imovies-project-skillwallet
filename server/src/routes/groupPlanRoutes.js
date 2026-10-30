/**
 * Group Movie Night Planning Routes
 * /api/v1/group-plans
 */
const express = require('express');
const {
  createGroupPlan,
  getGroupPlans,
  getGroupPlanById,
  getGroupByInviteToken,
  joinGroupPlan,
  voteCandidate,
  finalizeSelection,
} = require('../controllers/groupPlanController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public invitation preview
router.get('/invite/:token', getGroupByInviteToken);

// Authenticated group member endpoints
router.post('/', protect, createGroupPlan);
router.get('/', protect, getGroupPlans);
router.get('/:id', protect, getGroupPlanById);
router.post('/invite/:token/join', protect, joinGroupPlan);
router.post('/:id/vote', protect, voteCandidate);
router.post('/:id/finalize', protect, finalizeSelection);

module.exports = router;


/**
 * Group Movie Night Planning Controller
 * Manages group plans, secure invitations, member voting,
 * calculated cost sharing, and synchronized real-time booking.
 */
const crypto = require('crypto');
const GroupPlan = require('../models/GroupPlan');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

// In-memory fallback store
const inMemoryGroupPlans = [];

/**
 * Create a new Group Movie Night Plan
 * POST /api/v1/group-plans
 */
const createGroupPlan = async (req, res) => {
  try {
    const rawMovieIds = req.body.candidateMovieIds || req.body.movieIds || [];
    const { title, city, targetDate, budget = 25.0 } = req.body;
    const userId = req.user._id || req.user.id;
    const userName = req.user.name || 'Organizer';
    const userEmail = req.user.email || '';

    if (!title || !city || !targetDate) {
      return sendError(res, 'title, city, and targetDate are required', 400);
    }

    const inviteToken = `grp_${crypto.randomBytes(6).toString('hex')}`;
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const isDBConnected = GroupPlan.db?.readyState === 1;

    let candidateMovies = [];
    if (Array.isArray(rawMovieIds) && rawMovieIds.length > 0) {
      candidateMovies = rawMovieIds.map((mId) => ({
        movie: mId,
        suggestedBy: userId,
        votes: [userId],
      }));
    }

    const organizerMember = {
      user: userId,
      name: userName,
      email: userEmail,
      role: 'ORGANIZER',
      joinedAt: new Date(),
      contributionPaid: false,
    };

    let plan;
    if (isDBConnected) {
      plan = await GroupPlan.create({
        title,
        organizer: userId,
        city,
        targetDate: new Date(targetDate),
        budget: Number(budget) || 25.0,
        inviteToken,
        inviteExpiresAt,
        status: 'PLANNING',
        members: [organizerMember],
        candidateMovies,
      });

      plan = await GroupPlan.findById(plan._id)
        .populate('organizer', 'name email')
        .populate('candidateMovies.movie', 'title posterUrl duration genre rating');
    } else {
      plan = {
        _id: `gp_${Date.now()}`,
        id: `gp_${Date.now()}`,
        title,
        organizer: { _id: userId, name: userName, email: userEmail },
        city,
        targetDate: new Date(targetDate),
        budget: Number(budget) || 25.0,
        inviteToken,
        inviteExpiresAt,
        status: 'PLANNING',
        members: [organizerMember],
        candidateMovies: candidateMovies,
        createdAt: new Date(),
      };
      inMemoryGroupPlans.unshift(plan);
    }

    logger.info(`Group movie night plan created: "${title}" by ${userName} (${inviteToken})`);

    return sendSuccess(res, 'Group plan created successfully', plan, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get User's Group Movie Night Plans
 * GET /api/v1/group-plans
 */
const getGroupPlans = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isDBConnected = GroupPlan.db?.readyState === 1;

    let plans = [];
    if (isDBConnected) {
      plans = await GroupPlan.find({
        $or: [{ organizer: userId }, { 'members.user': userId }],
      })
        .populate('organizer', 'name email')
        .populate('selectedMovie', 'title posterUrl duration')
        .populate('selectedShow', 'startTime screenName format')
        .sort({ targetDate: 1 });
    } else {
      plans = inMemoryGroupPlans.filter(
        (p) =>
          String(p.organizer?._id || p.organizer) === String(userId) ||
          p.members?.some((m) => String(m.user) === String(userId))
      );
    }

    return sendSuccess(res, 'Group plans retrieved', plans);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get Group Plan by ID
 * GET /api/v1/group-plans/:id
 */
const getGroupPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = GroupPlan.db?.readyState === 1;

    let plan = null;
    if (isDBConnected && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      plan = await GroupPlan.findById(id)
        .populate('organizer', 'name email')
        .populate('candidateMovies.movie', 'title posterUrl duration genre rating certificate')
        .populate('candidateShows.show', 'startTime endTime screenName format pricing')
        .populate('selectedMovie', 'title posterUrl duration genre')
        .populate('selectedShow', 'startTime endTime screenName format pricing');
    }

    if (!plan) {
      plan = inMemoryGroupPlans.find((p) => p._id === id || p.id === id);
    }

    if (!plan) {
      return sendError(res, 'Group plan not found', 404);
    }

    return sendSuccess(res, 'Group plan retrieved', plan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get Group Plan Preview by Invite Token
 * GET /api/v1/group-plans/invite/:token
 */
const getGroupByInviteToken = async (req, res) => {
  try {
    const { token } = req.params;
    const isDBConnected = GroupPlan.db?.readyState === 1;

    let plan = null;
    if (isDBConnected) {
      plan = await GroupPlan.findOne({ inviteToken: token })
        .populate('organizer', 'name email')
        .populate('candidateMovies.movie', 'title posterUrl genre duration');
    } else {
      plan = inMemoryGroupPlans.find((p) => p.inviteToken === token);
    }

    if (!plan) {
      return sendError(res, 'Invalid or non-existent invitation link', 404);
    }

    if (new Date(plan.inviteExpiresAt) < new Date()) {
      return sendError(res, 'This movie night invitation link has expired', 410);
    }

    return sendSuccess(res, 'Invitation valid', {
      title: plan.title,
      organizerName: plan.organizer?.name || 'A Friend',
      city: plan.city,
      targetDate: plan.targetDate,
      budget: plan.budget,
      membersCount: plan.members?.length || 1,
      candidateMovies: plan.candidateMovies,
      candidates: plan.candidateMovies,
      status: plan.status,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Join Group Plan via Invite Token
 * POST /api/v1/group-plans/invite/:token/join
 */
const joinGroupPlan = async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user._id || req.user.id;
    const userName = req.user.name || 'Member';
    const userEmail = req.user.email || '';
    const isDBConnected = GroupPlan.db?.readyState === 1;

    let plan = null;
    if (isDBConnected) {
      plan = await GroupPlan.findOne({ inviteToken: token });
    } else {
      plan = inMemoryGroupPlans.find((p) => p.inviteToken === token);
    }

    if (!plan) {
      return sendError(res, 'Group plan not found', 404);
    }

    if (new Date(plan.inviteExpiresAt) < new Date()) {
      return sendError(res, 'This invitation link has expired', 410);
    }

    // Check if already a member
    const alreadyMember = plan.members.some((m) => String(m.user) === String(userId));
    if (alreadyMember) {
      return sendSuccess(res, 'Already a member of this movie night', plan);
    }

    const newMember = {
      user: userId,
      name: userName,
      email: userEmail,
      role: 'MEMBER',
      joinedAt: new Date(),
      contributionPaid: false,
    };

    plan.members.push(newMember);

    // Recalculate per-person cost if total cost exists
    if (plan.totalCost > 0) {
      plan.perPersonCost = parseFloat((plan.totalCost / plan.members.length).toFixed(2));
    }

    if (isDBConnected) {
      await plan.save();

      // Notify organizer
      await Notification.create({
        recipient: plan.organizer,
        type: 'GROUP_PLAN_INVITE',
        title: 'New Member Joined Movie Night!',
        message: `${userName} just accepted the invitation for "${plan.title}".`,
      });
    }

    logger.info(`User ${userName} joined group plan "${plan.title}"`);

    return sendSuccess(res, `Joined "${plan.title}" successfully`, plan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Vote on a Candidate Movie
 * POST /api/v1/group-plans/:id/vote
 */
const voteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const { movieId, votes } = req.body;
    const userId = req.user._id || req.user.id;
    const isDBConnected = GroupPlan.db?.readyState === 1;

    if (!movieId && (!Array.isArray(votes) || votes.length === 0)) {
      return sendError(res, 'movieId or votes array is required to cast a vote', 400);
    }

    let plan = null;
    if (isDBConnected && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      plan = await GroupPlan.findById(id);
    } else {
      plan = inMemoryGroupPlans.find((p) => p._id === id || p.id === id);
    }

    if (!plan) {
      return sendError(res, 'Group plan not found', 404);
    }

    if (Array.isArray(votes)) {
      votes.forEach(({ movieId: vMovieId }) => {
        let candidate = plan.candidateMovies.find(
          (c) => String(c.movie?._id || c.movie) === String(vMovieId) || String(c._id) === String(vMovieId)
        );
        if (candidate) {
          if (!candidate.votes.some((v) => String(v) === String(userId))) {
            candidate.votes.push(userId);
          }
        } else {
          plan.candidateMovies.push({
            movie: vMovieId,
            suggestedBy: userId,
            votes: [userId],
          });
        }
      });
    } else {
      // Single movie vote
      let candidate = plan.candidateMovies.find(
        (c) => String(c.movie?._id || c.movie) === String(movieId) || String(c._id) === String(movieId)
      );

      if (!candidate) {
        candidate = {
          movie: movieId,
          suggestedBy: userId,
          votes: [userId],
        };
        plan.candidateMovies.push(candidate);
      } else {
        const voteIdx = candidate.votes.findIndex((v) => String(v) === String(userId));
        if (voteIdx >= 0) {
          candidate.votes.splice(voteIdx, 1);
        } else {
          candidate.votes.push(userId);
        }
      }
    }

    plan.status = 'VOTING';

    if (isDBConnected) {
      await plan.save();
    }

    const plainPlan = plan.toObject ? plan.toObject() : { ...plan };
    plainPlan.candidates = plainPlan.candidateMovies.map((c) => ({
      ...c,
      totalVotes: c.votes ? c.votes.length : 0,
    }));

    return sendSuccess(res, 'Vote recorded successfully', plainPlan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Finalize Selection & Calculate Cost Sharing
 * POST /api/v1/group-plans/:id/finalize
 */
const finalizeSelection = async (req, res) => {
  try {
    const { id } = req.params;
    const targetMovieId = req.body.selectedMovieId || req.body.movieId;
    const targetShowId = req.body.selectedShowId || req.body.showId;
    const seats = req.body.seats || [];
    const totalEstimatedCost = req.body.totalEstimatedCost !== undefined ? Number(req.body.totalEstimatedCost) : undefined;
    const userId = req.user._id || req.user.id;
    const isDBConnected = GroupPlan.db?.readyState === 1;

    let plan = null;
    if (isDBConnected && String(id).match(/^[0-9a-fA-F]{24}$/)) {
      plan = await GroupPlan.findById(id);
    } else {
      plan = inMemoryGroupPlans.find((p) => p._id === id || p.id === id);
    }

    if (!plan) {
      return sendError(res, 'Group plan not found', 404);
    }

    // Only organizer can finalize
    if (String(plan.organizer?._id || plan.organizer) !== String(userId)) {
      return sendError(res, 'Only the group organizer can finalize the screening selection', 403);
    }

    if (targetMovieId) plan.selectedMovie = targetMovieId;
    if (targetShowId) plan.selectedShow = targetShowId;
    plan.selectedSeats = seats;
    plan.status = 'DECIDED';

    // Calculate per-person split cost
    const ticketCount = seats.length > 0 ? seats.length : Math.max(1, plan.members?.length || 1);
    const subtotal = ticketCount * 12.5;
    const totalCost = totalEstimatedCost !== undefined ? totalEstimatedCost : parseFloat((subtotal + ticketCount * 1.5).toFixed(2));
    const memberCount = Math.max(1, plan.members ? plan.members.length : 1);
    const perPersonCost = parseFloat((totalCost / memberCount).toFixed(2));

    plan.totalCost = totalCost;
    plan.perPersonCost = perPersonCost;

    if (isDBConnected) {
      await plan.save();

      // Notify all members
      for (const m of plan.members) {
        if (String(m.user) !== String(userId)) {
          await Notification.create({
            recipient: m.user,
            type: 'GROUP_PLAN_DECIDED',
            title: 'Movie Night Finalized!',
            message: `The screening for "${plan.title}" has been decided. Per-person share: $${perPersonCost.toFixed(2)}.`,
          });
        }
      }
    }

    logger.info(`Group plan "${plan.title}" finalized. Total: $${totalCost}, Per person: $${perPersonCost}`);

    const plainPlan = plan.toObject ? plan.toObject() : { ...plan };
    plainPlan.costSharing = {
      totalCost,
      costPerPerson: perPersonCost,
      memberCount,
    };

    return sendSuccess(res, 'Group movie night finalized and cost split calculated', plainPlan);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  createGroupPlan,
  getGroupPlans,
  getGroupPlanById,
  getGroupByInviteToken,
  joinGroupPlan,
  voteCandidate,
  finalizeSelection,
  inMemoryGroupPlans,
};

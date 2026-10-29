/**
 * Show Controller
 * Manages screening schedules, format allocations, pricing, and availability.
 */
const Show = require('../models/Show');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Initial default shows fallback
const defaultShows = [
  {
    _id: 'sh101',
    id: 'sh101',
    movie: 'm101',
    theatre: 'th101',
    screenNumber: 1,
    screenName: 'Audi 1 (IMAX Laser)',
    format: 'IMAX 2D',
    startTime: new Date(Date.now() + 3600000 * 2), // 2 hours from now
    endTime: new Date(Date.now() + 3600000 * 5),
    timeZone: 'America/New_York',
    pricing: [
      { tier: 'VIP', price: 18.0 },
      { tier: 'Executive', price: 16.5 },
      { tier: 'Standard', price: 14.0 },
    ],
    status: 'SCHEDULED',
    totalSeats: 120,
    availableSeatsCount: 112,
  },
  {
    _id: 'sh102',
    id: 'sh102',
    movie: 'm101',
    theatre: 'th101',
    screenNumber: 1,
    screenName: 'Audi 1 (IMAX Laser)',
    format: 'IMAX 2D',
    startTime: new Date(Date.now() + 3600000 * 6), // 6 hours from now
    endTime: new Date(Date.now() + 3600000 * 9),
    timeZone: 'America/New_York',
    pricing: [
      { tier: 'VIP', price: 18.0 },
      { tier: 'Executive', price: 16.5 },
      { tier: 'Standard', price: 14.0 },
    ],
    status: 'SCHEDULED',
    totalSeats: 120,
    availableSeatsCount: 98,
  },
  {
    _id: 'sh103',
    id: 'sh103',
    movie: 'm102',
    theatre: 'th102',
    screenNumber: 2,
    screenName: 'Audi 2 (Dolby Atmos)',
    format: 'Dolby Atmos',
    startTime: new Date(Date.now() + 3600000 * 3),
    endTime: new Date(Date.now() + 3600000 * 5.5),
    timeZone: 'America/New_York',
    pricing: [
      { tier: 'VIP', price: 16.0 },
      { tier: 'Standard', price: 13.5 },
    ],
    status: 'SCHEDULED',
    totalSeats: 100,
    availableSeatsCount: 92,
  },
];

let inMemoryShows = [...defaultShows];

/**
 * Get All Shows
 * GET /api/v1/shows
 */
const getShows = async (req, res) => {
  try {
    const { movieId, theatreId, date } = req.query;
    const isDBConnected = Show.db?.readyState === 1;

    let shows = [];
    if (isDBConnected) {
      const query = { status: { $ne: 'CANCELLED' } };
      if (movieId && movieId.match(/^[0-9a-fA-F]{24}$/)) query.movie = movieId;
      if (theatreId && theatreId.match(/^[0-9a-fA-F]{24}$/)) query.theatre = theatreId;
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        query.startTime = { $gte: startOfDay, $lte: endOfDay };
      }

      shows = await Show.find(query)
        .populate('movie', 'title certificate duration posterUrl rating')
        .populate('theatre', 'name city address')
        .sort({ startTime: 1 });
    } else {
      let filtered = [...inMemoryShows];
      if (movieId) {
        filtered = filtered.filter((s) => s.movie === movieId || s.movie?._id === movieId);
      }
      if (theatreId) {
        filtered = filtered.filter((s) => s.theatre === theatreId || s.theatre?._id === theatreId);
      }
      shows = filtered;
    }

    return sendSuccess(res, 'Shows retrieved successfully', shows);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get Show By ID
 * GET /api/v1/shows/:id
 */
const getShowById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Show.db?.readyState === 1;

    let show = null;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      show = await Show.findById(id)
        .populate('movie', 'title certificate duration posterUrl synopsis rating formats')
        .populate('theatre', 'name city address facilities accessibility');
    }

    if (!show) {
      show = inMemoryShows.find((s) => s._id === id || s.id === id);
    }

    if (!show) {
      return sendError(res, `Show with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Show details retrieved successfully', show);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Schedule Show (Admin Only)
 * POST /api/v1/shows
 */
const createShow = async (req, res) => {
  try {
    const {
      movie,
      theatre,
      screenNumber,
      screenName,
      format,
      startTime,
      endTime,
      pricing,
      totalSeats,
    } = req.body;

    if (!movie || !theatre || !startTime || !endTime || !pricing) {
      return sendError(
        res,
        'Movie, theatre, screenNumber, startTime, endTime, and pricing are required',
        400
      );
    }

    const isDBConnected = Show.db?.readyState === 1;
    let created;

    if (isDBConnected) {
      created = await Show.create({
        movie,
        theatre,
        screenNumber: Number(screenNumber) || 1,
        screenName: screenName || `Audi ${screenNumber || 1}`,
        format: format || 'Standard 2D',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        pricing: Array.isArray(pricing) ? pricing : [{ tier: 'Standard', price: 12.5 }],
        totalSeats: Number(totalSeats) || 120,
        availableSeatsCount: Number(totalSeats) || 120,
      });
    } else {
      created = {
        _id: `sh_${Date.now()}`,
        id: `sh_${Date.now()}`,
        movie,
        theatre,
        screenNumber: Number(screenNumber) || 1,
        screenName: screenName || `Audi ${screenNumber || 1}`,
        format: format || 'Standard 2D',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        pricing: Array.isArray(pricing) ? pricing : [{ tier: 'Standard', price: 12.5 }],
        status: 'SCHEDULED',
        totalSeats: Number(totalSeats) || 120,
        availableSeatsCount: Number(totalSeats) || 120,
      };
      inMemoryShows.push(created);
    }

    return sendSuccess(res, 'Show scheduled successfully', created, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update Show (Admin Only)
 * PUT /api/v1/shows/:id
 */
const updateShow = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Show.db?.readyState === 1;

    let updated = null;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      updated = await Show.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    if (!updated) {
      const idx = inMemoryShows.findIndex((s) => s._id === id || s.id === id);
      if (idx >= 0) {
        inMemoryShows[idx] = { ...inMemoryShows[idx], ...req.body };
        updated = inMemoryShows[idx];
      }
    }

    if (!updated) {
      return sendError(res, `Show with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Show updated successfully', updated);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Cancel Show (Admin Only)
 * DELETE /api/v1/shows/:id
 */
const deleteShow = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Show.db?.readyState === 1;

    let cancelled = false;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      const show = await Show.findByIdAndUpdate(id, { status: 'CANCELLED' });
      cancelled = !!show;
    }

    if (!cancelled) {
      const idx = inMemoryShows.findIndex((s) => s._id === id || s.id === id);
      if (idx >= 0) {
        inMemoryShows[idx].status = 'CANCELLED';
        cancelled = true;
      }
    }

    if (!cancelled) {
      return sendError(res, `Show with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Show marked as cancelled');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getShows,
  getShowById,
  createShow,
  updateShow,
  deleteShow,
  inMemoryShows,
};


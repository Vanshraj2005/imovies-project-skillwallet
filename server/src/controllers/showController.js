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
    const { movieId, theatreId, city, date, futureOnly, closedCaptions, audioDescription, wheelchairOnly } = req.query;
    const isDBConnected = Show.db?.readyState === 1;

    let shows = [];
    if (isDBConnected) {
      const query = { status: { $ne: 'CANCELLED' } };
      if (movieId && movieId.match(/^[0-9a-fA-F]{24}$/)) query.movie = movieId;
      if (theatreId && theatreId.match(/^[0-9a-fA-F]{24}$/)) query.theatre = theatreId;
      if (futureOnly === 'true') {
        query.startTime = { $gte: new Date() };
      }
      if (closedCaptions === 'true') {
        query.$or = [
          { 'accessibility.closedCaptioning.available': true },
          { 'accessibility.closedCaptioning': true },
          { 'accessibility.closedCaptioning.status': 'VERIFIED' },
        ];
      }
      if (audioDescription === 'true') {
        query.$or = [
          { 'accessibility.audioDescription.available': true },
          { 'accessibility.audioDescription': true },
          { 'accessibility.audioDescription.status': 'VERIFIED' },
        ];
      }
      if (wheelchairOnly === 'true') {
        query['accessibility.wheelchairAccessible'] = true;
      }
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        query.startTime = query.startTime
          ? { ...query.startTime, $gte: startOfDay, $lte: endOfDay }
          : { $gte: startOfDay, $lte: endOfDay };
      }

      shows = await Show.find(query)
        .populate('movie', 'title certificate duration posterUrl rating')
        .populate('theatre', 'name city address facilities accessibility')
        .sort({ startTime: 1 });

      if (city && city !== 'All') {
        const cityLower = city.toLowerCase();
        shows = shows.filter(
          (s) => s.theatre?.city && s.theatre.city.toLowerCase() === cityLower
        );
      }
    } else {
      let filtered = inMemoryShows.filter((s) => s.status !== 'CANCELLED');
      if (movieId) {
        filtered = filtered.filter(
          (s) => String(s.movie?._id || s.movie) === String(movieId)
        );
      }
      if (theatreId) {
        filtered = filtered.filter(
          (s) => String(s.theatre?._id || s.theatre) === String(theatreId)
        );
      }
      if (city && city !== 'All') {
        const cityLower = city.toLowerCase();
        filtered = filtered.filter((s) => {
          const tCity = s.theatre?.city;
          return tCity && tCity.toLowerCase() === cityLower;
        });
      }
      if (closedCaptions === 'true') {
        filtered = filtered.filter((s) => {
          if (!s.accessibility) return false;
          if (typeof s.accessibility.closedCaptioning === 'boolean') return s.accessibility.closedCaptioning;
          return s.accessibility.closedCaptioning?.available === true || s.accessibility.closedCaptioning?.status === 'VERIFIED';
        });
      }
      if (audioDescription === 'true') {
        filtered = filtered.filter((s) => {
          if (!s.accessibility) return false;
          if (typeof s.accessibility.audioDescription === 'boolean') return s.accessibility.audioDescription;
          return s.accessibility.audioDescription?.available === true || s.accessibility.audioDescription?.status === 'VERIFIED';
        });
      }
      if (date) {
        const targetDateStr = new Date(date).toISOString().split('T')[0];
        filtered = filtered.filter((s) => {
          const sDateStr = new Date(s.startTime).toISOString().split('T')[0];
          return sDateStr === targetDateStr;
        });
      }
      if (futureOnly === 'true') {
        const now = new Date();
        filtered = filtered.filter((s) => new Date(s.startTime) >= now);
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
      screenNumber = 1,
      screenName,
      format,
      startTime,
      endTime,
      pricing,
      totalSeats,
      accessibility,
    } = req.body;

    if (!movie || !theatre || !startTime || !endTime || !pricing) {
      return sendError(
        res,
        'Movie, theatre, screenNumber, startTime, endTime, and pricing are required',
        400
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return sendError(
        res,
        'Invalid show timings: Start time must precede end time.',
        400
      );
    }

    const scrNum = Number(screenNumber) || 1;
    const isDBConnected = Show.db?.readyState === 1;

    // Enforce Screen Overlap Prevention: Two shows on same screen cannot overlap
    if (isDBConnected) {
      const conflict = await Show.findOne({
        theatre,
        screenNumber: scrNum,
        status: { $ne: 'CANCELLED' },
        startTime: { $lt: end },
        endTime: { $gt: start },
      });

      if (conflict) {
        return sendError(
          res,
          `Scheduling conflict: Screen ${scrNum} already has a show scheduled between ${conflict.startTime.toISOString()} and ${conflict.endTime.toISOString()}.`,
          409
        );
      }
    } else {
      const theatreIdStr = String(theatre._id || theatre);
      const conflict = inMemoryShows.find((s) => {
        if (s.status === 'CANCELLED') return false;
        const sTheatre = String(s.theatre?._id || s.theatre);
        if (sTheatre !== theatreIdStr) return false;
        if (Number(s.screenNumber || 1) !== scrNum) return false;
        const sStart = new Date(s.startTime);
        const sEnd = new Date(s.endTime);
        return start < sEnd && end > sStart;
      });

      if (conflict) {
        return sendError(
          res,
          `Scheduling conflict: Screen ${scrNum} already has a show scheduled between ${new Date(conflict.startTime).toISOString()} and ${new Date(conflict.endTime).toISOString()}.`,
          409
        );
      }
    }

    const normAccessibility = {
      closedCaptioning: {
        status: typeof accessibility?.closedCaptioning === 'boolean'
          ? (accessibility.closedCaptioning ? 'VERIFIED' : 'NOT_AVAILABLE')
          : accessibility?.closedCaptioning?.status || 'VERIFIED',
        available: typeof accessibility?.closedCaptioning === 'boolean'
          ? accessibility.closedCaptioning
          : Boolean(accessibility?.closedCaptioning?.available !== false),
      },
      audioDescription: {
        status: typeof accessibility?.audioDescription === 'boolean'
          ? (accessibility.audioDescription ? 'VERIFIED' : 'NOT_AVAILABLE')
          : accessibility?.audioDescription?.status || 'VERIFIED',
        available: typeof accessibility?.audioDescription === 'boolean'
          ? accessibility.audioDescription
          : Boolean(accessibility?.audioDescription?.available !== false),
      },
      wheelchairAccessible: typeof accessibility?.wheelchairAccessible === 'boolean'
        ? accessibility.wheelchairAccessible
        : true,
    };

    let created;
    if (isDBConnected) {
      created = await Show.create({
        movie,
        theatre,
        screenNumber: scrNum,
        screenName: screenName || `Audi ${scrNum}`,
        format: format || 'Standard 2D',
        startTime: start,
        endTime: end,
        pricing: Array.isArray(pricing) ? pricing : [{ tier: 'Standard', price: 12.5 }],
        totalSeats: Number(totalSeats) || 120,
        availableSeatsCount: Number(totalSeats) || 120,
        accessibility: normAccessibility,
      });
    } else {
      created = {
        _id: `sh_${Date.now()}`,
        id: `sh_${Date.now()}`,
        movie,
        theatre,
        screenNumber: scrNum,
        screenName: screenName || `Audi ${scrNum}`,
        format: format || 'Standard 2D',
        startTime: start,
        endTime: end,
        pricing: Array.isArray(pricing) ? pricing : [{ tier: 'Standard', price: 12.5 }],
        status: 'SCHEDULED',
        totalSeats: Number(totalSeats) || 120,
        availableSeatsCount: Number(totalSeats) || 120,
        accessibility: normAccessibility,
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
    const { startTime, endTime, screenNumber, theatre } = req.body;
    const isDBConnected = Show.db?.readyState === 1;

    // Validate times if both are provided or being updated
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        return sendError(res, 'Invalid show timings: Start time must precede end time.', 400);
      }

      const scrNum = screenNumber !== undefined ? Number(screenNumber) : 1;

      // Check conflict excluding current show
      if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
        const query = {
          _id: { $ne: id },
          screenNumber: scrNum,
          status: { $ne: 'CANCELLED' },
          startTime: { $lt: end },
          endTime: { $gt: start },
        };
        if (theatre) query.theatre = theatre;

        const conflict = await Show.findOne(query);
        if (conflict) {
          return sendError(
            res,
            `Scheduling conflict: Screen ${scrNum} already has a show scheduled between ${conflict.startTime.toISOString()} and ${conflict.endTime.toISOString()}.`,
            409
          );
        }
      } else {
        const conflict = inMemoryShows.find((s) => {
          if (s._id === id || s.id === id) return false;
          if (s.status === 'CANCELLED') return false;
          if (theatre && String(s.theatre?._id || s.theatre) !== String(theatre)) return false;
          if (screenNumber !== undefined && Number(s.screenNumber || 1) !== scrNum) return false;
          const sStart = new Date(s.startTime);
          const sEnd = new Date(s.endTime);
          return start < sEnd && end > sStart;
        });

        if (conflict) {
          return sendError(
            res,
            `Scheduling conflict: Screen ${scrNum} already has a show scheduled between ${new Date(conflict.startTime).toISOString()} and ${new Date(conflict.endTime).toISOString()}.`,
            409
          );
        }
      }
    }

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


/**
 * Theatre Controller
 * Manages physical cinema locations, auditoriums/screens, facilities, and accessibility.
 */
const Theatre = require('../models/Theatre');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Default initial theatres fallback
const defaultTheatres = [
  {
    _id: 'th101',
    id: 'th101',
    name: 'IMovies Grand Cinema - Times Square',
    city: 'New York',
    address: { street: '1540 Broadway', postalCode: '10036', state: 'NY', country: 'USA' },
    screens: [
      { screenNumber: 1, name: 'Audi 1 (IMAX Laser)', format: 'IMAX Laser', totalCapacity: 140, isActive: true },
      { screenNumber: 2, name: 'Audi 2 (Dolby Atmos)', format: 'Dolby Atmos', totalCapacity: 110, isActive: true },
    ],
    facilities: ['IMAX Laser', 'Dolby Atmos', 'Recliner Seats', 'Gourmet Food'],
    accessibility: {
      wheelchairAccessible: true,
      assistiveListening: true,
      elevatorAccess: true,
      accessibleParking: true,
      accessibleRestrooms: true,
      details: 'Full step-free entrance, dedicated companion spaces, and hearing loops.',
    },
    isActive: true,
    phone: '+1 (212) 555-0144',
  },
  {
    _id: 'th102',
    id: 'th102',
    name: 'IMovies Downtown Royale',
    city: 'New York',
    address: { street: '84 2nd Avenue', postalCode: '10003', state: 'NY', country: 'USA' },
    screens: [
      { screenNumber: 1, name: 'Audi 1 (VIP Lounge)', format: 'VIP Recliner', totalCapacity: 80, isActive: true },
      { screenNumber: 2, name: 'Audi 2 (Dolby Atmos)', format: 'Dolby Atmos', totalCapacity: 100, isActive: true },
    ],
    facilities: ['Dolby Atmos', 'VIP Lounge', 'Wheelchair Accessible', 'Parking Available'],
    accessibility: {
      wheelchairAccessible: true,
      assistiveListening: true,
      elevatorAccess: true,
      accessibleParking: true,
      accessibleRestrooms: true,
      details: 'Ramped street access, power doors, and assistive listening headsets.',
    },
    isActive: true,
    phone: '+1 (212) 555-0188',
  },
  {
    _id: 'th103',
    id: 'th103',
    name: 'IMovies Horizon Multiplex',
    city: 'Los Angeles',
    address: { street: '6801 Hollywood Blvd', postalCode: '90028', state: 'CA', country: 'USA' },
    screens: [
      { screenNumber: 1, name: 'Audi 1 (IMAX Laser)', format: 'IMAX Laser', totalCapacity: 160, isActive: true },
      { screenNumber: 2, name: 'Audi 2 (4DX Motion)', format: '4DX', totalCapacity: 90, isActive: true },
    ],
    facilities: ['IMAX Laser', '4DX Motion', 'Dolby Atmos', 'Recliner Seats'],
    accessibility: {
      wheelchairAccessible: true,
      assistiveListening: true,
      elevatorAccess: true,
      accessibleParking: true,
      accessibleRestrooms: true,
      details: 'Companion seating next to wheelchair areas in all screens.',
    },
    isActive: true,
    phone: '+1 (323) 555-0129',
  },
];

let inMemoryTheatres = [...defaultTheatres];

/**
 * Get All Theatres
 * GET /api/v1/theatres
 */
const getTheatres = async (req, res) => {
  try {
    const { city, active } = req.query;
    const isDBConnected = Theatre.db?.readyState === 1;

    let theatres = [];
    if (isDBConnected) {
      const query = {};
      if (city && city !== 'All') query.city = new RegExp(`^${city}$`, 'i');
      if (active !== undefined) query.isActive = active === 'true';
      theatres = await Theatre.find(query).sort({ name: 1 });
    } else {
      let filtered = [...inMemoryTheatres];
      if (city && city !== 'All') {
        filtered = filtered.filter((t) => t.city.toLowerCase() === city.toLowerCase());
      }
      if (active !== undefined) {
        filtered = filtered.filter((t) => t.isActive === (active === 'true'));
      }
      theatres = filtered;
    }

    return sendSuccess(res, 'Theatres retrieved successfully', theatres);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get Theatre By ID
 * GET /api/v1/theatres/:id
 */
const getTheatreById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Theatre.db?.readyState === 1;

    let theatre = null;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      theatre = await Theatre.findById(id);
    }

    if (!theatre) {
      theatre = inMemoryTheatres.find((t) => t._id === id || t.id === id);
    }

    if (!theatre) {
      return sendError(res, `Theatre with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Theatre details retrieved successfully', theatre);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create Theatre (Admin Only)
 * POST /api/v1/theatres
 */
const createTheatre = async (req, res) => {
  try {
    const { name, city, address, phone, screens, facilities, accessibility } = req.body;

    if (!name || !city || !address) {
      return sendError(res, 'Name, city, and address are required', 400);
    }

    const isDBConnected = Theatre.db?.readyState === 1;
    let created;

    if (isDBConnected) {
      created = await Theatre.create({
        name: name.trim(),
        city: city.trim(),
        address: typeof address === 'string' ? { street: address } : address,
        phone: phone || '',
        screens: screens || [
          { screenNumber: 1, name: 'Audi 1', format: 'Standard 2D', totalCapacity: 120 },
        ],
        facilities: facilities || ['Dolby Atmos', 'Recliner Seats'],
        accessibility: accessibility || {},
      });
    } else {
      created = {
        _id: `th_${Date.now()}`,
        id: `th_${Date.now()}`,
        name: name.trim(),
        city: city.trim(),
        address: typeof address === 'string' ? { street: address } : address,
        phone: phone || '',
        screens: screens || [
          { screenNumber: 1, name: 'Audi 1', format: 'Standard 2D', totalCapacity: 120 },
        ],
        facilities: facilities || ['Dolby Atmos', 'Recliner Seats'],
        accessibility: accessibility || { wheelchairAccessible: true },
        isActive: true,
      };
      inMemoryTheatres.push(created);
    }

    return sendSuccess(res, 'Theatre created successfully', created, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update Theatre (Admin Only)
 * PUT /api/v1/theatres/:id
 */
const updateTheatre = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Theatre.db?.readyState === 1;

    let updated = null;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      updated = await Theatre.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    if (!updated) {
      const idx = inMemoryTheatres.findIndex((t) => t._id === id || t.id === id);
      if (idx >= 0) {
        inMemoryTheatres[idx] = { ...inMemoryTheatres[idx], ...req.body };
        updated = inMemoryTheatres[idx];
      }
    }

    if (!updated) {
      return sendError(res, `Theatre with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Theatre updated successfully', updated);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete Theatre (Admin Only)
 * DELETE /api/v1/theatres/:id
 */
const deleteTheatre = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Theatre.db?.readyState === 1;

    let deleted = false;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      const resDb = await Theatre.findByIdAndDelete(id);
      deleted = !!resDb;
    }

    if (!deleted) {
      const idx = inMemoryTheatres.findIndex((t) => t._id === id || t.id === id);
      if (idx >= 0) {
        inMemoryTheatres.splice(idx, 1);
        deleted = true;
      }
    }

    if (!deleted) {
      return sendError(res, `Theatre with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Theatre deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getTheatres,
  getTheatreById,
  createTheatre,
  updateTheatre,
  deleteTheatre,
  inMemoryTheatres,
};


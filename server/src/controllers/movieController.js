/**
 * Movie Controller
 * Handles movie catalog querying, full-text search, filtering, and admin CRUD.
 */
const Movie = require('../models/Movie');
const initialMovies = require('../data/initialMovies');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Working in-memory catalogue fallback
let inMemoryMovies = [...initialMovies];

/**
 * Get All Movies (Public with filters, text search, pagination)
 * GET /api/v1/movies
 */
const getMovies = async (req, res) => {
  try {
    const {
      genre,
      language,
      status,
      search,
      sort = 'rating',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const isDBConnected = Movie.db?.readyState === 1;

    let movies = [];
    let total = 0;

    if (isDBConnected) {
      const query = {};

      if (status) {
        query.status = status.toLowerCase();
      }

      if (genre && genre !== 'All') {
        query.genre = { $in: [new RegExp(`^${genre}$`, 'i')] };
      }

      if (language && language !== 'All') {
        query.language = { $regex: new RegExp(`^${language}$`, 'i') };
      }

      if (search && search.trim() !== '') {
        query.$text = { $search: search.trim() };
      }

      let sortOption = { rating: -1 };
      if (sort === 'releaseDate') sortOption = { releaseDate: -1 };
      else if (sort === 'title') sortOption = { title: 1 };

      total = await Movie.countDocuments(query);
      movies = await Movie.find(query)
        .sort(sortOption)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum);
    } else {
      // In-memory fallback
      let filtered = [...inMemoryMovies];

      if (status) {
        filtered = filtered.filter(
          (m) => m.status.toLowerCase() === status.toLowerCase()
        );
      }

      if (genre && genre !== 'All') {
        filtered = filtered.filter(
          (m) =>
            Array.isArray(m.genre) &&
            m.genre.some((g) => g.toLowerCase() === genre.toLowerCase())
        );
      }

      if (language && language !== 'All') {
        filtered = filtered.filter(
          (m) =>
            (m.language && m.language.toLowerCase() === language.toLowerCase()) ||
            (Array.isArray(m.languages) &&
              m.languages.some((l) => l.toLowerCase() === language.toLowerCase()))
        );
      }

      if (search && search.trim() !== '') {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.synopsis.toLowerCase().includes(q) ||
            (m.director && m.director.toLowerCase().includes(q))
        );
      }

      if (sort === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
      } else if (sort === 'releaseDate') {
        filtered.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
      } else if (sort === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      }

      total = filtered.length;
      movies = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);
    }

    const meta = {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      availableGenres: [
        'Action',
        'Adventure',
        'Sci-Fi',
        'Drama',
        'Thriller',
        'Romance',
        'Comedy',
        'Fantasy',
      ],
      availableLanguages: ['English', 'Spanish', 'French', 'German', 'Japanese'],
    };

    return sendSuccess(res, 'Movies retrieved successfully', movies, 200, meta);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Get Movie By ID
 * GET /api/v1/movies/:id
 */
const getMovieById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Movie.db?.readyState === 1;

    let movie = null;
    if (isDBConnected) {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        movie = await Movie.findById(id);
      }
    }

    if (!movie) {
      movie = inMemoryMovies.find((m) => m._id === id || m.id === id);
    }

    if (!movie) {
      return sendError(res, `Movie with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Movie details retrieved successfully', movie);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Create Movie (Admin Only)
 * POST /api/v1/movies
 */
const createMovie = async (req, res) => {
  try {
    const {
      title,
      synopsis,
      genre,
      duration,
      language,
      posterUrl,
      certificate,
      releaseDate,
      director,
      cast,
      formats,
    } = req.body;

    if (!title || !genre || !duration) {
      return sendError(res, 'Title, genre, and duration are required fields', 400);
    }

    const isDBConnected = Movie.db?.readyState === 1;
    let createdMovie;

    if (isDBConnected) {
      createdMovie = await Movie.create({
        title: title.trim(),
        synopsis: synopsis || 'No synopsis provided.',
        genre: Array.isArray(genre) ? genre : [genre],
        duration: Number(duration),
        language: language || 'English',
        posterUrl:
          posterUrl ||
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
        certificate: certificate || 'PG-13',
        releaseDate: releaseDate || new Date(),
        director: director || '',
        cast: cast || [],
        formats: formats || ['Standard 2D', 'Dolby Atmos'],
      });
    } else {
      createdMovie = {
        _id: `m${Date.now()}`,
        id: `m${Date.now()}`,
        title: title.trim(),
        synopsis: synopsis || 'No synopsis provided.',
        genre: Array.isArray(genre) ? genre : [genre],
        duration: Number(duration),
        rating: 8.0,
        votes: 1,
        language: language || 'English',
        languages: [language || 'English'],
        posterUrl:
          posterUrl ||
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
        certificate: certificate || 'PG-13',
        releaseDate: releaseDate || new Date().toISOString().split('T')[0],
        status: 'now_showing',
        director: director || '',
        cast: cast || [],
        formats: formats || ['Standard 2D', 'Dolby Atmos'],
        priceStartingAt: 12.0,
        theatresCount: 5,
      };
      inMemoryMovies.unshift(createdMovie);
    }

    return sendSuccess(res, 'Movie registered successfully', createdMovie, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update Movie (Admin Only)
 * PUT /api/v1/movies/:id
 */
const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Movie.db?.readyState === 1;

    let updatedMovie = null;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      updatedMovie = await Movie.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    if (!updatedMovie) {
      const index = inMemoryMovies.findIndex((m) => m._id === id || m.id === id);
      if (index >= 0) {
        inMemoryMovies[index] = { ...inMemoryMovies[index], ...req.body };
        updatedMovie = inMemoryMovies[index];
      }
    }

    if (!updatedMovie) {
      return sendError(res, `Movie with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Movie updated successfully', updatedMovie);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Delete Movie (Admin Only)
 * DELETE /api/v1/movies/:id
 */
const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Movie.db?.readyState === 1;

    let deleted = false;
    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      const result = await Movie.findByIdAndDelete(id);
      deleted = !!result;
    }

    if (!deleted) {
      const index = inMemoryMovies.findIndex((m) => m._id === id || m.id === id);
      if (index >= 0) {
        inMemoryMovies.splice(index, 1);
        deleted = true;
      }
    }

    if (!deleted) {
      return sendError(res, `Movie with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Movie deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  inMemoryMovies,
};

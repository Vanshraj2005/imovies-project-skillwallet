/**
 * Movie Controller
 * Handles movie catalog querying, filtering, search, and details retrieval.
 */
const initialMovies = require('../data/initialMovies');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// In-memory working catalogue that can be mutated/extended
let moviesStore = [...initialMovies];

const getMovies = (req, res) => {
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

    let filtered = [...moviesStore];

    // Filter by status (now_showing, coming_soon)
    if (status) {
      filtered = filtered.filter(
        (m) => m.status.toLowerCase() === status.toLowerCase()
      );
    }

    // Filter by genre
    if (genre && genre !== 'All') {
      filtered = filtered.filter(
        (m) =>
          Array.isArray(m.genre) &&
          m.genre.some((g) => g.toLowerCase() === genre.toLowerCase())
      );
    }

    // Filter by language
    if (language && language !== 'All') {
      filtered = filtered.filter(
        (m) =>
          (m.language && m.language.toLowerCase() === language.toLowerCase()) ||
          (Array.isArray(m.languages) &&
            m.languages.some((l) => l.toLowerCase() === language.toLowerCase()))
      );
    }

    // Search query on title, synopsis, or director
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.synopsis.toLowerCase().includes(q) ||
          (m.director && m.director.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sort === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'releaseDate') {
      filtered.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    } else if (sort === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Pagination
    const total = filtered.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    const meta = {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
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

    return sendSuccess(res, 'Movies retrieved successfully', paginated, 200, meta);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const getMovieById = (req, res) => {
  try {
    const { id } = req.params;
    const movie = moviesStore.find((m) => m._id === id || m.id === id);

    if (!movie) {
      return sendError(res, `Movie with ID '${id}' not found`, 404);
    }

    return sendSuccess(res, 'Movie details retrieved successfully', movie);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// Admin helper endpoint to add a movie into memory (full DB persistence in Part 2)
const createMovie = (req, res) => {
  try {
    const { title, genre, language, duration, synopsis, posterUrl, certificate, releaseDate } = req.body;

    if (!title || !genre || !duration) {
      return sendError(res, 'Title, genre, and duration are required fields', 400);
    }

    const newMovie = {
      _id: `m${Date.now()}`,
      id: `m${Date.now()}`,
      title,
      genre: Array.isArray(genre) ? genre : [genre],
      language: language || 'English',
      languages: [language || 'English'],
      duration: Number(duration),
      rating: 8.0,
      votes: 1,
      certificate: certificate || 'PG-13',
      releaseDate: releaseDate || new Date().toISOString().split('T')[0],
      status: 'now_showing',
      posterUrl: posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      synopsis: synopsis || 'No synopsis provided.',
      formats: ['Standard 2D', 'Dolby Atmos'],
      director: 'Staff Pick',
      cast: [],
      priceStartingAt: 12.00,
      theatresCount: 5,
    };

    moviesStore.unshift(newMovie);

    return sendSuccess(res, 'Movie registered successfully', newMovie, 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getMovies,
  getMovieById,
  createMovie,
};

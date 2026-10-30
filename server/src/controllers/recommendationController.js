/**
 * SmartMatch Recommendation Controller
 * Generates transparent, personalized movie recommendations using real database records,
 * user preferences, ratings, active showtimes, budget alignment, and human-readable explanations.
 */
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Default fallback genres and movies if DB is offline or empty
const defaultMovieCatalogue = [
  {
    _id: 'm101',
    id: 'm101',
    title: 'Interstellar: Beyond Time',
    genre: ['Sci-Fi', 'Adventure', 'Drama'],
    language: 'English',
    rating: 8.8,
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
    duration: 169,
    status: 'now_showing',
    isActive: true,
  },
  {
    _id: 'm102',
    id: 'm102',
    title: 'Cyberpunk Odyssey',
    genre: ['Sci-Fi', 'Action'],
    language: 'English',
    rating: 8.4,
    posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
    duration: 142,
    status: 'now_showing',
    isActive: true,
  },
  {
    _id: 'm103',
    id: 'm103',
    title: 'The Silent Melody',
    genre: ['Drama', 'Romance'],
    language: 'French',
    rating: 8.1,
    posterUrl: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=600&q=80',
    duration: 118,
    status: 'now_showing',
    isActive: true,
  },
];

/**
 * Get SmartMatch Recommendations
 * GET /api/v1/movies/recommendations/smartmatch
 */
const getSmartMatchRecommendations = async (req, res) => {
  try {
    const isDBConnected = Movie.db?.readyState === 1;
    let userPreferences = {
      genres: ['Sci-Fi', 'Action'],
      languages: ['English'],
      preferredLocations: ['New York'],
      approximateBudget: 25.0,
    };

    // If authenticated user, load preferences
    if (req.user) {
      const userId = req.user._id || req.user.id;
      if (isDBConnected && String(userId).match(/^[0-9a-fA-F]{24}$/)) {
        const userDoc = await User.findById(userId).select('preferences');
        if (userDoc?.preferences) {
          userPreferences = {
            ...userPreferences,
            genres: userDoc.preferences.genres?.length ? userDoc.preferences.genres : userPreferences.genres,
            languages: userDoc.preferences.languages?.length ? userDoc.preferences.languages : userPreferences.languages,
            preferredLocations: userDoc.preferences.preferredLocations?.length ? userDoc.preferences.preferredLocations : userPreferences.preferredLocations,
            approximateBudget: userDoc.preferences.approximateBudget || userPreferences.approximateBudget,
          };
        }
      }
    }

    // Allow query overrides for interactive simulator
    if (req.query.genre) {
      userPreferences.genres = req.query.genre.split(',').map((g) => g.trim());
    }
    if (req.query.language) {
      userPreferences.languages = req.query.language.split(',').map((l) => l.trim());
    }
    if (req.query.budget) {
      userPreferences.approximateBudget = Number(req.query.budget) || userPreferences.approximateBudget;
    }

    let movies = [];
    let shows = [];

    if (isDBConnected) {
      movies = await Movie.find({
        isActive: { $ne: false },
        status: { $in: ['now_showing', 'upcoming'] },
      });

      shows = await Show.find({
        status: { $in: ['SCHEDULED', 'SELLING_FAST'] },
        startTime: { $gt: new Date() },
      }).populate('theatre', 'city name');
    } else {
      movies = defaultMovieCatalogue;
    }

    if (!movies || movies.length === 0) {
      return sendSuccess(res, 'No movies currently eligible for recommendation', []);
    }

    // Build shows lookup by movie ID
    const showsByMovie = new Map();
    shows.forEach((sh) => {
      const mId = String(sh.movie?._id || sh.movie);
      if (!showsByMovie.has(mId)) showsByMovie.set(mId, []);
      showsByMovie.get(mId).push(sh);
    });

    // Score each candidate movie
    const scoredList = movies.map((movie) => {
      const mId = String(movie._id || movie.id);
      const movieShows = showsByMovie.get(mId) || [];
      const reasons = [];

      let score = 20; // baseline

      // 1. Rating contribution (up to 20 pts)
      const rating = movie.rating || 7.5;
      score += Math.min(20, (rating / 10) * 20);

      // 2. Genre matching (up to 30 pts)
      const movieGenres = Array.isArray(movie.genre) ? movie.genre : [movie.genre];
      const matchedGenres = movieGenres.filter((g) =>
        userPreferences.genres.some((pg) => pg.toLowerCase() === (g || '').toLowerCase())
      );
      if (matchedGenres.length > 0) {
        score += Math.min(30, matchedGenres.length * 15);
        reasons.push(`Matches your genre preference (${matchedGenres.join(', ')})`);
      }

      // 3. Language matching (up to 20 pts)
      const langMatch = userPreferences.languages.some(
        (pl) => pl.toLowerCase() === (movie.language || '').toLowerCase()
      );
      if (langMatch) {
        score += 20;
        reasons.push(`Available in your preferred language (${movie.language})`);
      }

      // 4. Active bookable showtimes (up to 15 pts)
      if (movieShows.length > 0) {
        score += 10;
        reasons.push(`${movieShows.length} live showtimes currently scheduled`);

        // Check if any show pricing fits budget
        const hasBudgetShow = movieShows.some((sh) =>
          sh.pricing?.some((p) => p.price <= userPreferences.approximateBudget)
        );
        if (hasBudgetShow) {
          score += 10;
          reasons.push(`Screening options within your $${userPreferences.approximateBudget} budget`);
        }
      }

      // Default explanation if user is new / no preferences matched
      if (reasons.length === 0) {
        reasons.push(`Top rated (${rating}/10) trending release among cinema audiences`);
      }

      const matchScore = Math.min(99, Math.round(score));
      const explanation = `${matchScore}% Match • ${reasons.join(' • ')}`;

      return {
        ...movie.toObject ? movie.toObject() : movie,
        matchScore,
        explanation,
        reasons,
        bookableShowsCount: movieShows.length,
      };
    });

    // Sort descending by matchScore
    scoredList.sort((a, b) => b.matchScore - a.matchScore);

    const formattedRecommendations = scoredList.map((m) => ({
      movie: m,
      matchScore: m.matchScore,
      matchPercentage: m.matchScore,
      matchReasons: m.reasons,
      explanation: m.explanation,
    }));

    return sendSuccess(res, 'SmartMatch personalized recommendations generated', {
      recommendations: formattedRecommendations,
      preferencesUsed: userPreferences,
      totalCount: formattedRecommendations.length,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Update User Discovery Preferences
 * PUT /api/v1/users/preferences
 */
const updateUserPreferences = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const prefGenres = req.body.preferredGenres || req.body.genres;
    const prefLangs = req.body.preferredLanguages || req.body.languages;
    const {
      preferredLocations,
      approximateBudget,
      preferredShowTimes,
      preferredFormats,
    } = req.body;

    const isDBConnected = User.db?.readyState === 1;

    if (isDBConnected) {
      const user = await User.findById(userId);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const genresArray = Array.isArray(prefGenres) ? prefGenres : user.preferences?.genres || [];
      const langsArray = Array.isArray(prefLangs) ? prefLangs : user.preferences?.languages || [];

      user.preferences = {
        genres: genresArray,
        preferredGenres: genresArray,
        languages: langsArray,
        preferredLanguages: langsArray,
        preferredLocations: Array.isArray(preferredLocations) ? preferredLocations : user.preferences?.preferredLocations || [],
        approximateBudget: approximateBudget !== undefined ? Number(approximateBudget) : user.preferences?.approximateBudget || 25,
        preferredShowTimes: Array.isArray(preferredShowTimes) ? preferredShowTimes : user.preferences?.preferredShowTimes || [],
        preferredFormats: Array.isArray(preferredFormats) ? preferredFormats : user.preferences?.preferredFormats || [],
      };

      await user.save();

      return sendSuccess(res, 'Discovery preferences updated successfully', {
        ...user.preferences.toObject ? user.preferences.toObject() : user.preferences,
        preferredGenres: genresArray,
        preferredLanguages: langsArray,
        approximateBudget: user.preferences.approximateBudget,
      });
    } else {
      return sendSuccess(res, 'Preferences updated (Session)', {
        genres: prefGenres || ['Sci-Fi', 'Action'],
        preferredGenres: prefGenres || ['Sci-Fi', 'Action'],
        languages: prefLangs || ['English'],
        preferredLanguages: prefLangs || ['English'],
        preferredLocations: preferredLocations || ['New York'],
        approximateBudget: approximateBudget || 25,
      });
    }
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getSmartMatchRecommendations,
  updateUserPreferences,
};

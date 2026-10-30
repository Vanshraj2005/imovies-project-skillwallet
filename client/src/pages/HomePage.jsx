import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovies, setFilters } from '../features/movies/moviesSlice';
import { setCurrentCity } from '../features/ui/uiSlice';
import { recommendationsApi } from '../services/api';
import MovieCard from '../components/common/MovieCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import { toast } from 'react-toastify';

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { movies, loading, error, filters } = useSelector((state) => state.movies);
  const { currentCity, availableCities } = useSelector((state) => state.ui);
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [heroSearch, setHeroSearch] = useState('');

  // SmartMatch Recommendations State
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [prefGenres, setPrefGenres] = useState(user?.preferredGenres || ['Action', 'Sci-Fi']);
  const [prefLanguages, setPrefLanguages] = useState(user?.preferredLanguages || ['English']);
  const [prefBudget, setPrefBudget] = useState(user?.approximateBudget || 20);
  const [prefShowTimes, setPrefShowTimes] = useState(user?.preferredShowTimes || ['EVENING']);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  const loadRecommendations = async () => {
    setRecLoading(true);
    try {
      const res = await recommendationsApi.getSmartMatch();
      if (res?.data?.recommendations) {
        setRecommendations(res.data.recommendations);
      }
    } catch (err) {
      console.warn('SmartMatch load error:', err);
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [isAuthenticated]);

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.info('Please sign in to save your personal preferences permanently.');
      setIsPrefModalOpen(false);
      return;
    }
    setIsSavingPrefs(true);
    try {
      await recommendationsApi.updatePreferences({
        preferredGenres: prefGenres,
        preferredLanguages: prefLanguages,
        approximateBudget: Number(prefBudget),
        preferredShowTimes: prefShowTimes,
      });
      toast.success('Preferences updated! Refreshing recommendations...');
      setIsPrefModalOpen(false);
      loadRecommendations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update preferences');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  useEffect(() => {
    dispatch(fetchMovies(filters));
  }, [dispatch, filters]);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      navigate(`/movies?search=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  const featuredMovie = movies.find((m) => m.status === 'now_showing') || movies[0];
  const genres = ['All', 'Sci-Fi', 'Action', 'Adventure', 'Drama', 'Thriller', 'Romance'];
  const languages = ['All', 'English', 'Spanish', 'French', 'Japanese'];

  return (
    <div className="home-page pb-5">
      {/* Featured Movie Hero Banner */}
      {featuredMovie && (
        <section className="bg-white border-bottom py-4 py-md-5 mb-4">
          <div className="container">
            <div className="row align-items-center g-4">
              <div className="col-lg-8 col-md-7">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                    Featured Screening
                  </span>
                  <div className="dropdown d-inline-block">
                    <button
                      className="btn btn-sm btn-light border dropdown-toggle py-0.5 px-2 text-secondary small"
                      type="button"
                      data-bs-toggle="dropdown"
                    >
                      <i className="bi bi-geo-alt-fill text-primary me-1" />
                      {currentCity}
                    </button>
                    <ul className="dropdown-menu shadow-sm border small">
                      {availableCities.map((city) => (
                        <li key={city}>
                          <button
                            type="button"
                            className={`dropdown-item ${city === currentCity ? 'active' : ''}`}
                            onClick={() => dispatch(setCurrentCity(city))}
                          >
                            {city}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <h1 className="display-6 fw-bold text-dark mb-2">{featuredMovie.title}</h1>
                <p className="text-secondary mb-3 fs-6" style={{ maxWidth: '640px' }}>
                  {featuredMovie.synopsis}
                </p>

                <div className="d-flex flex-wrap align-items-center gap-3 text-secondary small mb-4">
                  <span className="badge bg-light text-dark border">
                    {featuredMovie.certificate || 'PG-13'}
                  </span>
                  <span>
                    <i className="bi bi-clock me-1 text-primary" />
                    {featuredMovie.duration} mins
                  </span>
                  <span>
                    <i className="bi bi-star-fill me-1 text-warning" />
                    <strong>{featuredMovie.rating ? featuredMovie.rating.toFixed(1) : '8.2'}</strong> / 10
                  </span>
                  <span>
                    <i className="bi bi-translate me-1 text-primary" />
                    {featuredMovie.language || 'English'}
                  </span>
                </div>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <Link
                    to={`/shows?movieId=${featuredMovie._id || featuredMovie.id}`}
                    className="btn btn-primary fw-medium px-4 d-inline-flex align-items-center gap-2"
                  >
                    <i className="bi bi-ticket-perforated" />
                    Book Tickets Now
                  </Link>
                  <Link
                    to={`/movies/${featuredMovie._id || featuredMovie.id}`}
                    className="btn btn-outline-secondary fw-medium px-3"
                  >
                    View Details
                  </Link>
                </div>

                {/* Quick Search inside Hero */}
                <form onSubmit={handleHeroSearch} className="d-flex mt-3" style={{ maxWidth: '420px' }}>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0 text-muted">
                      <i className="bi bi-search" />
                    </span>
                    <input
                      type="text"
                      className="form-control bg-light border-start-0"
                      placeholder="Search any title, actor, or genre..."
                      value={heroSearch}
                      onChange={(e) => setHeroSearch(e.target.value)}
                    />
                    <button className="btn btn-primary" type="submit">
                      Search
                    </button>
                  </div>
                </form>
              </div>

              <div className="col-lg-4 col-md-5 d-none d-md-block text-center">
                <div
                  className="shadow-sm rounded overflow-hidden d-inline-block border"
                  style={{ maxWidth: '280px' }}
                >
                  <img
                    src={featuredMovie.posterUrl}
                    alt={featuredMovie.title}
                    className="img-fluid"
                    style={{ maxHeight: '380px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <div className="container">
        {/* Quick Discovery Strip */}
        <div className="bg-white border rounded p-3 mb-4 shadow-sm">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="fw-semibold text-secondary small me-1">Genre:</span>
              {genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`btn btn-sm ${
                    filters.genre === g ? 'btn-primary' : 'btn-light border text-secondary'
                  }`}
                  onClick={() => dispatch(setFilters({ genre: g }))}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="d-flex align-items-center gap-2">
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${
                    filters.status === 'now_showing'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => dispatch(setFilters({ status: 'now_showing' }))}
                >
                  Now Showing
                </button>
                <button
                  type="button"
                  className={`btn ${
                    filters.status === 'coming_soon'
                      ? 'btn-primary'
                      : 'btn-outline-secondary'
                  }`}
                  onClick={() => dispatch(setFilters({ status: 'coming_soon' }))}
                >
                  Coming Soon
                </button>
              </div>

              <Link to="/movies" className="btn btn-sm btn-outline-primary ms-auto">
                All Movies
                <i className="bi bi-arrow-right ms-1" />
              </Link>
            </div>
          </div>

          {/* Accessible Cinema Quick Filter Strip */}
          <div className="pt-2 border-top d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-muted fw-semibold">
                <i className="bi bi-universal-access me-1 text-primary" />
                Accessible Screenings:
              </span>
              <Link
                to="/shows?wheelchair=true"
                className="badge bg-light text-dark border text-decoration-none py-1.5 px-2 hover-shadow"
                title="Filter screenings with verified step-free wheelchair access"
              >
                ♿ Wheelchair Accessible
              </Link>
              <Link
                to="/shows?closedCaptions=true"
                className="badge bg-light text-dark border text-decoration-none py-1.5 px-2"
                title="Filter screenings with on-screen or device closed captions"
              >
                🗪 Closed Captions (CC)
              </Link>
              <Link
                to="/shows?audioDescription=true"
                className="badge bg-light text-dark border text-decoration-none py-1.5 px-2"
                title="Filter screenings with descriptive narration headsets"
              >
                🎧 Audio Description (AD)
              </Link>
              <Link
                to="/shows?assistedListening=true"
                className="badge bg-light text-dark border text-decoration-none py-1.5 px-2"
                title="Filter screenings in auditoriums with hearing induction loops"
              >
                🦻 Assistive Listening
              </Link>
            </div>
            <Link to="/theatres" className="small text-primary text-decoration-none fw-medium">
              View Verified Venues <i className="bi bi-chevron-right small" />
            </Link>
          </div>
        </div>

        {/* SmartMatch Recommendations Ribbon */}
        {recommendations.length > 0 && (
          <section className="bg-white border rounded p-4 mb-4 shadow-sm" aria-labelledby="smartmatch-heading">
            <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-primary text-white px-2 py-1">
                    <i className="bi bi-stars me-1" /> SmartMatch™
                  </span>
                  <h3 id="smartmatch-heading" className="h5 fw-bold text-dark mb-0">
                    Recommended For You
                  </h3>
                </div>
                <p className="text-muted small mb-0 mt-1">
                  Transparent recommendations tailored to your taste profile, preferred languages, and budget.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                onClick={() => setIsPrefModalOpen(true)}
              >
                <i className="bi bi-sliders" />
                Customize Taste Profile
              </button>
            </div>

            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
              {recommendations.slice(0, 3).map((rec) => {
                const mov = rec.movie;
                if (!mov) return null;
                return (
                  <div className="col" key={mov._id || mov.id}>
                    <div className="card h-100 border shadow-none bg-light">
                      <div className="row g-0 h-100">
                        <div className="col-4">
                          <img
                            src={mov.posterUrl}
                            alt={mov.title}
                            className="img-fluid rounded-start h-100"
                            style={{ objectFit: 'cover', minHeight: '130px' }}
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
                            }}
                          />
                        </div>
                        <div className="col-8">
                          <div className="card-body p-2 d-flex flex-column h-100">
                            <div className="d-flex align-items-center justify-content-between mb-1">
                              <span className="badge bg-success text-white fw-bold" style={{ fontSize: '0.75rem' }}>
                                {rec.matchPercentage}% Match
                              </span>
                              <span className="small text-muted">
                                <i className="bi bi-star-fill text-warning me-1" />
                                {mov.rating ? mov.rating.toFixed(1) : '8.0'}
                              </span>
                            </div>
                            <h4 className="card-title h6 fw-bold text-dark mb-1 text-truncate">
                              {mov.title}
                            </h4>
                            <div className="small text-muted mb-2" style={{ fontSize: '0.75rem' }}>
                              {mov.genre?.join(', ')} • {mov.duration}m
                            </div>
                            
                            {/* Transparent Match Reasons */}
                            <div className="mb-2 flex-grow-1">
                              {rec.matchReasons?.slice(0, 2).map((reason, idx) => (
                                <div key={idx} className="small text-secondary d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                  <i className="bi bi-check2 text-success" />
                                  <span className="text-truncate">{reason}</span>
                                </div>
                              ))}
                            </div>

                            <Link
                              to={`/shows?movieId=${mov._id || mov.id}`}
                              className="btn btn-xs btn-primary w-100 py-1 small fw-medium text-center"
                            >
                              Showtimes & Tickets
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Error Alert if API error */}
        {error && (
          <ErrorAlert
            message={error}
            onRetry={() => dispatch(fetchMovies(filters))}
            className="mb-4"
          />
        )}

        {/* Movies Grid */}
        <div className="mb-5">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h2 className="h4 fw-bold text-dark mb-0">
                {filters.status === 'coming_soon' ? 'Upcoming Releases' : 'Now in Cinemas'}
              </h2>
              <p className="text-muted small mb-0">
                Showing top screenings at partner theatres in {currentCity}
              </p>
            </div>
            <span className="badge bg-light text-secondary border">
              {movies.length} Movies Available
            </span>
          </div>

          {loading ? (
            <LoadingSkeleton count={4} />
          ) : movies.length > 0 ? (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
              {movies.map((movie) => (
                <div className="col" key={movie._id || movie.id}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No movies found"
              description={`There are currently no movies matching the '${filters.genre}' genre filter in ${currentCity}.`}
              actionLabel="Reset Filters"
              onAction={() => dispatch(setFilters({ genre: 'All' }))}
            />
          )}
        </div>

        {/* User Account Quick Banner (if logged in) */}
        {isAuthenticated && (
          <div className="bg-primary-subtle border border-primary-subtle rounded p-3 mb-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-person-check-fill text-primary fs-4" />
              <div>
                <span className="fw-bold text-dark small d-block">
                  Signed in as {user?.name || 'Customer'}
                </span>
                <span className="text-secondary small">
                  Quick access to your active e-tickets and reservation records
                </span>
              </div>
            </div>
            <Link to="/dashboard" className="btn btn-sm btn-primary">
              View Dashboard & Tickets
            </Link>
          </div>
        )}

        {/* How Booking Works Strip */}
        <section className="bg-white border rounded p-4 mb-5 shadow-sm">
          <h3 className="h5 fw-bold text-dark text-center mb-4">
            How Simple Movie Ticketing Works
          </h3>
          <div className="row g-4 text-center">
            <div className="col-md-4">
              <div className="p-3">
                <div
                  className="bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: '48px', height: '48px' }}
                >
                  <i className="bi bi-film fs-5" />
                </div>
                <h4 className="h6 fw-bold text-dark mb-1">1. Pick Your Movie & Time</h4>
                <p className="text-muted small mb-0">
                  Explore verified schedules across top local cinemas with accurate runtimes and formats.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-3">
                <div
                  className="bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: '48px', height: '48px' }}
                >
                  <i className="bi bi-grid-3x3-gap-fill fs-5" />
                </div>
                <h4 className="h6 fw-bold text-dark mb-1">2. Select Your Preferred Seats</h4>
                <p className="text-muted small mb-0">
                  Interactive real-time seating map with VIP recliners, executive rows, and accessible spaces.
                </p>
              </div>
            </div>

            <div className="col-md-4">
              <div className="p-3">
                <div
                  className="bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                  style={{ width: '48px', height: '48px' }}
                >
                  <i className="bi bi-qr-code-scan fs-5" />
                </div>
                <h4 className="h6 fw-bold text-dark mb-1">3. Instant QR E-Ticket</h4>
                <p className="text-muted small mb-0">
                  Receive instant digital confirmation with verified QR gate pass for fast contactless entry.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Taste Profile Modal */}
      <Modal
        isOpen={isPrefModalOpen}
        onClose={() => setIsPrefModalOpen(false)}
        title="Customize SmartMatch™ Preferences"
        size="md"
      >
        <form onSubmit={handleSavePreferences}>
          <div className="mb-3">
            <label className="form-label fw-semibold small text-dark">
              Preferred Genres
            </label>
            <div className="d-flex flex-wrap gap-1">
              {['Sci-Fi', 'Action', 'Adventure', 'Drama', 'Thriller', 'Romance', 'Comedy', 'Animation'].map((g) => {
                const isSelected = prefGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    className={`btn btn-xs rounded-pill ${
                      isSelected ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                    onClick={() => {
                      setPrefGenres((prev) =>
                        isSelected ? prev.filter((item) => item !== g) : [...prev, g]
                      );
                    }}
                  >
                    {isSelected && <i className="bi bi-check me-1" />}
                    {g}
                  </button>
                );
              })}
            </div>
            <div className="form-text small">Select one or more genres you enjoy watching.</div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold small text-dark">
              Preferred Languages
            </label>
            <div className="d-flex flex-wrap gap-1">
              {['English', 'Spanish', 'French', 'Japanese', 'Hindi', 'Korean'].map((lang) => {
                const isSelected = prefLanguages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    className={`btn btn-xs rounded-pill ${
                      isSelected ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                    onClick={() => {
                      setPrefLanguages((prev) =>
                        isSelected ? prev.filter((item) => item !== lang) : [...prev, lang]
                      );
                    }}
                  >
                    {isSelected && <i className="bi bi-check me-1" />}
                    {lang}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-6">
              <label className="form-label fw-semibold small text-dark">
                Ticket Budget ($)
              </label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">$</span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  className="form-control"
                  value={prefBudget}
                  onChange={(e) => setPrefBudget(e.target.value)}
                />
              </div>
            </div>

            <div className="col-6">
              <label className="form-label fw-semibold small text-dark">
                Preferred Show Times
              </label>
              <select
                className="form-select form-select-sm"
                value={prefShowTimes[0] || 'EVENING'}
                onChange={(e) => setPrefShowTimes([e.target.value])}
              >
                <option value="MORNING">Morning (Before 12 PM)</option>
                <option value="AFTERNOON">Afternoon (12 PM - 5 PM)</option>
                <option value="EVENING">Evening (5 PM - 9 PM)</option>
                <option value="NIGHT">Late Night (After 9 PM)</option>
              </select>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 pt-2 border-top">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setIsPrefModalOpen(false)}
              disabled={isSavingPrefs}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSavingPrefs}
            >
              Save Taste Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HomePage;

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovies, setFilters } from '../features/movies/moviesSlice';
import MovieCard from '../components/common/MovieCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';

const HomePage = () => {
  const dispatch = useDispatch();
  const { movies, loading, error, filters } = useSelector((state) => state.movies);
  const { currentCity } = useSelector((state) => state.ui);

  useEffect(() => {
    dispatch(fetchMovies(filters));
  }, [dispatch, filters]);

  const featuredMovie = movies.find((m) => m.status === 'now_showing') || movies[0];
  const nowShowingMovies = movies.filter((m) => m.status === 'now_showing');
  const comingSoonMovies = movies.filter((m) => m.status === 'coming_soon');

  const genres = ['All', 'Sci-Fi', 'Action', 'Drama', 'Thriller', 'Romance'];

  return (
    <div className="home-page pb-5">
      {/* Featured Movie Hero Banner */}
      {featuredMovie && (
        <section className="bg-white border-bottom py-4 py-md-5 mb-4">
          <div className="container">
            <div className="row align-items-center g-4">
              <div className="col-lg-8 col-md-7">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                    Featured Screening
                  </span>
                  <span className="text-muted small">in {currentCity}</span>
                </div>
                <h1 className="display-6 fw-bold text-dark mb-2">{featuredMovie.title}</h1>
                <p className="text-secondary mb-3 fs-6" style={{ maxWidth: '620px' }}>
                  {featuredMovie.synopsis}
                </p>
                <div className="d-flex flex-wrap align-items-center gap-3 text-secondary small mb-4">
                  <span className="badge bg-light text-dark border">
                    {featuredMovie.certificate}
                  </span>
                  <span>
                    <i className="bi bi-clock me-1 text-primary" />
                    {featuredMovie.duration} mins
                  </span>
                  <span>
                    <i className="bi bi-star-fill me-1 text-warning" />
                    <strong>{featuredMovie.rating}</strong> / 10
                  </span>
                  <span>
                    <i className="bi bi-translate me-1 text-primary" />
                    {featuredMovie.language}
                  </span>
                </div>
                <div className="d-flex flex-wrap gap-2">
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
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <div className="container">
        {/* Quick Filter Strip */}
        <div className="bg-white border rounded p-3 mb-4 shadow-sm">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
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
        </div>

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
    </div>
  );
};

export default HomePage;

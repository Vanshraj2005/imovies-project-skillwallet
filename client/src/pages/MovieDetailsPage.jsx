import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovieById } from '../features/movies/moviesSlice';
import { DetailBannerSkeleton } from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';

const MovieDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { selectedMovie, loading, error } = useSelector((state) => state.movies);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchMovieById(id));
    }
  }, [id, dispatch]);

  if (loading) {
    return (
      <div className="container py-4">
        <DetailBannerSkeleton />
      </div>
    );
  }

  if (error || !selectedMovie) {
    return (
      <div className="container py-4">
        <ErrorAlert
          message={error || 'Movie details could not be found.'}
          onRetry={() => dispatch(fetchMovieById(id))}
        />
        <div className="text-center mt-3">
          <Link to="/movies" className="btn btn-outline-primary">
            Return to Movie Catalogue
          </Link>
        </div>
      </div>
    );
  }

  const {
    _id,
    title,
    tagline,
    synopsis,
    genre = [],
    duration,
    rating,
    votes,
    certificate,
    releaseDate,
    posterUrl,
    language,
    formats = [],
    director,
    cast = [],
    status,
    theatresCount,
  } = selectedMovie;

  const isNowShowing = status === 'now_showing';

  return (
    <div className="movie-details-page pb-5">
      {/* Hero Overview */}
      <section className="bg-white border-bottom py-4 py-md-5 mb-4">
        <div className="container">
          <nav aria-label="breadcrumb" className="mb-3">
            <ol className="breadcrumb small">
              <li className="breadcrumb-item">
                <Link to="/" className="text-decoration-none text-muted">
                  Home
                </Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/movies" className="text-decoration-none text-muted">
                  Movies
                </Link>
              </li>
              <li className="breadcrumb-item active text-dark" aria-current="page">
                {title}
              </li>
            </ol>
          </nav>

          <div className="row g-4 align-items-start">
            {/* Poster Card */}
            <div className="col-md-4 col-lg-3 text-center">
              <div className="im-card p-2 shadow-sm d-inline-block">
                <img
                  src={posterUrl}
                  alt={title}
                  className="img-fluid rounded"
                  style={{ maxHeight: '420px', width: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            {/* Details Content */}
            <div className="col-md-8 col-lg-9">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <Badge variant={isNowShowing ? 'success' : 'warning'}>
                  {isNowShowing ? 'Now Showing' : 'Coming Soon'}
                </Badge>
                <span className="badge bg-light text-dark border">{certificate}</span>
                <span className="text-muted small">
                  <i className="bi bi-calendar3 me-1" />
                  Release: {releaseDate}
                </span>
              </div>

              <h1 className="h2 fw-bold text-dark mb-1">{title}</h1>
              {tagline && <p className="fst-italic text-secondary mb-3">{tagline}</p>}

              {/* Quick Meta Row */}
              <div className="d-flex flex-wrap align-items-center gap-3 p-3 bg-light border rounded mb-3">
                <div className="d-flex align-items-center gap-1">
                  <i className="bi bi-star-fill text-warning fs-5" />
                  <span className="fs-5 fw-bold text-dark">{rating}</span>
                  <span className="text-muted small">/10 ({votes?.toLocaleString()} votes)</span>
                </div>
                <span className="text-muted">•</span>
                <div className="text-secondary small">
                  <i className="bi bi-clock me-1 text-primary" />
                  <strong>{duration} mins</strong>
                </div>
                <span className="text-muted">•</span>
                <div className="text-secondary small">
                  <i className="bi bi-translate me-1 text-primary" />
                  <strong>{language}</strong>
                </div>
                <span className="text-muted">•</span>
                <div className="text-secondary small">
                  <i className="bi bi-building me-1 text-primary" />
                  In <strong>{theatresCount || 8}</strong> Cinemas
                </div>
              </div>

              {/* Genres & Formats */}
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-1 mb-2">
                  <span className="fw-semibold text-secondary small me-2 align-self-center">
                    Genres:
                  </span>
                  {genre.map((g, idx) => (
                    <Badge key={idx} variant="primary">
                      {g}
                    </Badge>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-1">
                  <span className="fw-semibold text-secondary small me-2 align-self-center">
                    Available In:
                  </span>
                  {formats.map((f, idx) => (
                    <Badge key={idx} variant="neutral">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex flex-wrap gap-2 pt-2">
                <Link
                  to={`/shows?movieId=${_id || selectedMovie.id}`}
                  className="btn btn-primary fw-medium px-4 d-inline-flex align-items-center gap-2"
                >
                  <i className="bi bi-ticket-perforated" />
                  Select Showtimes & Seats
                </Link>
                <button
                  type="button"
                  className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
                  onClick={() => setIsTrailerOpen(true)}
                >
                  <i className="bi bi-play-circle" />
                  Watch Trailer
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Synopsis & Cast */}
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-8">
            {/* Synopsis */}
            <div className="bg-white border rounded p-4 shadow-sm mb-4">
              <h2 className="h5 fw-bold text-dark mb-3">About the Movie</h2>
              <p className="text-secondary mb-0 leading-relaxed">{synopsis}</p>

              {director && (
                <div className="mt-3 pt-3 border-top small text-muted">
                  <strong>Director:</strong> <span className="text-dark">{director}</span>
                </div>
              )}
            </div>

            {/* Cast */}
            <div className="bg-white border rounded p-4 shadow-sm">
              <h2 className="h5 fw-bold text-dark mb-3">Top Cast & Characters</h2>
              {cast && cast.length > 0 ? (
                <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-3">
                  {cast.map((actor, idx) => (
                    <div className="col" key={idx}>
                      <div className="p-2 border rounded bg-light text-center h-100">
                        <div
                          className="rounded-circle bg-white border text-primary mx-auto mb-2 d-flex align-items-center justify-content-center fw-bold"
                          style={{ width: '44px', height: '44px' }}
                        >
                          {actor.name.charAt(0)}
                        </div>
                        <div className="fw-semibold text-dark small text-truncate" title={actor.name}>
                          {actor.name}
                        </div>
                        <div
                          className="text-muted small text-truncate"
                          style={{ fontSize: '0.75rem' }}
                          title={actor.role}
                        >
                          as {actor.role}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted small mb-0">Cast information not listed yet.</p>
              )}
            </div>
          </div>

          {/* Sidebar Booking Callout */}
          <div className="col-lg-4">
            <div className="bg-white border rounded p-4 shadow-sm sticky-top" style={{ top: '80px' }}>
              <h3 className="h6 fw-bold text-dark mb-2">Ready to Watch?</h3>
              <p className="text-muted small mb-3">
                Select your preferred theatre, time, and reserve your seats with contactless e-ticketing.
              </p>
              <Link
                to={`/shows?movieId=${_id || selectedMovie.id}`}
                className="btn btn-primary w-100 fw-medium py-2 d-flex align-items-center justify-content-center gap-2 mb-2"
              >
                <i className="bi bi-calendar-check" />
                View Cinema Showtimes
              </Link>
              <div className="text-center text-muted small" style={{ fontSize: '0.75rem' }}>
                <i className="bi bi-shield-check me-1 text-success" />
                Instant confirmation & flexible cancellation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      <Modal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        title={`${title} - Official Trailer Preview`}
        size="lg"
      >
        <div className="ratio ratio-16x9 bg-dark rounded">
          <div className="d-flex flex-column align-items-center justify-content-center text-white p-4">
            <i className="bi bi-play-circle-fill fs-1 text-primary mb-2" />
            <h6 className="fw-bold text-white mb-1">Official Studio Trailer</h6>
            <p className="text-secondary small text-center mb-0" style={{ maxWidth: '420px' }}>
              Full HD trailer preview for {title}. Streamed via secure studio media delivery.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MovieDetailsPage;

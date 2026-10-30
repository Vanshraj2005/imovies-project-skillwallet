import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovieById } from '../features/movies/moviesSlice';
import { selectShow } from '../features/booking/bookingSlice';
import { showsApi } from '../services/api';
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

  // Date selection for showtimes (next 7 days)
  const dateOptions = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().split('T')[0],
      dayLabel: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });

  const [selectedDate, setSelectedDate] = useState(dateOptions[0].iso);
  const [shows, setShows] = useState([]);
  const [showsLoading, setShowsLoading] = useState(false);
  const [showsError, setShowsError] = useState(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchMovieById(id));
    }
  }, [id, dispatch]);

  // Fetch live showtimes for this movie and selected date
  useEffect(() => {
    if (id) {
      setShowsLoading(true);
      setShowsError(null);
      showsApi
        .getAll({ movieId: id, date: selectedDate })
        .then((res) => setShows(res.data || []))
        .catch((err) => setShowsError(err.message || 'Unable to load showtimes.'))
        .finally(() => setShowsLoading(false));
    }
  }, [id, selectedDate]);

  const handleSelectShow = (show) => {
    const theatreObj = show.theatre || {
      id: 'th-default',
      name: 'Cinema Venue',
      screen: show.screenName || 'Audi 1',
    };

    dispatch(
      selectShow({
        movie: selectedMovie,
        theatre: {
          id: theatreObj._id || theatreObj.id,
          name: theatreObj.name,
          screen: show.screenName || `Audi ${show.screenNumber || 1}`,
        },
        date: selectedDate,
        showtime: {
          id: show._id || show.id,
          time: new Date(show.startTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          format: show.format,
          pricing: show.pricing,
        },
      })
    );

    navigate(`/seats?movieId=${id}&showId=${show._id || show.id}`);
  };

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
    accessibility = {},
  } = selectedMovie;

  const isNowShowing = status === 'now_showing';

  // Group shows by Theatre
  const theatreMap = new Map();
  shows.forEach((show) => {
    const tId = show.theatre?._id || show.theatre?.id || show.theatre || 'th-unknown';
    if (!theatreMap.has(tId)) {
      theatreMap.set(tId, {
        theatre: show.theatre,
        shows: [],
      });
    }
    theatreMap.get(tId).shows.push(show);
  });
  const groupedTheatres = Array.from(theatreMap.values());

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
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
                  }}
                />
              </div>
            </div>

            {/* Details Content */}
            <div className="col-md-8 col-lg-9">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <Badge variant={isNowShowing ? 'success' : 'warning'}>
                  {isNowShowing ? 'Now Showing' : 'Coming Soon'}
                </Badge>
                <span className="badge bg-light text-dark border">{certificate || 'PG-13'}</span>
                {releaseDate && (
                  <span className="text-muted small">
                    <i className="bi bi-calendar3 me-1" />
                    Release: {new Date(releaseDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              <h1 className="h2 fw-bold text-dark mb-1">{title}</h1>
              {tagline && <p className="fst-italic text-secondary mb-3">{tagline}</p>}

              {/* Quick Meta Row */}
              <div className="d-flex flex-wrap align-items-center gap-3 p-3 bg-light border rounded mb-3">
                <div className="d-flex align-items-center gap-1">
                  <i className="bi bi-star-fill text-warning fs-5" />
                  <span className="fs-5 fw-bold text-dark">{rating ? rating.toFixed(1) : '8.2'}</span>
                  <span className="text-muted small">/10 ({votes ? votes.toLocaleString() : '1,420'} votes)</span>
                </div>
                <span className="text-muted">•</span>
                <div className="text-secondary small">
                  <i className="bi bi-clock me-1 text-primary" />
                  <strong>{duration} mins</strong>
                </div>
                <span className="text-muted">•</span>
                <div className="text-secondary small">
                  <i className="bi bi-translate me-1 text-primary" />
                  <strong>{language || 'English'}</strong>
                </div>
              </div>

              {/* Genres & Formats */}
              <div className="mb-3">
                <div className="d-flex flex-wrap gap-1 mb-2">
                  <span className="fw-semibold text-secondary small me-2 align-self-center">
                    Genres:
                  </span>
                  {(Array.isArray(genre) ? genre : [genre]).map((g, idx) => (
                    <Badge key={idx} variant="primary">
                      {g}
                    </Badge>
                  ))}
                </div>
                {formats && formats.length > 0 && (
                  <div className="d-flex flex-wrap gap-1">
                    <span className="fw-semibold text-secondary small me-2 align-self-center">
                      Formats:
                    </span>
                    {formats.map((f, idx) => (
                      <Badge key={idx} variant="neutral">
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Accessibility Information */}
              <div className="p-2.5 bg-light border rounded d-flex flex-wrap align-items-center gap-3 mb-3 small">
                <span className="fw-semibold text-dark d-flex align-items-center gap-1">
                  <i className="bi bi-universal-access-circle text-primary fs-6" />
                  Accessibility:
                </span>
                <span className="text-secondary d-flex align-items-center gap-1">
                  <i className="bi bi-person-wheelchair text-primary" />
                  Wheelchair Accessible Seating
                </span>
                <span className="text-secondary d-flex align-items-center gap-1">
                  <i className="bi bi-ear text-primary" />
                  Assistive Audio
                </span>
                <span className="text-secondary d-flex align-items-center gap-1">
                  <i className="bi bi-badge-cc text-primary" />
                  Closed Captions
                </span>
              </div>

              {/* Actions */}
              <div className="d-flex flex-wrap gap-2 pt-1">
                <a
                  href="#showtimes-section"
                  className="btn btn-primary fw-medium px-4 d-inline-flex align-items-center gap-2"
                >
                  <i className="bi bi-ticket-perforated" />
                  Select Showtimes & Seats
                </a>
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

      {/* Main Content & Live Showtimes */}
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-8">
            {/* Showtimes & Cinemas Section */}
            <section id="showtimes-section" className="bg-white border rounded p-4 shadow-sm mb-4">
              <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3 pb-2 border-bottom">
                <div>
                  <h2 className="h5 fw-bold text-dark mb-0">Showtimes & Available Cinemas</h2>
                  <p className="text-muted small mb-0">
                    Select a date and click any showtime pill to select seats
                  </p>
                </div>
              </div>

              {/* Date Selector Pills */}
              <div className="d-flex gap-2 overflow-auto pb-2 mb-4">
                {dateOptions.map((opt) => (
                  <button
                    key={opt.iso}
                    type="button"
                    className={`btn btn-sm d-flex flex-column align-items-center px-3 py-2 flex-shrink-0 ${
                      selectedDate === opt.iso
                        ? 'btn-primary shadow-sm'
                        : 'btn-light border text-secondary'
                    }`}
                    style={{ minWidth: '90px' }}
                    onClick={() => setSelectedDate(opt.iso)}
                  >
                    <span className="fw-bold small">{opt.dayLabel}</span>
                    <span style={{ fontSize: '0.75rem' }}>{opt.dateLabel}</span>
                  </button>
                ))}
              </div>

              {/* Showtimes List */}
              {showsLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading showtimes...</span>
                  </div>
                </div>
              ) : showsError ? (
                <div className="alert alert-warning small mb-0">{showsError}</div>
              ) : groupedTheatres.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {groupedTheatres.map(({ theatre, shows: tShows }) => {
                    const tName = theatre?.name || 'Partner Cinema Multiplex';
                    const tCity = theatre?.city || 'New York';
                    const tStreet =
                      typeof theatre?.address === 'object'
                        ? theatre?.address?.street
                        : theatre?.address || '';

                    return (
                      <div key={theatre?._id || theatre?.id || tName} className="p-3 bg-light border rounded">
                        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-1 mb-2">
                          <div>
                            <span className="fw-bold text-dark d-flex align-items-center gap-1">
                              <i className="bi bi-building text-primary" />
                              {tName}
                            </span>
                            {tStreet && (
                              <span className="text-muted small">
                                {tStreet}, {tCity}
                              </span>
                            )}
                          </div>
                          <span className="badge bg-white text-secondary border">
                            {theatre?.facilities?.[0] || 'Dolby Atmos'}
                          </span>
                        </div>

                        {/* Showtimes Pills */}
                        <div className="d-flex flex-wrap gap-2 pt-2">
                          {tShows.map((show) => {
                            const startTime = new Date(show.startTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            const isPast = new Date(show.startTime) < new Date();
                            const minPrice = show.pricing?.[0]?.price || 12.5;

                            return (
                              <button
                                key={show._id || show.id}
                                type="button"
                                className={`btn btn-sm ${
                                  isPast ? 'btn-light border text-muted disabled' : 'btn-outline-primary'
                                } d-flex flex-column align-items-center px-3 py-1.5`}
                                onClick={() => !isPast && handleSelectShow(show)}
                                disabled={isPast}
                                title={isPast ? 'Showtime already commenced' : 'Book seats'}
                              >
                                <span className="fw-bold">{startTime}</span>
                                <span style={{ fontSize: '0.65rem' }}>
                                  {show.format || 'Standard'} • ${minPrice.toFixed(2)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 bg-light rounded border text-muted small">
                  <i className="bi bi-calendar-x fs-4 d-block mb-1" />
                  No showtimes currently scheduled for {new Date(selectedDate).toLocaleDateString()}.
                  <div className="mt-2">
                    <Link to="/shows" className="btn btn-sm btn-outline-primary">
                      Browse All Cinema Schedules
                    </Link>
                  </div>
                </div>
              )}
            </section>

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
                  {cast.map((actor, idx) => {
                    const actorName = typeof actor === 'object' ? actor.name || actor.actorName : actor;
                    const actorRole = typeof actor === 'object' ? actor.role || actor.roleName || 'Cast' : 'Cast';
                    return (
                      <div className="col" key={idx}>
                        <div className="p-2 border rounded bg-light text-center h-100">
                          <div
                            className="rounded-circle bg-white border text-primary mx-auto mb-2 d-flex align-items-center justify-content-center fw-bold"
                            style={{ width: '44px', height: '44px' }}
                          >
                            {actorName ? actorName.charAt(0) : 'A'}
                          </div>
                          <div className="fw-semibold text-dark small text-truncate" title={actorName}>
                            {actorName}
                          </div>
                          <div
                            className="text-muted small text-truncate"
                            style={{ fontSize: '0.75rem' }}
                            title={actorRole}
                          >
                            as {actorRole}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted small mb-0">Cast information not listed yet.</p>
              )}
            </div>
          </div>

          {/* Sidebar Booking Callout */}
          <div className="col-lg-4">
            <div className="bg-white border rounded p-4 shadow-sm sticky-top" style={{ top: '80px' }}>
              <h3 className="h6 fw-bold text-dark mb-2">Book Tickets Online</h3>
              <p className="text-muted small mb-3">
                Select your preferred theatre, showtime, and interactive seats with instant e-ticket delivery.
              </p>
              <a
                href="#showtimes-section"
                className="btn btn-primary w-100 fw-medium py-2 d-flex align-items-center justify-content-center gap-2 mb-2"
              >
                <i className="bi bi-calendar-check" />
                Select Showtime Above
              </a>
              <div className="text-center text-muted small" style={{ fontSize: '0.75rem' }}>
                <i className="bi bi-shield-check me-1 text-success" />
                Verified screening schedules & secure booking
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

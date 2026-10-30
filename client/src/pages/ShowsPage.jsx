import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovies } from '../features/movies/moviesSlice';
import { selectShow } from '../features/booking/bookingSlice';
import { showsApi, theatresApi } from '../services/api';
import Badge from '../components/common/Badge';
import EmptyState from '../components/common/EmptyState';
import ErrorAlert from '../components/common/ErrorAlert';

const ShowsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const urlMovieId = searchParams.get('movieId') || '';
  const urlTheatreId = searchParams.get('theatreId') || '';
  const urlDate = searchParams.get('date') || '';

  const { movies } = useSelector((state) => state.movies);
  const { currentCity } = useSelector((state) => state.ui);

  // Generate next 7 dates
  const dates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      iso: d.toISOString().split('T')[0],
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateFormatted: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });

  const [selectedDate, setSelectedDate] = useState(urlDate || dates[0].iso);
  const [selectedMovieId, setSelectedMovieId] = useState(urlMovieId);
  const [selectedTheatreId, setSelectedTheatreId] = useState(urlTheatreId);

  const [shows, setShows] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load movies and theatres on mount
  useEffect(() => {
    if (movies.length === 0) {
      dispatch(fetchMovies());
    }
    theatresApi
      .getAll()
      .then((res) => setTheatres(res.data || []))
      .catch(() => {});
  }, [dispatch, movies.length]);

  // Load shows matching selected filters
  useEffect(() => {
    setLoading(true);
    setError(null);

    const queryParams = {
      date: selectedDate,
    };
    if (selectedMovieId) queryParams.movieId = selectedMovieId;
    if (selectedTheatreId) queryParams.theatreId = selectedTheatreId;
    if (searchParams.get('wheelchair') === 'true') queryParams.wheelchair = 'true';
    if (searchParams.get('closedCaptions') === 'true') queryParams.closedCaptions = 'true';
    if (searchParams.get('audioDescription') === 'true') queryParams.audioDescription = 'true';
    if (searchParams.get('assistedListening') === 'true') queryParams.assistedListening = 'true';

    showsApi
      .getAll(queryParams)
      .then((res) => setShows(res.data || []))
      .catch((err) => setError(err.message || 'Failed to load show schedules.'))
      .finally(() => setLoading(false));

    // Update URL params
    const newParams = new URLSearchParams();
    if (selectedMovieId) newParams.set('movieId', selectedMovieId);
    if (selectedTheatreId) newParams.set('theatreId', selectedTheatreId);
    if (selectedDate !== dates[0].iso) newParams.set('date', selectedDate);
    if (searchParams.get('wheelchair') === 'true') newParams.set('wheelchair', 'true');
    if (searchParams.get('closedCaptions') === 'true') newParams.set('closedCaptions', 'true');
    if (searchParams.get('audioDescription') === 'true') newParams.set('audioDescription', 'true');
    if (searchParams.get('assistedListening') === 'true') newParams.set('assistedListening', 'true');
    setSearchParams(newParams, { replace: true });
  }, [selectedMovieId, selectedTheatreId, selectedDate, setSearchParams, searchParams]);

  const activeMovie = movies.find(
    (m) => String(m._id || m.id) === String(selectedMovieId)
  );

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

  const handleSelectShowtime = (show) => {
    const theatreObj = show.theatre || {
      id: 'th-default',
      name: 'Cinema Venue',
    };

    const movieObj = show.movie || activeMovie || {
      id: 'm101',
      title: 'Movie Feature',
    };

    dispatch(
      selectShow({
        movie: movieObj,
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

    navigate(`/seats?movieId=${movieObj._id || movieObj.id}&showId=${show._id || show.id}`);
  };

  return (
    <div className="container py-4">
      {/* Top Filter and Navigation Bar */}
      <div className="bg-white border rounded p-3 mb-4 shadow-sm">
        <div className="row g-3 align-items-center">
          {/* Movie Filter */}
          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">
              Select Movie:
            </label>
            <select
              className="form-select form-select-sm"
              value={selectedMovieId}
              onChange={(e) => setSelectedMovieId(e.target.value)}
            >
              <option value="">All Movies ({movies.length})</option>
              {movies.map((m) => (
                <option key={m._id || m.id} value={m._id || m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Theatre Filter */}
          <div className="col-md-4">
            <label className="form-label small fw-semibold text-secondary mb-1">
              Filter Cinema:
            </label>
            <select
              className="form-select form-select-sm"
              value={selectedTheatreId}
              onChange={(e) => setSelectedTheatreId(e.target.value)}
            >
              <option value="">All Cinema Locations ({theatres.length})</option>
              {theatres.map((t) => (
                <option key={t._id || t.id} value={t._id || t.id}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>
          </div>

          {/* City Indicator & Reset */}
          <div className="col-md-4 text-md-end pt-3 pt-md-0">
            {(selectedMovieId || selectedTheatreId) && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary me-2"
                onClick={() => {
                  setSelectedMovieId('');
                  setSelectedTheatreId('');
                }}
              >
                Clear Filters
              </button>
            )}
            <span className="badge bg-light text-secondary border">
              <i className="bi bi-geo-alt-fill text-primary me-1" />
              {currentCity} Region
            </span>
          </div>
        </div>
      </div>

      {/* Date Selector Pills */}
      <div className="d-flex gap-2 overflow-auto pb-2 mb-3">
        {dates.map((d) => (
          <button
            key={d.iso}
            type="button"
            className={`btn btn-sm d-flex flex-column align-items-center px-3 py-2 flex-shrink-0 ${
              selectedDate === d.iso
                ? 'btn-primary shadow-sm'
                : 'btn-light border text-secondary'
            }`}
            style={{ minWidth: '94px' }}
            onClick={() => setSelectedDate(d.iso)}
          >
            <span className="fw-bold small">{d.dayName}</span>
            <span style={{ fontSize: '0.75rem' }}>{d.dateFormatted}</span>
          </button>
        ))}
      </div>

      {/* Accessibility Filters Bar */}
      <div className="bg-white border rounded p-2 mb-4 d-flex flex-wrap align-items-center justify-content-between gap-2 shadow-sm">
        <div className="d-flex flex-wrap align-items-center gap-1.5">
          <span className="small text-muted fw-semibold me-1">
            <i className="bi bi-universal-access me-1 text-primary" /> Accessibility:
          </span>
          {[
            { key: 'wheelchair', label: '♿ Wheelchair Step-Free' },
            { key: 'closedCaptions', label: '🗪 Closed Captions' },
            { key: 'audioDescription', label: '🎧 Audio Description' },
            { key: 'assistedListening', label: '🦻 Assisted Listening' },
          ].map(({ key, label }) => {
            const isActive = searchParams.get(key) === 'true';
            return (
              <button
                key={key}
                type="button"
                className={`btn btn-xs rounded-pill ${
                  isActive ? 'btn-primary' : 'btn-light border text-secondary'
                }`}
                onClick={() => {
                  const newP = new URLSearchParams(searchParams);
                  if (isActive) newP.delete(key);
                  else newP.set(key, 'true');
                  setSearchParams(newP);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {Array.from(searchParams.keys()).some((k) =>
          ['wheelchair', 'closedCaptions', 'audioDescription', 'assistedListening'].includes(k)
        ) && (
          <button
            type="button"
            className="btn btn-xs btn-link text-decoration-none text-muted"
            onClick={() => {
              const newP = new URLSearchParams(searchParams);
              ['wheelchair', 'closedCaptions', 'audioDescription', 'assistedListening'].forEach((k) =>
                newP.delete(k)
              );
              setSearchParams(newP);
            }}
          >
            Clear accessibility filters
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} className="mb-4" />}

      {/* Showtimes Grouped By Cinema */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading verified schedules...</span>
          </div>
        </div>
      ) : groupedTheatres.length > 0 ? (
        <div className="d-flex flex-column gap-3 mb-5">
          {groupedTheatres.map(({ theatre, shows: tShows }) => {
            const tName = theatre?.name || 'Grand Cinema';
            const tCity = theatre?.city || currentCity;
            const tStreet =
              typeof theatre?.address === 'object'
                ? theatre?.address?.street
                : theatre?.address || '';

            return (
              <div
                key={theatre?._id || theatre?.id || tName}
                className="bg-white border rounded p-4 shadow-sm"
              >
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3 pb-2 border-bottom">
                  <div>
                    <h2 className="h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      <i className="bi bi-building text-primary" />
                      {tName}
                    </h2>
                    <div className="text-muted small">
                      {tStreet && `${tStreet}, `}
                      {tCity}
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {theatre?.accessibility?.wheelchairAccessible && (
                      <span className="badge bg-light text-primary border" title="Wheelchair Accessible">
                        <i className="bi bi-person-wheelchair me-1" />
                        Accessible
                      </span>
                    )}
                    {theatre?.facilities?.[0] && (
                      <span className="badge bg-light text-secondary border">
                        {theatre.facilities[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Showtimes Ribbon */}
                <div className="d-flex flex-wrap gap-2.5 pt-1">
                  {tShows.map((show) => {
                    const startTime = new Date(show.startTime);
                    const timeFormatted = startTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isPast = startTime < new Date();
                    const minPrice = show.pricing?.[0]?.price || 12.5;
                    const mTitle = show.movie?.title;

                    return (
                      <button
                        key={show._id || show.id}
                        type="button"
                        className={`btn ${
                          isPast ? 'btn-light border text-muted disabled' : 'btn-outline-primary'
                        } d-flex flex-column align-items-center p-2.5 rounded text-center`}
                        style={{ minWidth: '110px' }}
                        disabled={isPast}
                        onClick={() => !isPast && handleSelectShowtime(show)}
                      >
                        <span className="fw-bold fs-6">{timeFormatted}</span>
                        <span className="small text-truncate" style={{ fontSize: '0.7rem' }}>
                          {show.format || 'Standard'}
                        </span>
                        {mTitle && selectedMovieId === '' && (
                          <span
                            className="text-truncate fw-semibold text-secondary"
                            style={{ fontSize: '0.65rem', maxWidth: '100px' }}
                          >
                            {mTitle}
                          </span>
                        )}
                        <span
                          className={`fw-semibold ${isPast ? 'text-muted' : 'text-primary'}`}
                          style={{ fontSize: '0.75rem' }}
                        >
                          ${minPrice.toFixed(2)}
                        </span>
                        <div className="d-flex gap-1 mt-1">
                          {show.accessibility?.wheelchairAccessible && (
                            <span className="badge bg-light text-primary border" style={{ fontSize: '0.6rem' }} title="Wheelchair Accessible">
                              ♿
                            </span>
                          )}
                          {show.accessibility?.closedCaptioning && (
                            <span className="badge bg-light text-secondary border" style={{ fontSize: '0.6rem' }} title="Closed Captioning">
                              CC
                            </span>
                          )}
                          {show.accessibility?.audioDescription && (
                            <span className="badge bg-light text-secondary border" style={{ fontSize: '0.6rem' }} title="Audio Description">
                              AD
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No showtimes available"
          description={`No shows are scheduled on ${new Date(
            selectedDate
          ).toLocaleDateString()} for the selected filters.`}
          actionLabel="View All Movies"
          onAction={() => {
            setSelectedMovieId('');
            setSelectedTheatreId('');
            setSelectedDate(dates[0].iso);
          }}
        />
      )}
    </div>
  );
};

export default ShowsPage;

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMovies } from '../features/movies/moviesSlice';
import { selectShow } from '../features/booking/bookingSlice';
import Badge from '../components/common/Badge';

const ShowsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const urlMovieId = searchParams.get('movieId') || '';
  const { movies, loading } = useSelector((state) => state.movies);
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

  const [selectedDate, setSelectedDate] = useState(dates[0].iso);
  const [selectedMovieId, setSelectedMovieId] = useState(urlMovieId);

  useEffect(() => {
    if (movies.length === 0) {
      dispatch(fetchMovies());
    }
  }, [dispatch, movies.length]);

  useEffect(() => {
    if (urlMovieId) {
      setSelectedMovieId(urlMovieId);
    } else if (movies.length > 0 && !selectedMovieId) {
      setSelectedMovieId(movies[0]._id || movies[0].id);
    }
  }, [urlMovieId, movies, selectedMovieId]);

  const activeMovie = movies.find((m) => m._id === selectedMovieId || m.id === selectedMovieId) || movies[0];

  const mockCinemas = [
    {
      id: 'th-1',
      name: 'IMovies Grand Cinema - Times Square',
      screen: 'Audi 1 (IMAX Laser)',
      shows: [
        { id: 'sh-101', time: '10:30 AM', format: 'IMAX 2D', price: 16.50, status: 'available' },
        { id: 'sh-102', time: '01:45 PM', format: 'IMAX 2D', price: 16.50, status: 'fast_filling' },
        { id: 'sh-103', time: '05:15 PM', format: 'IMAX 2D', price: 18.00, status: 'fast_filling' },
        { id: 'sh-104', time: '09:00 PM', format: 'IMAX 2D', price: 18.00, status: 'available' },
      ],
    },
    {
      id: 'th-2',
      name: 'IMovies Downtown Royale',
      screen: 'Audi 3 (Dolby Atmos)',
      shows: [
        { id: 'sh-201', time: '11:15 AM', format: 'Dolby Atmos', price: 14.00, status: 'available' },
        { id: 'sh-202', time: '02:30 PM', format: 'Dolby Atmos', price: 14.00, status: 'available' },
        { id: 'sh-203', time: '06:00 PM', format: 'Dolby Atmos', price: 15.50, status: 'fast_filling' },
        { id: 'sh-204', time: '09:45 PM', format: 'Dolby Atmos', price: 15.50, status: 'available' },
      ],
    },
    {
      id: 'th-3',
      name: 'IMovies Broadway Cineplex',
      screen: 'Audi 5 (Standard 2D)',
      shows: [
        { id: 'sh-301', time: '12:00 PM', format: 'Standard 2D', price: 12.00, status: 'available' },
        { id: 'sh-302', time: '03:45 PM', format: 'Standard 2D', price: 12.00, status: 'available' },
        { id: 'sh-303', time: '07:15 PM', format: 'Standard 2D', price: 13.50, status: 'available' },
      ],
    },
  ];

  const handleSelectShowtime = (theatre, show) => {
    dispatch(
      selectShow({
        movie: activeMovie,
        theatre: { id: theatre.id, name: theatre.name, screen: theatre.screen },
        date: selectedDate,
        showtime: show,
      })
    );
    navigate(`/seats?movieId=${activeMovie._id || activeMovie.id}&showId=${show.id}`);
  };

  return (
    <div className="container py-4">
      {/* Top Navigation & Selected Movie Bar */}
      <div className="bg-white border rounded p-3 mb-4 shadow-sm">
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            <span className="text-muted small">Select Movie:</span>
            <div className="d-flex align-items-center gap-2 mt-1">
              <select
                className="form-select fw-bold text-dark"
                style={{ maxWidth: '340px' }}
                value={selectedMovieId}
                onChange={(e) => setSelectedMovieId(e.target.value)}
              >
                {movies.map((m) => (
                  <option key={m._id || m.id} value={m._id || m.id}>
                    {m.title} ({m.certificate || 'PG-13'})
                  </option>
                ))}
              </select>
              {activeMovie && (
                <span className="badge bg-light text-secondary border">
                  {activeMovie.duration}m • {activeMovie.language}
                </span>
              )}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">City:</span>
            <span className="fw-bold text-primary">{currentCity}</span>
          </div>
        </div>
      </div>

      {/* Date Picker Slider */}
      <div className="bg-white border rounded p-2 mb-4 shadow-sm">
        <div className="d-flex gap-2 overflow-auto py-1">
          {dates.map((dateObj) => (
            <button
              key={dateObj.iso}
              type="button"
              className={`btn text-center px-3 py-2 flex-shrink-0 ${
                selectedDate === dateObj.iso
                  ? 'btn-primary text-white shadow-sm'
                  : 'btn-light border text-dark'
              }`}
              style={{ minWidth: '96px', borderRadius: '6px' }}
              onClick={() => setSelectedDate(dateObj.iso)}
            >
              <div className="small fw-semibold text-uppercase" style={{ fontSize: '0.7rem' }}>
                {dateObj.dayName}
              </div>
              <div className="fw-bold fs-6">{dateObj.dateFormatted}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Cinema Listings */}
      <div className="mb-4">
        <h2 className="h5 fw-bold text-dark mb-3">Available Theatres & Showtimes</h2>

        <div className="d-flex flex-column gap-3">
          {mockCinemas.map((cinema) => (
            <div className="bg-white border rounded p-4 shadow-sm" key={cinema.id}>
              <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between pb-3 mb-3 border-bottom">
                <div>
                  <h3 className="h6 fw-bold text-dark mb-1">{cinema.name}</h3>
                  <div className="d-flex align-items-center gap-2 small text-muted">
                    <span>{cinema.screen}</span>
                    <span>•</span>
                    <span className="text-success">
                      <i className="bi bi-shield-check me-1" />
                      Contactless QR Entry
                    </span>
                  </div>
                </div>

                <div className="d-flex align-items-center gap-2 mt-2 mt-md-0 small text-muted">
                  <i className="bi bi-info-circle text-primary" />
                  <span>Cancellation Available up to 2 hrs prior</span>
                </div>
              </div>

              {/* Showtimes Grid */}
              <div className="d-flex flex-wrap gap-3">
                {cinema.shows.map((show) => (
                  <button
                    key={show.id}
                    type="button"
                    className="btn btn-outline-primary p-2 text-start d-flex flex-column"
                    style={{ minWidth: '130px', borderRadius: '6px' }}
                    onClick={() => handleSelectShowtime(cinema, show)}
                  >
                    <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                      <span className="fw-bold fs-6">{show.time}</span>
                      {show.status === 'fast_filling' && (
                        <span
                          className="badge bg-warning-subtle text-warning-emphasis p-1"
                          style={{ fontSize: '0.65rem' }}
                        >
                          Filling Fast
                        </span>
                      )}
                    </div>
                    <div className="d-flex align-items-center justify-content-between small text-muted">
                      <span>{show.format}</span>
                      <span className="fw-semibold text-dark">${show.price.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShowsPage;

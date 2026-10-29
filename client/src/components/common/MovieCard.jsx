import React from 'react';
import { Link } from 'react-router-dom';
import Badge from './Badge';

const MovieCard = ({ movie }) => {
  if (!movie) return null;

  const {
    _id,
    id,
    title,
    posterUrl,
    genre = [],
    duration,
    rating,
    certificate,
    language,
    status,
    priceStartingAt,
  } = movie;

  const movieId = _id || id;
  const isNowShowing = status === 'now_showing';

  return (
    <div className="im-card h-100 d-flex flex-column p-2">
      <Link
        to={`/movies/${movieId}`}
        className="text-decoration-none"
        aria-label={`View details for ${title}`}
      >
        <div className="movie-poster-wrapper mb-2">
          <img
            src={posterUrl}
            alt={`${title} poster`}
            className="movie-poster-img"
            loading="lazy"
            onError={(e) => {
              e.target.src =
                'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';
            }}
          />
          {rating && (
            <div
              className="position-absolute bottom-0 start-0 m-2 px-2 py-1 bg-white border rounded shadow-sm d-flex align-items-center gap-1"
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              <i className="bi bi-star-fill text-warning" />
              <span className="text-dark">{rating.toFixed(1)}</span>
            </div>
          )}
          {certificate && (
            <div
              className="position-absolute top-0 end-0 m-2 px-1.5 py-0.5 bg-dark text-white rounded text-uppercase"
              style={{ fontSize: '0.65rem', fontWeight: 700 }}
            >
              {certificate}
            </div>
          )}
        </div>
      </Link>

      <div className="d-flex flex-column flex-grow-1 px-1">
        <Link
          to={`/movies/${movieId}`}
          className="text-decoration-none text-dark fw-bold mb-1 text-truncate"
          title={title}
        >
          {title}
        </Link>

        <div className="d-flex align-items-center gap-2 text-muted small mb-2">
          <span>{duration ? `${duration}m` : '2h 15m'}</span>
          <span>•</span>
          <span>{language || 'English'}</span>
        </div>

        <div className="d-flex flex-wrap gap-1 mb-3">
          {(Array.isArray(genre) ? genre.slice(0, 2) : [genre]).map((g, idx) => (
            <Badge key={idx} variant="neutral">
              {g}
            </Badge>
          ))}
        </div>

        <div className="d-flex align-items-center justify-content-between mt-auto pt-2 border-top">
          <div>
            <span className="text-muted small d-block" style={{ fontSize: '0.7rem' }}>
              Tickets from
            </span>
            <span className="fw-bold text-primary small">
              ${priceStartingAt ? priceStartingAt.toFixed(2) : '12.00'}
            </span>
          </div>

          <Link
            to={isNowShowing ? `/shows?movieId=${movieId}` : `/movies/${movieId}`}
            className={`btn btn-sm ${
              isNowShowing ? 'btn-primary' : 'btn-outline-secondary'
            } fw-medium px-3`}
          >
            {isNowShowing ? 'Book Now' : 'Details'}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;

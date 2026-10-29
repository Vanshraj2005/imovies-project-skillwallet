import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="container py-5 text-center">
      <div className="py-5 my-4">
        <div className="mb-3 text-muted">
          <i className="bi bi-film fs-1 text-primary" />
        </div>
        <h1 className="display-4 fw-bold text-dark mb-2">404</h1>
        <h2 className="h4 fw-semibold text-secondary mb-3">Screening Not Found</h2>
        <p className="text-muted small mx-auto mb-4" style={{ maxWidth: '460px' }}>
          The page or movie showtime you are searching for might have ended, been rescheduled, or is temporarily unavailable in the projector booth.
        </p>
        <div className="d-flex justify-content-center gap-2">
          <Link to="/" className="btn btn-primary">
            <i className="bi bi-house-door me-1" />
            Back to Home
          </Link>
          <Link to="/movies" className="btn btn-outline-secondary">
            Browse Movies
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

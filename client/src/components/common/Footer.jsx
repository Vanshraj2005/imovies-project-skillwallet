import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { healthApi } from '../../services/api';

const Footer = () => {
  const [apiStatus, setApiStatus] = useState({
    checked: false,
    healthy: false,
    version: '1.0.0',
  });

  useEffect(() => {
    let isMounted = true;
    healthApi
      .check()
      .then((res) => {
        if (isMounted && res.success) {
          setApiStatus({
            checked: true,
            healthy: true,
            version: res.data?.version || '1.0.0',
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiStatus({ checked: true, healthy: false, version: '1.0.0' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="bg-white border-top mt-auto py-5 text-secondary">
      <div className="container">
        <div className="row g-4 mb-4">
          {/* Brand & Mission */}
          <div className="col-lg-4 col-md-6">
            <Link
              to="/"
              className="d-flex align-items-center gap-2 fw-bold text-primary fs-5 text-decoration-none mb-3"
            >
              <span className="bg-primary text-white rounded px-2 py-0.5 d-inline-flex align-items-center justify-content-center">
                <i className="bi bi-film" />
              </span>
              <span>IMovies</span>
            </Link>
            <p className="small text-muted mb-3" style={{ maxWidth: '340px' }}>
              The modern cinema ticketing and theatre management platform.
              Experience seamless showtime discovery, interactive seat selection,
              and verified digital admissions.
            </p>

            {/* Live System Health Badge */}
            <div className="d-inline-flex align-items-center gap-2 px-2.5 py-1.5 bg-light border rounded small">
              <span
                className={`rounded-circle d-inline-block ${
                  apiStatus.healthy ? 'bg-success' : 'bg-warning'
                }`}
                style={{ width: '8px', height: '8px' }}
              />
              <span className="text-secondary small">
                Backend API:{' '}
                <strong className={apiStatus.healthy ? 'text-success' : 'text-warning'}>
                  {apiStatus.healthy ? 'Online & Healthy' : 'Connecting...'}
                </strong>
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-lg-2 col-md-6 col-6">
            <h6 className="fw-bold text-dark small text-uppercase mb-3">Discover</h6>
            <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
              <li>
                <Link to="/movies?status=now_showing" className="text-decoration-none text-muted">
                  Now Showing
                </Link>
              </li>
              <li>
                <Link to="/movies?status=coming_soon" className="text-decoration-none text-muted">
                  Coming Soon
                </Link>
              </li>
              <li>
                <Link to="/theatres" className="text-decoration-none text-muted">
                  Cinema Theatres
                </Link>
              </li>
              <li>
                <Link to="/shows" className="text-decoration-none text-muted">
                  Daily Showtimes
                </Link>
              </li>
            </ul>
          </div>

          {/* Cinema Experiences */}
          <div className="col-lg-3 col-md-6 col-6">
            <h6 className="fw-bold text-dark small text-uppercase mb-3">Experiences</h6>
            <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
              <li className="text-muted">IMAX with Laser</li>
              <li className="text-muted">Dolby Atmos Audio</li>
              <li className="text-muted">4DX Dynamic Seating</li>
              <li className="text-muted">VIP Gold Recliner Lounge</li>
            </ul>
          </div>

          {/* Customer Care & Accessibility */}
          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold text-dark small text-uppercase mb-3">Support & Accessibility</h6>
            <ul className="list-unstyled small mb-0 d-flex flex-column gap-2">
              <li className="text-muted">
                <i className="bi bi-universal-access me-2 text-primary" />
                Wheelchair Accessible Theatres
              </li>
              <li className="text-muted">
                <i className="bi bi-earbuds me-2 text-primary" />
                Assistive Listening Devices
              </li>
              <li className="text-muted">
                <i className="bi bi-shield-check me-2 text-primary" />
                Verified QR Check-in
              </li>
              <li className="text-muted">
                <i className="bi bi-credit-card me-2 text-primary" />
                Secure Mock/Stripe Payments
              </li>
            </ul>
          </div>
        </div>

        {/* Divider & Copyright */}
        <div className="pt-4 border-top d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 text-muted small">
          <div>
            &copy; {new Date().getFullYear()} IMovies Cinema Management Platform. All rights reserved.
          </div>
          <div className="d-flex gap-3">
            <span className="text-muted">Privacy Policy</span>
            <span>•</span>
            <span className="text-muted">Terms of Admission</span>
            <span>•</span>
            <span className="text-muted">Refund & Cancellation Rules</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

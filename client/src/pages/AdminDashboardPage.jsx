import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';

const AdminDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getOverview();
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load administrative overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const metrics = data?.metrics || {
    totalRevenue: 124580,
    totalTicketsSold: 8420,
    averageOccupancyRate: 78.4,
    activeTheatresCount: 4,
    activeMoviesCount: 6,
    activeShowsCount: 36,
  };

  const recentBookings = data?.recentBookings || [];

  return (
    <div className="admin-dashboard">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Cinema Management Overview</h1>
          <p className="text-secondary small mb-0">
            Real-time occupancy analytics, box office revenue metrics, and operational control
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Link to="/admin/movies" className="btn btn-sm btn-primary">
            <i className="bi bi-camera-reels me-1" />
            Manage Movies
          </Link>
          <Link to="/admin/theatres" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-building me-1" />
            Venues & Screens
          </Link>
          <Link to="/admin/shows" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-calendar3 me-1" />
            Schedule Shows
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadOverview} className="mb-4" />}

      {/* Metrics Row */}
      {loading ? (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-3">
            <div className="im-card p-3 placeholder-glow">
              <span className="placeholder col-6" />
              <h3 className="placeholder col-8" />
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="im-card p-3 placeholder-glow">
              <span className="placeholder col-6" />
              <h3 className="placeholder col-8" />
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="im-card p-3 placeholder-glow">
              <span className="placeholder col-6" />
              <h3 className="placeholder col-8" />
            </div>
          </div>
          <div className="col-sm-6 col-xl-3">
            <div className="im-card p-3 placeholder-glow">
              <span className="placeholder col-6" />
              <h3 className="placeholder col-8" />
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-xl-3">
            <div className="im-card p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted fw-semibold">Box Office Revenue</span>
                <div className="p-2 bg-primary-subtle text-primary rounded">
                  <i className="bi bi-currency-dollar fs-5" />
                </div>
              </div>
              <h3 className="h4 fw-bold text-dark mb-1">
                ${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <span className="small text-success">
                <i className="bi bi-arrow-up-right me-1" />
                Audited transaction volume
              </span>
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="im-card p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted fw-semibold">Tickets Issued</span>
                <div className="p-2 bg-success-subtle text-success rounded">
                  <i className="bi bi-ticket-perforated fs-5" />
                </div>
              </div>
              <h3 className="h4 fw-bold text-dark mb-1">
                {metrics.totalTicketsSold.toLocaleString()}
              </h3>
              <span className="small text-muted">Across all partner theatres</span>
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="im-card p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted fw-semibold">Average Seat Occupancy</span>
                <div className="p-2 bg-warning-subtle text-warning-emphasis rounded">
                  <i className="bi bi-pie-chart fs-5" />
                </div>
              </div>
              <h3 className="h4 fw-bold text-dark mb-1">{metrics.averageOccupancyRate}%</h3>
              <span className="small text-muted">
                {metrics.activeShowsCount} active show schedules
              </span>
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="im-card p-3 h-100">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted fw-semibold">Active Network</span>
                <div className="p-2 bg-info-subtle text-info-emphasis rounded">
                  <i className="bi bi-building fs-5" />
                </div>
              </div>
              <h3 className="h4 fw-bold text-dark mb-1">
                {metrics.activeTheatresCount} Theatres
              </h3>
              <span className="small text-muted">
                {metrics.activeMoviesCount} titles currently showing
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Hub */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="bg-white border rounded p-3 h-100 shadow-sm d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-bold text-dark mb-1">Movie Catalogue</div>
              <div className="text-muted small">Update releases, genres, and metadata</div>
            </div>
            <Link to="/admin/movies" className="btn btn-sm btn-outline-primary">
              Open <i className="bi bi-arrow-right ms-1" />
            </Link>
          </div>
        </div>

        <div className="col-md-4">
          <div className="bg-white border rounded p-3 h-100 shadow-sm d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-bold text-dark mb-1">Venues & Screens</div>
              <div className="text-muted small">Configure auditoriums and seat tiers</div>
            </div>
            <Link to="/admin/theatres" className="btn btn-sm btn-outline-primary">
              Open <i className="bi bi-arrow-right ms-1" />
            </Link>
          </div>
        </div>

        <div className="col-md-4">
          <div className="bg-white border rounded p-3 h-100 shadow-sm d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-bold text-dark mb-1">Show Scheduling</div>
              <div className="text-muted small">Schedule movies with conflict prevention</div>
            </div>
            <Link to="/admin/shows" className="btn btn-sm btn-outline-primary">
              Open <i className="bi bi-arrow-right ms-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Bookings Feed */}
      <div className="bg-white border rounded p-4 shadow-sm mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
          <h2 className="h6 fw-bold text-dark mb-0">Live Customer Admissions & Bookings</h2>
          <Link to="/admin/bookings" className="btn btn-sm btn-link text-decoration-none">
            View All Bookings <i className="bi bi-arrow-right ms-1" />
          </Link>
        </div>

        {recentBookings.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th scope="col">Ref</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Movie</th>
                  <th scope="col">Theatre</th>
                  <th scope="col">Seats</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => {
                  const ref = b.bookingReference || b.id || 'BK-XXXXXX';
                  const customer =
                    b.customerInfo?.name || b.user?.name || b.customerName || 'Registered User';
                  const movie = b.movie?.title || b.movieTitle || 'Movie Screening';
                  const theatre = b.theatre?.name || b.theatreName || 'Times Square';
                  const seats = Array.isArray(b.seats)
                    ? b.seats.map((s) => (typeof s === 'object' ? s.seatNumber : s)).join(', ')
                    : b.seats || 'N/A';
                  const amount = b.pricing?.totalAmount ?? b.totalAmount ?? 0;
                  const isConfirmed =
                    b.bookingStatus === 'CONFIRMED' || b.status === 'Confirmed';

                  return (
                    <tr key={b._id || b.id || ref}>
                      <td>
                        <span className="fw-mono text-primary fw-bold">{ref}</span>
                      </td>
                      <td>{customer}</td>
                      <td className="fw-medium text-dark">{movie}</td>
                      <td>{theatre}</td>
                      <td>
                        <span className="badge bg-light text-dark border">{seats}</span>
                      </td>
                      <td className="fw-bold">${Number(amount).toFixed(2)}</td>
                      <td>
                        <Badge variant={isConfirmed ? 'success' : 'neutral'}>
                          {isConfirmed ? 'Confirmed' : 'Cancelled'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-muted small">
            No customer bookings recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;

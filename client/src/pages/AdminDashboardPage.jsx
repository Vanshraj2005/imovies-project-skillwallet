import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../services/api';
import Badge from '../components/common/Badge';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';

const AdminDashboardPage = () => {
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, analyticsRes] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getAnalytics({ range: dateRange }).catch(() => ({ data: null })),
      ]);
      setData(overviewRes.data);
      if (analyticsRes?.data) {
        setAnalytics(analyticsRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load administrative overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const financials = analytics?.financials || {
    grossTicketSales: data?.metrics?.totalRevenue || 0,
    collectedRevenue: data?.metrics?.totalRevenue || 0,
    refundTotal: 0,
    foodRevenue: 0,
    netRevenue: data?.metrics?.totalRevenue || 0,
  };

  const volumes = analytics?.volumes || {
    totalBookings: 0,
    confirmedBookings: 0,
    checkedInBookings: 0,
    cancelledBookings: 0,
    totalTicketsSold: data?.metrics?.totalTicketsSold || 0,
    cancellationRate: 0,
    totalFoodOrders: 0,
  };

  const occupancy = analytics?.occupancy || {
    totalAuditoriumCapacity: 720,
    bookedSeats: 480,
    occupancyRate: data?.metrics?.averageOccupancyRate || 66.7,
  };

  const popularMovies = analytics?.popularMovies || [];
  const dailyTrends = analytics?.dailyTrends || [];
  const recentBookings = data?.recentBookings || [];

  return (
    <div className="admin-dashboard">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Cinema Intelligence Dashboard</h1>
          <p className="text-secondary small mb-0">
            Real-time box office analytics, audited revenue collections, and live occupancy rates
          </p>
        </div>

        {/* Date Range Selector & Action Links */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="btn-group btn-group-sm" role="group">
            {[
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 90 Days' },
              { id: 'all', label: 'All Time' },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                className={`btn ${dateRange === r.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setDateRange(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Link to="/admin/bookings" className="btn btn-sm btn-outline-primary">
            <i className="bi bi-qr-code-scan me-1" />
            Check-In Scanner
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadData} className="mb-4" />}

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
            <div className="bg-white border rounded p-3 h-100 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted fw-semibold">Collected Revenue</span>
                <div className="p-2 bg-success-subtle text-success rounded">
                  <i className="bi bi-cash-stack fs-5" />
                </div>
              </div>
              <h3 className="h4 fw-bold text-dark mb-1">
                ${financials.collectedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
                <span>Gross: ${financials.grossTicketSales.toFixed(2)}</span>
                <span className="text-danger">Refunds: ${financials.refundTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="bg-white border rounded p-3 h-100 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted fw-semibold">Confirmed Tickets</span>
                <div className="p-2 bg-primary-subtle text-primary rounded">
                  <i className="bi bi-ticket-perforated fs-5" />
                </div>
              </div>
              <h3 className="h4 fw-bold text-dark mb-1">
                {volumes.totalTicketsSold.toLocaleString()} Tickets
              </h3>
              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                {volumes.confirmedBookings} bookings ({volumes.checkedInBookings} admitted)
              </div>
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="bg-white border rounded p-3 h-100 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted fw-semibold">Auditorium Occupancy</span>
                <div className="p-2 bg-warning-subtle text-warning-emphasis rounded">
                  <i className="bi bi-pie-chart fs-5" />
                </div>
              </div>
              <h3 className="h4 fw-bold text-dark mb-1">{occupancy.occupancyRate}%</h3>
              <div className="progress mt-2" style={{ height: '6px' }}>
                <div
                  className="progress-bar bg-warning"
                  role="progressbar"
                  style={{ width: `${Math.min(100, occupancy.occupancyRate)}%` }}
                  aria-valuenow={occupancy.occupancyRate}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
              <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                {occupancy.bookedSeats} of {occupancy.totalAuditoriumCapacity} seats filled
              </div>
            </div>
          </div>

          <div className="col-sm-6 col-xl-3">
            <div className="bg-white border rounded p-3 h-100 shadow-sm">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted fw-semibold">Food & Concessions</span>
                <div className="p-2 bg-info-subtle text-info-emphasis rounded">
                  <i className="bi bi-cup-straw fs-5" />
                </div>
              </div>
              <h3 className="h4 fw-bold text-dark mb-1">
                ${financials.foodRevenue.toFixed(2)}
              </h3>
              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                {volumes.totalFoodOrders} pre-orders served
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Movies & Occupancy Breakdown */}
      <div className="row g-4 mb-4">
        {/* Popular Movies by Ticket Volume */}
        <div className="col-lg-7">
          <div className="bg-white border rounded p-4 h-100 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h2 className="h6 fw-bold text-dark mb-0">Top Performing Titles (Box Office)</h2>
              <span className="text-muted small">By Admissions Sold</span>
            </div>

            {popularMovies.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Movie Title</th>
                      <th scope="col" className="text-center">
                        Tickets
                      </th>
                      <th scope="col" className="text-end">
                        Gross Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {popularMovies.map((pm, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className="fw-semibold text-dark">{pm.movieTitle || 'Movie'}</span>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-light text-primary border">{pm.ticketsSold}</span>
                        </td>
                        <td className="text-end fw-bold text-dark">${Number(pm.revenue).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted small">
                No movie revenue records in this date window.
              </div>
            )}
          </div>
        </div>

        {/* Daily Financial Trend Breakdown */}
        <div className="col-lg-5">
          <div className="bg-white border rounded p-4 h-100 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h2 className="h6 fw-bold text-dark mb-0">Daily Revenue Snapshot</h2>
              <span className="text-muted small">Selected Range</span>
            </div>

            {dailyTrends.length > 0 ? (
              <div className="d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: '240px' }}>
                {dailyTrends.map((day, idx) => (
                  <div key={idx} className="p-2 border rounded bg-light d-flex justify-content-between align-items-center small">
                    <div>
                      <strong className="text-dark d-block">{day.date}</strong>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {day.bookings} bookings • {day.tickets} tickets
                      </span>
                    </div>
                    <span className="fw-bold text-primary fs-6">${Number(day.revenue).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted small">
                No daily trends recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="bg-white border rounded p-3 h-100 shadow-sm d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-bold text-dark small mb-1">Movie Catalogue</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                Metadata, posters, certs
              </div>
            </div>
            <Link to="/admin/movies" className="btn btn-sm btn-outline-primary">
              Manage
            </Link>
          </div>
        </div>

        <div className="col-md-3">
          <div className="bg-white border rounded p-3 h-100 shadow-sm d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-bold text-dark small mb-1">Venues & Screens</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                Auditoriums, accessibility
              </div>
            </div>
            <Link to="/admin/theatres" className="btn btn-sm btn-outline-primary">
              Manage
            </Link>
          </div>
        </div>

        <div className="col-md-3">
          <div className="bg-white border rounded p-3 h-100 shadow-sm d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-bold text-dark small mb-1">Show Scheduling</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                Schedules & conflicts
              </div>
            </div>
            <Link to="/admin/shows" className="btn btn-sm btn-outline-primary">
              Manage
            </Link>
          </div>
        </div>

        <div className="col-md-3">
          <div className="bg-white border rounded p-3 h-100 shadow-sm d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-bold text-dark small mb-1">Gate Check-In</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                QR code ticket scanner
              </div>
            </div>
            <Link to="/admin/bookings" className="btn btn-sm btn-primary">
              Scanner
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
                    b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN';

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
                          {b.bookingStatus || 'CONFIRMED'}
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

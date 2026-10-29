import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/common/Badge';

const mockRecentBookings = [
  { id: 'BK-902144', customer: 'Alex Johnson', movie: 'Interstellar: Beyond Time', theatre: 'Times Square', seats: 'A4, A5', amount: 34.50, status: 'Confirmed', time: '10 mins ago' },
  { id: 'BK-902143', customer: 'Elena Gilbert', movie: 'The Silent Horizon', theatre: 'Downtown Royale', seats: 'C6, C7', amount: 29.50, status: 'Confirmed', time: '25 mins ago' },
  { id: 'BK-902142', customer: 'David Miller', movie: 'Neon Odyssey 2099', theatre: 'Horizon Multiplex', seats: 'B1, B2, B3', amount: 48.00, status: 'Confirmed', time: '1 hour ago' },
  { id: 'BK-902141', customer: 'Sophia Chen', movie: 'Chronicles of Eldoria', theatre: 'Times Square', seats: 'F4', amount: 16.50, status: 'Cancelled', time: '2 hours ago' },
];

const AdminDashboardPage = () => {
  return (
    <div className="admin-dashboard">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold text-dark mb-1">Cinema Management Overview</h1>
          <p className="text-secondary small mb-0">
            Real-time occupancy analytics, daily box office metrics, and operations oversight
          </p>
        </div>

        <div className="d-flex gap-2">
          <Link to="/admin/movies" className="btn btn-sm btn-primary">
            <i className="bi bi-plus-lg me-1" />
            Add New Movie
          </Link>
          <Link to="/shows" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-calendar-event me-1" />
            Schedule Show
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="im-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-muted fw-semibold">Monthly Box Office</span>
              <div className="p-2 bg-primary-subtle text-primary rounded">
                <i className="bi bi-currency-dollar fs-5" />
              </div>
            </div>
            <h3 className="h4 fw-bold text-dark mb-1">$124,580</h3>
            <span className="small text-success">
              <i className="bi bi-arrow-up-right me-1" />
              +14.2% from last month
            </span>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="im-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-muted fw-semibold">Tickets Sold</span>
              <div className="p-2 bg-success-subtle text-success rounded">
                <i className="bi bi-ticket-perforated fs-5" />
              </div>
            </div>
            <h3 className="h4 fw-bold text-dark mb-1">8,420</h3>
            <span className="small text-success">
              <i className="bi bi-arrow-up-right me-1" />
              +8.5% ticket volume
            </span>
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
            <h3 className="h4 fw-bold text-dark mb-1">78.4%</h3>
            <span className="small text-muted">Across 34 daily screens</span>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="im-card p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-muted fw-semibold">Active Showtimes Today</span>
              <div className="p-2 bg-info-subtle text-info-emphasis rounded">
                <i className="bi bi-calendar3 fs-5" />
              </div>
            </div>
            <h3 className="h4 fw-bold text-dark mb-1">42 Shows</h3>
            <span className="small text-muted">In 4 regional partner cinemas</span>
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="bg-white border rounded p-4 shadow-sm mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
          <h2 className="h6 fw-bold text-dark mb-0">Recent Customer Bookings</h2>
          <span className="badge bg-light text-muted border">Live Feed</span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th scope="col">Booking ID</th>
                <th scope="col">Customer</th>
                <th scope="col">Movie & Theatre</th>
                <th scope="col">Seats</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              {mockRecentBookings.map((b) => (
                <tr key={b.id}>
                  <td className="fw-bold font-monospace text-primary">{b.id}</td>
                  <td className="fw-medium text-dark">{b.customer}</td>
                  <td>
                    <div className="fw-semibold text-dark">{b.movie}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {b.theatre}
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border">{b.seats}</span>
                  </td>
                  <td className="fw-bold text-dark">${b.amount.toFixed(2)}</td>
                  <td>
                    <Badge variant={b.status === 'Confirmed' ? 'success' : 'danger'}>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="text-muted">{b.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

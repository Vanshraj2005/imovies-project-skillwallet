import React from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { loginDemoAdmin } from '../features/auth/authSlice';
import Button from '../components/common/Button';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminLayout = () => {
  const { role, isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const isAdmin =
    isAuthenticated &&
    (String(role).toUpperCase() === 'ADMIN' ||
      String(user?.role).toUpperCase() === 'ADMIN');

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar */}
      <aside
        className="bg-white border-end d-flex flex-column flex-shrink-0 p-3"
        style={{ width: '260px' }}
      >
        <Link
          to="/"
          className="d-flex align-items-center gap-2 mb-4 text-decoration-none fw-bold text-primary fs-5"
        >
          <span className="bg-primary text-white rounded px-2 py-0.5">
            <i className="bi bi-film" />
          </span>
          <span>IMovies Admin</span>
        </Link>

        <ul className="nav nav-pills flex-column mb-auto gap-1">
          <li className="nav-item">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive ? 'active' : 'text-secondary'
                }`
              }
            >
              <i className="bi bi-speedometer2" />
              Overview & Analytics
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/movies"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive ? 'active' : 'text-secondary'
                }`
              }
            >
              <i className="bi bi-camera-reels" />
              Manage Movies
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/theatres"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive ? 'active' : 'text-secondary'
                }`
              }
            >
              <i className="bi bi-building" />
              Theatres & Screens
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/shows"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive ? 'active' : 'text-secondary'
                }`
              }
            >
              <i className="bi bi-calendar3" />
              Show Scheduling
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/admin/bookings"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center gap-2 ${
                  isActive ? 'active' : 'text-secondary'
                }`
              }
            >
              <i className="bi bi-ticket-perforated" />
              Bookings Oversight
            </NavLink>
          </li>
        </ul>

        <hr className="my-3" />

        <div className="d-flex flex-column gap-2">
          <Link to="/" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2">
            <i className="bi bi-arrow-left" />
            Back to Public Site
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-bottom px-4 py-3 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
              Admin Console
            </span>
            <span className="text-muted small">| Cinema Operations & Schedule Management</span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="text-end d-none d-sm-block">
              <div className="fw-bold small text-dark">{user?.name || 'Administrator'}</div>
              <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                Role: {role}
              </div>
            </div>
            <div
              className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
              style={{ width: '36px', height: '36px' }}
            >
              {user?.name ? user.name.charAt(0) : 'A'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 flex-grow-1 overflow-auto">
          {!isAdmin ? (
            <div className="bg-white border rounded p-5 text-center my-4 mx-auto" style={{ maxWidth: '560px' }}>
              <div className="mb-3 text-warning">
                <i className="bi bi-shield-lock-fill fs-1" />
              </div>
              <h5 className="fw-bold text-dark">Administrator Access Required</h5>
              <p className="text-secondary small mb-4">
                You are currently signed in as <strong>{role}</strong>. To view and manage cinema listings, schedules, and analytics, switch to the Administrator role.
              </p>
              <div className="d-flex justify-content-center gap-2">
                <Button
                  variant="primary"
                  onClick={() => dispatch(loginDemoAdmin())}
                >
                  <i className="bi bi-person-badge me-1" />
                  Elevate to Admin Role (Demo)
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/')}
                >
                  Return Home
                </Button>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        theme="light"
      />
    </div>
  );
};

export default AdminLayout;

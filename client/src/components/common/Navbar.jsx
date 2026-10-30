import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  logout,
  loginSuccess,
  loginDemoAdmin,
  loginDemoUser,
} from '../../features/auth/authSlice';
import { authApi } from '../../services/api';
import { setCurrentCity } from '../../features/ui/uiSlice';
import { toast } from 'react-toastify';

const Navbar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isAuthenticated, user, role } = useSelector((state) => state.auth);
  const { currentCity, availableCities } = useSelector((state) => state.ui);

  const [searchQuery, setSearchQuery] = useState('');
  const [isNavCollapsed, setIsNavCollapsed] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'city' | 'role' | 'user' | null

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.dropdown')) {
        setActiveDropdown(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const toggleDropdown = (name) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsNavCollapsed(true);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.info('You have been signed out.');
    navigate('/');
  };

  const handleQuickLogin = async (email, password, displayName) => {
    try {
      const res = await authApi.login({ email, password });
      dispatch(
        loginSuccess({
          user: res.data.user,
          token: res.data.accessToken,
        })
      );
      toast.success(`Logged in as ${displayName}`);
      setActiveDropdown(null);
    } catch (err) {
      toast.error(err.message || 'Login failed');
    }
  };

  return (
    <header className="sticky-top bg-white border-bottom shadow-sm">
      <nav className="navbar navbar-expand-lg navbar-light py-2">
        <div className="container">
          {/* Brand Logo */}
          <Link
            to="/"
            className="navbar-brand d-flex align-items-center gap-2 fw-bold text-primary fs-4"
          >
            <span
              className="bg-primary text-white rounded px-2 py-1 d-inline-flex align-items-center justify-content-center"
              style={{ fontSize: '1.1rem' }}
            >
              <i className="bi bi-film" />
            </span>
            <span>IMovies</span>
          </Link>

          {/* Location Selector */}
          <div className="dropdown me-auto ms-2 d-none d-md-block">
            <button
              className="btn btn-sm btn-light border d-flex align-items-center gap-2 text-secondary"
              type="button"
              onClick={() => toggleDropdown('city')}
              aria-expanded={activeDropdown === 'city'}
            >
              <i className="bi bi-geo-alt-fill text-primary" />
              <span className="fw-medium">{currentCity}</span>
              <i className="bi bi-chevron-down small" />
            </button>
            <ul className={`dropdown-menu shadow-sm border ${activeDropdown === 'city' ? 'show' : ''}`}>
              <li className="dropdown-header small text-muted">Select City</li>
              {availableCities.map((city) => (
                <li key={city}>
                  <button
                    className={`dropdown-item ${city === currentCity ? 'active' : ''}`}
                    onClick={() => {
                      dispatch(setCurrentCity(city));
                      setActiveDropdown(null);
                    }}
                  >
                    {city}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Mobile Toggle Button */}
          <button
            className="navbar-toggler border-0"
            type="button"
            onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            aria-controls="navbarContent"
            aria-expanded={!isNavCollapsed}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          {/* Collapsible Content */}
          <div
            className={`collapse navbar-collapse ${!isNavCollapsed ? 'show' : ''}`}
            id="navbarContent"
          >
            {/* Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="d-flex mx-lg-3 my-2 my-lg-0 flex-grow-1"
              style={{ maxWidth: '380px' }}
            >
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-muted">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="search"
                  className="form-control bg-light border-start-0"
                  placeholder="Search movies, genres, cinemas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search"
                />
              </div>
            </form>

            {/* Nav Links */}
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink
                  to="/movies"
                  className={({ isActive }) =>
                    `nav-link fw-medium ${isActive ? 'text-primary' : 'text-secondary'}`
                  }
                  onClick={() => setIsNavCollapsed(true)}
                >
                  Movies
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/theatres"
                  className={({ isActive }) =>
                    `nav-link fw-medium ${isActive ? 'text-primary' : 'text-secondary'}`
                  }
                  onClick={() => setIsNavCollapsed(true)}
                >
                  Theatres
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/shows"
                  className={({ isActive }) =>
                    `nav-link fw-medium ${isActive ? 'text-primary' : 'text-secondary'}`
                  }
                  onClick={() => setIsNavCollapsed(true)}
                >
                  Showtimes
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/food"
                  className={({ isActive }) =>
                    `nav-link fw-medium ${isActive ? 'text-primary' : 'text-secondary'}`
                  }
                  onClick={() => setIsNavCollapsed(true)}
                >
                  Concessions
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/group-plans"
                  className={({ isActive }) =>
                    `nav-link fw-medium ${isActive ? 'text-primary' : 'text-secondary'}`
                  }
                  onClick={() => setIsNavCollapsed(true)}
                >
                  <i className="bi bi-people me-1 text-primary" />
                  Movie Nights
                </NavLink>
              </li>
            </ul>

            {/* Auth Actions & Demo Persona Switcher */}
            <div className="d-flex align-items-center gap-2 mt-2 mt-lg-0">
              {/* Quick Persona Switcher for Evaluation */}
              <div className="dropdown">
                <button
                  className="btn btn-sm btn-outline-secondary dropdown-toggle d-flex align-items-center gap-1"
                  type="button"
                  onClick={() => toggleDropdown('role')}
                  aria-expanded={activeDropdown === 'role'}
                  title="Switch Demo Persona for evaluation"
                >
                  <i className="bi bi-person-gear text-primary" />
                  <span className="small d-none d-sm-inline">Role: {role}</span>
                </button>
                <ul className={`dropdown-menu dropdown-menu-end shadow-sm border ${activeDropdown === 'role' ? 'show' : ''}`} style={{ minWidth: '240px' }}>
                  <li>
                    <h6 className="dropdown-header small text-muted">Multi-User Testing Personas</h6>
                  </li>
                  <li>
                    <button
                      className="dropdown-item small d-flex align-items-center gap-2 py-2"
                      onClick={() => handleQuickLogin('imovies.user1@example.com', 'User1@IMovies2026!', 'Test User 1')}
                    >
                      <i className="bi bi-person-fill text-primary fs-5" />
                      <div>
                        <div className="fw-semibold text-dark">Test User 1</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>imovies.user1@example.com</div>
                      </div>
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item small d-flex align-items-center gap-2 py-2"
                      onClick={() => handleQuickLogin('imovies.user2@example.com', 'User2@IMovies2026!', 'Test User 2')}
                    >
                      <i className="bi bi-person-fill text-success fs-5" />
                      <div>
                        <div className="fw-semibold text-dark">Test User 2</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>imovies.user2@example.com</div>
                      </div>
                    </button>
                  </li>
                  <li><hr className="dropdown-divider my-1" /></li>
                  <li>
                    <button
                      className="dropdown-item small d-flex align-items-center gap-2 py-2"
                      onClick={() => handleQuickLogin('admin@imovies.com', 'AdminPassword123!', 'Cinema Admin (Sarah)')}
                    >
                      <i className="bi bi-shield-lock-fill text-danger fs-5" />
                      <div>
                        <div className="fw-semibold text-dark">Cinema Admin</div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>admin@imovies.com (ADMIN)</div>
                      </div>
                    </button>
                  </li>
                </ul>
              </div>

              {isAuthenticated ? (
                <div className="dropdown">
                  <button
                    className="btn btn-sm btn-light border d-flex align-items-center gap-2"
                    type="button"
                    onClick={() => toggleDropdown('user')}
                    aria-expanded={activeDropdown === 'user'}
                  >
                    <div
                      className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: '28px', height: '28px', fontSize: '0.8rem' }}
                    >
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="small fw-semibold d-none d-md-inline text-dark">
                      {user?.name || 'Account'}
                    </span>
                    <i className="bi bi-chevron-down small text-muted" />
                  </button>
                  <ul className={`dropdown-menu dropdown-menu-end shadow-sm border ${activeDropdown === 'user' ? 'show' : ''}`}>
                    <li className="px-3 py-1 border-bottom mb-1">
                      <div className="fw-bold small text-dark">{user?.name}</div>
                      <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
                        {user?.email}
                      </div>
                    </li>
                    <li>
                      <Link
                        className="dropdown-item small"
                        to="/dashboard"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <i className="bi bi-speedometer2 me-2 text-muted" />
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="dropdown-item small"
                        to="/bookings"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <i className="bi bi-ticket-perforated me-2 text-muted" />
                        My Bookings
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="dropdown-item small"
                        to="/group-plans"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <i className="bi bi-people me-2 text-muted" />
                        Group Movie Nights
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="dropdown-item small"
                        to="/food"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <i className="bi bi-cup-straw me-2 text-muted" />
                        Concessions & Snacks
                      </Link>
                    </li>
                    <li>
                      <Link
                        className="dropdown-item small"
                        to="/profile"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <i className="bi bi-person-circle me-2 text-muted" />
                        Profile Settings
                      </Link>
                    </li>

                    {(role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'ADMIN') && (
                      <>
                        <li><hr className="dropdown-divider" /></li>
                        <li className="dropdown-header small text-primary fw-bold">Admin Portal</li>
                        <li>
                          <Link
                            className="dropdown-item small text-primary fw-medium"
                            to="/admin"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <i className="bi bi-shield-lock me-2" />
                            Admin Console
                          </Link>
                        </li>
                        <li>
                          <Link
                            className="dropdown-item small"
                            to="/admin/movies"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <i className="bi bi-camera-reels me-2 text-muted" />
                            Manage Movies
                          </Link>
                        </li>
                        <li>
                          <Link
                            className="dropdown-item small"
                            to="/admin/theatres"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <i className="bi bi-building me-2 text-muted" />
                            Venues & Screens
                          </Link>
                        </li>
                        <li>
                          <Link
                            className="dropdown-item small"
                            to="/admin/shows"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <i className="bi bi-calendar3 me-2 text-muted" />
                            Show Scheduling
                          </Link>
                        </li>
                        <li>
                          <Link
                            className="dropdown-item small"
                            to="/admin/bookings"
                            onClick={() => setActiveDropdown(null)}
                          >
                            <i className="bi bi-ticket-perforated me-2 text-muted" />
                            Bookings Oversight
                          </Link>
                        </li>
                      </>
                    )}

                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button
                        className="dropdown-item small text-danger"
                        onClick={() => {
                          setActiveDropdown(null);
                          handleLogout();
                        }}
                      >
                        <i className="bi bi-box-arrow-right me-2" />
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <Link to="/login" className="btn btn-sm btn-outline-secondary fw-medium px-3">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-sm btn-primary fw-medium px-3">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;


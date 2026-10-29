import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginSuccess,
  loginDemoUser,
  loginDemoAdmin,
} from '../features/auth/authSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { toast } from 'react-toastify';

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email address is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Please provide a valid email.';
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    // Simulate login for Part 1 foundation (Full JWT / DB in Part 2)
    const simulatedUser = {
      id: `usr_${Date.now()}`,
      name: email.split('@')[0],
      email,
      role: email.includes('admin') ? 'admin' : 'user',
      phone: '+1 (555) 012-3456',
    };

    dispatch(
      loginSuccess({
        user: simulatedUser,
        token: `jwt_token_${Date.now()}`,
      })
    );

    toast.success(`Welcome back, ${simulatedUser.name}!`);
    navigate(simulatedUser.role === 'admin' ? '/admin' : '/');
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-7 col-lg-5">
          <div className="bg-white border rounded p-4 p-md-5 shadow-sm">
            <div className="text-center mb-4">
              <Link
                to="/"
                className="d-inline-flex align-items-center gap-2 fw-bold text-primary fs-4 text-decoration-none mb-2"
              >
                <span className="bg-primary text-white rounded px-2 py-0.5">
                  <i className="bi bi-film" />
                </span>
                <span>IMovies</span>
              </Link>
              <h1 className="h5 fw-bold text-dark mb-1">Sign In to Your Account</h1>
              <p className="text-secondary small mb-0">
                Access your movie tickets, booking history, and profile
              </p>
            </div>

            {/* Quick Demo Access Box */}
            <div className="bg-light border rounded p-3 mb-4">
              <div className="small fw-bold text-secondary mb-2 text-center">
                <i className="bi bi-lightning-charge-fill text-warning me-1" />
                Quick One-Click Demo Access
              </div>
              <div className="d-grid gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center gap-2"
                  onClick={() => {
                    dispatch(loginDemoUser());
                    toast.success('Signed in as Demo Moviegoer (Alex)');
                    navigate('/');
                  }}
                >
                  <i className="bi bi-person" />
                  Continue as Demo Customer
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center gap-2"
                  onClick={() => {
                    dispatch(loginDemoAdmin());
                    toast.success('Signed in as Demo Administrator (Sarah)');
                    navigate('/admin');
                  }}
                >
                  <i className="bi bi-shield-lock" />
                  Continue as Cinema Administrator
                </button>
              </div>
            </div>

            <div className="position-relative text-center mb-4">
              <hr />
              <span className="position-absolute top-50 start-50 translate-middle bg-white px-2 small text-muted">
                or sign in with email
              </span>
            </div>

            <form onSubmit={handleSubmit}>
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                icon={<i className="bi bi-envelope" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                icon={<i className="bi bi-lock" />}
                required
              />

              <div className="d-flex align-items-center justify-content-between mb-4 small">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="rememberMeCheck"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="form-check-label text-secondary" htmlFor="rememberMeCheck">
                    Remember me
                  </label>
                </div>
                <a href="#forgot" className="text-decoration-none text-primary" onClick={(e) => { e.preventDefault(); toast.info('Password recovery link sent in demo mode.'); }}>
                  Forgot password?
                </a>
              </div>

              <Button type="submit" variant="primary" className="w-100 py-2 mb-3" loading={loading}>
                Sign In
              </Button>
            </form>

            <div className="text-center text-muted small mt-3">
              Don't have an account yet?{' '}
              <Link to="/register" className="fw-semibold text-primary text-decoration-none">
                Register here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../features/auth/authSlice';
import { authApi } from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { toast } from 'react-toastify';

const RegisterPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required.';
    if (!formData.email.trim()) errs.email = 'Email address is required.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Please provide a valid email.';
    if (!formData.phone.trim()) errs.phone = 'Contact phone number is required.';
    if (!formData.password) errs.password = 'Password is required.';
    else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!agreed) {
      errs.agreed = 'You must accept the terms of service.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const response = await authApi.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      const { user, accessToken } = response.data;
      dispatch(
        loginSuccess({
          user,
          token: accessToken,
        })
      );

      toast.success('Registration successful! Welcome to IMovies.');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
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
              <h1 className="h5 fw-bold text-dark mb-1">Create Your Account</h1>
              <p className="text-secondary small mb-0">
                Join IMovies to book seats, access instant QR tickets, and manage reservations
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <Input
                label="Full Name"
                name="name"
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
                icon={<i className="bi bi-person" />}
                required
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                icon={<i className="bi bi-envelope" />}
                required
              />

              <Input
                label="Mobile Phone Number"
                name="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                icon={<i className="bi bi-telephone" />}
                required
              />

              <div className="row">
                <div className="col-md-6">
                  <Input
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    icon={<i className="bi bi-lock" />}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <Input
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    icon={<i className="bi bi-shield-check" />}
                    required
                  />
                </div>
              </div>

              <div className="form-check mb-4">
                <input
                  type="checkbox"
                  className={`form-check-input ${errors.agreed ? 'is-invalid' : ''}`}
                  id="agreeTerms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <label className="form-check-label small text-secondary" htmlFor="agreeTerms">
                  I agree to the <a href="#terms" className="text-primary text-decoration-none">Terms of Service</a> and <a href="#privacy" className="text-primary text-decoration-none">Privacy Policy</a>.
                </label>
                {errors.agreed && <div className="invalid-feedback d-block">{errors.agreed}</div>}
              </div>

              <Button type="submit" variant="primary" className="w-100 py-2 mb-3" loading={loading}>
                Register Account
              </Button>
            </form>

            <div className="text-center text-muted small mt-3">
              Already have an account?{' '}
              <Link to="/login" className="fw-semibold text-primary text-decoration-none">
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { loginSuccess } from '../features/auth/authSlice';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { toast } from 'react-toastify';

const UserProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: user?.name || 'Alex Johnson',
    email: user?.email || 'alex.johnson@example.com',
    phone: user?.phone || '+1 (555) 843-9201',
    favoriteGenre: 'Sci-Fi',
    wheelchairAccess: false,
    emailAlerts: true,
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [e.target.name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user) {
      dispatch(
        loginSuccess({
          user: {
            ...user,
            name: formData.name,
            phone: formData.phone,
          },
          token: localStorage.getItem('imovies_token') || 'token',
        })
      );
    }
    setIsSaved(true);
    toast.success('Your profile preferences have been updated.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1 className="h3 fw-bold text-dark mb-1">Account & Preferences</h1>
        <p className="text-secondary small mb-0">
          Manage your personal details, accessibility settings, and cinema preferences
        </p>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="bg-white border rounded p-4 shadow-sm mb-4">
            <h2 className="h6 fw-bold text-dark mb-3 pb-2 border-bottom">Profile Information</h2>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <Input
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    disabled
                    helperText="Contact support to change verified email"
                  />
                </div>
                <div className="col-md-6">
                  <Input
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-secondary small mb-1">
                    Favorite Movie Genre
                  </label>
                  <select
                    className="form-select"
                    name="favoriteGenre"
                    value={formData.favoriteGenre}
                    onChange={handleChange}
                  >
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Action">Action</option>
                    <option value="Drama">Drama</option>
                    <option value="Thriller">Thriller</option>
                    <option value="Comedy">Comedy</option>
                  </select>
                </div>
              </div>

              <h2 className="h6 fw-bold text-dark mt-4 mb-3 pb-2 border-bottom">
                Accessibility & Notifications
              </h2>

              <div className="d-flex flex-column gap-2 mb-4">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="wheelchairCheck"
                    name="wheelchairAccess"
                    checked={formData.wheelchairAccess}
                    onChange={handleChange}
                  />
                  <label className="form-check-label small text-dark" htmlFor="wheelchairCheck">
                    <strong>Highlight Wheelchair Accessible Seating by Default</strong>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Automatically surfaces dedicated companion and accessible spaces on seat maps.
                    </div>
                  </label>
                </div>

                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="alertsCheck"
                    name="emailAlerts"
                    checked={formData.emailAlerts}
                    onChange={handleChange}
                  />
                  <label className="form-check-label small text-dark" htmlFor="alertsCheck">
                    <strong>Showtime & E-Ticket Email Notifications</strong>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      Receive schedule reminders and ticket QR codes directly in your inbox.
                    </div>
                  </label>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
                {isSaved && (
                  <span className="text-success small fw-medium">
                    <i className="bi bi-check-circle-fill me-1" />
                    Changes saved successfully
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Account Summary Sidebar */}
        <div className="col-lg-4">
          <div className="bg-white border rounded p-4 shadow-sm">
            <div className="text-center pb-3 border-bottom mb-3">
              <div
                className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold fs-4 mb-2"
                style={{ width: '64px', height: '64px' }}
              >
                {formData.name.charAt(0)}
              </div>
              <h5 className="fw-bold text-dark mb-0">{formData.name}</h5>
              <div className="text-muted small">{formData.email}</div>
              <span className="badge bg-light text-secondary border mt-2">
                Standard Moviegoer Member
              </span>
            </div>

            <div className="d-flex justify-content-between py-2 border-bottom small">
              <span className="text-muted">Account Tier</span>
              <span className="fw-bold text-primary">IMovies Club</span>
            </div>
            <div className="d-flex justify-content-between py-2 border-bottom small">
              <span className="text-muted">Total Bookings</span>
              <span className="fw-bold text-dark">4</span>
            </div>
            <div className="d-flex justify-content-between py-2 small">
              <span className="text-muted">Reward Points</span>
              <span className="fw-bold text-success">350 pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;

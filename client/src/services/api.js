/**
 * Axios API Service Client
 * Configures base URL, authentication headers, request interceptors, and response parsing.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Attach JWT token if available in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('imovies_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Unify responses and extract payload
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const errorPayload = {
      message:
        error.response?.data?.message ||
        error.message ||
        'An unexpected network error occurred.',
      status: error.response?.status || 500,
      errors: error.response?.data?.errors || null,
    };
    return Promise.reject(errorPayload);
  }
);

// Auth Service Endpoints
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  refreshToken: (token) => api.post('/auth/refresh', { token }),
  logout: () => api.post('/auth/logout'),
};

// Users & Profile Endpoints
export const usersApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.patch('/users/profile', data),
  changePassword: (data) => api.put('/users/password', data),
};

// Movie Catalogue Endpoints
export const moviesApi = {
  getAll: (params = {}) => api.get('/movies', { params }),
  getById: (id) => api.get(`/movies/${id}`),
  create: (data) => api.post('/movies', data),
  update: (id, data) => api.put(`/movies/${id}`, data),
  delete: (id) => api.delete(`/movies/${id}`),
};

// Theatres Endpoints
export const theatresApi = {
  getAll: (params = {}) => api.get('/theatres', { params }),
  getById: (id) => api.get(`/theatres/${id}`),
  create: (data) => api.post('/theatres', data),
  update: (id, data) => api.put(`/theatres/${id}`, data),
  delete: (id) => api.delete(`/theatres/${id}`),
};

// Shows & Schedules Endpoints
export const showsApi = {
  getAll: (params = {}) => api.get('/shows', { params }),
  getById: (id) => api.get(`/shows/${id}`),
  create: (data) => api.post('/shows', data),
  update: (id, data) => api.put(`/shows/${id}`, data),
  delete: (id) => api.delete(`/shows/${id}`),
};

// Seats & Availability Endpoints
export const seatsApi = {
  getLayout: (showId) => api.get(`/seats/show/${showId}`),
  hold: (data) => api.post('/seats/hold', data),
  release: (data) => api.post('/seats/release', data),
  recommend: (data) => api.post('/seats/recommend', data),
};

// Booking Endpoints
export const bookingsApi = {
  create: (data) => api.post('/bookings', data),
  getAll: (params = {}) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id, data = {}) => api.post(`/bookings/${id}/cancel`, data),
  checkIn: (data) => api.post('/bookings/check-in', data),
  getAllAdmin: (params = {}) => api.get('/bookings/admin/all', { params }),
};

// Admin Operations Endpoints
export const adminApi = {
  getOverview: () => api.get('/admin/overview'),
  getBookings: (params = {}) => api.get('/bookings/admin/all', { params }),
  getUsers: (params = {}) => api.get('/users', { params }),
};

// Payment Endpoints
export const paymentsApi = {
  process: (data) => api.post('/payments/process', data),
  getByBooking: (bookingId) => api.get(`/payments/booking/${bookingId}`),
};

// Notifications Endpoints
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// Health Check Endpoint
export const healthApi = {
  check: () => axios.get('/api/health').then((res) => res.data),
};

export default api;

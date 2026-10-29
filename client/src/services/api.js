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

// API service endpoints
export const moviesApi = {
  getAll: (params = {}) => api.get('/movies', { params }),
  getById: (id) => api.get(`/movies/${id}`),
  create: (data) => api.post('/movies', data),
};

export const healthApi = {
  check: () => axios.get('/api/health').then((res) => res.data),
};

export default api;

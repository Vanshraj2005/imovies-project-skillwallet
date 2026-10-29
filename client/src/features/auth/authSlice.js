import { createSlice } from '@reduxjs/toolkit';

// Retrieve initial auth state from localStorage if previously stored
const savedToken = localStorage.getItem('imovies_token');
const savedUser = localStorage.getItem('imovies_user')
  ? JSON.parse(localStorage.getItem('imovies_user'))
  : null;

const initialState = {
  user: savedUser,
  token: savedToken,
  isAuthenticated: !!savedToken,
  role: savedUser?.role || 'guest',
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.role = action.payload.user?.role || 'user';
      localStorage.setItem('imovies_token', action.payload.token);
      localStorage.setItem('imovies_user', JSON.stringify(action.payload.user));
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.role = 'guest';
      state.loading = false;
      state.error = null;
      localStorage.removeItem('imovies_token');
      localStorage.removeItem('imovies_user');
    },
    // Quick Demo convenience logins for previewing user & admin experiences
    loginDemoAdmin: (state) => {
      const demoAdmin = {
        id: 'usr_admin_01',
        name: 'Sarah Connor',
        email: 'admin@imovies.com',
        role: 'admin',
        phone: '+1 (555) 019-2834',
      };
      state.user = demoAdmin;
      state.token = 'demo_admin_jwt_token_sample';
      state.isAuthenticated = true;
      state.role = 'admin';
      state.error = null;
      localStorage.setItem('imovies_token', state.token);
      localStorage.setItem('imovies_user', JSON.stringify(demoAdmin));
    },
    loginDemoUser: (state) => {
      const demoUser = {
        id: 'usr_customer_01',
        name: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        role: 'user',
        phone: '+1 (555) 843-9201',
      };
      state.user = demoUser;
      state.token = 'demo_user_jwt_token_sample';
      state.isAuthenticated = true;
      state.role = 'user';
      state.error = null;
      localStorage.setItem('imovies_token', state.token);
      localStorage.setItem('imovies_user', JSON.stringify(demoUser));
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  loginDemoAdmin,
  loginDemoUser,
} = authSlice.actions;

export default authSlice.reducer;

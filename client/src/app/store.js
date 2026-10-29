import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import moviesReducer from '../features/movies/moviesSlice';
import bookingReducer from '../features/booking/bookingSlice';
import uiReducer from '../features/ui/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    movies: moviesReducer,
    booking: bookingReducer,
    ui: uiReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';

// Public & Customer Pages
import HomePage from './pages/HomePage';
import MoviesPage from './pages/MoviesPage';
import MovieDetailsPage from './pages/MovieDetailsPage';
import TheatresPage from './pages/TheatresPage';
import ShowsPage from './pages/ShowsPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import BookingSummaryPage from './pages/BookingSummaryPage';
import BookingConfirmationPage from './pages/BookingConfirmationPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserProfilePage from './pages/UserProfilePage';
import BookingHistoryPage from './pages/BookingHistoryPage';
import NotFoundPage from './pages/NotFoundPage';

// Admin Pages
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminMoviesPage from './pages/AdminMoviesPage';

function App() {
  return (
    <Routes>
      {/* Customer & Public Routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="movies" element={<MoviesPage />} />
        <Route path="movies/:id" element={<MovieDetailsPage />} />
        <Route path="theatres" element={<TheatresPage />} />
        <Route path="shows" element={<ShowsPage />} />
        <Route path="seats" element={<SeatSelectionPage />} />
        <Route path="checkout" element={<BookingSummaryPage />} />
        <Route path="confirmation" element={<BookingConfirmationPage />} />
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="dashboard" element={<BookingHistoryPage />} />
        <Route path="bookings" element={<BookingHistoryPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin Operations Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="movies" element={<AdminMoviesPage />} />
      </Route>
    </Routes>
  );
}

export default App;

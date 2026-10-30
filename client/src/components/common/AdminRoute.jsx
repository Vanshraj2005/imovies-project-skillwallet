import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Admin Route Wrapper
 * Ensures only authenticated users with ADMIN role can access cinema administration.
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, role, user, loading } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Validating admin credentials...</span>
        </div>
      </div>
    );
  }

  const isAdmin =
    isAuthenticated &&
    (String(role).toUpperCase() === 'ADMIN' ||
      String(user?.role).toUpperCase() === 'ADMIN');

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;


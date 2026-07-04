import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route protection wrapper component for Administrator paths.
 * Restricts access to admin and super_admin roles, redirecting guests and customers to home.
 * Optionally enforces an exact requiredRole clearance level.
 */
export default function AdminRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  // If auth state is still restoring from refresh token, render nothing/loading
  if (loading) {
    return null;
  }

  // If user is not authenticated or does not possess administrative roles, redirect silently to home
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return <Navigate to="/" replace />;
  }

  // If a specific role clearance level is required and not matched, redirect to admin landing page
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/admin" replace />;
  }

  // Render children if wrapped explicitly, or Outlet for nested routes
  return children ? children : <Outlet />;
}

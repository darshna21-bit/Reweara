import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import OutfitListing from './pages/OutfitListing';
import OutfitDetail from './pages/OutfitDetail';
import MyBookings from './pages/MyBookings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StyleGuide from './StyleGuide';

// Admin Dashboard Components
import AdminRoute from './components/AdminRoute';
import AdminLayout from './layouts/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import AdminOutfits from './pages/admin/AdminOutfits';
import AdminOutfitForm from './pages/admin/AdminOutfitForm';
import AdminOutfitEdit from './pages/admin/AdminOutfitEdit';
import AdminBookings from './pages/admin/AdminBookings';
import AdminRefunds from './pages/admin/AdminRefunds';
import AdminManageUsers from './pages/admin/AdminManageUsers';

/**
 * Layout wrapper for all customer-facing routes.
 * Ensures the main customer navigation bar is rendered alongside page contents.
 */
function CustomerLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

/**
 * Main Application Routing Container
 * Configures the router to deliver Home on root, OutfitListing on /outfits,
 * OutfitDetail on /outfits/:slugOrId, Login/Signup interfaces, and protected Admin paths.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer Facing Pages */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/outfits" element={<OutfitListing />} />
            <Route path="/outfits/:slugOrId" element={<OutfitDetail />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* Retain StyleGuide route under /style-guide for reference/debugging */}
            <Route path="/style-guide" element={<StyleGuide />} />
          </Route>

          {/* Admin Dashboard Protected Nested Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="outfits" element={<AdminOutfits />} />
              <Route path="outfits/new" element={<AdminOutfitForm />} />
              <Route path="outfits/:id/edit" element={<AdminOutfitEdit />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="refunds" element={<AdminRefunds />} />
              <Route
                path="admins"
                element={
                  <AdminRoute requiredRole="super_admin">
                    <AdminManageUsers />
                  </AdminRoute>
                }
              />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

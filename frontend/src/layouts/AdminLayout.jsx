import React, { useState } from 'react';
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Admin Layout Shell Component
 * Implements a split sidebar navigation structure:
 * - Desktop: Collapsible left sidebar + main content panel.
 * - Mobile: Top header bar + slide-in drawer sidebar + click-dismiss backdrop (clean sibling stacking).
 * Utilizes a denser, utilitarian layout scale for efficient scanning.
 */
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Admin logout failed:', err);
    }
  };

  // Shared Sidebar Content to preserve DRY logic
  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full bg-white text-brand-espresso w-64 flex-shrink-0">
      <div className="p-5 space-y-6">
        {/* Wordmark Branding */}
        <div className="border-b border-brand-dust/10 pb-4">
          <Link 
            to="/admin" 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="font-serif text-xl tracking-tight text-brand-espresso hover:text-brand-dust transition-colors duration-300 block"
          >
            ReWeara Admin
          </Link>
          <span className="text-[10px] uppercase tracking-wider text-brand-dust/80 font-semibold block mt-1">
            Management Panel
          </span>
        </div>

        {/* Dense Navigation Item Registry */}
        <nav className="flex flex-col space-y-1">
          <NavLink
            to="/admin"
            end
            onClick={() => setIsMobileSidebarOpen(false)}
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-espresso text-brand-cream shadow-sm' 
                  : 'text-brand-espresso/80 hover:bg-brand-cream hover:text-brand-espresso'
              }`
            }
          >
            Overview
          </NavLink>
          <NavLink
            to="/admin/outfits"
            onClick={() => setIsMobileSidebarOpen(false)}
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-espresso text-brand-cream shadow-sm' 
                  : 'text-brand-espresso/80 hover:bg-brand-cream hover:text-brand-espresso'
              }`
            }
          >
            Outfits
          </NavLink>
          <NavLink
            to="/admin/bookings"
            onClick={() => setIsMobileSidebarOpen(false)}
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-espresso text-brand-cream shadow-sm' 
                  : 'text-brand-espresso/80 hover:bg-brand-cream hover:text-brand-espresso'
              }`
            }
          >
            Bookings
          </NavLink>
          <NavLink
            to="/admin/refunds"
            onClick={() => setIsMobileSidebarOpen(false)}
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-brand-espresso text-brand-cream shadow-sm' 
                  : 'text-brand-espresso/80 hover:bg-brand-cream hover:text-brand-espresso'
              }`
            }
          >
            Refunds
          </NavLink>

          {/* SuperAdmin Role Guard Link */}
          {user && user.role === 'super_admin' && (
            <NavLink
              to="/admin/admins"
              onClick={() => setIsMobileSidebarOpen(false)}
              className={({ isActive }) => 
                `flex items-center px-3 py-2 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-espresso text-brand-cream shadow-sm' 
                    : 'text-brand-espresso/80 hover:bg-brand-cream hover:text-brand-espresso'
                }`
              }
            >
              Manage Admins
            </NavLink>
          )}
        </nav>
      </div>

      {/* Bottom User Profile Controls */}
      <div className="p-5 border-t border-brand-dust/10 space-y-4">
        {/* User Card */}
        <div className="flex flex-col space-y-0.5">
          <span className="text-[10px] uppercase tracking-wider text-brand-dust font-light">
            Logged In As
          </span>
          <span className="text-xs font-semibold text-brand-espresso truncate">
            {user?.name}
          </span>
          <span className="text-[9px] uppercase tracking-widest font-bold text-brand-gold">
            {user?.role}
          </span>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-col space-y-2 pt-1">
          <Link
            to="/"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="text-center border border-brand-espresso/20 hover:border-brand-espresso text-brand-espresso py-2 rounded-soft text-[10px] uppercase tracking-widest font-medium transition-all duration-200"
          >
            Back to Site
          </Link>
          <button
            onClick={handleLogout}
            className="bg-brand-espresso hover:bg-brand-dust text-brand-cream py-2 rounded-soft text-[10px] uppercase tracking-widest font-medium transition-all duration-200 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-brand-cream text-brand-espresso flex flex-col md:flex-row relative">
        
        {/* 1. Desktop Left Sidebar Panel */}
        <aside className={`hidden md:block h-screen sticky top-0 flex-shrink-0 overflow-hidden transition-all duration-300 ${
          isCollapsed ? 'w-0 opacity-0 border-r-0' : 'w-64 border-r border-brand-dust/10'
        }`}>
          <SidebarContent />
        </aside>

        {/* 2. Mobile Top Navigation Bar */}
        <header className="md:hidden h-14 bg-white border-b border-brand-dust/10 flex items-center justify-between px-4 sticky top-0 z-30 w-full">
          <Link to="/admin" className="font-serif text-lg tracking-tight text-brand-espresso">
            ReWeara Admin
          </Link>
          
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="text-brand-espresso hover:text-brand-dust focus:outline-none transition-colors p-1"
            aria-label="Toggle admin sidebar"
            aria-expanded={isMobileSidebarOpen}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileSidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </header>

        {/* 3. Main Dashboard Workspace Panel */}
        <main className="flex-1 min-w-0 p-6 sm:p-8 md:p-10 bg-brand-cream overflow-y-auto relative">
          
          {/* Desktop-only Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center p-2 mb-4 rounded-soft border border-brand-dust/20 bg-white hover:border-brand-espresso text-brand-espresso transition-all duration-200 cursor-pointer shadow-xs"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              </svg>
            )}
          </button>

          <Outlet />
        </main>

      </div>

      {/* 4. Sibling Stacking-Context Drawer Overlays (Mobile view only) */}
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-brand-espresso/45 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Slide-in Sidebar Panel */}
          <aside className="fixed top-0 left-0 h-full w-64 border-r border-brand-dust/10 bg-white z-50 md:hidden animate-fade-in shadow-xl">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}

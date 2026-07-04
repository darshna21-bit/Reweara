import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Shared Luxury Navigation Header Component
 * Sticky top placement, responsive structure, and context-dependent auth menus.
 */
export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-brand-dust/10 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 h-16 flex items-center justify-between">
          
          {/* Brand Logo Wordmark */}
          <Link 
            to="/" 
            onClick={() => setIsMenuOpen(false)}
            className="font-serif text-xl sm:text-2xl text-brand-espresso tracking-tight hover:text-brand-dust transition-colors duration-300 flex-shrink-0"
          >
            ReWeara
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-8 text-xs uppercase tracking-widest font-medium">
            <Link 
              to="/outfits" 
              className="text-brand-espresso hover:text-brand-dust transition-colors duration-300"
            >
              Browse
            </Link>
            {user && (
              <Link 
                to="/my-bookings" 
                className="text-brand-espresso hover:text-brand-dust transition-colors duration-300"
              >
                My Bookings
              </Link>
            )}
          </nav>

          {/* Right Authentication Context Controls (Desktop) */}
          <div className="hidden md:flex items-center space-x-6 text-xs uppercase tracking-widest font-medium">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-brand-dust normal-case font-light text-[11px] sm:text-xs">
                  Hello, <span className="font-medium text-brand-espresso">{user.name.split(' ')[0]}</span>
                </span>
                {(user.role === 'admin' || user.role === 'super_admin') && (
                  <Link
                    to="/admin"
                    className="border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-espresso px-3.5 py-1.5 rounded-soft text-[10px] sm:text-xs uppercase tracking-widest font-medium transition-all duration-300"
                  >
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-4 py-2 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-6">
                <Link 
                  to="/login" 
                  className="text-brand-espresso hover:text-brand-dust transition-colors duration-300"
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="bg-brand-espresso text-brand-cream hover:bg-brand-dust px-4 py-2 rounded-soft text-xs uppercase tracking-widest font-medium transition-all duration-300"
                >
                  Signup
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-brand-espresso hover:text-brand-dust focus:outline-none transition-colors duration-300 p-1"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

        </div>

      </header>

      {isMenuOpen && (
        <>
          {/* Backdrop for click-outside dismissal */}
          <div 
            className="fixed inset-0 bg-brand-espresso/45 z-40 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Menu Dropdown Container */}
          <div className="fixed top-16 left-0 w-full bg-white border-b border-brand-dust/10 shadow-lg md:hidden animate-fade-in z-50">
            <div className="px-6 py-6 flex flex-col space-y-4 text-xs uppercase tracking-widest font-medium">
              <Link 
                to="/outfits" 
                onClick={() => setIsMenuOpen(false)}
                className="text-brand-espresso hover:text-brand-dust transition-colors py-2 border-b border-brand-cream"
              >
                Browse
              </Link>
              {user && (
                <Link 
                  to="/my-bookings" 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-brand-espresso hover:text-brand-dust transition-colors py-2 border-b border-brand-cream"
                >
                  My Bookings
                </Link>
              )}
              
              <div className="pt-2 flex flex-col space-y-3">
                {user ? (
                  <>
                    <span className="text-brand-dust normal-case font-light text-xs py-1">
                      Hello, <span className="font-medium text-brand-espresso">{user.name}</span>
                    </span>
                    {(user.role === 'admin' || user.role === 'super_admin') && (
                      <Link
                        to="/admin"
                        onClick={() => setIsMenuOpen(false)}
                        className="border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-espresso py-2 rounded-soft text-center text-xs uppercase tracking-widest font-medium transition-all duration-300 w-full block"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="bg-brand-espresso text-brand-cream hover:bg-brand-dust py-2.5 rounded-soft text-center text-xs uppercase tracking-widest font-medium transition-all duration-300 w-full"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col space-y-3">
                    <Link 
                      to="/login" 
                      onClick={() => setIsMenuOpen(false)}
                      className="text-brand-espresso hover:text-brand-dust transition-colors py-2 border-b border-brand-cream"
                    >
                      Login
                    </Link>
                    <Link 
                      to="/signup" 
                      onClick={() => setIsMenuOpen(false)}
                      className="bg-brand-espresso text-brand-cream hover:bg-brand-dust py-2.5 rounded-soft text-center text-xs uppercase tracking-widest font-medium transition-all duration-300 w-full block"
                    >
                      Signup
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

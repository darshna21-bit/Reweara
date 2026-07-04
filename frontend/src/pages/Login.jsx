import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Login Page Component
 * Renders the email & password credentials login panel, matching approved styling tokens.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Success redirects to originating page or home
      const from = location.state?.from || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || 
        err.message || 
        'Login failed. Please verify credentials and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-cream text-brand-espresso flex items-center justify-center px-4 py-12 animate-fade-in">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-luxury border border-brand-dust/15 shadow-sm space-y-6">
        
        {/* Header Block */}
        <div className="text-center space-y-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-brand-dust font-semibold block">
            Welcome Back
          </span>
          <h2 className="text-3xl font-serif tracking-tight text-brand-espresso">
            Log In
          </h2>
          <p className="text-xs text-brand-dust font-light">
            Access your exclusive luxury wardrobe catalog.
          </p>
        </div>

        {/* Inline Error Alert Box */}
        {error && (
          <div className="bg-red-50 border border-red-200/50 rounded-soft p-3 text-center text-xs text-red-600">
            ⚠️ {error}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label 
              htmlFor="email" 
              className="text-[10px] uppercase tracking-wider text-brand-dust font-semibold block"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@reweara.com"
              className="w-full bg-brand-cream border border-brand-dust/10 focus:border-brand-espresso focus:ring-1 focus:ring-brand-espresso rounded-soft px-4 py-3 text-sm transition-all duration-300 font-light outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label 
              htmlFor="password" 
              className="text-[10px] uppercase tracking-wider text-brand-dust font-semibold block"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-brand-cream border border-brand-dust/10 focus:border-brand-espresso focus:ring-1 focus:ring-brand-espresso rounded-soft px-4 py-3 text-sm transition-all duration-300 font-light outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-espresso text-brand-cream hover:bg-brand-dust disabled:bg-brand-dust/50 disabled:cursor-not-allowed py-3.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-[1px] cursor-pointer mt-2"
          >
            {isSubmitting ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-brand-dust pt-2 border-t border-brand-cream font-light">
          Don't have an account?{' '}
          <Link 
            to="/signup" 
            state={{ from: location.state?.from }}
            className="text-brand-espresso font-medium hover:underline hover:text-brand-dust transition-colors"
          >
            Sign Up Now
          </Link>
        </div>

      </div>
    </div>
  );
}

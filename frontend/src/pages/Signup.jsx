import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Signup Page Component
 * Renders user registration panel and integrates client-side validators matching Zod backend rules.
 */
export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // UX validation alerts
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client-side validator matching backend constraints
  const validateForm = () => {
    const errors = {};

    if (name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = 'Please provide a valid email address.';
    }

    // Phone validation matching: /^[6-9]\d{9}$/
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      errors.phone = 'Phone number must be a valid 10-digit Indian mobile number (starting with 6-9).';
    }

    // Password validation: min 8, 1 uppercase, 1 number
    if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must contain at least one uppercase letter.';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must contain at least one digit.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Auto-logs in internally upon successful signup response
      await signup(name, email, password, phone);
      // Success redirects to originating page or home
      const from = location.state?.from || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || 
        err.message || 
        'Registration failed. Please check your details and try again.'
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
            Start Curation
          </span>
          <h2 className="text-3xl font-serif tracking-tight text-brand-espresso">
            Create Account
          </h2>
          <p className="text-xs text-brand-dust font-light">
            Sign up to access India's finest fashion rentals.
          </p>
        </div>

        {/* Inline Submission Error */}
        {error && (
          <div className="bg-red-50 border border-red-200/50 rounded-soft p-3 text-center text-xs text-red-600">
            ⚠️ {error}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Field */}
          <div className="space-y-1">
            <label 
              htmlFor="name" 
              className="text-[10px] uppercase tracking-wider text-brand-dust font-semibold block"
            >
              Full Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Darshna Shingavi"
              className="w-full bg-brand-cream border border-brand-dust/10 focus:border-brand-espresso focus:ring-1 focus:ring-brand-espresso rounded-soft px-4 py-2.5 text-sm transition-all duration-300 font-light outline-none"
            />
            {validationErrors.name && (
              <span className="text-[10px] text-red-500 font-light block mt-0.5">{validationErrors.name}</span>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-1">
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
              placeholder="darshna@reweara.com"
              className="w-full bg-brand-cream border border-brand-dust/10 focus:border-brand-espresso focus:ring-1 focus:ring-brand-espresso rounded-soft px-4 py-2.5 text-sm transition-all duration-300 font-light outline-none"
            />
            {validationErrors.email && (
              <span className="text-[10px] text-red-500 font-light block mt-0.5">{validationErrors.email}</span>
            )}
          </div>

          {/* Phone Field */}
          <div className="space-y-1">
            <label 
              htmlFor="phone" 
              className="text-[10px] uppercase tracking-wider text-brand-dust font-semibold block"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full bg-brand-cream border border-brand-dust/10 focus:border-brand-espresso focus:ring-1 focus:ring-brand-espresso rounded-soft px-4 py-2.5 text-sm transition-all duration-300 font-light outline-none"
            />
            {validationErrors.phone && (
              <span className="text-[10px] text-red-500 font-light block mt-0.5">{validationErrors.phone}</span>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1">
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
              placeholder="Min 8 chars, 1 uppercase, 1 digit"
              className="w-full bg-brand-cream border border-brand-dust/10 focus:border-brand-espresso focus:ring-1 focus:ring-brand-espresso rounded-soft px-4 py-2.5 text-sm transition-all duration-300 font-light outline-none"
            />
            {validationErrors.password && (
              <span className="text-[10px] text-red-500 font-light block mt-0.5">{validationErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-espresso text-brand-cream hover:bg-brand-dust disabled:bg-brand-dust/50 disabled:cursor-not-allowed py-3.5 rounded-soft text-xs uppercase tracking-widest font-semibold transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-[1px] cursor-pointer mt-2"
          >
            {isSubmitting ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-brand-dust pt-2 border-t border-brand-cream font-light">
          Already have an account?{' '}
          <Link 
            to="/login" 
            state={{ from: location.state?.from }}
            className="text-brand-espresso font-medium hover:underline hover:text-brand-dust transition-colors"
          >
            Log In
          </Link>
        </div>

      </div>
    </div>
  );
}

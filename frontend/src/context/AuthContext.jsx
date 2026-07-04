import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAccessToken, onAuthFailure, performRefreshToken } from '../api/client.js';
import { loginApi, signupApi, logoutApi } from '../api/auth.js';

// 1. Create global context
const AuthContext = createContext(null);

/**
 * AuthProvider wraps application components to supply global authentication states.
 * Uses secure in-memory access token storage paired with httpOnly refresh cookies.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessTokenState, setAccessTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to update state and sync Axios authorization headers
  const handleAuthSuccess = (token, userData) => {
    setAccessTokenState(token);
    setAccessToken(token);
    setUser(userData);
  };

  const handleAuthClear = () => {
    setAccessTokenState(null);
    setAccessToken(null);
    setUser(null);
  };

  /**
   * Log in user using email and password credentials.
   */
  const login = async (email, password) => {
    const res = await loginApi({ email, password });
    if (res && res.data) {
      const { accessToken, user: userData } = res.data;
      handleAuthSuccess(accessToken, userData);
      return res.data;
    }
    throw new Error('Invalid login response from server.');
  };

  /**
   * Register a new customer profile.
   * Note: Excludes role to protect security boundaries.
   */
  const signup = async (name, email, password, phone) => {
    const res = await signupApi({ name, email, password, phone });
    if (res && res.data) {
      const { accessToken, user: userData } = res.data;
      handleAuthSuccess(accessToken, userData);
      return res.data;
    }
    throw new Error('Invalid signup response from server.');
  };

  /**
   * Terminate user session and clear credentials/cookies.
   */
  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Backend session cleanup during logout returned warning:', err);
    } finally {
      handleAuthClear();
    }
  };

  // Silently restore session on initial app load if refresh cookie is active
  useEffect(() => {
    // Register the Axios 401 interceptor logout callback
    onAuthFailure(() => {
      console.error('⚠️ Session expired (refresh token invalid). Clearing auth context.');
      handleAuthClear();
    });

    const restoreSession = async () => {
      try {
        const data = await performRefreshToken();
        if (data) {
          handleAuthSuccess(data.accessToken, data.user);
        }
      } catch (err) {
        // Failed refresh indicates guest user; fail silently
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const value = {
    user,
    accessToken: accessTokenState,
    loading,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? (
        children
      ) : (
        <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center space-y-4">
          <div className="w-8 h-8 border-2 border-brand-blush border-t-brand-espresso rounded-full animate-spin"></div>
          <p className="text-xs uppercase tracking-widest text-brand-dust font-light">
            Loading boutique services...
          </p>
        </div>
      )}
    </AuthContext.Provider>
  );
}

/**
 * Custom React Hook to consume authentication services.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed within an AuthProvider container.');
  }
  return context;
}

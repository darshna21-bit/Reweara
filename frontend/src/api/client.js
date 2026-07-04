import axios from 'axios';

// Module-level token holder for secure memory-only access token storage
let accessToken = null;
let refreshPromise = null;
let onAuthFailureCallback = null;

/**
 * Set the memory-only access token to be used on subsequent requests.
 * @param {string|null} token - JWT Access Token
 */
export const setAccessToken = (token) => {
  accessToken = token;
};

/**
 * Register a callback to be executed when the token refresh fails.
 * @param {Function} callback - Callback function to clear auth state
 */
export const onAuthFailure = (callback) => {
  onAuthFailureCallback = callback;
};

/**
 * Global Axios API Client Instance
 * Configures base URL dynamically from Vite env configuration,
 * and sets withCredentials to true for secure transit of HttpOnly cookies.
 */
const client = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  withCredentials: true
});

// Request Interceptor: Automatically attaches access token as bearer auth header if present
client.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Intercepts 401 Unauthorized errors and performs automatic silent token refresh
client.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized, and this is not a retry attempt, and not a refresh token request itself
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.url &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        // Await the shared refresh promise
        const data = await performRefreshToken();
        
        // Replay the original request with the new access token
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(originalRequest);
      } catch (retryError) {
        // If refresh failed, reject with the original 401 error
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Executes a silent refresh call, sharing the in-flight promise with any concurrent callers.
 * Resolves to the data object containing accessToken and user profile.
 */
export const performRefreshToken = () => {
  if (!refreshPromise) {
    refreshPromise = client.post('/auth/refresh-token')
      .then((res) => {
        if (res.data && res.data.success) {
          const { accessToken: newAccessToken, user } = res.data.data;
          setAccessToken(newAccessToken);
          return res.data.data; // Return the payload { accessToken, user }
        }
        throw new Error('Refresh response payload invalid.');
      })
      .catch((err) => {
        console.error('❌ Silent refresh failed. Invalidating session.', err);
        setAccessToken(null);
        if (onAuthFailureCallback) {
          onAuthFailureCallback();
        }
        throw err;
      })
      .finally(() => {
        // Guarantee cleanup of the stored Promise
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export default client;

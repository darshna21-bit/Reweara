import client from './client.js';

/**
 * Sends a signup request to register a new customer account.
 * 
 * @param {Object} data - Contains { name, email, password, phone }
 * @returns {Promise<Object>} - Backend response payload
 */
export const signupApi = async (data) => {
  const response = await client.post('/auth/signup', data);
  return response.data;
};

/**
 * Sends a login credentials request to authorize session.
 * 
 * @param {Object} data - Contains { email, password }
 * @returns {Promise<Object>} - Backend response payload
 */
export const loginApi = async (data) => {
  const response = await client.post('/auth/login', data);
  return response.data;
};

/**
 * Clears the active secure session cookies on the backend.
 * 
 * @returns {Promise<Object>} - Backend response payload
 */
export const logoutApi = async () => {
  const response = await client.post('/auth/logout');
  return response.data;
};

/**
 * Performs a silent token refresh using the secure httpOnly cookie.
 * 
 * @returns {Promise<Object>} - Backend response payload
 */
export const refreshTokenApi = async () => {
  const response = await client.post('/auth/refresh-token');
  return response.data;
};

/**
 * Fetches users for administration (SuperAdmin only).
 * If email is provided, searches by exact email.
 * If not, fetches all admin/super_admin users.
 * 
 * @param {string} [email] - Optional email filter
 * @returns {Promise<Object>} - Backend response payload
 */
export const getUsersApi = async (email) => {
  const url = email ? `/auth/admin/users?email=${encodeURIComponent(email)}` : '/auth/admin/users';
  const response = await client.get(url);
  return response.data;
};

/**
 * Updates a target user's role (SuperAdmin only).
 * 
 * @param {string} userId - Target user ID
 * @param {string} role - New role ('admin' or 'customer')
 * @returns {Promise<Object>} - Backend response payload
 */
export const updateUserRoleApi = async (userId, role) => {
  const response = await client.patch(`/auth/admin/${userId}/role`, { role });
  return response.data;
};

/**
 * Sends a request to dispatch a verification OTP to the target email.
 * 
 * @param {string} email - Target email address
 * @returns {Promise<Object>} - Backend response payload
 */
export const sendOtpApi = async (email) => {
  const response = await client.post('/auth/signup/send-otp', { email });
  return response.data;
};

/**
 * Sends a request to verify the OTP for the target email.
 * 
 * @param {string} email - Target email address
 * @param {string} otp - The 6-digit OTP code input
 * @returns {Promise<Object>} - Backend response payload
 */
export const verifyOtpApi = async (email, otp) => {
  const response = await client.post('/auth/signup/verify-otp', { email, otp });
  return response.data;
};

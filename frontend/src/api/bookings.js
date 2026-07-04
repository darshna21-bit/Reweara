import client from './client.js';

/**
 * Checks if a specific outfit is available for rent during the selected dates.
 * 
 * @param {string} outfitId - MongoDB ObjectID of the outfit
 * @param {string} startDate - YYYY-MM-DD date string
 * @param {string} endDate - YYYY-MM-DD date string
 * @returns {Promise<Object>} - Backend response payload
 */
export const checkAvailability = async (outfitId, startDate, endDate) => {
  const response = await client.post('/bookings/check-availability', {
    outfitId,
    startDate,
    endDate
  });
  return response.data;
};

/**
 * Initiates a temporary hold booking and generates a Razorpay Order.
 * 
 * @param {string} outfitId - MongoDB ObjectID of the outfit
 * @param {string} startDate - YYYY-MM-DD date string
 * @param {string} endDate - YYYY-MM-DD date string
 * @returns {Promise<Object>} - Backend response payload
 */
export const createBookingOrder = async (outfitId, startDate, endDate) => {
  const response = await client.post('/bookings/create-order', {
    outfitId,
    startDate,
    endDate
  });
  return response.data;
};

/**
 * Cryptographically validates the Razorpay checkout signature.
 * 
 * @param {string} bookingId
 * @param {string} razorpay_order_id
 * @param {string} razorpay_payment_id
 * @param {string} razorpay_signature
 * @returns {Promise<Object>} - Backend response payload
 */
export const verifyPayment = async (bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
  const response = await client.post('/bookings/verify-payment', {
    bookingId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  });
  return response.data;
};

/**
 * Fetches the authenticated user's booking history from the backend.
 * 
 * @returns {Promise<Object>} - Backend response payload containing bookings
 */
export const getMyBookings = async () => {
  const response = await client.get('/bookings/my-bookings');
  return response.data;
};

/**
 * Cancels a pending or confirmed booking on the backend.
 * 
 * @param {string} bookingId - Custom booking ID string (e.g., BKG-XXXX)
 * @param {string} cancellationReason - Explanation (min 5 chars)
 * @returns {Promise<Object>} - Backend response payload
 */
export const cancelBooking = async (bookingId, cancellationReason) => {
  const response = await client.patch(`/bookings/${bookingId}/cancel`, {
    cancellationReason
  });
  return response.data;
};

/**
 * Fetches all global booking registries for admin view (paginated).
 * 
 * @param {Object} params - Query filters (status, page, limit)
 * @returns {Promise<Object>} - Backend response payload
 */
export const getAdminBookings = async (params = {}) => {
  const response = await client.get('/bookings/admin', { params });
  return response.data;
};

/**
 * Updates status and admin notes of a booking.
 * 
 * @param {string} id - The MongoDB ObjectID or bookingId of the booking
 * @param {Object} updateData - Body parameters ({ bookingStatus, adminNotes })
 * @returns {Promise<Object>} - Backend response payload
 */
export const updateBookingStatusAdmin = async (id, updateData) => {
  const response = await client.patch(`/bookings/admin/${id}`, updateData);
  return response.data;
};

/**
 * Processes the security deposit refund for a completed booking (Admin only).
 * 
 * @param {string} id - The MongoDB ObjectID or bookingId of the booking
 * @param {Object} refundData - Body parameters ({ damageDeductionAmount, damageReason })
 * @returns {Promise<Object>} - Backend response payload
 */
export const processDepositRefundAdmin = async (id, refundData) => {
  const response = await client.patch(`/bookings/admin/${id}/refund-deposit`, refundData);
  return response.data;
};

/**
 * Fetches overview metrics for the admin dashboard overview.
 * 
 * @returns {Promise<Object>} - Backend response payload
 */
export const getAdminDashboardStats = async () => {
  const response = await client.get('/bookings/admin/dashboard-stats');
  return response.data;
};

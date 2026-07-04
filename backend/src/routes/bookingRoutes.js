const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateInput } = require('../middleware/validationMiddleware');

/**
 * ReWeara - Rental Booking Pipeline Routing Configuration
 * Evaluates route mappings top-down. Static routes reside strictly
 * above dynamic wildcard routes to prevent parameter lookup collisions.
 */

// ==========================================
// 1. PUBLIC PATHWAYS
// ==========================================

// Public date conflict checker pipeline
router.post(
  '/check-availability',
  validateInput('check_booking_availability'),
  bookingController.checkAvailability
);

// ==========================================
// 2. SECURED CUSTOMER PATHWAYS (Bearer JWT Guarded)
// ==========================================

// Create a new pending hold + sandbox Razorpay order payload (Stage 1)
router.post(
  '/create-order',
  protect,
  validateInput('create_booking'),
  bookingController.createBookingOrder
);

// Verify real Razorpay HMAC payment signature and capture bookings (Stage 2)
router.post(
  '/verify-payment',
  protect,
  validateInput('verify_payment'),
  bookingController.verifyPaymentSignature
);

// Retrieve active authenticated user bookings list
router.get(
  '/my-bookings',
  protect,
  bookingController.getMyBookings
);

// Retrieve admin dashboard statistics
router.get(
  '/admin/dashboard-stats',
  protect,
  authorize('super_admin', 'admin'),
  bookingController.getDashboardStatsAdmin
);

// Global paginated bookings audit logs
router.get(
  '/admin',
  protect,
  authorize('super_admin', 'admin'),
  bookingController.getAllBookingsAdmin
);

// Process security deposit refund for completed rentals (Damage / Late Fee deductions)
router.patch(
  '/admin/:id/refund-deposit',
  protect,
  authorize('super_admin', 'admin'),
  validateInput('process_deposit_refund'),
  bookingController.processDepositRefund
);

// Update order, payment, and delivery status transitions (Lifecycle Hardened)
router.patch(
  '/admin/:id',
  protect,
  authorize('super_admin', 'admin'),
  validateInput('admin_update_booking'),
  bookingController.updateBookingStatusAdmin
);

// ==========================================
// 4. DYNAMIC WILDCARD PATHWAYS (Reside at bottom to prevent collisions)
// ==========================================

// Fetch detailed booking metadata profile
router.get(
  '/:id',
  protect,
  bookingController.getBookingDetails
);

// Cancel an active booking order
router.patch(
  '/:id/cancel',
  protect,
  validateInput('cancel_booking'),
  bookingController.cancelBooking
);

module.exports = router;

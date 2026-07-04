const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Outfit = require('../models/Outfit');
const BookingService = require('../services/bookingService');
const User = require('../models/User');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * @desc    Checks date availability for a selected outfit (Public)
 * @route   POST /api/v1/bookings/check-availability
 * @access  Public
 */
exports.checkAvailability = asyncHandler(async (req, res, next) => {
  const { outfitId, startDate, endDate } = req.body;

  // 1. Assert outfitId matches valid MongoDB ObjectId formatting
  if (!mongoose.Types.ObjectId.isValid(outfitId)) {
    return next(new AppError('Outfit not found', 404));
  }

  // 2. Validate Outfit document exists in database prior to checking collision
  const outfitExists = await Outfit.exists({ _id: outfitId });
  if (!outfitExists) {
    return next(new AppError('Outfit not found', 404));
  }

  // Hook into our availability checking service
  const isAvailable = await BookingService.verifyAvailability(outfitId, startDate, endDate);

  res.status(200).json({
    success: true,
    message: isAvailable 
      ? 'Outfit is fully available for rent during the selected dates.'
      : 'Sorry, this outfit is unavailable or pending holds are active during this window.',
    data: {
      isAvailable
    }
  });
});

/**
 * @desc    Stage 1: Instantiates a 15m hold and generates a sandbox-ready Razorpay payment order session
 * @route   POST /api/v1/bookings/create-order
 * @access  Private (Customer)
 */
exports.createBookingOrder = asyncHandler(async (req, res, next) => {
  const customerId = req.user._id;

  // Invoke hardened booking payment service layer
  const { booking, razorpayOrder } = await BookingService.createBookingOrder(customerId, req.body);

  res.status(201).json({
    success: true,
    message: 'Temporary reservation hold set successfully. Razorpay Order generated.',
    data: {
      booking,
      razorpayOrder
    }
  });
});

/**
 * @desc    Stage 2: Verifies real payment signature callbacks and transitions pending locks to confirmed
 * @route   POST /api/v1/bookings/verify-payment
 * @access  Private (Customer)
 */
exports.verifyPaymentSignature = asyncHandler(async (req, res, next) => {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const customerId = req.user._id;

  // Early IDOR check: Verify the booking exists and belongs to the authenticated customer
  const bookingExists = await Booking.findOne({ bookingId });
  if (!bookingExists) {
    return next(new AppError('Verification failed: Reservation record not found.', 404));
  }

  if (bookingExists.customer.toString() !== customerId.toString()) {
    return next(new AppError('Forbidden: You are not authorized to verify payment for this booking.', 403));
  }

  // Invoke service verification pipeline (includes Stage 2 post-check overlap validation)
  const booking = await BookingService.verifyPaymentSignature(bookingId, customerId, {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  });

  res.status(200).json({
    success: true,
    message: booking.bookingStatus === 'confirmed'
      ? 'Payment capture verified successfully. Rental dates locked permanently.'
      : 'Payment processing failed or timed out. Reservation hold cancelled.',
    data: {
      booking
    }
  });
});

/**
 * @desc    Retrieves active user booking history list
 * @route   GET /api/v1/bookings/my-bookings
 * @access  Private (Customer)
 */
exports.getMyBookings = asyncHandler(async (req, res, next) => {
  const customerId = req.user._id;
  const bookings = await BookingService.getCustomerBookings(customerId);

  res.status(200).json({
    success: true,
    message: 'Your booking history list fetched successfully.',
    data: {
      bookings
    }
  });
});

/**
 * @desc    Retrieves detailed booking metadata by custom bookingId or ObjectID
 * @route   GET /api/v1/bookings/:id
 * @access  Private (Customer/Admin)
 */
exports.getBookingDetails = asyncHandler(async (req, res, next) => {
  const booking = await BookingService.getBookingById(req.params.id);

  // Authorization check: Enforce that customers can only view their own bookings
  if (req.user.role === 'customer' && booking.customer._id.toString() !== req.user._id.toString()) {
    return next(new AppError('Forbidden: You are not authorized to view this booking profile.', 403));
  }

  res.status(200).json({
    success: true,
    message: 'Booking details fetched successfully.',
    data: {
      booking
    }
  });
});

/**
 * @desc    Cancels a customer booking with audit trail support
 * @route   PATCH /api/v1/bookings/:id/cancel
 * @access  Private (Customer/Admin)
 */
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const { id } = req.params; // Target custom bookingId parameter
  const { cancellationReason } = req.body;

  // Enforce validation middleware results presence
  if (!cancellationReason) {
    return next(new AppError('Please provide a cancellationReason in the request body.', 400));
  }

  // Invoke service. Ownership checks are handled at the service layer
  const booking = await BookingService.cancelBooking(req.user._id, id, cancellationReason);

  res.status(200).json({
    success: true,
    message: `Booking [${id}] cancelled successfully. Refunds/locks cleared.`,
    data: {
      booking
    }
  });
});

/**
 * @desc    Retrieves all global booking registries (Logistics pipeline tracking)
 * @route   GET /api/v1/bookings/admin
 * @access  Private (Admin/SuperAdmin)
 */
exports.getAllBookingsAdmin = asyncHandler(async (req, res, next) => {
  const { status, page, limit } = req.query;

  const parsedPage = Number(page) || 1;
  const parsedLimit = Number(limit) || 10;
  const skip = (parsedPage - 1) * parsedLimit;

  let filterQuery = {};
  if (status) {
    filterQuery.bookingStatus = status.toLowerCase();
  }

  // Query database with populate relations
  const bookings = await Booking.find(filterQuery)
    .populate('customer', 'name email phone address')
    .populate('outfit', 'title slug thumbnail rentPrice status')
    .populate('depositRefundDetails.processedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit);

  const totalCount = await Booking.countDocuments(filterQuery);

  logger.info(`⚙️ Admin queried all bookings. Status Filter: ${status || 'none'}, Count: ${bookings.length}`);

  res.status(200).json({
    success: true,
    message: 'Global bookings registry fetched successfully.',
    data: {
      bookings,
      totalCount,
      page: parsedPage,
      limit: parsedLimit
    }
  });
});

/**
 * @desc    Performs administrative status overrides and logistics checks
 * @route   PATCH /api/v1/bookings/admin/:id
 * @access  Private (Admin/SuperAdmin)
 */
exports.updateBookingStatusAdmin = asyncHandler(async (req, res, next) => {
  const { id } = req.params; // Target booking _id or bookingId

  const booking = await BookingService.adminUpdateBookingStatus(id, req.body);

  res.status(200).json({
    success: true,
    message: `Booking [${booking.bookingId}] status metrics updated successfully by administrator.`,
    data: {
      booking
    }
  });
});

/**
 * @desc    Processes the security deposit refund for a returned outfit (Admin/SuperAdmin only)
 * @route   PATCH /api/v1/bookings/admin/:id/refund-deposit
 * @access  Private (Admin/SuperAdmin)
 */
exports.processDepositRefund = asyncHandler(async (req, res, next) => {
  const { id } = req.params; // Custom bookingId or ObjectID
  const { damageDeductionAmount, damageReason } = req.body;
  const adminId = req.user._id;

  const booking = await BookingService.processDepositRefund(id, {
    damageDeductionAmount,
    damageReason
  }, adminId);

  // Query back populated booking to ensure nested and sibling relations are fully populated in response
  const populatedBooking = await Booking.findById(booking._id)
    .populate('customer', 'name email phone address')
    .populate('outfit', 'title slug thumbnail rentPrice status')
    .populate('depositRefundDetails.processedBy', 'name email');

  res.status(200).json({
    success: true,
    message: `Security deposit refund processed successfully for Booking [${booking.bookingId}].`,
    data: {
      booking: populatedBooking
    }
  });
});

/**
 * @desc    Retrieves admin overview dashboard statistics
 * @route   GET /api/v1/bookings/admin/dashboard-stats
 * @access  Private (Admin/SuperAdmin)
 */
exports.getDashboardStatsAdmin = asyncHandler(async (req, res, next) => {
  const [activeCatalog, activeRentals, pendingReturns, pendingRefunds] = await Promise.all([
    Outfit.countDocuments({ status: { $ne: 'inactive' } }),
    Booking.countDocuments({ bookingStatus: 'active', deliveryStatus: 'delivered' }),
    Booking.countDocuments({ 
      endDate: { $lt: new Date() }, 
      deliveryStatus: { $ne: 'returned' }, 
      bookingStatus: { $in: ['confirmed', 'active'] } 
    }),
    Booking.countDocuments({ 'depositRefundDetails.status': 'pending_review' })
  ]);

  res.status(200).json({
    success: true,
    message: 'Admin dashboard overview statistics retrieved successfully.',
    data: {
      activeCatalog,
      activeRentals,
      pendingReturns,
      pendingRefunds
    }
  });
});

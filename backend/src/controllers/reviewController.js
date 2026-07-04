const Review = require('../models/Review');
const Booking = require('../models/Booking');
const ReviewService = require('../services/reviewService');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * @desc    Creates a new outfit review (Guarded: only completed bookings, one review per user per outfit)
 * @route   POST /api/v1/reviews
 * @access  Private (Customer)
 */
exports.createReview = asyncHandler(async (req, res, next) => {
  const { outfitId, bookingId, rating, title, comment, media } = req.body;

  // 1. Verify that the user has a COMPLETED booking for this outfit (Rule requirement)
  const completedBooking = await Booking.findOne({
    _id: bookingId,
    customer: req.user._id,
    outfit: outfitId,
    bookingStatus: 'completed'
  });

  if (!completedBooking) {
    return next(
      new AppError('Permission denied: You can only review outfits that you have rented and returned successfully.', 403)
    );
  }

  // 2. Enforce one review per user per outfit (Anti-abuse protection check)
  const existingReview = await Review.findOne({
    user: req.user._id,
    outfit: outfitId
  });

  if (existingReview) {
    return next(new AppError('You have already submitted a review for this outfit.', 400));
  }

  // 3. Save the review with default status 'pending' (Hardened moderation requirement)
  const review = await Review.create({
    user: req.user._id,
    outfit: outfitId,
    booking: bookingId,
    rating,
    title,
    comment,
    media: media || [],
    moderationStatus: 'pending' // Enforce pending state strictly
  });

  logger.info(`✍️ New Review created for Outfit [${outfitId}] by User [${req.user._id}]. Awaiting admin approval.`);

  res.status(201).json({
    success: true,
    message: 'Thank you! Your product review has been submitted successfully and is awaiting moderation.',
    data: {
      review
    }
  });
});

/**
 * @desc    Retrieves all approved reviews for a specific outfit
 * @route   GET /api/v1/reviews/outfit/:id
 * @access  Public
 */
exports.getOutfitReviews = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Query strictly filters on 'approved' reviews to protect public visibility from unmoderated/rejected spams
  const reviews = await Review.find({ outfit: id, moderationStatus: 'approved' })
    .populate('user', 'name')
    .sort({ createdAt: -1 });

  // Fetch denormalized rating stats directly from the Outfit document to prevent CPU reduce overhead
  const Outfit = require('../models/Outfit');
  const outfit = await Outfit.findById(id);
  const averageRating = outfit ? outfit.averageRating : 0;
  const totalCount = outfit ? outfit.totalReviews : 0;

  res.status(200).json({
    success: true,
    message: 'Outfit reviews fetched successfully.',
    data: {
      reviews,
      averageRating,
      totalCount
    }
  });
});

/**
 * @desc    Moderates a user review (Approve or Reject)
 * @route   PUT /api/v1/reviews/admin/:id/moderate
 * @access  Private (Admin/SuperAdmin)
 */
exports.moderateReviewAdmin = asyncHandler(async (req, res, next) => {
  const { status } = req.body; // status: 'approved' or 'rejected'
  const { id } = req.params;

  if (!status || !['approved', 'rejected'].includes(status)) {
    return next(new AppError('Please provide a valid moderation status: approved or rejected.', 400));
  }

  const review = await Review.findById(id);
  if (!review) {
    return next(new AppError('Review record not found.', 404));
  }

  const previousStatus = review.moderationStatus;
  review.moderationStatus = status;
  await review.save();

  logger.info(`🛡️ Review [${id}] status updated from [${previousStatus}] to [${status}].`);

  // CRITICAL RECALCULATION (Correction 4): Trigger rating recalculations on all status transitions
  if (previousStatus !== status || status === 'approved') {
    await ReviewService.recalculateRatingStats(review.outfit);
  }

  res.status(200).json({
    success: true,
    message: `Review [${id}] status successfully set to: ${status}.`,
    data: {
      review
    }
  });
});

/**
 * @desc    Deletes/Removes a review from database
 * @route   DELETE /api/v1/reviews/admin/:id
 * @access  Private (Admin/SuperAdmin)
 */
exports.deleteReviewAdmin = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const review = await Review.findById(id);
  if (!review) {
    return next(new AppError('Review record not found.', 404));
  }

  const outfitId = review.outfit;
  const wasApproved = review.moderationStatus === 'approved';

  // Remove the document from collection
  await Review.findByIdAndDelete(id);

  logger.info(`🛡️ Review [${id}] deleted successfully from DB by admin.`);

  // Trigger aggregate recalculation if the deleted review was approved
  if (wasApproved) {
    await ReviewService.recalculateRatingStats(outfitId);
  }

  res.status(200).json({
    success: true,
    message: `Review [${id}] successfully removed from the database cluster. Outfit statistics updated.`
  });
});

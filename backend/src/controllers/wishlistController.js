const User = require('../models/User');
const Outfit = require('../models/Outfit');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * @desc    Retrieves the authenticated user favorites list
 * @route   GET /api/v1/wishlist
 * @access  Private (Customer)
 */
exports.getWishlist = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).populate({
    path: 'savedFavorites',
    select: 'title slug rentPrice refundableDeposit thumbnail averageRating status'
  });

  if (!user) {
    return next(new AppError('User profile not found.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Wishlist favorites fetched successfully.',
    data: {
      wishlist: user.savedFavorites
    }
  });
});

/**
 * @desc    Saves an outfit reference to the user favorites list
 * @route   POST /api/v1/wishlist/:outfitId
 * @access  Private (Customer)
 */
exports.addFavorite = asyncHandler(async (req, res, next) => {
  const { outfitId } = req.params;

  // 1. Verify referential integrity: Check if target Outfit exists in database
  const outfit = await Outfit.findById(outfitId);
  if (!outfit) {
    return next(new AppError('The target outfit does not exist in our catalog.', 404));
  }

  // 2. Atomically append the outfit ID using Mongoose $addToSet to prevent duplicates
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $addToSet: { savedFavorites: outfitId } },
    { new: true }
  ).populate({
    path: 'savedFavorites',
    select: 'title slug rentPrice thumbnail averageRating status'
  });

  logger.info(`💖 User [${req.user._id}] added Outfit [${outfitId}] to wishlist.`);

  res.status(200).json({
    success: true,
    message: 'Outfit successfully added to your favorites wishlist.',
    data: {
      wishlist: user.savedFavorites
    }
  });
});

/**
 * @desc    Removes an outfit reference from the user favorites list
 * @route   DELETE /api/v1/wishlist/:outfitId
 * @access  Private (Customer)
 */
exports.removeFavorite = asyncHandler(async (req, res, next) => {
  const { outfitId } = req.params;

  // Atomically pull/remove the outfit ID using Mongoose $pull operator
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $pull: { savedFavorites: outfitId } },
    { new: true }
  ).populate({
    path: 'savedFavorites',
    select: 'title slug rentPrice thumbnail averageRating status'
  });

  logger.info(`💔 User [${req.user._id}] removed Outfit [${outfitId}] from wishlist.`);

  res.status(200).json({
    success: true,
    message: 'Outfit successfully removed from your favorites wishlist.',
    data: {
      wishlist: user.savedFavorites
    }
  });
});

const mongoose = require('mongoose');
const Review = require('../models/Review');
const Outfit = require('../models/Outfit');
const logger = require('../utils/logger');

class ReviewService {
  /**
   * Recalculates the denormalized rating metrics (averageRating, totalReviews) inside Outfit schema.
   * Runs an atomic MongoDB aggregate calculation strictly matching approved moderation reviews.
   *
   * @param {string} outfitId - Target Outfit ObjectID
   */
  static async recalculateRatingStats(outfitId) {
    logger.info(`⭐ Recalculating catalog rating stats for Outfit [${outfitId}]...`);

    const stats = await Review.aggregate([
      {
        $match: {
          outfit: new mongoose.Types.ObjectId(outfitId),
          moderationStatus: 'approved'
        }
      },
      {
        $group: {
          _id: '$outfit',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      const roundedRating = Math.round(stats[0].averageRating * 10) / 10;
      await Outfit.findByIdAndUpdate(outfitId, {
        averageRating: roundedRating,
        totalReviews: stats[0].totalReviews
      });
      logger.info(`⭐ Outfit [${outfitId}] rating stats updated successfully: Rating ${roundedRating}, Reviews: ${stats[0].totalReviews}`);
    } else {
      // Fallback: reset stats to zero if no approved reviews are remaining
      await Outfit.findByIdAndUpdate(outfitId, {
        averageRating: 0,
        totalReviews: 0
      });
      logger.info(`⭐ Outfit [${outfitId}] rating stats reset to 0: No approved reviews found.`);
    }
  }
}

module.exports = ReviewService;

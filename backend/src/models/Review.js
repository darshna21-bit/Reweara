const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required.']
  },
  outfit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outfit',
    required: [true, 'Outfit reference is required.'],
    index: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Associated booking reference is required.']
  },
  rating: {
    type: Number,
    required: [true, 'Rating value is required.'],
    min: [1, 'Rating must be at least 1.'],
    max: [5, 'Rating cannot exceed 5.']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters.']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required.'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters long.'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters.']
  },
  media: [{
    type: String, // Dynamic Cloudinary worn outfit photos uploaded by customer
    trim: true
  }],
  
  // 🛡️ MODERATION SYSTEM (Hides spam reviews from frontend queries)
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    lowercase: true,
    index: true
  }
}, {
  timestamps: true // Auto injects createdAt and updatedAt
});

// ==========================================
// 🛡️ ANTI-ABUSE UNIQUE CONSTRAINTS
// ==========================================

// Unique compound index: Enforces that a specific user profile can review a given outfit ONLY ONCE.
// This prevents bot spam or artificial rating manipulation.
reviewSchema.index({
  user: 1,
  outfit: 1
}, {
  unique: true,
  name: 'user_outfit_unique_review_index'
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

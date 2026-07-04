const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name.'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long.']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email address.'],
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address.'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
    minlength: [8, 'Password must be at least 8 characters long.'],
    select: false // Avoid leaking hashed passwords in standard API fetches
  },
  role: {
    type: String,
    enum: {
      values: ['super_admin', 'admin', 'customer'],
      message: 'Role must be either: super_admin, admin, or customer.'
    },
    default: 'customer',
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide a contact phone number.'],
    trim: true,
    match: [
      /^[6-9]\d{9}$/,
      'Please provide a valid 10-digit Indian phone number.'
    ]
  },
  // Future-proof planning: Binds references to Outfit documents for curation wishlists
  savedFavorites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Outfit'
    }
  ],
  // Future-proof planning: Direct binding references to Booking documents for history tracking
  bookings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking'
    }
  ],
  address: {
    street: { type: String, trim: true },
    city: { type: String, default: 'Pune' },
    state: { type: String, default: 'Maharashtra' },
    zipCode: { type: String, trim: true }
  },
  // 🔐 REFRESH TOKEN REUSE DETECTION (Multi-session support)
  // Tracks currently-valid refresh token IDs to support multi-device login while still detecting reuse.
  // An ID not present in this array means it was already rotated away or is invalid (treated as suspected compromise).
  activeRefreshTokenIds: [
    {
      tokenId: {
        type: String,
        required: true
      },
      expiresAt: {
        type: Date,
        required: true
      }
    }
  ],
  // 🔄 REFRESH TOKEN ROTATION GRACE PERIOD TRACKING
  // Retains recently rotated-away tokens for a short window (e.g. 30 seconds) to prevent concurrent client race conditions.
  recentlyRotatedTokens: [
    {
      tokenId: {
        type: String,
        required: true
      },
      rotatedToTokenId: {
        type: String,
        required: true
      },
      rotatedAt: {
        type: Date,
        required: true
      }
    }
  ]
}, {
  timestamps: true // Auto injects createdAt and updatedAt
});

// Pre-save hook: Hashes passwords atomically before writing to MongoDB
userSchema.pre('save', async function (next) {
  // Only encrypt if the password field has been modified (or created fresh)
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance verification helper to cryptographically assert password authenticity.
 * @param {string} candidatePassword - Unhashed plain-text input password
 * @returns {Promise<boolean>} - True if matching, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

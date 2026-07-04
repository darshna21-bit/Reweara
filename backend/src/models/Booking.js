const mongoose = require('mongoose');

/**
 * ReWeara - Premium Indian Fashion Rental Booking Schema
 * Handles the complete circular rental lifecycle, financial ledgers,
 * pricing snapshots, and automated 15-minute checkout holds.
 */
const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: [true, 'Human-readable bookingId identifier is required.'],
    unique: true,
    index: true,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer reference is required.'],
    index: true
  },
  outfit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outfit',
    required: [true, 'Outfit reference is required.'],
    index: true
  },
  
  // 📅 RENTAL LIFECYCLE DATES
  startDate: {
    type: Date,
    required: [true, 'Rental start date is required.'],
    index: true
  },
  endDate: {
    type: Date,
    required: [true, 'Rental end date is required.'],
    index: true
  },
  
  // 💰 FINANCIAL CALCULATIONS
  totalRentAmount: {
    type: Number,
    required: [true, 'Total rent amount is required.'],
    min: [0, 'Total rent amount cannot be negative.']
  },
  securityDeposit: {
    type: Number,
    required: [true, 'Security deposit is required.'],
    min: [0, 'Security deposit cannot be negative.']
  },
  refundableDeposit: {
    type: Number,
    required: [true, 'Refundable deposit amount is required.'],
    min: [0, 'Refundable deposit cannot be negative.']
  },

  // 📈 TRANSACTION STATUSES (Standardized in lowercase for case conformity)
  bookingStatus: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'cancelled', 'active', 'completed', 'refunded'],
      message: 'bookingStatus must be pending, confirmed, cancelled, active, completed, or refunded.'
    },
    default: 'pending',
    lowercase: true,
    index: true
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'failed', 'refunded', 'refund_failed'],
      message: 'paymentStatus must be pending, paid, failed, refunded, or refund_failed.'
    },
    default: 'pending',
    lowercase: true,
    index: true
  },
  deliveryStatus: {
    type: String,
    enum: {
      values: ['pending', 'dispatched', 'delivered', 'returned'],
      message: 'deliveryStatus must be pending, dispatched, delivered, or returned.'
    },
    default: 'pending',
    lowercase: true
  },  razorpayOrderId: {
    type: String,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    index: true
  },

  // 📝 LOGISTICS & AUDITING METADATA
  cancellationReason: {
    type: String,
    trim: true
  },
  adminNotes: {
    type: String,
    trim: true
  },

  // 💸 HISTORICAL PRICING SNAPSHOT (Guarantees invoice integrity if catalog prices change)
  pricingSnapshot: {
    rentPrice: { type: Number, required: true },
    refundableDeposit: { type: Number, required: true },
    securityDeposit: { type: Number, required: true }
  },  // 💸 DEPOSIT REFUND ENGINE (Late Fee + Damage Deduction details)
  depositRefundDetails: {
    // Current status of the deposit refund cycle
    status: {
      type: String,
      enum: {
        values: ['not_applicable', 'pending_review', 'processed'],
        message: 'status must be not_applicable, pending_review, or processed.'
      },
      default: 'not_applicable',
      lowercase: true
    },
    // The timestamp when the item was returned and checked back in
    actualReturnDate: {
      type: Date
    },
    // Number of days returned late based on actualReturnDate - endDate
    lateDays: {
      type: Number,
      default: 0
    },
    // Total financial penalty calculated for late days
    lateFeeAmount: {
      type: Number,
      default: 0
    },
    // Manual deduction determined by admin after quality inspection
    damageDeductionAmount: {
      type: Number,
      default: 0
    },
    // Explanation of any physical damage found on the garment
    damageReason: {
      type: String,
      default: ''
    },
    // Final calculated refund amount: securityDeposit - lateFeeAmount - damageDeductionAmount
    finalRefundAmount: {
      type: Number
    },
    // Reference to the Admin/SuperAdmin who finalized the review
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // Timestamp when the refund was processed
    processedAt: {
      type: Date
    }
  },

  // 🔒 15-MINUTE CHECKOUT HOLD
  // Automatically deleted by MongoDB TTL background thread if hold expires.
  // Cleared ($unset) immediately upon successful checkout payment confirmation.
  reservationExpiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true // Auto injects createdAt and updatedAt fields
});

// ==========================================
// 🔍 DATABASE PERFORMANCE COMPLEX INDEXES
// ==========================================

// 1. Compound Index for index-assisted query execution and performant range scans
// Avoids expensive collection scans when validating rental date collisions.
bookingSchema.index({
  outfit: 1,
  bookingStatus: 1,
  startDate: 1,
  endDate: 1
}, {
  name: 'booking_overlap_scan_index'
});

// 2. Compound Index for customer rental history dashboard queries
bookingSchema.index({
  customer: 1,
  createdAt: -1
}, {
  name: 'booking_customer_history_index'
});

// 3. TTL Index to auto-delete expired unpaid reservation locks from collection
// Dropping the path (setting reservationExpiresAt to undefined) disables the TTL trigger.
bookingSchema.index({
  reservationExpiresAt: 1
}, {
  expireAfterSeconds: 0,
  name: 'booking_hold_ttl_index'
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

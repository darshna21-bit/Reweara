const { z } = require('zod');

// Regular expression checking Mongoose ObjectId formatting (24 hex characters)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * 🔍 Availability Check payload validation schema
 * Validates check-availability requests prior to running booking collision logic
 */
const checkAvailabilitySchema = z.object({
  outfitId: z
    .string({ required_error: 'Outfit identifier reference is required.' })
    .regex(objectIdRegex, 'Invalid outfit ID format.'),
  
  startDate: z
    .string({ required_error: 'Rental start date is required.' })
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), { message: 'Invalid start date format.' }),
  
  endDate: z
    .string({ required_error: 'Rental end date is required.' })
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), { message: 'Invalid end date format.' })
}).refine((data) => data.endDate > data.startDate, {
  message: 'Rental end date must occur strictly after the rental start date.',
  path: ['endDate']
});

/**
 * 🔒 Create Booking payload validation schema
 * Validates parameters needed to establish a 15-minute checkout lock
 */
const createBookingSchema = z.object({
  outfitId: z
    .string({ required_error: 'Outfit identifier reference is required.' })
    .regex(objectIdRegex, 'Invalid outfit ID format.'),
  
  startDate: z
    .string({ required_error: 'Rental start date is required.' })
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), { message: 'Invalid start date format.' })
    .refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
      message: 'Rental start date cannot be scheduled in the past.'
    }),
  
  endDate: z
    .string({ required_error: 'Rental end date is required.' })
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), { message: 'Invalid end date format.' }),

  adminNotes: z
    .string()
    .trim()
    .max(500, 'Admin notes cannot exceed 500 characters.')
    .optional()
}).refine((data) => data.endDate > data.startDate, {
  message: 'Rental end date must occur strictly after the rental start date.',
  path: ['endDate']
});

/**
 * 🚫 Cancel Booking payload validation schema
 * Validates cancellation audit logs entered by customer or administrator
 */
const cancelBookingSchema = z.object({
  cancellationReason: z
    .string({ required_error: 'Cancellation reason is required.' })
    .trim()
    .min(5, 'Cancellation reason must be at least 5 characters long.')
    .max(300, 'Cancellation reason cannot exceed 300 characters.')
});

/**
 * ⚙️ Admin Update Booking payload validation schema
 * Validates administrative updates for booking, payment, and delivery status transitions
 */
const adminUpdateBookingSchema = z.object({
  bookingStatus: z
    .enum(['pending', 'confirmed', 'cancelled', 'active', 'completed', 'refunded'], {
      invalid_type_error: 'bookingStatus must be pending, confirmed, cancelled, active, completed, or refunded.'
    })
    .optional(),
  
  paymentStatus: z
    .enum(['pending', 'paid', 'failed', 'refunded', 'refund_failed'], {
      invalid_type_error: 'paymentStatus must be pending, paid, failed, refunded, or refund_failed.'
    })
    .optional(),
  
  deliveryStatus: z
    .enum(['pending', 'dispatched', 'delivered', 'returned'], {
      invalid_type_error: 'deliveryStatus must be pending, dispatched, delivered, or returned.'
    })
    .optional(),
  
  adminNotes: z
    .string()
    .trim()
    .max(1000, 'Admin notes cannot exceed 1000 characters.')
    .optional()
}).refine((data) => {
  // Ensure that at least one update parameter is provided to prevent empty edit submissions
  const keys = Object.keys(data);
  return keys.length > 0;
}, {
  message: 'Please provide at least one field to update (bookingStatus, paymentStatus, deliveryStatus, or adminNotes).'
});
/**
 * 💸 Process Security Deposit Refund payload validation schema
 * Validates manual damage deduction parameters prior to finalizing the refund ledger
 */
const processRefundSchema = z.object({
  damageDeductionAmount: z
    .number({ invalid_type_error: 'Damage deduction amount must be a number.' })
    .nonnegative('Damage deduction amount cannot be negative.')
    .default(0)
    .optional(),
  
  damageReason: z
    .string()
    .trim()
    .max(500, 'Damage reason explanation cannot exceed 500 characters.')
    .default('')
    .optional()
});

/**
 * 💳 Verify Payment payload validation schema
 * Validates the real Razorpay checkout callback payload, replacing the old mock-era fields.
 */
const verifyPaymentSchema = z.object({
  bookingId: z
    .string({ required_error: 'Booking identifier reference is required.' })
    .trim(),
  
  razorpay_order_id: z
    .string({ required_error: 'Razorpay order ID is required.' })
    .trim(),
  
  razorpay_payment_id: z
    .string({ required_error: 'Razorpay payment ID is required.' })
    .trim(),
  
  razorpay_signature: z
    .string({ required_error: 'Razorpay signature hash is required.' })
    .trim()
});

module.exports = {
  checkAvailabilitySchema,
  createBookingSchema,
  cancelBookingSchema,
  adminUpdateBookingSchema,
  processRefundSchema,
  verifyPaymentSchema
};

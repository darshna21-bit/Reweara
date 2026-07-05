const AppError = require('../utils/appError');
const { 
  signupSchema, 
  loginSchema, 
  updateUserRoleSchema,
  sendOtpSchema,
  verifyOtpSchema
} = require('../validators/authValidator');
const { createOutfitSchema, updateOutfitSchema } = require('../validators/outfitValidator');
const { 
  checkAvailabilitySchema, 
  createBookingSchema, 
  cancelBookingSchema, 
  adminUpdateBookingSchema,
  processRefundSchema,
  verifyPaymentSchema
} = require('../validators/bookingValidator');
const { createReviewSchema } = require('../validators/reviewValidator');

/**
 * Zod schema validation middleware mapping.
 * Executes safe parsing on request payloads, stripping unmapped variables and trimming fields.
 * @param {string} validationType - Target validation schema
 */
const validateInput = (validationType) => {
  return (req, res, next) => {
    let schema;

    switch (validationType) {
      case 'signup':
        schema = signupSchema;
        break;
      case 'login':
        schema = loginSchema;
        break;
      case 'update_user_role':
        schema = updateUserRoleSchema;
        break;
      case 'send_otp':
        schema = sendOtpSchema;
        break;
      case 'verify_otp':
        schema = verifyOtpSchema;
        break;
      case 'create_outfit':
        schema = createOutfitSchema;
        break;
      case 'update_outfit':
        schema = updateOutfitSchema;
        break;
      case 'check_booking_availability':
        schema = checkAvailabilitySchema;
        break;
      case 'create_booking':
        schema = createBookingSchema;
        break;
      case 'cancel_booking':
        schema = cancelBookingSchema;
        break;
      case 'admin_update_booking':
        schema = adminUpdateBookingSchema;
        break;
      case 'process_deposit_refund':
        schema = processRefundSchema;
        break;
      case 'verify_payment':
        schema = verifyPaymentSchema;
        break;
      case 'create_review':
        schema = createReviewSchema;
        break;
      default:
        schema = null;
    }

    if (!schema) {
      return next(new AppError('Server error: Validation schema not registered.', 500));
    }

    const parseResult = schema.safeParse(req.body);

    if (!parseResult.success) {
      // Collect all schema violation messages into a single user-facing sentence
      const errorMsg = parseResult.error.issues
        .map((issue) => `${issue.path.join('.') ? `[${issue.path.join('.')}] ` : ''}${issue.message}`)
        .join(' ');
      
      return next(new AppError(`Validation Failure: ${errorMsg}`, 400));
    }

    // Bind sanitized parameters back to req.body
    req.body = parseResult.data;
    next();
  };
};

module.exports = { validateInput };

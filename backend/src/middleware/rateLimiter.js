const rateLimit = require('express-rate-limit');
const AppError = require('../utils/appError');

// Rate limiting profile for general application endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  handler: (req, res, next) => {
    next(new AppError('Too many requests from this IP. Please try again after 15 minutes.', 429));
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Strict rate limiting profile for signup / login to prevent brute force testing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  handler: (req, res, next) => {
    next(new AppError('Too many authentication attempts. Please try again after 15 minutes.', 429));
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  authLimiter
};

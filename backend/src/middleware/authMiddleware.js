const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const User = require('../models/User');
const AuthService = require('../services/authService');

/**
 * Global authentication middleware to verify stateless access tokens.
 * Extracts JWT from authorization header and binds user context.
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Assert bearer header presence
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication failed: Missing token. Please log in.', 401));
  }

  try {
    // 2. Cryptographic token verification
    const decoded = AuthService.verifyAccessToken(token);

    // 3. User verification scan (safety check if account was deleted)
    const currentUser = await User.findById(decoded.userId);
    if (!currentUser) {
      return next(new AppError('Authentication failed: The user belonging to this token no longer exists.', 401));
    }

    // 4. Grant access and bind credentials to Express request context
    req.user = currentUser;
    next();
  } catch (error) {
    logger.error('❌ Access Token Verification Failure:', error);
    return next(new AppError('Authentication failed: Invalid or expired token. Please log in again.', 401));
  }
};

/**
 * Middleware role-guard to restrict endpoint access based on account clearance levels.
 * Enforces standardized lowercase enums: 'super_admin', 'admin', 'customer'.
 * @param {...string} roles - List of allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Security authorization breached: User identity context missing.', 500));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: You do not have clearance to perform this action.', 403));
    }

    next();
  };
};

module.exports = {
  protect,
  authorize
};

const User = require('../models/User');
const OtpVerification = require('../models/OtpVerification');
const AuthService = require('../services/authService');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const { env, abstractEmailApiKey } = require('../config/env');
const logger = require('../utils/logger');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Helper utility to attach refresh token inside an httpOnly cookie
 * and return access token in JSON body. This represents security best practices.
 */
const sendTokensResponse = async (user, statusCode, res, message, oldTokenId = null) => {
  const tokenId = crypto.randomUUID();
  const accessToken = AuthService.generateAccessToken(user);
  const refreshToken = AuthService.generateRefreshToken(user, tokenId);

  const now = new Date();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days matching token expiration

  if (oldTokenId) {
    // 1. Atomically pull the oldTokenId from activeRefreshTokenIds (ensures concurrency check)
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        'activeRefreshTokenIds.tokenId': oldTokenId
      },
      {
        $pull: { activeRefreshTokenIds: { tokenId: oldTokenId } }
      },
      { new: true }
    );

    if (!updatedUser) {
      // Return null indicating the token has already been rotated/consumed by a concurrent call
      return null;
    }

    // 2. Push the new rotated session details and cap array lengths
    const finalUser = await User.findByIdAndUpdate(
      user._id,
      {
        $push: {
          activeRefreshTokenIds: {
            $each: [{ tokenId, expiresAt }],
            $slice: -5 // Cap concurrent active sessions at 5
          },
          recentlyRotatedTokens: {
            $each: [{ tokenId: oldTokenId, rotatedToTokenId: tokenId, rotatedAt: now }],
            $slice: -10 // Cap rotated token history at 10
          }
        }
      },
      { new: true }
    );

    user = finalUser;
  } else {
    // 1. Filter out expired sessions
    let activeSessions = (user.activeRefreshTokenIds || []).filter(
      (item) => item.expiresAt > now
    );

    // 2. FIFO Device Session Management: Cap concurrent active sessions at 5
    if (activeSessions.length >= 5) {
      activeSessions.shift(); // Evict the oldest session
    }

    // 3. Push new tokenId into active sessions array
    activeSessions.push({ tokenId, expiresAt });
    user.activeRefreshTokenIds = activeSessions;
    await user.save();
  }

  const cookieOptions = {
    httpOnly: true, // Shields cookie from XSS scripts access
    secure: env === 'production', // Forces SSL encryption in production
    sameSite: 'strict', // Blocks CSRF cookie spoofing vectors
    expires: expiresAt
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  // Exclude password field from the return payload
  const userProfile = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    createdAt: user.createdAt
  };

  res.status(statusCode).json({
    success: true,
    message,
    data: {
      accessToken,
      user: userProfile
    }
  });

  return { success: true };
};

/**
 * @desc    Registers a new user profile
 * @route   POST /api/v1/auth/signup
 * @access  Public
 */
exports.signup = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone } = req.body;
  const lowercaseEmail = email.toLowerCase().trim();

  // 1. Assert email is unique before creation
  const existingUser = await User.findOne({ email: lowercaseEmail });
  if (existingUser) {
    return next(new AppError('A user profile already exists with this email address.', 409));
  }

  // 2. Enforce OTP verification within the last 15 minutes
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const verifiedRecord = await OtpVerification.findOne({
    email: lowercaseEmail,
    verified: true,
    verifiedAt: { $gte: fifteenMinutesAgo }
  });

  if (!verifiedRecord) {
    return next(new AppError('Email verification required. Please verify your email via OTP before signing up.', 400));
  }

  // 3. Delete the verification record to prevent replay attacks
  await OtpVerification.deleteOne({ _id: verifiedRecord._id });

  // 4. Safe register profile
  const user = await User.create({
    name,
    email: lowercaseEmail,
    password,
    phone,
    role: 'customer' // Hardcoded to customer to prevent privilege escalation
  });

  await sendTokensResponse(user, 201, res, 'User registered successfully.');
});

/**
 * @desc    Authenticates credentials and issues sessions
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Fetch user including password field for verification
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    return next(new AppError('Invalid email or password credentials.', 401));
  }

  // 2. Assert password authenticity
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid email or password credentials.', 401));
  }

  await sendTokensResponse(user, 200, res, 'Login successful.');
});

/**
 * @desc    Logs out current session by clearing secure cookies
 * @route   POST /api/v1/auth/logout
 * @access  Public
 */
exports.logout = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (token && token !== 'loggedout') {
    try {
      // Decode refresh token to identify the specific tokenId being terminated
      const decoded = AuthService.verifyRefreshToken(token);
      
      // Perform surgical pull: remove only the active tokenId associated with this device
      await User.findByIdAndUpdate(decoded.userId, {
        $pull: { activeRefreshTokenIds: { tokenId: decoded.tokenId } }
      });
    } catch (error) {
      // Catch all expired, malformed, or missing token validation failures
      // Proceed gracefully to clear cookie without blocking the client logout sequence
      logger.warn(`Logout session cleanup skipped: ${error.message}`);
    }
  }

  res.cookie('refreshToken', 'loggedout', {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
    sameSite: 'strict',
    secure: env === 'production'
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Session tokens cleared.'
  });
});

/**
 * @desc    Retrieves current user identity profile context
 * @route   GET /api/v1/auth/me/profile
 * @access  Private (Authenticated)
 */
exports.getProfile = asyncHandler(async (req, res, next) => {
  // req.user has already been loaded from database inside auth protect middleware
  const userProfile = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    phone: req.user.phone,
    savedFavorites: req.user.savedFavorites,
    bookings: req.user.bookings,
    address: req.user.address,
    createdAt: req.user.createdAt
  };

  res.status(200).json({
    success: true,
    message: 'User profile fetched successfully.',
    data: {
      user: userProfile
    }
  });
});

/**
 * @desc    Refreshes access tokens using active secure httpOnly refresh cookie
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
  // Extract token dynamically from secure httpOnly cookies parsed by cookie-parser
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!token || token === 'loggedout') {
    return next(new AppError('Token renewal failed: Missing refresh token.', 401));
  }

  try {
    // 1. Cryptographically verify the refresh token
    const decoded = AuthService.verifyRefreshToken(token);
    
    // 2. Fetch the target user profile
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new AppError('Token renewal failed: Associated user no longer exists.', 401));
    }

    const now = new Date();

    // 3. Try to execute atomic refresh token rotation
    const result = await sendTokensResponse(user, 200, res, 'Token renewed successfully.', decoded.tokenId);

    if (result === null) {
      // Concurrency check fallback: Old token already rotated. Check recentlyRotatedTokens.
      const freshUser = await User.findById(decoded.userId);
      const rotatedTokens = freshUser.recentlyRotatedTokens || [];
      const graceEntry = rotatedTokens.find(
        (item) =>
          item.tokenId === decoded.tokenId &&
          new Date(item.rotatedAt).getTime() + 30000 > now.getTime()
      );

      if (graceEntry) {
        // Benign concurrent tab refresh race condition: Serve regenerated token from grace window
        const regeneratedAccessToken = AuthService.generateAccessToken(freshUser);
        const regeneratedRefreshToken = AuthService.generateRefreshToken(freshUser, graceEntry.rotatedToTokenId);

        const cookieOptions = {
          httpOnly: true,
          secure: env === 'production',
          sameSite: 'strict',
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };

        res.cookie('refreshToken', regeneratedRefreshToken, cookieOptions);

        const userProfile = {
          id: freshUser._id,
          name: freshUser.name,
          email: freshUser.email,
          role: freshUser.role,
          phone: freshUser.phone,
          address: freshUser.address,
          createdAt: freshUser.createdAt
        };

        logger.info(`🔄 CONCURRENT REFRESH GRACE: Benign race condition handled on User [${freshUser._id}] for token [${decoded.tokenId}].`);

        return res.status(200).json({
          success: true,
          message: 'Token renewed successfully.',
          data: {
            accessToken: regeneratedAccessToken,
            user: userProfile
          }
        });
      }

      // SECURITY BREACH: Refresh token reuse detected outside grace window!
      // Invalidate ALL sessions immediately to protect user accounts
      freshUser.activeRefreshTokenIds = [];
      freshUser.recentlyRotatedTokens = [];
      await freshUser.save();

      // Clear cookie immediately
      res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'strict',
        secure: env === 'production'
      });

      logger.error(`🚨 SECURITY: Refresh token reuse detected, all sessions invalidated for User ID [${freshUser._id}].`);
      return next(new AppError('Session invalidated due to suspected token compromise. Please log in again.', 401));
    }

  } catch (error) {
    console.error('❌ DETAILED REFRESH ERROR:', error);
    // Clear cookie on invalid renewal attempts to reset client states safely
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: env === 'production'
    });
    return next(new AppError('Token renewal failed: Invalid or expired refresh token. Cookies cleared.', 401));
  }
});

/**
 * @desc    Updates a user's role (SuperAdmin only)
 * @route   PATCH /api/v1/auth/admin/:userId/role
 * @access  Private (SuperAdmin)
 */
exports.updateUserRole = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { role } = req.body;
  const actingAdminId = req.user._id;

  // 1. Block self-modification (SuperAdmin cannot demote/change their own role here)
  if (userId.toString() === actingAdminId.toString()) {
    return next(new AppError('Operation rejected: You cannot change or demote your own user role.', 400));
  }

  // 2. Find the target user
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('The requested user profile was not found.', 404));
  }

  // 3. Block modifying another super_admin's role (SuperAdmin accounts are immutable via API)
  if (user.role === 'super_admin') {
    return next(new AppError('Operation forbidden: super_admin accounts are immutable via API operations.', 403));
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  // 4. Recruiter-grade Audit logging
  logger.info(`[AUDIT LOG] User role updated | Admin ID: ${actingAdminId} | Target User ID: ${user._id} | Old Role: ${oldRole} | New Role: ${role}`);

  const userProfile = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    createdAt: user.createdAt
  };

  res.status(200).json({
    success: true,
    message: 'User role updated successfully.',
    data: {
      user: userProfile
    }
  });
});

/**
 * @desc    Get all admin users OR search a single user by exact email (SuperAdmin only)
 * @route   GET /api/v1/auth/admin/users
 * @access  Private (SuperAdmin)
 */
exports.getUsers = asyncHandler(async (req, res, next) => {
  const { email } = req.query;
  let users = [];

  if (email) {
    const searchEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: searchEmail })
      .select('-password -activeRefreshTokenIds -recentlyRotatedTokens');
    if (user) {
      users = [user];
    }
  } else {
    users = await User.find({ role: { $in: ['admin', 'super_admin'] } })
      .select('-password -activeRefreshTokenIds -recentlyRotatedTokens')
      .sort({ createdAt: -1 });
  }

  res.status(200).json({
    success: true,
    message: 'Users fetched successfully.',
    data: {
      users
    }
  });
});

/**
 * @desc    Generate and send signup verification OTP after AbstractAPI deliverability pre-check
 * @route   POST /api/v1/auth/signup/send-otp
 * @access  Public
 */
exports.sendOtp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const lowercaseEmail = email.toLowerCase().trim();

  // 1. Assert email is unique before sending OTP
  const existingUser = await User.findOne({ email: lowercaseEmail });
  if (existingUser) {
    return next(new AppError('A user profile already exists with this email address.', 409));
  }

  // 2. AbstractAPI Email Reputation Validation Check
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const abstractUrl = `https://emailreputation.abstractapi.com/v1/?api_key=${abstractEmailApiKey}&email=${encodeURIComponent(lowercaseEmail)}`;
    const response = await fetch(abstractUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      logger.info(`AbstractAPI response for ${lowercaseEmail}: ${JSON.stringify(data)}`);

      if (data.email_deliverability?.status === 'undeliverable') {
        return next(new AppError("This email address doesn't appear to exist. Please check and try again.", 400));
      }
      if (data.email_quality?.is_disposable === true) {
        return next(new AppError("Temporary/disposable email addresses aren't allowed. Please use a permanent email.", 400));
      }
      if (data.email_risk?.address_risk_status === 'high') {
        return next(new AppError("This email address couldn't be verified. Please use a different one.", 400));
      }
    } else {
      logger.error(`AbstractAPI returned error status: ${response.status}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    logger.error(`AbstractAPI Reputation Check failed/timed out: ${err.message}`);
    // Graceful degradation: do NOT block the user
  }

  // 3. Database Rate Limiting: Max 3 OTP requests per email within 10 minutes
  const now = new Date();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  let otpRecord = await OtpVerification.findOne({ email: lowercaseEmail });
  let requests = [];
  if (otpRecord) {
    requests = (otpRecord.requestsWithinWindow || []).filter((reqTime) => reqTime > tenMinutesAgo);
    if (requests.length >= 3) {
      return next(new AppError('Too many requests. You can request up to 3 OTP codes every 10 minutes.', 429));
    }
  }

  // 4. Generate random 6-digit OTP code
  const rawOtp = String(Math.floor(100000 + Math.random() * 900000));

  // 5. Hash the OTP using bcrypt
  const hashedOtp = await bcrypt.hash(rawOtp, 10);

  // 6. Record timestamp and upsert OtpVerification record
  requests.push(now);

  if (otpRecord) {
    otpRecord.otpCode = hashedOtp;
    otpRecord.attempts = 0;
    otpRecord.createdAt = now;
    otpRecord.verified = false;
    otpRecord.requestsWithinWindow = requests;
    await otpRecord.save();
  } else {
    await OtpVerification.create({
      email: lowercaseEmail,
      otpCode: hashedOtp,
      attempts: 0,
      createdAt: now,
      verified: false,
      requestsWithinWindow: requests
    });
  }

  // 7. Dispatch the OTP via Nodemailer utility
  const { sendOtpEmail } = require('../utils/mailer');
  await sendOtpEmail(lowercaseEmail, rawOtp);

  res.status(200).json({
    success: true,
    message: 'Verification OTP has been sent successfully.'
  });
});

/**
 * @desc    Verify signup OTP code matches
 * @route   POST /api/v1/auth/signup/verify-otp
 * @access  Public
 */
exports.verifyOtp = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;
  const lowercaseEmail = email.toLowerCase().trim();

  const otpRecord = await OtpVerification.findOne({ email: lowercaseEmail });
  if (!otpRecord) {
    return next(new AppError('Verification OTP expired or not requested. Please request a new code.', 400));
  }

  // Check attempt thresholds
  if (otpRecord.attempts >= 5) {
    return next(new AppError('Too many failed attempts. Please request a new OTP.', 400));
  }

  // Check 5-minute expiry limits
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (otpRecord.createdAt < fiveMinutesAgo) {
    return next(new AppError('Verification OTP has expired. Please request a new code.', 400));
  }

  // Cryptographically compare the codes
  const isMatch = await bcrypt.compare(otp, otpRecord.otpCode);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    const remaining = 5 - otpRecord.attempts;
    if (remaining <= 0) {
      return next(new AppError('Too many failed attempts. This OTP has been locked. Please request a new code.', 400));
    }
    return next(new AppError(`Invalid verification code. You have ${remaining} attempts remaining.`, 400));
  }

  // Successful verification
  otpRecord.verified = true;
  otpRecord.verifiedAt = new Date();
  otpRecord.attempts = 0;
  await otpRecord.save();

  res.status(200).json({
    success: true,
    message: 'Email address verified successfully.'
  });
});


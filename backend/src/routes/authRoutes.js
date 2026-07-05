const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateInput } = require('../middleware/validationMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

// 1. Public Authentication Entrypoints (Guarded under anti-brute rate limits)
router.post(
  '/signup/send-otp',
  authLimiter,
  validateInput('send_otp'),
  authController.sendOtp
);

router.post(
  '/signup/verify-otp',
  authLimiter,
  validateInput('verify_otp'),
  authController.verifyOtp
);

router.post(
  '/signup',
  authLimiter,
  validateInput('signup'),
  authController.signup
);

router.post(
  '/login',
  authLimiter,
  validateInput('login'),
  authController.login
);

router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);

// 2. Secured Profile Access Pathways (Guarded under token validations)
router.get('/me/profile', protect, authController.getProfile);

// 3. SuperAdmin Role Promotion/Demotion Pathway (Guarded under super_admin limits)
router.get(
  '/admin/users',
  protect,
  authorize('super_admin'),
  authController.getUsers
);

router.patch(
  '/admin/:userId/role',
  protect,
  authorize('super_admin'),
  validateInput('update_user_role'),
  authController.updateUserRole
);

module.exports = router;

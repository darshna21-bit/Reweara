const Razorpay = require('razorpay');
const envConfig = require('./env');

/**
 * Configure Razorpay SDK client connection
 * Dynamically binds sandbox test/production credentials validated during server launch.
 */
const razorpayInstance = new Razorpay({
  key_id: envConfig.razorpay.keyId,
  key_secret: envConfig.razorpay.secret
});

module.exports = razorpayInstance;

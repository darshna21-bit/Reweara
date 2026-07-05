const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email address is required.'],
    unique: true,
    lowercase: true,
    trim: true
  },
  otpCode: {
    type: String,
    required: [true, 'OTP verification code is required.']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900 // Document automatically deleted after 15 minutes (900 seconds)
  },
  attempts: {
    type: Number,
    default: 0
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  requestsWithinWindow: {
    type: [Date],
    default: []
  }
});

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);

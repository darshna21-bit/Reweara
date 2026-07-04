const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');

/**
 * Standardizes JWT token generation and verification.
 * Follows recruiter-ready stateless session security best practices.
 */
class AuthService {
  /**
   * Generates a short-lived access token for stateless API access verification.
   * @param {Object} user - User mongoose document
   */
  static generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  }

  /**
   * Generates a long-lived refresh token to support automatic token renewals.
   * @param {Object} user - User mongoose document
   * @param {string} tokenId - Unique token identifier for session rotation tracking
   */
  static generateRefreshToken(user, tokenId) {
    return jwt.sign(
      {
        userId: user._id,
        tokenId
      },
      jwtConfig.refreshSecret,
      { expiresIn: jwtConfig.refreshExpiresIn }
    );
  }

  /**
   * Cryptographically verifies an incoming access token.
   * @param {string} token - Signed access JWT
   */
  static verifyAccessToken(token) {
    return jwt.verify(token, jwtConfig.secret);
  }

  /**
   * Cryptographically verifies an incoming refresh token.
   * @param {string} token - Signed refresh JWT
   */
  static verifyRefreshToken(token) {
    return jwt.verify(token, jwtConfig.refreshSecret);
  }
}

module.exports = AuthService;

/**
 * Operational AppError class to represent known, client-facing HTTP exceptions.
 * By flagging errors as 'isOperational = true', the centralized error handler knows
 * it is safe to return the raw message details directly to the client.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture stack trace, excluding the constructor call itself
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

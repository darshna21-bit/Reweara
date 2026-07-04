/**
 * High-order function to automatically wrap asynchronous controllers
 * and forward any uncaught exceptions directly to the global error middleware.
 * Bypasses explicit try-catch blocks in route handlers.
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = asyncHandler;

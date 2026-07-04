const mongoose = require('mongoose');
const { db, env } = require('./env');
const logger = require('../utils/logger');

let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

/**
 * Orchestrates secure Mongoose Atlas cloud database connections.
 * Features automated retry thresholds for robust startup container resilience.
 */
const connectDB = async () => {
  try {
    const connInstance = await mongoose.connect(db.uri, {
      autoIndex: env !== 'production', // Disable auto-indexing in production for performance
    });

    logger.success(`🔌 MongoDB Connected Successfully: ${connInstance.connection.host}`);
    retryCount = 0; // Reset connection counters on successful link
  } catch (error) {
    logger.error('❌ MongoDB Atlas Connection Failure:', error);

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      logger.warn(`Retrying database connection in ${RETRY_INTERVAL_MS / 1000}s... (Attempt ${retryCount}/${MAX_RETRIES})`);
      setTimeout(connectDB, RETRY_INTERVAL_MS);
    } else {
      logger.error('❌ Persistent DB Connection Failure: Exceeded maximum retry threshold. Initiating system shutdown.');
      process.exit(1);
    }
  }
};

// Monitor ongoing connection drops inside runtime container
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB connection lost. Database state is currently disconnected.');
});

mongoose.connection.on('error', (err) => {
  logger.error('⚠️ MongoDB runtime error encountered:', err);
});

module.exports = connectDB;

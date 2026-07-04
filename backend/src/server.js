const app = require('./app');
const connectDB = require('./config/db');
const { port, env } = require('./config/env');
const logger = require('./utils/logger');

// ==========================================
// 🚀 SERVER INCEPTION & SYSTEM BOOTSTRAP
// ==========================================

let server;

const startServer = async () => {
  // 1. Establish secure DB connection before listening on network socket
  await connectDB();

  // 2. Bind application to specified local network port if not running in Vercel Serverless environment
  if (!process.env.VERCEL) {
    server = app.listen(port, () => {
      logger.success(`🚀 ReWeara server initialized in [${env}] mode.`);
      logger.success(`   Listening on interface: http://localhost:${port}`);
    });
  }
};

startServer();

// Export the express application module for Vercel Serverless hosting entry
module.exports = app;

// ==========================================
// 🛡️ UNHANDLED CRITICAL EXCEPTION MONITOR
// ==========================================

// Intercept unhandled promise rejections (e.g. lost DB credentials)
process.on('unhandledRejection', (err) => {
  logger.error('💥 UNHANDLED PROMISE REJECTION TRIGGERED! Shutting down server gracefully...', err);
  
  if (server) {
    server.close(() => {
      logger.info('💤 Express server connection pools terminated.');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Intercept raw uncaught exceptions (e.g. undefined variable calls)
process.on('uncaughtException', (err) => {
  logger.error('💥 UNCAUGHT EXCEPTION TRIGGERED! Exiting system immediately...', err);
  process.exit(1);
});

// ==========================================
// 💤 GRACEFUL CONTAINER SHUTDOWN (SIGTERM/SIGINT)
// ==========================================

const shutdownGracefully = (signal) => {
  logger.warn(`⚠️ Received ${signal} signal. Initiating graceful shutdown sequence.`);
  
  if (server) {
    server.close(() => {
      logger.success('Express HTTP server shutdown complete.');
      
      // Close Mongoose connection handle cleanly
      const mongoose = require('mongoose');
      mongoose.connection.close().then(() => {
        logger.success('MongoDB connection handle terminated.');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));

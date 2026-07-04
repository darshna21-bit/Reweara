const { env } = require('../config/env');

const colors = {
  reset: '\x1b[0m',
  info: '\x1b[36m',    // Cyan
  success: '\x1b[32m', // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[90m'    // Grey
};

const formatMessage = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  
  if (env === 'production') {
    // In production, log as flat structured JSON for log aggregators
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(meta ? { meta } : {})
    });
  }

  // Colorized, human-readable terminal output for development
  const color = colors[level] || colors.reset;
  const metaStr = meta ? ` | meta: ${JSON.stringify(meta, null, 2)}` : '';
  return `[${timestamp}] [${color}${level.toUpperCase()}${colors.reset}]: ${message}${metaStr}`;
};

const logger = {
  info: (message, meta) => {
    console.log(formatMessage('info', message, meta));
  },
  success: (message, meta) => {
    console.log(formatMessage('success', message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatMessage('warn', message, meta));
  },
  error: (message, errorObject) => {
    let meta;
    if (errorObject instanceof Error) {
      meta = {
        name: errorObject.name,
        stack: errorObject.stack,
        message: errorObject.message
      };
    } else {
      meta = errorObject;
    }
    console.error(formatMessage('error', message, meta));
  },
  debug: (message, meta) => {
    if (env !== 'production') {
      console.log(formatMessage('debug', message, meta));
    }
  }
};

module.exports = logger;

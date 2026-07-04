const cloudinary = require('cloudinary').v2;
const envConfig = require('./env');

/**
 * Configure Cloudinary SDK client connection
 * Dynamically binds API keys validated during server launch.
 */
cloudinary.config({
  cloud_name: envConfig.cloudinary.cloudName,
  api_key: envConfig.cloudinary.apiKey,
  api_secret: envConfig.cloudinary.apiSecret
});

module.exports = cloudinary;

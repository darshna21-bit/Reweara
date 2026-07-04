const cloudinary = require('../config/cloudinary');
const AppError = require('./appError');

/**
 * Uploads an in-memory file buffer directly to Cloudinary using upload streams.
 *
 * @param {Buffer} fileBuffer - In-memory file buffer parsed by multer
 * @param {string} folder - Destination folder directory in Cloudinary
 * @returns {Promise<string>} - Resolves to the resulting secure CDN URL
 */
const uploadBufferToCloudinary = async (fileBuffer, folder) => {
  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result.secure_url);
        }
      );
      
      // End the stream and flush the buffer
      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    throw new AppError(`Cloudinary CDN upload failed: ${error.message || 'Unknown network error.'}`, 500);
  }
};

module.exports = { uploadBufferToCloudinary };

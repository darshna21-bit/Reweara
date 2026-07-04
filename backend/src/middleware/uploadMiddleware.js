const multer = require('multer');
const AppError = require('../utils/appError');

// Configure memory storage (avoids local disk writes for ephemeral hosts like Railway/Render)
const storage = multer.memoryStorage();

/**
 * Filter files by MIME type to strictly allow only common image extensions.
 */
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file format. Only JPEG, PNG, and WEBP formats are allowed.', 400), false);
  }
};

// Instantiate multer with memory storage, 5MB file limits, and type filters
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB per file size limit (PHASE 5.5 Requirement 2)
  },
  fileFilter
});

module.exports = upload;

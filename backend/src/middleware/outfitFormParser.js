const AppError = require('../utils/appError');

/**
 * Normalizes incoming multipart/form-data text fields into structured types
 * expected by the Zod outfit validation schemas.
 * 
 * Since multipart forms parse all text inputs as strings, this middleware
 * converts numeric fields, JSON-stringified subdocuments, and comma-separated
 * tag arrays before Zod validations run, avoiding type validation failures.
 */
const outfitFormParser = (req, res, next) => {
  // If req.body is empty or not populated, bypass
  if (!req.body) {
    return next();
  }

  // 1. Normalize Core Numeric Fields (rentPrice, refundableDeposit, originalMRP)
  const numericFields = ['rentPrice', 'refundableDeposit', 'originalMRP'];
  numericFields.forEach((field) => {
    if (req.body[field] !== undefined && req.body[field] !== '') {
      const parsed = Number(req.body[field]);
      if (!isNaN(parsed)) {
        req.body[field] = parsed;
      }
    }
  });

  // 2. Parse Nested measurements JSON string or properties
  if (req.body.measurements !== undefined) {
    if (typeof req.body.measurements === 'string') {
      try {
        req.body.measurements = JSON.parse(req.body.measurements);
      } catch (err) {
        // Leave as string so Zod object validation fails naturally
      }
    }

    // Cast measurements numerical sub-properties to Numbers
    if (typeof req.body.measurements === 'object' && req.body.measurements !== null) {
      const measurementKeys = ['bust', 'waist', 'hips', 'length', 'shoulder', 'sleeveLength'];
      measurementKeys.forEach((key) => {
        if (req.body.measurements[key] !== undefined && req.body.measurements[key] !== '') {
          const parsed = Number(req.body.measurements[key]);
          if (!isNaN(parsed)) {
            req.body.measurements[key] = parsed;
          }
        }
      });
    }
  }

  // 3. Normalize Array fields (occasions, tags) from comma strings or repeat values
  const arrayFields = ['occasions', 'tags'];
  arrayFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (typeof req.body[field] === 'string') {
        // Split on commas and trim whitespace
        req.body[field] = req.body[field]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      } else if (!Array.isArray(req.body[field])) {
        // Wrap single non-string element in array
        req.body[field] = [req.body[field]];
      }
    }
  });

  next();
};

module.exports = outfitFormParser;

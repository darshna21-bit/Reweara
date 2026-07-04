const mongoose = require('mongoose');
const Outfit = require('../models/Outfit');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');

/**
 * @desc    Retrieves a list of filtered outfits catalog
 * @route   GET /api/v1/outfits
 * @access  Public
 */
exports.getOutfits = asyncHandler(async (req, res, next) => {
  const { search, category, occasion, color, fabric, minPrice, maxPrice, sortBy, page, limit } = req.query;

  const parsedPage = Number(page) || 1;
  const parsedLimit = Number(limit) || 10;
  const skip = (parsedPage - 1) * parsedLimit;

  // Build basic query filters. Public catalog strictly sees available outfits only.
  let query = { status: 'available' };

  if (category) {
    query.category = category.toLowerCase();
  }
  if (occasion) {
    query.occasions = occasion.toLowerCase();
  }
  if (color) {
    query.color = color.toLowerCase();
  }
  if (fabric) {
    query.fabric = fabric.toLowerCase();
  }

  // Price range filters
  if (minPrice || maxPrice) {
    query.rentPrice = {};
    if (minPrice) query.rentPrice.$gte = Number(minPrice);
    if (maxPrice) query.rentPrice.$lte = Number(maxPrice);
  }

  // Sort logic definition
  let sortOption = {};
  if (sortBy) {
    const [field, order] = sortBy.split(':');
    sortOption[field] = order === 'desc' ? -1 : 1;
  } else {
    sortOption.createdAt = -1; // Default: newest catalog items first
  }

  let outfits;
  let totalCount;

  // HYBRID SEARCH ALGORITHM (Correction 2)
  if (search) {
    const cleanedSearch = search.trim();
    logger.info(`🔍 Initiating hybrid catalog search for: "${cleanedSearch}"`);

    // Step 1: Attempt MongoDB Text Index search first
    const textQuery = { ...query, $text: { $search: cleanedSearch } };
    outfits = await Outfit.find(
      textQuery,
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(parsedLimit);

    totalCount = await Outfit.countDocuments(textQuery);

    // Step 2: Fall back to Regex Search if text search returns no matches
    if (outfits.length === 0) {
      logger.info('⚠️ Text index returned 0 matches. Falling back to multi-field regex match.');
      const terms = cleanedSearch.split(/\s+/).filter(Boolean);
      const regexQueries = terms.map(term => ({
        $or: [
          { title: { $regex: term, $options: 'i' } },
          { description: { $regex: term, $options: 'i' } },
          { color: { $regex: term, $options: 'i' } },
          { occasions: { $regex: term, $options: 'i' } },
          { category: { $regex: term, $options: 'i' } }
        ]
      }));

      if (regexQueries.length > 0) {
        query.$and = regexQueries;
      }

      outfits = await Outfit.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(parsedLimit);

      totalCount = await Outfit.countDocuments(query);
    }
  } else {
    // Standard filtered execution
    outfits = await Outfit.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parsedLimit);

    totalCount = await Outfit.countDocuments(query);
  }

  res.status(200).json({
    success: true,
    message: 'Catalog outfits fetched successfully.',
    data: {
      outfits,
      totalCount,
      page: parsedPage,
      limit: parsedLimit
    }
  });
});

/**
 * @desc    Retrieves a single outfit detail page profile (by slug or ObjectId)
 * @route   GET /api/v1/outfits/:slugOrId
 * @access  Public
 */
exports.getOutfitDetails = asyncHandler(async (req, res, next) => {
  const { slugOrId } = req.params;
  let lookupQuery = {};

  if (mongoose.Types.ObjectId.isValid(slugOrId)) {
    lookupQuery._id = slugOrId;
  } else {
    lookupQuery.slug = slugOrId.toLowerCase();
  }

  const outfit = await Outfit.findOne(lookupQuery);
  if (!outfit) {
    return next(new AppError('No outfit found with that identifier.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Outfit detailed metadata fetched successfully.',
    data: {
      outfit
    }
  });
});

/**
 * @desc    Creates a new outfit in catalog
 * @route   POST /api/v1/outfits/admin
 * @access  Private (Admin/SuperAdmin)
 */
exports.createOutfit = asyncHandler(async (req, res, next) => {
  // 1. Assert media files presence and constraints BEFORE Cloudinary upload loops (PHASE 5.5 Requirement)
  const thumbnailFile = req.files?.thumbnail?.[0];
  const imageFiles = req.files?.images;

  if (!thumbnailFile) {
    return next(new AppError('Thumbnail image file is required.', 400));
  }

  if (!imageFiles || imageFiles.length < 2) {
    return next(new AppError('Please upload at least 2 product images (front & back view).', 400));
  }

  // 2. Upload thumbnail buffer to Cloudinary
  logger.info('☁️ Uploading outfit thumbnail to Cloudinary CDN...');
  const thumbnailUrl = await uploadBufferToCloudinary(thumbnailFile.buffer, 'reweara/outfits');

  // 3. Upload all image buffers to Cloudinary in parallel
  logger.info(`☁️ Uploading ${imageFiles.length} outfit images to Cloudinary CDN...`);
  const imageUploadPromises = imageFiles.map((file) => 
    uploadBufferToCloudinary(file.buffer, 'reweara/outfits')
  );
  const imageUrls = await Promise.all(imageUploadPromises);

  // 4. Map uploaded URLs to request body before DB creation
  req.body.thumbnail = thumbnailUrl;
  req.body.images = imageUrls;

  const newOutfitData = {
    ...req.body,
    createdBy: req.user._id,
    updatedBy: req.user._id
  };

  const outfit = await Outfit.create(newOutfitData);

  res.status(201).json({
    success: true,
    message: 'New outfit added successfully to the catalog database.',
    data: {
      outfit
    }
  });
});

/**
 * @desc    Modifies an existing outfit details
 * @route   PATCH /api/v1/outfits/admin/:id
 * @access  Private (Admin/SuperAdmin)
 */
exports.updateOutfit = asyncHandler(async (req, res, next) => {
  // 1. Check if new media files are provided and execute conditional updates
  const thumbnailFile = req.files?.thumbnail?.[0];
  const imageFiles = req.files?.images;

  // Optional new thumbnail update
  if (thumbnailFile) {
    logger.info('☁️ Uploading new outfit thumbnail to Cloudinary CDN...');
    const thumbnailUrl = await uploadBufferToCloudinary(thumbnailFile.buffer, 'reweara/outfits');
    req.body.thumbnail = thumbnailUrl;
  }

  // Optional new images update (enforces catalog minimum 2 photos constraint if uploaded)
  if (imageFiles) {
    if (imageFiles.length < 2) {
      return next(new AppError('Please upload at least 2 product images (front & back view).', 400));
    }

    logger.info(`☁️ Uploading ${imageFiles.length} new outfit images to Cloudinary CDN...`);
    const imageUploadPromises = imageFiles.map((file) => 
      uploadBufferToCloudinary(file.buffer, 'reweara/outfits')
    );
    const imageUrls = await Promise.all(imageUploadPromises);
    req.body.images = imageUrls;
  }

  const updatedData = {
    ...req.body,
    updatedBy: req.user._id
  };

  // Enforce runValidators to execute schema validations on edits
  const outfit = await Outfit.findByIdAndUpdate(
    req.params.id,
    updatedData,
    { new: true, runValidators: true }
  );

  if (!outfit) {
    return next(new AppError('No outfit found with that ID.', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Outfit details updated successfully.',
    data: {
      outfit
    }
  });
});

/**
 * @desc    Toggles active state of an outfit (Soft Delete)
 * @route   DELETE /api/v1/outfits/admin/:id
 * @access  Private (Admin/SuperAdmin)
 */
exports.deleteOutfit = asyncHandler(async (req, res, next) => {
  const outfit = await Outfit.findByIdAndUpdate(
    req.params.id,
    { status: 'inactive', updatedBy: req.user._id },
    { new: true }
  );

  if (!outfit) {
    return next(new AppError('No outfit found with that ID.', 404));
  }

  res.status(200).json({
    success: true,
    message: `Outfit [${req.params.id}] successfully marked as inactive. Catalog visibility disabled.`,
    data: {
      id: outfit._id,
      status: outfit.status
    }
  });
});

/**
 * @desc    Retrieves a list of all outfits for admin view (unfiltered, unpaginated)
 * @route   GET /api/v1/outfits/admin
 * @access  Private (Admin/SuperAdmin)
 */
exports.getAdminOutfits = asyncHandler(async (req, res, next) => {
  logger.info('📋 Admin initiating fetch for all catalog outfits');
  const outfits = await Outfit.find({}).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'All outfits fetched successfully for admin.',
    data: {
      outfits
    }
  });
});


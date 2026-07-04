const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema({
  bust: { type: Number, required: [true, 'Bust measurement in inches is required.'] },
  waist: { type: Number, required: [true, 'Waist measurement in inches is required.'] },
  hips: { type: Number, required: [true, 'Hips measurement in inches is required.'] },
  length: { type: Number, required: [true, 'Garment length in inches is required.'] },
  shoulder: { type: Number },
  sleeveLength: { type: Number },
  alterationNotes: { type: String, trim: true }
}, { _id: false });

const videoSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String }, // Cloudinary asset tracker
  type: { type: String, enum: ['reel', 'walking-flair'], default: 'reel' }
}, { _id: false });

const outfitSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide the outfit title.'],
    trim: true,
    index: true
  },
  slug: {
    type: String,
    required: [true, 'Slug path is required.'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a product description.']
  },
  category: {
    type: String,
    enum: {
      values: ['lehenga', 'saree', 'gown', 'indo-western', 'festive-wear', 'wedding-guest', 'farewell-wear'],
      message: 'Category must be lehenga, saree, gown, indo-western, festive-wear, wedding-guest, or farewell-wear.'
    },
    required: [true, 'Category classification is required.'],
    lowercase: true,
    index: true
  },
  occasions: [{
    type: String,
    enum: {
      values: ['wedding', 'reception', 'haldi', 'mehendi', 'engagement', 'pre-wedding', 'sangeet', 'farewell', 'traditional-day'],
      message: 'Invalid occasion category.'
    },
    lowercase: true,
    index: true
  }],
  gender: {
    type: String,
    enum: ['female', 'male', 'unisex'],
    default: 'female',
    lowercase: true
  },
  brand: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // 📏 STYLING METADATA
  color: {
    type: String,
    required: [true, 'Color specification is required.'],
    trim: true,
    lowercase: true,
    index: true
  },
  fabric: {
    type: String,
    required: [true, 'Fabric specification is required.'],
    trim: true,
    lowercase: true
  },
  embroideryType: {
    type: String,
    trim: true,
    lowercase: true
  },
  styleType: {
    type: String,
    trim: true,
    lowercase: true
  },
  measurements: {
    type: measurementSchema,
    required: [true, 'Styling measurement parameters are required.']
  },

  // 💰 PRICING LEDGERS
  rentPrice: {
    type: Number,
    required: [true, 'Rent fee amount is required.'],
    min: [0, 'Rent fee cannot be negative.'],
    index: true
  },
  refundableDeposit: {
    type: Number,
    required: [true, 'Refundable deposit amount is required.'],
    min: [0, 'Refundable deposit cannot be negative.']
  },
  originalMRP: {
    type: Number,
    required: [true, 'Original MRP value is required.'],
    min: [0, 'Original MRP cannot be negative.']
  },
  securityPolicyType: {
    type: String,
    enum: ['standard', 'strict', 'flexible'],
    default: 'standard',
    lowercase: true
  },

  // 🖼️ MEDIA SYSTEM DATA
  thumbnail: {
    type: String,
    required: [true, 'Thumbnail image URL is required.']
  },
  images: [{
    type: String,
    required: [true, 'Image URL link is required.']
  }],
  videos: [videoSchema],

  // 📦 INVENTORY & CONDITION METRICS
  condition: {
    type: String,
    enum: ['new', 'excellent', 'good', 'needs-cleaning', 'damaged'],
    default: 'new',
    lowercase: true
  },
  qualityNotes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['available', 'maintenance', 'damaged', 'retired', 'inactive'],
    default: 'available',
    lowercase: true,
    index: true
  },

  // 📅 AVAILABILITY RESERVATIONS
  blacklistedDates: [{
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: { type: String, required: true }
  }],

  // ⭐ REVIEWS & RATINGS (Denormalized to prevent database aggregation loads)
  averageRating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0.'],
    max: [5, 'Rating cannot exceed 5.'],
    set: (val) => Math.round(val * 10) / 10 // Round to 1 decimal place
  },
  totalReviews: {
    type: Number,
    default: 0,
    min: [0, 'Review counts cannot be negative.']
  },

  // 👤 ADMINISTRATIVE TRACEABILITY
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin reference createdBy is required.']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Admin reference updatedBy is required.']
  }
});

// Pre-validate hook: Automatically slugifies product title, normalizes it, and resolves duplicate slug collisions
outfitSchema.pre('validate', async function (next) {
  try {
    if (this.isModified('title') || this.isModified('slug') || !this.slug) {
      let baseSlug = (this.slug || this.title || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Strip special punctuation
        .replace(/[\s_]+/g, '-')  // Replace spaces/underscores with dashes
        .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes

      if (!baseSlug) {
        baseSlug = 'outfit';
      }

      let uniqueSlug = baseSlug;
      let counter = 0;
      let exists = true;

      // Use this.constructor dynamically to query the active Outfit model
      while (exists) {
        const query = { slug: uniqueSlug };
        if (!this.isNew) {
          query._id = { $ne: this._id };
        }
        const existingDoc = await this.constructor.findOne(query);
        if (existingDoc) {
          counter++;
          uniqueSlug = `${baseSlug}-${counter}`;
        } else {
          exists = false;
        }
      }
      this.slug = uniqueSlug;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 🔍 DATABASE PERFORMANCE INDEXES
// ==========================================

// 1. Compound index for multi-filter catalog queries (Pune operations filtering)
outfitSchema.index({ category: 1, status: 1, rentPrice: 1 });

// 2. Text Search index for robust fuzzy text discovery
outfitSchema.index({
  title: 'text',
  description: 'text',
  color: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    tags: 5,
    color: 3,
    description: 1
  },
  name: 'outfit_fuzzy_search_index'
});

const Outfit = mongoose.model('Outfit', outfitSchema);

module.exports = Outfit;

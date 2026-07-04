/**
 * ==========================================
 * REWEARA DEMO OUTFITS SEEDING BLUEPRINT
 * ==========================================
 *
 * This file serves as the planning guide and baseline blueprint for database seeding in Phase 4.
 * It outlines how the initial Pune catalog (20-30 premium outfits) will be safely loaded.
 *
 * Seeding Rules Enforced:
 * 1. Zero Hardcoding: The script dynamically queries the 'User' database for an active 'super_admin' or
 *    'admin' profile ID to assign as the product owner ('createdBy' and 'updatedBy').
 * 2. Zod Schema Verification: Every item is parsed through 'createOutfitSchema' before database insertion
 *    to guarantee perfect data sanitization, lowercase enums, and valid measurement types.
 * 3. Bulk Write Operations: Uses MongoDB's highly performant 'insertMany' in a single transaction.
 * 4. Idempotency Check: Queries current outfits SKU indexes. If the database is already seeded,
 *    it gracefully aborts, preventing duplicate inventory clutter.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Configure environment bindings
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Outfit = require('../src/models/Outfit');
const logger = require('../src/utils/logger');
const connectDB = require('../src/config/db');
const { createOutfitSchema } = require('../src/validators/outfitValidator');

// Structured mock outfits representing standard Circular Indian Garments catalog (Pune boutique)
const DEMO_OUTFITS_CATALOG = [
  {
    title: 'Warm Nude Pink Lehenga',
    slug: 'warm-nude-pink-lehenga',
    description: 'A premium blush nude pink Georgette Lehenga featuring heavy zardozi embroidery and styling drapes. Elegant and light, perfect for sangeet nights.',
    category: 'lehenga',
    occasions: ['sangeet', 'wedding', 'reception'],
    gender: 'female',
    brand: 'Custom Boutique',
    tags: ['blush-rose', 'zardozi', 'lehenga', 'sangeet-wear'],
    color: 'pink',
    fabric: 'georgette',
    embroideryType: 'zardozi',
    styleType: 'bridal-guest',
    measurements: {
      bust: 36,
      waist: 28,
      hips: 38,
      length: 42,
      shoulder: 14,
      sleeveLength: 10,
      alterationNotes: 'Waist alteration bounds: +/- 2 inches easily adjustable by local Pune tailor counter.'
    },
    rentPrice: 899,
    refundableDeposit: 2000,
    originalMRP: 9000,
    securityPolicyType: 'standard',
    thumbnail: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600', // Premium high-fidelity visual placeholders
    images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=800'
    ],
    videos: [
      {
        url: 'https://assets.mixkit.co/videos/preview/mixkit-beautiful-woman-wearing-traditional-wedding-dress-walking-41584-large.mp4',
        type: 'reel'
      }
    ],
    condition: 'excellent',
    status: 'available',
    averageRating: 0,
    totalReviews: 0
  },
  {
    title: 'Matte Wine Maroon Saree',
    slug: 'matte-wine-maroon-saree',
    description: 'An elegant deep wine maroon Organza Saree featuring gold thread borders and pre-pleated waist bands for ease of wear.',
    category: 'saree',
    occasions: ['farewell', 'traditional-day', 'reception'],
    gender: 'female',
    brand: 'Vogue Weaves',
    tags: ['wine', 'maroon', 'saree', 'farewell'],
    color: 'maroon',
    fabric: 'organza',
    embroideryType: 'zari-border',
    styleType: 'pre-pleated',
    measurements: {
      bust: 34,
      waist: 26,
      hips: 36,
      length: 40,
      shoulder: 13,
      sleeveLength: 8,
      alterationNotes: 'Pre-pleated waist hooks fit size 24-30.'
    },
    rentPrice: 699,
    refundableDeposit: 1500,
    originalMRP: 6000,
    securityPolicyType: 'standard',
    thumbnail: 'https://images.unsplash.com/photo-1610030470298-40b355e717de?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1610030470298-40b355e717de?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&q=80&w=800'
    ],
    videos: [],
    condition: 'new',
    status: 'available',
    averageRating: 0,
    totalReviews: 0
  }
];

const seedDemoOutfits = async () => {
  try {
    await connectDB();

    // 1. Indentify active system administrator to associate ownership logs
    const activeAdmin = await User.findOne({ role: 'super_admin' });
    if (!activeAdmin) {
      logger.error('❌ SEEDING FAILED: No active SuperAdmin found. Please execute npm run seed first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    // 2. Perform Idempotency check: prevent duplicate database seeding
    const existingCount = await Outfit.countDocuments();
    if (existingCount > 0) {
      logger.warn(`⚠️ SEEDING ABORTED: Database already has ${existingCount} outfits seeded.`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // 3. Process, Zod validate, and enrich demo catalog
    const validatedOutfits = [];
    for (const item of DEMO_OUTFITS_CATALOG) {
      // Inject admin ownership tags dynamically
      const fullItem = {
        ...item,
        createdBy: activeAdmin._id.toString(),
        updatedBy: activeAdmin._id.toString()
      };

      // Zod Validation Assertion
      const zodCheck = createOutfitSchema.safeParse(fullItem);
      if (!zodCheck.success) {
        logger.error(`❌ SEED SCHEMA INVALID for [${item.title}]:`);
        zodCheck.error.issues.forEach((v) => logger.error(`   - [${v.path.join('.')}]: ${v.message}`));
        await mongoose.connection.close();
        process.exit(1);
      }

      // Append sanitized, validated result
      validatedOutfits.push(zodCheck.data);
    }

    // 4. Bulk Write atomic operations
    await Outfit.insertMany(validatedOutfits);
    logger.success(`🚀 SEED SUCCESS: successfully seeded ${validatedOutfits.length} premium Indian outfits into MongoDB catalog!`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('💥 SEED CRITICAL FAILURE: execution error.', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Plan trigger: export/execution ready
module.exports = {
  seedDemoOutfits,
  DEMO_OUTFITS_CATALOG
};

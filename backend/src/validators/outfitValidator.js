const { z } = require('zod');

// Measurements sub-object validation schema
const measurementSchema = z.object({
  bust: z.number({ required_error: 'Bust measurement is required.' }).min(20).max(60),
  waist: z.number({ required_error: 'Waist measurement is required.' }).min(15).max(50),
  hips: z.number({ required_error: 'Hips measurement is required.' }).min(20).max(60),
  length: z.number({ required_error: 'Garment length is required.' }).min(10).max(100),
  shoulder: z.number().min(5).max(30).optional(),
  sleeveLength: z.number().min(0).max(40).optional(),
  alterationNotes: z.string().trim().max(500).optional()
});

// Create Outfit request validation schema
const createOutfitSchema = z.object({
  title: z
    .string({ required_error: 'Title is required.' })
    .trim()
    .min(3, 'Title must be at least 3 characters long.')
    .max(100, 'Title cannot exceed 100 characters.'),
  
  slug: z
    .string()
    .trim()
    .lowercase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be an SEO-friendly URL path (lowercase alphanumeric separated by dashes, e.g. red-bridal-lehenga)')
    .optional(),

  description: z
    .string({ required_error: 'Description is required.' })
    .trim()
    .min(10, 'Description must be at least 10 characters long.'),
  
  category: z.enum(
    ['lehenga', 'saree', 'gown', 'indo-western', 'festive-wear', 'wedding-guest', 'farewell-wear'],
    { invalid_type_error: 'Invalid category selection.' }
  ),

  occasions: z
    .array(z.enum(['wedding', 'reception', 'haldi', 'mehendi', 'engagement', 'pre-wedding', 'sangeet', 'farewell', 'traditional-day']))
    .min(1, 'Please select at least one occasion tag.'),
  
  gender: z.enum(['female', 'male', 'unisex']).default('female'),
  
  brand: z.string().trim().max(100).optional(),
  
  tags: z.array(z.string().trim().lowercase()).optional(),
  
  color: z
    .string({ required_error: 'Color specification is required.' })
    .trim()
    .lowercase()
    .min(2, 'Color must be at least 2 characters long.'),
  
  fabric: z
    .string({ required_error: 'Fabric is required.' })
    .trim()
    .min(2, 'Fabric must be at least 2 characters long.'),
  
  embroideryType: z.string().trim().optional(),
  styleType: z.string().trim().optional(),
  
  measurements: measurementSchema,

  rentPrice: z
    .number({ required_error: 'Rent fee is required.' })
    .min(0, 'Rent price cannot be negative.'),
  
  refundableDeposit: z
    .number({ required_error: 'Refundable deposit is required.' })
    .min(0, 'Deposit cannot be negative.'),
  
  originalMRP: z
    .number({ required_error: 'Original MRP is required.' })
    .min(0, 'MRP cannot be negative.'),
  
  securityPolicyType: z.enum(['standard', 'strict', 'flexible']).default('standard'),

  thumbnail: z
    .string()
    .url('Thumbnail must be a valid URL.')
    .optional(),
  
  images: z
    .array(z.string().url('Image link must be a valid URL.'))
    .optional(),
  
  condition: z.enum(['new', 'excellent', 'good', 'needs-cleaning', 'damaged']).default('new'),
  
  qualityNotes: z.string().trim().optional(),
  
  status: z.enum(['available', 'maintenance', 'damaged', 'retired', 'inactive']).default('available')
});

// Update Outfit schema: maps all fields optionally to support partial edits (PATCH)
const updateOutfitSchema = createOutfitSchema.partial();

module.exports = {
  createOutfitSchema,
  updateOutfitSchema
};

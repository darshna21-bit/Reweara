const { z } = require('zod');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const createReviewSchema = z.object({
  outfitId: z
    .string({ required_error: 'Outfit identifier reference is required.' })
    .regex(objectIdRegex, 'Invalid outfit ID reference format.'),
  
  bookingId: z
    .string({ required_error: 'Associated booking reference is required.' })
    .regex(objectIdRegex, 'Invalid booking ID reference format.'),
  
  rating: z
    .number({ required_error: 'Rating score is required.' })
    .min(1, 'Rating must be at least 1 star.')
    .max(5, 'Rating cannot exceed 5 stars.'),
  
  title: z
    .string()
    .trim()
    .max(100, 'Title cannot exceed 100 characters.')
    .optional(),
  
  comment: z
    .string({ required_error: 'Review feedback comment is required.' })
    .trim()
    .min(10, 'Review comment must be at least 10 characters long to provide value.')
    .max(1000, 'Review comment cannot exceed 1000 characters.'),
  
  media: z
    .array(z.string().url('Attachment link must be a valid URL.'))
    .max(5, 'You cannot attach more than 5 photos to a review.')
    .optional()
});

module.exports = {
  createReviewSchema
};

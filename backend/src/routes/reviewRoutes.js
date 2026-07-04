const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateInput } = require('../middleware/validationMiddleware');

// 1. Public Review Browsing Pathway
router.get('/outfit/:id', reviewController.getOutfitReviews);

// 2. Authenticated Customer Review Submissions
router.post('/', protect, validateInput('create_review'), reviewController.createReview);

// 3. Administrative Control Pathways (Guarded under RBAC security filters)
router.put('/admin/:id/moderate', protect, authorize('super_admin', 'admin'), reviewController.moderateReviewAdmin);
router.delete('/admin/:id', protect, authorize('super_admin', 'admin'), reviewController.deleteReviewAdmin);

module.exports = router;

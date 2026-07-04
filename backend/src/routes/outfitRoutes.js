const express = require('express');
const router = express.Router();
const outfitController = require('../controllers/outfitController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateInput } = require('../middleware/validationMiddleware');
const upload = require('../middleware/uploadMiddleware');
const outfitFormParser = require('../middleware/outfitFormParser');

// 1. Public List Pathway
router.get('/', outfitController.getOutfits);

// ==========================================
// 2. ADMINISTRATIVE CONTROL PATHWAYS (Guarded under RBAC security filters)
// ==========================================

// Create new outfit with media upload pipeline
router.post(
  '/admin',
  protect,
  authorize('super_admin', 'admin'),
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]),
  outfitFormParser,
  validateInput('create_outfit'),
  outfitController.createOutfit
);

// Update existing outfit details with optional media uploads
router.patch(
  '/admin/:id',
  protect,
  authorize('super_admin', 'admin'),
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]),
  outfitFormParser,
  validateInput('update_outfit'),
  outfitController.updateOutfit
);

router.get(
  '/admin',
  protect,
  authorize('super_admin', 'admin'),
  outfitController.getAdminOutfits
);

router.delete(
  '/admin/:id',
  protect,
  authorize('super_admin', 'admin'),
  outfitController.deleteOutfit
);

// 3. Dynamic Public Details Pathway (Must reside at the bottom to prevent route collisions)
router.get('/:slugOrId', outfitController.getOutfitDetails);

module.exports = router;

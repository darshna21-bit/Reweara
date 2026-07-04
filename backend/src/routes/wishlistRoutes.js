const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

// All Wishlist pathways require strict Access Token validations
router.get('/', protect, wishlistController.getWishlist);
router.post('/:outfitId', protect, wishlistController.addFavorite);
router.delete('/:outfitId', protect, wishlistController.removeFavorite);

module.exports = router;

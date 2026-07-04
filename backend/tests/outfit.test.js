const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Outfit = require('../src/models/Outfit');
const AuthService = require('../src/services/authService');
const mongoose = require('mongoose');

// 1. Mock Cloudinary client integration at module level
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn().mockImplementation((options, callback) => {
        return {
          end: jest.fn().mockImplementation((fileBuffer) => {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/mock_cloud/image/upload/v12345/mock_image.jpg',
              public_id: 'mock_public_id_123'
            });
          })
        };
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    }
  }
}));

describe('👗 Outfit Catalog Management Integration Tests', () => {
  let customerUser;
  let adminUser;
  
  let customerToken;
  let adminToken;

  beforeEach(async () => {
    // 1. Seed Customer User
    customerUser = await User.create({
      name: 'Regular Customer',
      email: 'customer@test.com',
      password: 'Password123!',
      phone: '9876543210',
      role: 'customer'
    });
    customerToken = AuthService.generateAccessToken(customerUser);

    // 2. Seed Admin User
    adminUser = await User.create({
      name: 'Store Admin',
      email: 'admin@test.com',
      password: 'Password123!',
      phone: '9988776655',
      role: 'admin'
    });
    adminToken = AuthService.generateAccessToken(adminUser);
  });

  describe('POST /api/v1/outfits/admin', () => {
    it('should reject a customer attempting to create an outfit (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/outfits/admin')
        .set('Authorization', `Bearer ${customerToken}`)
        .attach('thumbnail', Buffer.from('mock_thumbnail'), 'thumbnail.jpg')
        .attach('images', Buffer.from('mock_img1'), 'img1.jpg')
        .attach('images', Buffer.from('mock_img2'), 'img2.jpg')
        .field('title', 'Chic Evening Gown')
        .field('description', 'A gorgeous gown.')
        .field('category', 'gown')
        .field('color', 'emerald-green')
        .field('fabric', 'silk')
        .field('rentPrice', '2000')
        .field('refundableDeposit', '3000')
        .field('originalMRP', '15000')
        .field('measurements', JSON.stringify({ bust: 34, waist: 26, hips: 36, length: 44 }));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('clearance to perform this action');
    });

    it('should allow an admin to successfully create an outfit with valid multipart inputs and files', async () => {
      const res = await request(app)
        .post('/api/v1/outfits/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('thumbnail', Buffer.from('mock_thumbnail'), 'thumbnail.jpg')
        .attach('images', Buffer.from('mock_img1'), 'img1.jpg')
        .attach('images', Buffer.from('mock_img2'), 'img2.jpg')
        .field('title', 'Chic Wedding Lehenga')
        .field('description', 'A beautiful heavy hand-embroidered wedding lehenga.')
        .field('category', 'lehenga')
        .field('occasions', 'wedding, sangeet')
        .field('color', 'crimson-red')
        .field('fabric', 'velvet')
        .field('rentPrice', '5000')
        .field('refundableDeposit', '8000')
        .field('originalMRP', '50000')
        .field('measurements', JSON.stringify({ bust: 36, waist: 28, hips: 40, length: 42 }));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.outfit).toBeDefined();
      expect(res.body.data.outfit.title).toBe('Chic Wedding Lehenga');
      expect(res.body.data.outfit.slug).toBe('chic-wedding-lehenga');
      expect(res.body.data.outfit.thumbnail).toBe('https://res.cloudinary.com/mock_cloud/image/upload/v12345/mock_image.jpg');
      expect(res.body.data.outfit.images.length).toBe(2);

      // Verify DB entry
      const dbOutfit = await Outfit.findOne({ slug: 'chic-wedding-lehenga' });
      expect(dbOutfit).toBeDefined();
      expect(dbOutfit.category).toBe('lehenga');
      expect(dbOutfit.createdBy.toString()).toBe(adminUser._id.toString());
    });
  });
});

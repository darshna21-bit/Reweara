const mongoose = require('mongoose');
mongoose.set('autoIndex', false); // Disable auto-indexing to prevent background TTL index conflicts

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Outfit = require('../src/models/Outfit');
const Booking = require('../src/models/Booking');
const AuthService = require('../src/services/authService');

// 1. Mock Razorpay client integration at module level
jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockImplementation((params) => {
        return Promise.resolve({
          id: `rzp_order_${Math.random().toString(36).substring(7)}`,
          amount: params.amount,
          currency: params.currency,
          receipt: params.receipt,
          status: 'created'
        });
      })
    },
    payments: {
      refund: jest.fn().mockImplementation((paymentId, params) => {
        if (paymentId === 'pay_error_123') {
          return Promise.reject({
            code: 'BAD_REQUEST_ERROR',
            message: 'Refund amount exceeds payment captured amount',
            error: {
              description: 'The payment has already been fully refunded'
            }
          });
        }
        return Promise.resolve({
          id: `rfnd_${Math.random().toString(36).substring(7)}`,
          payment_id: paymentId,
          amount: params.amount,
          status: 'processed'
        });
      })
    }
  }));
});

// 2. Mock Cloudinary client integration at module level
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

// Helper to get formatted YYYY-MM-DD date strings relative to current date
const getRelativeDateString = (daysOffset) => {
  const date = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);
  return date.toISOString().split('T')[0];
};

describe('📅 Booking Lifecycle & Conflict Integration Tests', () => {
  let customerA;
  let customerB;
  let adminUser;
  
  let tokenA;
  let tokenB;

  let outfit;

  beforeEach(async () => {
    // Manually create the specific query index needed for overlapping calculations to satisfy the .hint() constraint
    try {
      await Booking.collection.createIndex(
        { outfit: 1, bookingStatus: 1, startDate: 1, endDate: 1 },
        { name: 'booking_overlap_scan_index' }
      );
    } catch (err) {
      // Ignore if index creation fails or already exists
    }

    // 1. Seed Customer Users
    customerA = await User.create({
      name: 'Customer A',
      email: 'customera@test.com',
      password: 'Password123!',
      phone: '9876543210',
      role: 'customer'
    });
    tokenA = AuthService.generateAccessToken(customerA);

    customerB = await User.create({
      name: 'Customer B',
      email: 'customerb@test.com',
      password: 'Password123!',
      phone: '9876543211',
      role: 'customer'
    });
    tokenB = AuthService.generateAccessToken(customerB);

    // 2. Seed Admin User
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'Password123!',
      phone: '9988776655',
      role: 'admin'
    });

    // 3. Seed Outfit
    outfit = await Outfit.create({
      title: 'Premium Royal Saree',
      description: 'A beautiful silk saree perfect for weddings.',
      category: 'saree',
      occasions: ['wedding'],
      color: 'royal-blue',
      fabric: 'silk',
      measurements: { bust: 36, waist: 28, hips: 38, length: 42 },
      rentPrice: 1500,
      refundableDeposit: 2000,
      originalMRP: 15000,
      thumbnail: 'https://res.cloudinary.com/mock/image.jpg',
      images: ['https://res.cloudinary.com/mock/image1.jpg'],
      status: 'available',
      createdBy: adminUser._id,
      updatedBy: adminUser._id
    });
  });

  describe('Conflict / Overlap Detection checks', () => {
    it('should block creating overlapping bookings for the same outfit (409 Conflict)', async () => {
      // 1. Create first booking (Day 1 - Day 5)
      const booking1Res = await request(app)
        .post('/api/v1/bookings/create-order')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          outfitId: outfit._id.toString(),
          startDate: getRelativeDateString(1),
          endDate: getRelativeDateString(5)
        });

      expect(booking1Res.status).toBe(201);
      
      // 2. Attempt to create second overlapping booking (Day 3 - Day 7)
      const booking2Res = await request(app)
        .post('/api/v1/bookings/create-order')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          outfitId: outfit._id.toString(),
          startDate: getRelativeDateString(3),
          endDate: getRelativeDateString(7)
        });

      expect(booking2Res.status).toBe(409);
      expect(booking2Res.body.success).toBe(false);
      expect(booking2Res.body.message).toContain('no longer available for the selected dates');
    });

    it('should allow creating non-overlapping bookings for the same outfit successfully', async () => {
      // 1. Create first booking (Day 1 - Day 5)
      const booking1Res = await request(app)
        .post('/api/v1/bookings/create-order')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          outfitId: outfit._id.toString(),
          startDate: getRelativeDateString(1),
          endDate: getRelativeDateString(5)
        });

      expect(booking1Res.status).toBe(201);

      // 2. Create second booking with non-overlapping dates (Day 6 - Day 10)
      const booking2Res = await request(app)
        .post('/api/v1/bookings/create-order')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          outfitId: outfit._id.toString(),
          startDate: getRelativeDateString(6),
          endDate: getRelativeDateString(10)
        });

      expect(booking2Res.status).toBe(201);
      expect(booking2Res.body.success).toBe(true);
    });
  });

  describe('IDOR Security checks', () => {
    let bookingIdA;

    beforeEach(async () => {
      // Create a booking for Customer A
      const res = await request(app)
        .post('/api/v1/bookings/create-order')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          outfitId: outfit._id.toString(),
          startDate: getRelativeDateString(1),
          endDate: getRelativeDateString(5)
        });
      
      bookingIdA = res.body.data.booking._id;
    });

    it('should reject a customer attempting to view another customer\'s booking details (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${bookingIdA}`)
        .set('Authorization', `Bearer ${tokenB}`) // Customer B tries to view Customer A's booking
        .send();

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You are not authorized to view this booking profile');
    });

    it('should reject a customer attempting to verify payment on a booking that is not theirs (403 Forbidden)', async () => {
      const dbBooking = await Booking.findById(bookingIdA);

      const res = await request(app)
        .post('/api/v1/bookings/verify-payment')
        .set('Authorization', `Bearer ${tokenB}`) // Customer B tries to verify Customer A's payment
        .send({
          bookingId: dbBooking.bookingId,
          razorpay_order_id: dbBooking.razorpayOrderId,
          razorpay_payment_id: 'pay_mock_123',
          razorpay_signature: 'sig_mock_123'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You are not authorized to verify payment for this booking');
    });

    it('should reject a customer attempting to cancel another customer\'s booking (403 Forbidden)', async () => {
      const dbBooking = await Booking.findById(bookingIdA);

      const res = await request(app)
        .patch(`/api/v1/bookings/${dbBooking.bookingId}/cancel`)
        .set('Authorization', `Bearer ${tokenB}`) // Customer B tries to cancel Customer A's booking
        .send({
          cancellationReason: 'I want to cancel this booking'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You are not authorized to cancel this booking');
    });
  });

  describe('Cancellation Policy & Automated Gateway Refunds', () => {
    let confirmedBooking;

    beforeEach(async () => {
      // Direct seeding of a confirmed and paid booking to check policies
      confirmedBooking = await Booking.create({
        bookingId: `BKG-${Date.now().toString().substring(5)}`,
        customer: customerA._id,
        outfit: outfit._id,
        startDate: getRelativeDateString(5), // Starts in 5 days (safe for 3-day block rule)
        endDate: getRelativeDateString(7),
        totalRentAmount: 1500,
        securityDeposit: 2000,
        refundableDeposit: 2000,
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
        deliveryStatus: 'pending',
        razorpayOrderId: 'order_test_123',
        razorpayPaymentId: 'pay_test_123',
        pricingSnapshot: {
          rentPrice: 750,
          refundableDeposit: 2000,
          securityDeposit: 2000
        }
      });
    });

    it('should allow free cancellation (full refund) within the 15-minute mistake window even if the start date is within 3 days', async () => {
      // Force startDate to be within 1 day (would be blocked normally)
      await Booking.collection.updateOne(
        { _id: confirmedBooking._id },
        { $set: { startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) } }
      );

      const res = await request(app)
        .patch(`/api/v1/bookings/${confirmedBooking.bookingId}/cancel`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          cancellationReason: 'Mistake in size selected'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.bookingStatus).toBe('cancelled');
      expect(res.body.data.booking.paymentStatus).toBe('refunded');
      expect(res.body.data.booking.adminNotes).toContain('[REFUND] Automated refund of ₹1500.00 processed (Fee deducted: ₹0.00)');
    });

    it('should deduct a 10% cancellation fee from rent refund if cancelled after the 15-minute window', async () => {
      // Simulate booking created 20 minutes ago
      await Booking.collection.updateOne(
        { _id: confirmedBooking._id },
        { $set: { createdAt: new Date(Date.now() - 20 * 60 * 1000) } }
      );

      const res = await request(app)
        .patch(`/api/v1/bookings/${confirmedBooking.bookingId}/cancel`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          cancellationReason: 'Change of plans for wedding'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.bookingStatus).toBe('cancelled');
      expect(res.body.data.booking.paymentStatus).toBe('refunded');
      // 10% of 1500 rent is 150. Refund is 1350 rent.
      expect(res.body.data.booking.adminNotes).toContain('[REFUND] Automated refund of ₹1350.00 processed (Fee deducted: ₹150.00)');
    });

    it('should block cancellation entirely if requested within 3 days of the rental start date (400 Bad Request)', async () => {
      // Update booking start date to starts in 2 days (fails 3-day block rule)
      // AND backdate createdAt by 20 minutes to be outside the 15-minute grace window
      await Booking.collection.updateOne(
        { _id: confirmedBooking._id },
        { 
          $set: { 
            startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 20 * 60 * 1000)
          } 
        }
      );

      const res = await request(app)
        .patch(`/api/v1/bookings/${confirmedBooking.bookingId}/cancel`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          cancellationReason: 'Event starts tomorrow, need to cancel'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Bookings cannot be cancelled within 3 days of the rental start date');
    });

    it('should reject cancellation of paid legacy bookings that lack a razorpayPaymentId (400 Bad Request)', async () => {
      // Clear payment ID
      await Booking.collection.updateOne(
        { _id: confirmedBooking._id },
        { $unset: { razorpayPaymentId: "" } }
      );

      const res = await request(app)
        .patch(`/api/v1/bookings/${confirmedBooking.bookingId}/cancel`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          cancellationReason: 'Standard cancellation'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Payment transaction ID is missing for this legacy booking');
    });

    it('should successfully cancel the booking but mark payment status as refund_failed if the Razorpay API call fails', async () => {
      // Force paymentId to match the error mock
      await Booking.collection.updateOne(
        { _id: confirmedBooking._id },
        { $set: { razorpayPaymentId: 'pay_error_123' } }
      );

      const res = await request(app)
        .patch(`/api/v1/bookings/${confirmedBooking.bookingId}/cancel`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          cancellationReason: 'Need to cancel and test refund error'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.bookingStatus).toBe('cancelled');
      expect(res.body.data.booking.paymentStatus).toBe('refund_failed');
      expect(res.body.data.booking.adminNotes).toContain('[ERROR] Automated refund of ₹1500.00 failed: Msg: Refund amount exceeds payment captured amount, Code: BAD_REQUEST_ERROR, Desc: The payment has already been fully refunded');
    });
  });
});

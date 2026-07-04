const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const AuthService = require('../src/services/authService');
const mongoose = require('mongoose');

describe('🔑 Authentication & Authorization Integration Tests', () => {
  let customerUser;
  let superAdminUser;
  let superAdminToken;

  beforeEach(async () => {
    // 1. Seed standard customer user
    customerUser = await User.create({
      name: 'Test Customer',
      email: 'customer@test.com',
      password: 'Password123!',
      phone: '9876543210',
      role: 'customer'
    });

    // 2. Seed super_admin user
    superAdminUser = await User.create({
      name: 'Test Super Admin',
      email: 'superadmin@test.com',
      password: 'SuperAdmin123!',
      phone: '9988776655',
      role: 'super_admin'
    });

    superAdminToken = AuthService.generateAccessToken(superAdminUser);
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should force role to "customer" even if a different role is supplied (privilege escalation block)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Hacker User',
          email: 'hacker@test.com',
          password: 'HackerPassword123!',
          phone: '9876543222',
          role: 'super_admin' // Attempted privilege escalation
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('customer');

      // Verify DB matches
      const dbUser = await User.findOne({ email: 'hacker@test.com' });
      expect(dbUser).toBeDefined();
      expect(dbUser.role).toBe('customer');
    });

    it('should successfully register a customer profile with valid details', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          name: 'Jane Doe',
          email: 'jane@test.com',
          password: 'JaneDoePassword123!',
          phone: '9876543211'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('jane@test.com');
      expect(res.body.data.user.role).toBe('customer');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully log in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer@test.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('customer@test.com');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject login attempt with an incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'customer@test.com',
          password: 'WrongPassword1!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password credentials');
    });
  });

  describe('PATCH /api/v1/auth/admin/:userId/role', () => {
    it('should allow a super_admin to promote a customer to admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/admin/${customerUser._id}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('admin');

      // Verify in DB
      const updatedUser = await User.findById(customerUser._id);
      expect(updatedUser.role).toBe('admin');
    });

    it('should reject promotion attempts to set a role to "super_admin" (Zod validation block)', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/admin/${customerUser._id}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'super_admin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation Failure');
    });

    it('should reject modifying another super_admin\'s role', async () => {
      // Create a second super admin
      const secondSuperAdmin = await User.create({
        name: 'Second Super Admin',
        email: 'superadmin2@test.com',
        password: 'SuperAdmin123!',
        phone: '9988776644',
        role: 'super_admin'
      });

      const res = await request(app)
        .patch(`/api/v1/auth/admin/${secondSuperAdmin._id}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('super_admin accounts are immutable via API operations');
    });

    it('should reject self-modification of own user role', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/admin/${superAdminUser._id}/role`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ role: 'admin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('You cannot change or demote your own user role');
    });
  });

  describe('POST /api/v1/auth/refresh-token (Reuse Detection)', () => {
    it('should trigger full session invalidation when a rotated refresh token is reused outside the grace period', async () => {
      const expiredTokenId = 'rotated-token-uuid-1';
      const user = await User.create({
        name: 'Session User',
        email: 'session@test.com',
        password: 'SessionPassword123!',
        phone: '9876543212',
        role: 'customer',
        activeRefreshTokenIds: [
          { tokenId: 'active-token-uuid-2', expiresAt: new Date(Date.now() + 100000) }
        ],
        // Push a rotated token entry that is 40 seconds old (outside the 30s grace window)
        recentlyRotatedTokens: [
          {
            tokenId: expiredTokenId,
            rotatedToTokenId: 'active-token-uuid-2',
            rotatedAt: new Date(Date.now() - 40000)
          }
        ]
      });

      // Generate a signed JWT representing the old rotated token
      const oldRefreshToken = AuthService.generateRefreshToken(user, expiredTokenId);

      const res = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`refreshToken=${oldRefreshToken}`])
        .send();

      // Assert reuse detection triggers 401
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Session invalidated due to suspected token compromise');

      // Verify that all active and rotated token identifiers are wiped out in the database
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.activeRefreshTokenIds.length).toBe(0);
      expect(updatedUser.recentlyRotatedTokens.length).toBe(0);
    });
  });
});

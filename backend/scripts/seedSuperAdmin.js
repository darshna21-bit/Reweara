const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Ensure environmental configurations are loaded cleanly
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const logger = require('../src/utils/logger');
const connectDB = require('../src/config/db');

/**
 * Super Admin seeding task script.
 * Registers the system owner securely inside MongoDB cluster using environment secrets.
 *
 * Why Seeding Exists:
 * In a secure production MERN startup, signup endpoints are restricted or public signups default strictly 
 * to the 'customer' role. Publicly registering a 'super_admin' represents an extreme vulnerability. 
 * Therefore, we bootstrap the initial system owner via an administrative command line execution script
 * that connects directly to the DB cluster and reads credentials from secured environment variables.
 */
const seedSuperAdmin = async () => {
  const superAdminName = process.env.SUPER_ADMIN_NAME;
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE || '9999999999';

  // 1. Assert seeding inputs are present in environmental workspace
  if (!superAdminName || !superAdminEmail || !superAdminPassword) {
    logger.error('❌ SEEDING FAIL: Missing SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, or SUPER_ADMIN_PASSWORD in environment config.');
    process.exit(1);
  }

  // Normalize email input early to lowercase for consistent database indexes matches
  const normalizedEmail = superAdminEmail.trim().toLowerCase();

  try {
    // 2. Establish database connection link
    await connectDB();

    // 3. Prevent duplicate account registrations (Check matching email or existing super_admin role)
    const existingAdmin = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { role: 'super_admin' }
      ]
    });

    if (existingAdmin) {
      logger.warn('⚠️ SEEDING CANCELLED: A SuperAdmin account or email collision already exists in this database cluster.');
      await mongoose.connection.close();
      logger.info('🔌 MongoDB connection closed gracefully.');
      process.exit(0);
    }

    // 4. Create initial system owner
    // Note: We do NOT manually hash the password here; we pass it plain text and let the 
    // Mongoose User Schema's pre-save salt hook handle encryption naturally, preserving model integrity.
    await User.create({
      name: superAdminName.trim(),
      email: normalizedEmail,
      password: superAdminPassword,
      phone: superAdminPhone.trim(),
      role: 'super_admin'
    });

    logger.success(`🚀 SEEDING SUCCESS: SuperAdmin [${superAdminName}] created successfully inside database!`);
    
    await mongoose.connection.close();
    logger.info('🔌 MongoDB connection closed gracefully.');
    process.exit(0);
  } catch (error) {
    logger.error('💥 SEEDING CRITICAL ERROR: Execution failed.', error);
    await mongoose.connection.close();
    logger.info('🔌 MongoDB connection closed gracefully.');
    process.exit(1);
  }
};

seedSuperAdmin();

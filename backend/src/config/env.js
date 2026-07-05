const dotenv = require('dotenv');
const path = require('path');
const { z } = require('zod');

// Explicitly load .env file from the backend root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define structural environment configuration schema constraints using Zod
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  API_VERSION: z.string().default('v1'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL (e.g. http://localhost:5173).'),
  MONGODB_URI: z.string().min(10, 'MONGODB_URI connection string is required.'),
  
  // Enforce strong entropy bounds on JWT secrets to prevent brute force testing
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long for secure signing.'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_SECRET: z.string().min(32, 'REFRESH_SECRET must be at least 32 characters long for refresh holds.'),
  REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Razorpay sandboxing variables
  RAZORPAY_KEY_ID: z.string().min(1, 'RAZORPAY_KEY_ID is required.'),
  RAZORPAY_SECRET: z.string().min(1, 'RAZORPAY_SECRET is required.'),

  // Cloudinary media CDN credentials
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required.'),
  CLOUDINARY_API_KEY: z.string().min(5, 'CLOUDINARY_API_KEY is required.'),
  CLOUDINARY_API_SECRET: z.string().min(5, 'CLOUDINARY_API_SECRET is required.'),

  // AbstractAPI Email Reputation credentials
  ABSTRACT_EMAIL_API_KEY: z.string().min(1, 'ABSTRACT_EMAIL_API_KEY is required.')
});

// Run safe validation parsing
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('\n❌ FATAL CONFIGURATION ERROR: Invalid environment variables:');
  parseResult.error.issues.forEach((issue) => {
    console.error(`   - [${issue.path.join('.')}]: ${issue.message}`);
  });
  console.error('Please configure your .env file according to .env.example.\n');
  process.exit(1);
}

const validatedEnv = parseResult.data;

module.exports = {
  env: validatedEnv.NODE_ENV,
  port: validatedEnv.PORT,
  apiVersion: validatedEnv.API_VERSION,
  clientUrl: validatedEnv.CLIENT_URL,
  db: {
    uri: validatedEnv.MONGODB_URI
  },
  jwt: {
    secret: validatedEnv.JWT_SECRET,
    expiresIn: validatedEnv.JWT_EXPIRES_IN,
    refreshSecret: validatedEnv.REFRESH_SECRET,
    refreshExpiresIn: validatedEnv.REFRESH_EXPIRES_IN
  },
  razorpay: {
    keyId: validatedEnv.RAZORPAY_KEY_ID,
    secret: validatedEnv.RAZORPAY_SECRET
  },
  cloudinary: {
    cloudName: validatedEnv.CLOUDINARY_CLOUD_NAME,
    apiKey: validatedEnv.CLOUDINARY_API_KEY,
    apiSecret: validatedEnv.CLOUDINARY_API_SECRET
  },
  abstractEmailApiKey: validatedEnv.ABSTRACT_EMAIL_API_KEY
};

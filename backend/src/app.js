const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { apiLimiter } = require('./middleware/rateLimiter');
const globalErrorHandler = require('./middleware/errorMiddleware');
const AppError = require('./utils/appError');

// REST API Routers
const authRoutes = require('./routes/authRoutes');
const outfitRoutes = require('./routes/outfitRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const { clientUrl, apiVersion, env } = require('./config/env');

const app = express();

// Trust reverse proxy headers (essential for rate limiting on Vercel)
app.set('trust proxy', 1);

// ==========================================
// 🛡️ SECURITY & REQUEST PROCESSING MIDDLEWARES
// ==========================================

// 1. Injects fundamental HTTP response security headers (Helmet CSP headers)
app.use(helmet({
  contentSecurityPolicy: env === 'production' ? {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://checkout.razorpay.com", "https://cdn.razorpay.com"],
      "frame-src": ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
      "connect-src": ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"]
    }
  } : false, // Permissive CSP in dev for API testing
  crossOriginEmbedderPolicy: false, // Essential to allow third-party assets without CORP headers (e.g. Razorpay)
  crossOriginOpenerPolicy: true
}));

// 2. Coordinates strict Cross-Origin Resource Sharing (CORS) restrictions
const corsOptions = {
  origin: clientUrl, // Explicit domain lock
  credentials: true, // Permits secure httpOnly cookies transit
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Hardened method limits
  allowedHeaders: ['Content-Type', 'Authorization'], // Strict header limits
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 3. Registers cookie parser middleware to easily parse cookie headers
app.use(cookieParser());

// 4. Establishes request payload size restriction barriers to prevent memory exhaustion
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Sets up structured development/production HTTP log formats
if (env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 6. Mounts general API rate limiters
app.use('/api/', apiLimiter);

// ==========================================
// 🔌 SERVICE PATHWAYS & ROUTING DECLARATIONS
// ==========================================

// Health auditing pathway to verify system and cluster health
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'System audit report: ReWeara API backend services are fully operational.',
    data: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      status: 'operational',
      timestamp: new Date().toISOString()
    }
  });
});

// Mounted authentication & business domain pathways
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/outfits`, outfitRoutes);
app.use(`/api/${apiVersion}/bookings`, bookingRoutes);
app.use(`/api/${apiVersion}/reviews`, reviewRoutes);
app.use(`/api/${apiVersion}/wishlist`, wishlistRoutes);

// Fallback pathway: Triggers 404 for unmapped endpoints
app.all('*', (req, res, next) => {
  next(new AppError(`Requested resource not found: CANNOT resolve ${req.method} ${req.originalUrl}`, 404));
});

// Centralized operational exception interceptor
app.use(globalErrorHandler);

module.exports = app;

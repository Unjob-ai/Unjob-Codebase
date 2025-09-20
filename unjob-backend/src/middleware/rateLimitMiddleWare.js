// middleware/rateLimit.js
import  rateLimit  from"express-rate-limit" ;

// Simple rate limit configuration without custom keyGenerator to avoid IPv6 issues
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: "Too many requests from this IP, please try again later.",
      retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000 / 60), // minutes
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json(
        options.message || {
          error: "Too many requests from this IP, please try again later.",
        }
      );
    },
    skip: (req) => {
      // Skip rate limiting for certain IPs
      const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(",") || [];
      return whitelist.includes(req.ip);
    },
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// General API rate limiter
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  message: {
    error: "Too many API requests, please try again later.",
    type: "RATE_LIMIT_EXCEEDED",
  },
});

// Authentication rate limiter (stricter)
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many authentication attempts, please try again later.",
    type: "AUTH_RATE_LIMIT_EXCEEDED",
  },
  skipSuccessfulRequests: true,
});

// Registration rate limiter
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: "Too many registration attempts, please try again later.",
    type: "REGISTRATION_RATE_LIMIT_EXCEEDED",
  },
});

// Password reset rate limiter
const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    error: "Too many password reset attempts, please try again later.",
    type: "PASSWORD_RESET_RATE_LIMIT_EXCEEDED",
  },
});

// File upload rate limiter
const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: "Too many file upload attempts, please try again later.",
    type: "UPLOAD_RATE_LIMIT_EXCEEDED",
  },
});

// Message sending rate limiter
const messageLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: "Too many messages sent, please slow down.",
    type: "MESSAGE_RATE_LIMIT_EXCEEDED",
  },
});

// Post creation rate limiter
const postLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: "Too many posts created, please try again later.",
    type: "POST_RATE_LIMIT_EXCEEDED",
  },
});

// Gig creation rate limiter
const gigLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  message: {
    error: "Too many gigs created today, please try again tomorrow.",
    type: "GIG_RATE_LIMIT_EXCEEDED",
  },
});

// Application submission rate limiter
const applicationLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error: "Too many applications submitted, please try again later.",
    type: "APPLICATION_RATE_LIMIT_EXCEEDED",
  },
});

// Search rate limiter
const searchLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: "Too many search requests, please slow down.",
    type: "SEARCH_RATE_LIMIT_EXCEEDED",
  },
});

// Payment rate limiter
const paymentLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many payment attempts, please try again later.",
    type: "PAYMENT_RATE_LIMIT_EXCEEDED",
  },
});

export  {
  // Basic rate limiters
  apiLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  uploadLimiter,
  messageLimiter,
  postLimiter,
  gigLimiter,
  applicationLimiter,
  searchLimiter,
  paymentLimiter,

  // Utility function
  createRateLimiter,
};

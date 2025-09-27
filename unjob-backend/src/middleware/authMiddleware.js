// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import { User } from "../models/UserModel.js";
// Main authentication middleware
const authMiddleware = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new apiError("Access denied. No token provided.", 401);
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token (handle different token structures)
    const userId = decoded.userId || decoded.id || decoded._id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new apiError("Invalid token. User not found.", 401);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new apiError("Account is deactivated.", 401);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new apiError("Invalid token.", 401);
    } else if (error.name === "TokenExpiredError") {
      throw new apiError("Token expired. Please login again.", 401);
    } else {
      throw error;
    }
  }
});

// Admin authentication middleware
const adminAuthMiddleware = asyncHandler(async (req, res, next) => {
  const token = req
    .header("Authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) {
    throw new apiError("Access denied. Admin token required.", 401);
  }

  try {
    const adminSecret =
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + "_admin";
    const decoded = jwt.verify(token, adminSecret);

    // Check if it's an admin token
    if (!decoded.isAdmin) {
      throw new apiError("Invalid admin token.", 401);
    }

    // Handle default admin
    if (decoded.adminId === "admin_default") {
      req.user = {
        _id: "admin_default",
        name: "Default Admin",
        email: "admin@gmail.com",
        role: "admin",
        isActive: true,
      };
      return next();
    }

    // Find admin user by ID from token
    const admin = await User.findById(decoded.adminId).select("-password");

    if (!admin || admin.role !== "admin") {
      throw new apiError("Invalid admin token. Admin not found.", 401);
    }

    if (!admin.isActive) {
      throw new apiError("Admin account is deactivated.", 401);
    }

    req.user = admin;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new apiError("Invalid admin token.", 401);
    } else if (error.name === "TokenExpiredError") {
      throw new apiError("Admin token expired.", 401);
    } else {
      throw error;
    }
  }
});

// Role-based authorization middleware
const requireRole = (roles) => {
  return asyncHandler(async (req, res, next) => {
      if (!req.user) {
        throw new apiError("Authentication required.", 401);
      }

      const userRoles = Array.isArray(roles) ? roles : [roles];

      if (!userRoles.includes(req.user.role)) {
        throw new apiError(
          `Access denied. Required role: ${userRoles.join(" or ")}`,
          403
        );
      }
      next();
   
  });
};


// Alternative authorization function (for compatibility)
const authorize = (...roles) => {
  return requireRole(roles);
};

// Protect middleware (alias for authMiddleware for compatibility)
const protect = authMiddleware;

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      req.user = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;
    const user = await User.findById(userId).select("-password");

    if (user && user.isActive) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    // In optional auth, we continue even if token is invalid
    req.user = null;
    next();
  }
};

// Middleware to check if profile is complete
const requireCompleteProfile = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new apiError("Authentication required.", 401);
  }

  // Check if user has required profile fields based on role
  let isComplete = false;

  if (req.user.role === "freelancer") {
    isComplete =
      req.user.name && req.user.email && req.user.profile?.skills?.length > 0;
  } else if (req.user.role === "hiring") {
    isComplete =
      req.user.name && req.user.email && req.user.profile?.companyName;
  } else {
    isComplete = req.user.name && req.user.email;
  }

  if (!isComplete) {
    throw new apiError("Profile completion required.", 403);
  }

  next();
});

// Middleware to check if user is verified
const requireVerified = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new apiError("Authentication required.", 401);
  }

  if (!req.user.isVerified && !req.user.verified) {
    throw new apiError("Email verification required.", 403);
  }

  next();
});

// Middleware to check if user is active
const requireActive = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new apiError("Authentication required.", 401);
  }

  if (!req.user.isActive) {
    throw new apiError("Account is deactivated. Please contact support.", 403);
  }

  next();
});

// Subscription check middleware
const requireSubscription = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new apiError("Authentication required.", 401);
  }

  // Add subscription check logic here if needed
  // For now, we'll just pass through
  next();
});

// Admin only middleware
const requireAdmin = requireRole("admin");

// Freelancer only middleware
const requireFreelancer = requireRole("freelancer");

// Hiring manager only middleware
const requireHiring = requireRole("hiring");

// Freelancer or hiring middleware
const requireFreelancerOrHiring = requireRole(["freelancer", "hiring"]);

export {
  authMiddleware,
  adminAuthMiddleware,
  requireRole,
  authorize,
  protect,
  requireCompleteProfile,
  optionalAuth,
  requireVerified,
  requireActive,
  requireSubscription,
  requireAdmin,
  requireFreelancer,
  requireHiring,
  requireFreelancerOrHiring,
};

// Default export for backward compatibility
export default authMiddleware;

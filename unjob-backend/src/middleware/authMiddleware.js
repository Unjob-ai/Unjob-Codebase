// middleware/auth.js
import jwt from "jsonwebtoken";
import { User } from "../models/UserModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();

  console.log("Auth Middleware Token:", token);
  if (!token) {
    throw new apiError("Access denied. No token provided.", 401);
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Find user by ID from token
  let user = await User.findById(decoded.userId || decoded.id).select(
    "-password"
  );

  if (!user) {
    throw new apiError("Invalid token. User not found.", 401);
  }
  req.user = user;
  next();
});

// Admin authentication middleware
const adminAuthMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    throw new apiError("Access denied. Admin token required.", 401);
  }

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
  let admin = await User.findById(decoded.adminId).select("-password");

  if (!admin || admin.role !== "admin") {
    throw new apiError("Invalid admin token. Admin not found.", 401);
  }

  if (!admin.isActive) {
    throw new apiError("Admin account is deactivated.", 401);
  }

  req.user = admin;
  next();
});

const requireRole = (roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new apiError("Authentication required.", 401);
    }
    const userRoles = Array.isArray(roles) ? roles : [roles];
    if (!userRoles.includes(req.user.role)) {
      throw new apiError("Access denied. Insufficient permissions.", 403);
    }

    next();
  });
};


// Middleware to check if profile is complete
const requireCompleteProfile = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new apiError("Authentication required.", 401);
  }

  if (!req.user.isProfileComplete()) {
    throw new apiError("Profile completion required.", 403);
  }

  next();
})

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId || decoded.id).select(
      "-password"
    );

    req.user = user;
    next();
  } catch (error) {
    // In optional auth, we continue even if token is invalid
    req.user = null;
    next();
  }
};

// Middleware to check if user is verified
const requireVerified = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new apiError("Authentication required.", 401);
  }

  if (!req.user.verified && !req.user.isVerified) {
    throw new apiError("Email verification required.", 403);
  }

  next();
})


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

// Middleware to check subscription status
const requireSubscription = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new apiError("Authentication required.", 401);
  }
  // Add subscription check logic here if needed
  // For now, we'll just pass through
  next();
});

// Admin only middleware
const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new apiError("Authentication required.", 401);
  }
  if (req.user.role !== "admin") {
    throw new apiError("Access denied. Admin privileges required.", 403);
  }
  next();
});

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

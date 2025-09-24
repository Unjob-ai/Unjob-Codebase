// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models/UserModel.js";
import { AppError, catchAsync } from "../middleware/errorHandler.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import notificationService from "../services/notificationService.js";

// Generate JWT token
const generateToken = async (userId) => {
  //create access
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
  // return accessToken;
  return { accessToken };
};

// Generate admin JWT token with different secret
const generateAdminToken = (adminId) => {
  return jwt.sign(
    { adminId, isAdmin: true },
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + "_admin",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

// Send token response
const sendTokenResponse = async (user, statusCode, res, message) => {
  const { accessToken } = await generateToken(user._id);
  // Remove password from output
  const userResponse = user.toObject();
  delete userResponse.password;
  res.setHeader("Authorization", `Bearer ${accessToken}`);
  res
    .status(statusCode)
    .json(new apiResponse(statusCode, true, userResponse, message));
};

// Send admin token response
const sendAdminTokenResponse = (admin, statusCode, res, message) => {
  const token = generateAdminToken(admin._id);

  // Remove password from output
  const adminResponse = admin.toObject();
  delete adminResponse.password;
  res.setHeader("Authorization", `Bearer ${token}`);
  res
    .status(statusCode)
    .json(new apiResponse(statusCode, true, adminResponse, message));
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, provider = "email" } = req.body;
  if (!name || !email || !password || !role) {
    throw new apiError("Please provide name, email, password, role", 400);
  }
  // Check if user already exists
  const existingUser = await User.findOne({ email: email });
  if (existingUser) {
    throw new apiError("User already exists with this email address", 409);
  }
  // Create new user
  const user = await User.create({
    name,
    email,
    password,
    role,
    provider,
    verified: provider === "google",
    isVerified: provider === "google",
  });
  //check if user is created
  if (!user) {
    throw new apiError("User registration failed", 500);
  }

  // Send welcome email for email provider users
  if (provider === "email") {
    try {
      await notificationService.sendWelcomeEmail(user.email, {
        recipientName: user.name,
      });
      console.log("✅ Welcome email sent to:", user.email);
    } catch (error) {
      console.error("❌ Failed to send welcome email:", error);
      // Don't fail the registration if email fails
    }
  }

  await sendTokenResponse(user, 201, res, "User registered successfully");
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email and include password
  const user = await User.findOne({ email });
  if (!user) {
    throw new apiError("Invalid email ", 401);
  }

  // Check password (skip for Google OAuth users)
  if (user.provider === "email") {
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new apiError("Invalid  password", 401);
    }
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await sendTokenResponse(user, 200, res, "Login successful");
});

// @desc    Google OAuth authentication
// @route   POST /api/auth/google
// @access  Public
const googleAuth = asyncHandler(async (req, res) => {
  const { name, email, googleId, image, role } = req.body;
  if (!email || !googleId) {
    throw new apiError("Email and Google ID are required", 400);
  }
  // Check if user exists
  let user = await User.findOne({
    $or: [{ email }, { googleId }],
  });

  if (user) {
    // Update existing user
    user.name = name;
    user.image = image || user.image;
    user.googleId = googleId;
    user.provider = "google";
    user.verified = true;
    user.isVerified = true;
    user.lastLogin = new Date();

    if (!user.role && role) {
      user.role = role;
    }

    await user.save({ validateBeforeSave: false });
  } else {
    // Create new user
    user = await User.create({
      name,
      email,
      googleId,
      image,
      role,
      provider: "google",
      verified: true,
      isVerified: true,
      lastLogin: new Date(),
    });

    // Send welcome email for new Google users
    try {
      await notificationService.sendWelcomeEmail(user.email, {
        recipientName: user.name,
      });
      console.log("✅ Welcome email sent to new Google user:", user.email);
    } catch (error) {
      console.error("❌ Failed to send welcome email to Google user:", error);
    }
  }

  await sendTokenResponse(user, 200, res, "Google authentication successful");
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("followers", "name image role")
    .populate("following", "name image role");

  if (!user) {
    throw new apiError("User not found", 404);
  }
  const data = {
    user,
    isProfileComplete: user.isProfileComplete(),
  };
  res
    .status(200)
    .json(
      new apiResponse(200, true, data, "User profile fetched successfully")
    );
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new apiError("Email is required", 400);
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new apiError("Invalid Email", 401);
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false });

  // Send password reset email
  try {
    await notificationService.sendPasswordResetEmail(
      email,
      resetToken,
      user.name
    );
    console.log("✅ Password reset email sent to:", email);
  } catch (error) {
    // If email fails, clear the reset token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.error("❌ Failed to send password reset email:", error);
    throw new apiError("Email could not be sent", 500);
  }

  const data =
    process.env.NODE_ENV === "development"
      ? { resetToken: resetToken } // Only in development
      : {};

  res
    .status(200)
    .json(
      new apiResponse(200, true, data, "Password reset link sent to email")
    );
});

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const { password } = req.body;
  const { token } = req.params;

  if (!password || password.length < 6) {
    throw new apiError("Password must be at least 6 characters long", 400);
  }

  // Hash token
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Find user with valid token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new apiError("Invalid or expired reset token", 401);
  }

  // Update password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  console.log("[Auth] Password reset successful for:", user.email);

  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Password reset successfully"));
});

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new apiError("Current password and new password are required", 400);
  }

  if (newPassword.length < 6) {
    throw new apiError("New password must be at least 6 characters long", 400);
  }

  const user = await User.findById(req.user._id).select("+password");

  // Check current password (skip for Google OAuth users)
  if (user.provider === "email") {
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new apiError("Current password is incorrect", 400);
    }
  }

  // Update password
  user.password = newPassword;
  await user.save();

  console.log("[Auth] Password changed for:", user.email);

  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Password changed successfully"));
});

// @desc    Send email verification
// @route   POST /api/auth/verify-email
// @access  Private
const sendEmailVerification = asyncHandler(async (req, res, next) => {
  if (req.user.verified) {
    throw new apiError("Email is already verified", 400);
  }

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  req.user.verificationToken = verificationToken;
  await req.user.save({ validateBeforeSave: false });

  // Send verification email
  try {
    await notificationService.sendEmailVerificationEmail(
      req.user.email,
      verificationToken,
      req.user.name
    );
    console.log("✅ Email verification sent to:", req.user.email);
  } catch (error) {
    // Clear verification token if email fails
    req.user.verificationToken = undefined;
    await req.user.save({ validateBeforeSave: false });
    console.error("❌ Failed to send verification email:", error);
    throw new apiError("Verification email could not be sent", 500);
  }

  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Verification email sent"));
});

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    throw new apiError("Invalid verification token", 400);
  }

  user.verified = true;
  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  console.log("[Auth] Email verified for:", user.email);

  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Email verified successfully"));
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  console.log("[Auth] User logged out:", req.user._id);
  res.setHeader("Authorization", `Bearer `);
  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Logged out successfully"));
});

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Private
const refreshToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new apiError("User not found", 404);
  }

  sendTokenResponse(user, 200, res, "Token refreshed successfully");
});

// @desc    Admin login
// @route   POST /api/auth/admin/login
// @access  Public
const adminLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if it's the default admin credentials
  const isDefaultAdmin =
    email.toLowerCase() === "admin@gmail.com" && password === "admin@unjob.ai";

  if (isDefaultAdmin) {
    // Create a temporary admin object for the default admin
    const defaultAdmin = {
      _id: "admin_default",
      name: "Default Admin",
      email: "admin@gmail.com",
      role: "admin",
      isActive: true,
      toObject: function () {
        return {
          _id: this._id,
          name: this.name,
          email: this.email,
          role: this.role,
          isActive: this.isActive,
        };
      },
    };

    return sendAdminTokenResponse(
      defaultAdmin,
      200,
      res,
      "Admin login successful"
    );
  }

  // Find admin user by email and include password
  const admin = await User.findOne({
    email,
    role: "admin",
  }).select("+password");

  if (!admin) {
    throw new apiError("Invalid admin credentials", 401);
  }

  // Check password
  const isPasswordValid = await admin.comparePassword(password);
  if (!isPasswordValid) {
    throw new apiError("Invalid admin credentials", 401);
  }

  // Check if admin is active
  if (!admin.isActive) {
    throw new apiError("Admin account is deactivated", 401);
  }

  // Update last login
  admin.lastLogin = new Date();
  await admin.save({ validateBeforeSave: false });

  sendAdminTokenResponse(admin, 200, res, "Admin login successful");
});

// @desc    Initialize default admin (for setup purposes)
// @route   POST /api/auth/admin/initialize
// @access  Public (should be removed in production)
const initializeAdmin = asyncHandler(async (req, res, next) => {
  // Check if admin already exists
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    throw new apiError("Admin already exists", 400);
  }

  // Create default admin user
  const admin = await User.create({
    name: "Default Admin",
    email: "admin@gmail.com",
    password: "admin@unjob.ai",
    role: "admin",
    provider: "email",
    verified: true,
    isVerified: true,
    isActive: true,
  });

  sendAdminTokenResponse(admin, 201, res, "Default admin created successfully");
});

// @desc    Test email functionality (Admin only)
// @route   POST /api/auth/test-email
// @access  Private (Admin only)
const testEmail = asyncHandler(async (req, res) => {
  // Check if user is admin
  if (req.user.role !== "admin") {
    throw new apiError("Access denied. Admin privileges required.", 403);
  }

  const { email, type = "test" } = req.body;

  if (!email) {
    throw new apiError("Email address is required", 400);
  }

  let result;

  try {
    switch (type) {
      case "test":
        result = await notificationService.sendTestEmail(email);
        break;
      case "welcome":
        result = await notificationService.sendWelcomeEmail(email, {
          recipientName: "Test User",
        });
        break;
      case "reset":
        result = await notificationService.sendPasswordResetEmail(
          email,
          "test-token-123",
          "Test User"
        );
        break;
      case "verification":
        result = await notificationService.sendEmailVerificationEmail(
          email,
          "test-verification-token-123",
          "Test User"
        );
        break;
      default:
        throw new apiError("Invalid email type", 400);
    }

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          true,
          result,
          `Test ${type} email sent successfully`
        )
      );
  } catch (error) {
    console.error("❌ Test email failed:", error);
    throw new apiError("Failed to send test email: " + error.message, 500);
  }
});

export {
  register,
  login,
  googleAuth,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  sendEmailVerification,
  verifyEmail,
  logout,
  refreshToken,
  adminLogin,
  initializeAdmin,
  testEmail,
};

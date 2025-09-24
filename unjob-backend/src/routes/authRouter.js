// routes/auth.js
import express from "express";
import {
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
} from "../controllers/authController.js";

import {
  validateUserRegistration,
  validateUserLogin,
  validateEmail,
  validatePasswordChange,
  validateResetPassword,
} from "../middleware/validationMiddleWare.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  registerLimiter,
  authLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimitMiddleWare.js";

const router = express.Router();

// Public routes
router.post("/register", registerLimiter, validateUserRegistration, register);
router.post("/login", authLimiter, validateUserLogin, login);
router.post("/google", authLimiter, googleAuth);
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validateEmail,
  forgotPassword
);
router.post(
  "/reset-password/:token",
  passwordResetLimiter,
  validateResetPassword,
  resetPassword
);
router.get("/verify-email/:token", verifyEmail);

// Admin routes
router.post("/admin/login", authLimiter, validateUserLogin, adminLogin);
// router.post("/admin/initialize", initializeAdmin); // Remove this in production

// Protected routes
router.use(authMiddleware); // All routes below require authentication

router.get("/me", getMe);
router.post("/change-password", validatePasswordChange, changePassword);
router.post("/verify-email", sendEmailVerification);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

// Admin test routes (for development/testing)
router.post("/test-email", testEmail); // Admin only - test email functionality

export default router;

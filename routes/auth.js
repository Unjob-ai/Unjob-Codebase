// routes/auth.js
const express = require("express");
const {
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
} = require("../controllers/authController");

const {
  validateUserRegistration,
  validateUserLogin,
  validateEmail,
  validatePasswordChange,
} = require("../middleware/validation");

const { authMiddleware } = require("../middleware/auth");
const {
  registerLimiter,
  authLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimit");

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
router.post("/reset-password/:token", passwordResetLimiter, resetPassword);
router.get("/verify-email/:token", verifyEmail);

// Protected routes
router.use(authMiddleware); // All routes below require authentication

router.get("/me", getMe);
router.post("/change-password", validatePasswordChange, changePassword);
router.post("/verify-email", sendEmailVerification);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);

module.exports = router;

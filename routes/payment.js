// routes/payments.js
const express = require("express");
const {
  createPaymentOrder,
  verifyPayment,
  getUserPayments,
  getPaymentById,
  requestRefund,
  getPaymentStats,
  updatePaymentStatus,
  getPaymentMethods,
} = require("../controllers/paymentController");

const {
  validatePayment,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const {
  requireCompleteProfile,
  requireAdmin,
  requireFreelancerOrHiring,
} = require("../middleware/auth");

const { paymentLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Payment operations
router.post(
  "/create-order",
  paymentLimiter,
  requireCompleteProfile,
  validatePayment,
  createPaymentOrder
);
router.post("/verify", paymentLimiter, requireCompleteProfile, verifyPayment);
router.get("/methods", requireCompleteProfile, getPaymentMethods);
router.get("/stats", requireCompleteProfile, getPaymentStats);
router.get("/", requireCompleteProfile, validatePagination, getUserPayments);
router.get(
  "/:id",
  requireFreelancerOrHiring,
  validateObjectId(),
  getPaymentById
);
router.post(
  "/:id/refund",
  requireCompleteProfile,
  validateObjectId(),
  requestRefund
);

// Admin routes
router.put(
  "/:id/status",
  requireAdmin,
  validateObjectId(),
  updatePaymentStatus
);

module.exports = router;

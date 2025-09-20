// routes/payments.js
import  express from"express"
import  {
  createPaymentOrder,
  verifyPayment,
  getUserPayments,
  getPaymentById,
  requestRefund,
  getPaymentStats,
  updatePaymentStatus,
  getPaymentMethods,
} from "../controllers/paymentController.js"

import  {
  validatePayment,
  validateObjectId,
  validatePagination,
}  from "../middleware/validationMiddleWare.js"

import  {
  requireCompleteProfile,
  requireAdmin,
  requireFreelancerOrHiring,
}  from "../middleware/authMiddleware.js"

import { paymentLimiter }  from "../middleware/rateLimitMiddleWare.js"

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

export default router;

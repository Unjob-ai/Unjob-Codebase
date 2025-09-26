// routes/paymentRoutes.js
import express from "express";
import {
  getPaymentHistory,
  getPaymentAnalytics,
  downloadInvoice,
  getWalletDetails,
  requestWithdrawal,
} from "../controllers/paymentController.js";

import {
  getWallet,
  getWalletTransactions,
  syncWallet,
  requestWithdrawal as walletWithdraw,
  getWithdrawalHistory,
} from "../controllers/walletController.js";

import {
  getBankDetails,
  updateBankDetails,
  validateBankDetails,
  getBankDetailsStatus,
} from "../controllers/bankDetailsController.js";

import {
  authMiddleware,
  requireFreelancer,
  requireHiring,
} from "../middleware/authMiddleware.js";
import {
  validateObjectId,
  validatePagination,
} from "../middleware/validationMiddleWare.js";
import { paymentLimiter } from "../middleware/rateLimitMiddleWare.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// =============================================================================
// PAYMENT HISTORY ROUTES
// =============================================================================

// @route   GET /api/payments/history
// @desc    Get payment history for user (both freelancer and hiring)
// @access  Private
router.get("/history", validatePagination, getPaymentHistory);

// @route   GET /api/payments/analytics
// @desc    Get payment analytics for hiring users
// @access  Private (Hiring only)
router.get("/analytics", requireHiring, getPaymentAnalytics);

// @route   GET /api/payments/:paymentId/invoice
// @desc    Download payment invoice
// @access  Private
router.get(
  "/:paymentId/invoice",
  validateObjectId("paymentId"),
  downloadInvoice
);

// =============================================================================
// BANK DETAILS ROUTES (Freelancers only)
// =============================================================================

// @route   GET /api/payments/bank-details
// @desc    Get freelancer bank details
// @access  Private (Freelancers only)
router.get("/bank-details", requireFreelancer, getBankDetails);

// @route   POST /api/payments/bank-details
// @desc    Update freelancer bank details
// @access  Private (Freelancers only)
router.post("/bank-details", requireFreelancer, updateBankDetails);

// @route   POST /api/payments/bank-details/validate
// @desc    Validate bank details
// @access  Private (Freelancers only)
router.post("/bank-details/validate", requireFreelancer, validateBankDetails);

// @route   GET /api/payments/bank-details/status
// @desc    Check bank details completion status
// @access  Private (Freelancers only)
router.get("/bank-details/status", requireFreelancer, getBankDetailsStatus);

// =============================================================================
// WALLET ROUTES (Freelancers only)
// =============================================================================

// @route   GET /api/payments/wallet
// @desc    Get wallet details including balance and money in progress
// @access  Private (Freelancers only)
router.get("/wallet", requireFreelancer, getWallet);

// @route   GET /api/payments/wallet/transactions
// @desc    Get wallet transaction history
// @access  Private (Freelancers only)
router.get(
  "/wallet/transactions",
  requireFreelancer,
  validatePagination,
  getWalletTransactions
);

// @route   POST /api/payments/wallet/sync
// @desc    Sync wallet with earnings system
// @access  Private (Freelancers only)
router.post("/wallet/sync", requireFreelancer, syncWallet);

// =============================================================================
// WITHDRAWAL ROUTES (Freelancers only)
// =============================================================================

// @route   POST /api/payments/withdraw
// @desc    Request withdrawal from wallet
// @access  Private (Freelancers only)
router.post("/withdraw", requireFreelancer, paymentLimiter, walletWithdraw);

// @route   GET /api/payments/withdrawals
// @desc    Get withdrawal history
// @access  Private (Freelancers only)
router.get(
  "/withdrawals",
  requireFreelancer,
  validatePagination,
  getWithdrawalHistory
);

export default router;

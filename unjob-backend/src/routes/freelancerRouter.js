// routes/freelancer.js
import  express from "express"
import  {
  requireFreelancer,
  requireCompleteProfile,
}  from "../middleware/authMiddleware.js"

import { validatePagination } from "../middleware/validationMiddleWare.js"
import {Wallet}  from "../models/WalletModel.js"

const router = express.Router();

// Freelancer-specific utility routes
// Most freelancer functionality is handled in other route files
// This file can be used for freelancer-specific features like:

// Get freelancer dashboard data
router.get(
  "/dashboard",
  requireFreelancer,
  requireCompleteProfile,
  async (req, res) => {
    try {
      // This would typically aggregate data from multiple sources
      // For now, return a basic response
      res.status(200).json({
        success: true,
        message: "Freelancer dashboard data",
        data: {
          // Add dashboard-specific data here
          profileComplete: req.user.isProfileComplete(),
          totalApplications: 0,
          activeProjects: 0,
          totalEarnings: 0,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch dashboard data",
      });
    }
  }
);

// Bank details routes (could be moved to a separate controller)
router.get(
  "/bank-details",
  requireFreelancer,
  requireCompleteProfile,
  async (req, res) => {
    try {
      const bankDetails = req.user.profile?.bankDetails || {};

      res.status(200).json({
        success: true,
        bankDetails,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch bank details",
      });
    }
  }
);

router.post(
  "/bank-details",
  requireFreelancer,
  requireCompleteProfile,
  async (req, res) => {
    try {
      const { accountHolderName, accountNumber, upiId, ifscCode, bankName } =
        req.body;

      if (!req.user.profile) {
        req.user.profile = {};
      }

      req.user.profile.bankDetails = {
        accountHolderName,
        accountNumber,
        upiId,
        ifscCode,
        bankName,
      };

      await req.user.save();

      res.status(200).json({
        success: true,
        message: "Bank details updated successfully",
        bankDetails: req.user.profile.bankDetails,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to update bank details",
      });
    }
  }
);

// Wallet routes (could be moved to a separate wallet controller)
router.get(
  "/wallet",
  requireFreelancer,
  requireCompleteProfile,
  async (req, res) => {
    try {

      let wallet = await Wallet.findOne({ userId: req.user._id });

      if (!wallet) {
        wallet = await Wallet.create({ userId: req.user._id });
      }

      res.status(200).json({
        success: true,
        wallet: {
          balance: wallet.balance,
          currency: wallet.currency,
          totalEarned: wallet.totalEarned,
          totalWithdrawn: wallet.totalWithdrawn,
          pendingWithdrawals: wallet.pendingWithdrawals,
          lastTransactionAt: wallet.lastTransactionAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch wallet details",
      });
    }
  }
);

router.get(
  "/wallet/transactions",
  requireFreelancer,
  requireCompleteProfile,
  validatePagination,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, type } = req.query;

      const wallet = await Wallet.findOne({ userId: req.user._id });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          error: "Wallet not found",
        });
      }

      const transactions = wallet.getTransactionHistory({
        limit: parseInt(limit),
        skip: (page - 1) * limit,
        type,
      });

      res.status(200).json({
        success: true,
        transactions,
        pagination: {
          currentPage: parseInt(page),
          totalTransactions: wallet.transactions.length,
          hasNext: transactions.length === parseInt(limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch transaction history",
      });
    }
  }
);

// Withdrawal request
router.post(
  "/withdraw",
  requireFreelancer,
  requireCompleteProfile,
  async (req, res) => {
    try {
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          error: "Valid amount is required",
        });
      }

      const wallet = await Wallet.findOne({ userId: req.user._id });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          error: "Wallet not found",
        });
      }

      if (wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          error: "Insufficient balance",
        });
      }

      // Check if user has bank details
      if (!req.user.hasBankDetails()) {
        return res.status(400).json({
          success: false,
          error: "Please add your bank details before requesting withdrawal",
          requiresBankDetails: true,
        });
      }

      // Create withdrawal transaction
      await wallet.addTransaction({
        type: "debit",
        amount,
        description: "Withdrawal request",
        reference: `withdrawal_${Date.now()}`,
        referenceModel: "Withdrawal",
      });

      wallet.pendingWithdrawals += amount;
      await wallet.save();

      res.status(200).json({
        success: true,
        message: "Withdrawal request submitted successfully",
        withdrawalAmount: amount,
        remainingBalance: wallet.balance,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to process withdrawal request",
      });
    }
  }
);

export default  router;

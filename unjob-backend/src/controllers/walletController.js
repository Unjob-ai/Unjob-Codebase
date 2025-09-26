// controllers/walletController.js
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { Wallet } from "../models/WalletModel.js";
import { Payment } from "../models/PaymentModel.js";
import { User } from "../models/UserModel.js";
import { Gig } from "../models/GigModel.js";
import { Notification } from "../models/NotificationModel.js";

// @desc    Get wallet details
// @route   GET /api/freelancer/wallet
// @access  Private (Freelancers only)
export const getWallet = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "freelancer") {
    throw new apiError("Only freelancers can access wallet", 403);
  }

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    // Calculate earnings data for initial sync
    const completedPayments = await Payment.find({
      payee: user._id,
      status: "completed",
      type: { $ne: "subscription" },
    });

    const withdrawals = await Payment.find({
      payer: user._id,
      type: "withdrawal",
      status: { $in: ["completed", "processing", "pending"] },
    });

    const totalEarnings = completedPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    wallet = await Wallet.createUserWallet(user._id, {
      totalEarnings,
      totalWithdrawals,
      completedPayments,
    });
  }

  // Calculate money in progress (accepted gigs not yet completed)
  const inProgressGigs = await Gig.find({
    "applications.freelancer": user._id,
    "applications.applicationStatus": "accepted",
    status: { $in: ["in_progress", "active", "published"] },
  });

  let moneyInProgress = 0;
  const inProgressProjects = [];

  inProgressGigs.forEach((gig) => {
    const application = gig.applications.find(
      (app) =>
        app.freelancer.toString() === user._id.toString() &&
        app.applicationStatus === "accepted"
    );

    if (application) {
      const amount = application.proposedRate || gig.budget;
      moneyInProgress += amount;
      inProgressProjects.push({
        gigId: gig._id,
        gigTitle: gig.title,
        amount: amount,
        status: gig.status,
        acceptedAt: application.acceptedAt,
        formattedAmount: `₹${amount.toLocaleString()}`,
      });
    }
  });

  // Get recent transactions
  const recentTransactions = wallet.getRecentTransactions(10);

  // Check wallet health
  const healthCheck = wallet.checkHealth();

  const walletData = {
    // Main balance info
    balance: wallet.balance,
    moneyInProgress,
    totalAmount: wallet.balance + moneyInProgress,
    totalEarned: wallet.totalEarned,
    totalWithdrawn: wallet.totalWithdrawn,
    pendingAmount: wallet.pendingAmount,

    // Formatted amounts
    formattedBalance: `₹${wallet.balance.toLocaleString()}`,
    formattedInProgress: `₹${moneyInProgress.toLocaleString()}`,
    formattedTotalAmount: `₹${(
      wallet.balance + moneyInProgress
    ).toLocaleString()}`,
    formattedTotalEarned: `₹${wallet.totalEarned.toLocaleString()}`,
    formattedTotalWithdrawn: `₹${wallet.totalWithdrawn.toLocaleString()}`,

    // Withdrawal info
    canWithdraw:
      wallet.balance >= 100 && user.profile?.bankDetails?.accountHolderName,
    minWithdrawal: 100,
    maxWithdrawal: wallet.balance,

    // In-progress projects
    inProgressProjects,
    inProgressCount: inProgressProjects.length,

    // Recent activity
    recentTransactions: recentTransactions.map((tx) => ({
      ...tx.toObject(),
      formattedAmount: `₹${tx.amount.toLocaleString()}`,
      relativeTime: getRelativeTime(tx.createdAt),
    })),

    // Wallet health
    walletHealth: healthCheck,
    lastSyncWithEarnings: wallet.lastSyncWithEarnings,

    // Statistics
    stats: {
      totalTransactions: wallet.transactions.length,
      successfulWithdrawals: wallet.transactions.filter(
        (tx) => tx.type === "withdrawal" && tx.status === "completed"
      ).length,
      pendingWithdrawals: wallet.transactions.filter(
        (tx) => tx.type === "withdrawal" && tx.status === "pending"
      ).length,
    },
  };

  res
    .status(200)
    .json(
      new apiResponse(200, walletData, "Wallet details fetched successfully")
    );
});

// @desc    Get wallet transactions
// @route   GET /api/freelancer/wallet/transactions
// @access  Private (Freelancers only)
export const getWalletTransactions = asyncHandler(async (req, res) => {
  const user = req.user;
  const { page = 1, limit = 20, type } = req.query;

  if (user.role !== "freelancer") {
    throw new apiError("Only freelancers can view wallet transactions", 403);
  }

  const wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    throw new apiError("Wallet not found", 404);
  }

  let transactions = wallet.transactions;

  // Filter by type if specified
  if (type) {
    transactions = transactions.filter((tx) => tx.type === type);
  }

  // Sort by date (newest first)
  transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  const formattedTransactions = paginatedTransactions.map((tx) => ({
    ...tx.toObject(),
    formattedAmount: `₹${tx.amount.toLocaleString()}`,
    relativeTime: getRelativeTime(tx.createdAt),
  }));

  res.status(200).json(
    new apiResponse(
      200,
      {
        transactions: formattedTransactions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(transactions.length / limit),
          totalTransactions: transactions.length,
          hasNext: endIndex < transactions.length,
          hasPrev: startIndex > 0,
          limit: parseInt(limit),
        },
      },
      "Wallet transactions fetched successfully"
    )
  );
});

// @desc    Sync wallet with earnings system
// @route   POST /api/freelancer/wallet/sync
// @access  Private (Freelancers only)
export const syncWallet = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "freelancer") {
    throw new apiError("Only freelancers can sync wallet", 403);
  }

  // Get current earnings data
  const completedPayments = await Payment.find({
    payee: user._id,
    status: "completed",
    type: { $ne: "subscription" },
  });

  const withdrawals = await Payment.find({
    payer: user._id,
    type: "withdrawal",
    status: { $in: ["completed", "processing", "pending"] },
  });

  const totalEarnings = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    wallet = await Wallet.createUserWallet(user._id, {
      totalEarnings,
      totalWithdrawals,
      completedPayments,
    });
  } else {
    await wallet.syncWithEarnings({
      totalEarnings,
      totalWithdrawals,
      completedPayments,
    });
  }

  const syncResults = {
    previousBalance:
      wallet.syncMetadata.lastEarningsTotal -
      wallet.syncMetadata.lastWithdrawalsTotal,
    currentBalance: wallet.balance,
    totalEarnings,
    totalWithdrawals,
    syncedAt: wallet.lastSyncWithEarnings,
    syncStatus: wallet.syncMetadata.lastSyncStatus,
  };

  res
    .status(200)
    .json(
      new apiResponse(200, syncResults, "Wallet synchronized successfully")
    );
});

// @desc    Request withdrawal
// @route   POST /api/freelancer/wallet/withdraw
// @access  Private (Freelancers only)
export const requestWithdrawal = asyncHandler(async (req, res) => {
  const user = req.user;
  const { amount, bankDetails } = req.body;

  if (user.role !== "freelancer") {
    throw new apiError("Only freelancers can request withdrawals", 403);
  }

  // Validation
  if (!amount || amount < 100) {
    throw new apiError("Minimum withdrawal amount is ₹100", 400);
  }

  if (!bankDetails || !bankDetails.accountHolderName) {
    throw new apiError("Bank details are required", 400);
  }

  const hasCompleteBank = bankDetails.accountNumber && bankDetails.ifscCode;
  const hasUPI = bankDetails.upiId;

  if (!hasCompleteBank && !hasUPI) {
    throw new apiError("Either complete bank details or UPI ID required", 400);
  }

  // Check daily withdrawal limit
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentWithdrawals = await Payment.countDocuments({
    payer: user._id,
    type: "withdrawal",
    createdAt: { $gte: twentyFourHoursAgo },
  });

  if (recentWithdrawals >= 3) {
    throw new apiError("Daily withdrawal limit (3) reached", 429);
  }

  // Get wallet and check balance
  let wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    throw new apiError("Wallet not found", 404);
  }

  if (amount > wallet.balance) {
    throw new apiError(
      `Insufficient balance. Available: ₹${wallet.balance}, Requested: ₹${amount}`,
      400
    );
  }

  // Create withdrawal record
  const withdrawalId = `WD${Date.now().toString().slice(-8)}`;

  const withdrawal = await Payment.create({
    payer: user._id,
    payee: user._id,
    amount,
    type: "withdrawal",
    status: "pending",
    description: `Withdrawal request by ${user.name} for ₹${amount}`,
    bankAccountDetails: {
      accountNumber: bankDetails.accountNumber || "",
      ifscCode: bankDetails.ifscCode || "",
      accountHolderName: bankDetails.accountHolderName,
      bankName: bankDetails.bankName || "",
      upiId: bankDetails.upiId || "",
    },
    metadata: {
      withdrawalId,
      availableBalanceBefore: wallet.balance,
      totalEarningsAtRequest: wallet.totalEarned,
      previousWithdrawalsAtRequest: wallet.totalWithdrawn,
    },
    statusHistory: [
      {
        status: "pending",
        timestamp: new Date(),
        description: "Withdrawal request submitted by freelancer",
      },
    ],
  });

  // Update wallet
  await wallet.withdrawFunds(amount, `Withdrawal request ${withdrawalId}`, {
    withdrawalId,
    status: "pending",
    bankDetails: bankDetails.accountHolderName,
  });

  // Update user stats
  if (!user.stats) user.stats = {};
  user.stats.totalWithdrawn = (user.stats.totalWithdrawn || 0) + amount;
  await user.save();

  // Create notifications
  await Notification.create({
    user: user._id,
    type: "withdrawal_requested",
    title: "Withdrawal Request Submitted",
    message: `Your withdrawal request for ₹${amount.toLocaleString()} is being processed`,
    relatedId: withdrawal._id,
    actionUrl: "/freelancer/earnings",
  });

  // Notify admins
  const adminUsers = await User.find({ role: "admin" });
  const adminNotifications = adminUsers.map((admin) => ({
    user: admin._id,
    type: "withdrawal_admin_review",
    title: "New Withdrawal Request",
    message: `${user.name} requested withdrawal of ₹${amount.toLocaleString()}`,
    relatedId: withdrawal._id,
    actionUrl: `/admin/withdrawals/${withdrawal._id}`,
  }));

  if (adminNotifications.length > 0) {
    await Notification.insertMany(adminNotifications);
  }

  res.status(201).json(
    new apiResponse(
      201,
      {
        withdrawalId,
        amount,
        status: "pending",
        estimatedProcessingTime: "7 business days",
        newBalance: wallet.balance,
        formattedAmount: `₹${amount.toLocaleString()}`,
      },
      "Withdrawal request submitted successfully"
    )
  );
});

// @desc    Get withdrawal history
// @route   GET /api/freelancer/wallet/withdrawals
// @access  Private (Freelancers only)
export const getWithdrawalHistory = asyncHandler(async (req, res) => {
  const user = req.user;
  const { page = 1, limit = 10, status } = req.query;
  const skip = (page - 1) * limit;

  if (user.role !== "freelancer") {
    throw new apiError("Only freelancers can view withdrawal history", 403);
  }

  let query = { payer: user._id, type: "withdrawal" };
  if (status) query.status = status;

  const withdrawals = await Payment.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalWithdrawals = await Payment.countDocuments(query);

  // Format withdrawals
  const formattedWithdrawals = withdrawals.map((w) => ({
    _id: w._id,
    withdrawalId: w.metadata?.withdrawalId || w._id.toString().slice(-8),
    amount: w.amount,
    status: w.status,
    requestedAt: w.createdAt,
    processedAt: w.transferDetails?.transferredAt,
    bankDetails: {
      accountHolderName: w.bankAccountDetails?.accountHolderName,
      accountNumber: maskAccountNumber(w.bankAccountDetails?.accountNumber),
      bankName: w.bankAccountDetails?.bankName,
      upiId: maskUpiId(w.bankAccountDetails?.upiId),
    },
    formattedAmount: `₹${w.amount.toLocaleString()}`,
    relativeTime: getRelativeTime(w.createdAt),
    statusDescription: getWithdrawalStatusDescription(w.status),
    canCancel: w.status === "pending",
  }));

  // Calculate stats
  const stats = await Payment.aggregate([
    { $match: { payer: user._id, type: "withdrawal" } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        completedCount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] },
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
      },
    },
  ]);

  const withdrawalStats = stats[0] || {
    totalRequests: 0,
    totalAmount: 0,
    completedCount: 0,
    completedAmount: 0,
    pendingCount: 0,
  };

  res.status(200).json(
    new apiResponse(
      200,
      {
        withdrawals: formattedWithdrawals,
        stats: withdrawalStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalWithdrawals / limit),
          totalWithdrawals,
          hasNext: page < Math.ceil(totalWithdrawals / limit),
          hasPrev: page > 1,
          limit: parseInt(limit),
        },
      },
      "Withdrawal history fetched successfully"
    )
  );
});

// Helper functions
const getRelativeTime = (date) => {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0)
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  if (diffInHours > 0)
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  if (diffInMinutes > 0)
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  return "Just now";
};

const getWithdrawalStatusDescription = (status) => {
  const descriptions = {
    pending: "Your withdrawal request is being reviewed",
    processing: "Withdrawal is being processed by the bank",
    completed: "Withdrawal completed successfully",
    failed: "Withdrawal failed - amount refunded to wallet",
    cancelled: "Withdrawal cancelled - amount refunded to wallet",
  };
  return descriptions[status] || "Unknown status";
};

const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.length < 4) return "";
  return `****${accountNumber.slice(-4)}`;
};

const maskUpiId = (upiId) => {
  if (!upiId || !upiId.includes("@")) return "";
  const [username, domain] = upiId.split("@");
  if (username.length < 4) return `${username.slice(0, 1)}***@${domain}`;
  return `${username.slice(0, 2)}****${username.slice(-2)}@${domain}`;
};

export default {
  getWallet,
  getWalletTransactions,
  syncWallet,
  requestWithdrawal,
  getWithdrawalHistory,
};

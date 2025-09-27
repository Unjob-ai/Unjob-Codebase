// controllers/paymentController.js
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { Payment } from "../models/PaymentModel.js";
import { User } from "../models/UserModel.js";
import { Gig } from "../models/GigModel.js";
import { Subscription } from "../models/SubscriptionModel.js";
import { Wallet } from "../models/WalletModel.js";
import PDFDocument from "pdfkit";
import { Readable } from "stream";

// ADD THESE NOTIFICATION IMPORTS
import { autoNotifyPayment } from "../utils/notificationHelpers.js";

// @desc    Get payment history for user
// @route   GET /api/payments/history
// @access  Private
export const getPaymentHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, status, startDate, endDate } = req.query;

  const skip = (page - 1) * limit;
  const user = req.user;

  // Build query based on user role
  let query = {
    $or: [{ payer: user._id }, { payee: user._id }],
  };

  // Add filters
  if (type) query.type = type;
  if (status) query.status = status;
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // For hiring users, exclude internal transfers
  if (user.role === "hiring") {
    query.type = { $ne: "gig_payment" };
  }

  const payments = await Payment.find(query)
    .populate("payer", "name image profile.companyName")
    .populate("payee", "name image profile.companyName")
    .populate("gig", "title")
    .populate("subscription", "planType duration")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalPayments = await Payment.countDocuments(query);

  // Enhanced payment data with user context
  const enhancedPayments = payments.map((payment) => {
    const paymentObj = payment.toObject();
    const isIncoming =
      payment.payee && payment.payee._id.toString() === user._id.toString();
    const isOutgoing =
      payment.payer && payment.payer._id.toString() === user._id.toString();

    return {
      ...paymentObj,
      isIncoming,
      isOutgoing,
      formattedAmount: `₹${payment.amount.toLocaleString()}`,
      relativeTime: getRelativeTime(payment.createdAt),
      statusDescription: getPaymentStatusDescription(payment.status),
      canDownloadInvoice: payment.status === "completed",
    };
  });

  // Calculate summary
  const summary = await getPaymentSummary(user._id, user.role, type);

  res.status(200).json(
    new apiResponse(
      200,
      {
        payments: enhancedPayments,
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPayments / limit),
          totalPayments,
          hasNextPage: page < Math.ceil(totalPayments / limit),
          hasPrevPage: page > 1,
          limit: parseInt(limit),
        },
      },
      "Payment history fetched successfully"
    )
  );
});

// @desc    Get payment analytics for hiring users
// @route   GET /api/payments/analytics
// @access  Private (Hiring only)
export const getPaymentAnalytics = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "hiring") {
    throw new apiError("Only hiring users can access payment analytics", 403);
  }

  const { year = new Date().getFullYear() } = req.query;
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  // Monthly breakdown
  const monthlyPayments = await Payment.aggregate([
    {
      $match: {
        payer: user._id,
        status: "completed",
        createdAt: { $gte: startOfYear, $lte: endOfYear },
      },
    },
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
        totalCount: { $sum: 1 },
        subscriptionAmount: {
          $sum: { $cond: [{ $eq: ["$type", "subscription"] }, "$amount", 0] },
        },
        freelancerAmount: {
          $sum: { $cond: [{ $eq: ["$type", "gig_escrow"] }, "$amount", 0] },
        },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  // Total statistics
  const totalStats = await Payment.aggregate([
    {
      $match: {
        payer: user._id,
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        totalPaid: { $sum: "$amount" },
        subscriptionTotal: {
          $sum: { $cond: [{ $eq: ["$type", "subscription"] }, "$amount", 0] },
        },
        freelancerTotal: {
          $sum: { $cond: [{ $eq: ["$type", "gig_escrow"] }, "$amount", 0] },
        },
        totalTransactions: { $sum: 1 },
      },
    },
  ]);

  // Payment breakdown by type
  const paymentByType = await Payment.aggregate([
    {
      $match: {
        payer: user._id,
        status: "completed",
      },
    },
    {
      $group: {
        _id: "$type",
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const analytics = {
    yearlyStats: totalStats[0] || {
      totalPaid: 0,
      subscriptionTotal: 0,
      freelancerTotal: 0,
      totalTransactions: 0,
    },
    monthlyBreakdown: monthlyPayments.map((item) => ({
      month: item._id.month,
      monthName: getMonthName(item._id.month),
      totalAmount: item.totalAmount,
      totalCount: item.totalCount,
      subscriptionAmount: item.subscriptionAmount,
      freelancerAmount: item.freelancerAmount,
      formattedTotal: `₹${item.totalAmount.toLocaleString()}`,
    })),
    paymentTypeBreakdown: paymentByType.map((item) => ({
      type: item._id,
      amount: item.amount,
      count: item.count,
      formattedAmount: `₹${item.amount.toLocaleString()}`,
      percentage: totalStats[0]
        ? Math.round((item.amount / totalStats[0].totalPaid) * 100)
        : 0,
    })),
  };

  res
    .status(200)
    .json(
      new apiResponse(200, analytics, "Payment analytics fetched successfully")
    );
});

// @desc    Download payment invoice
// @route   GET /api/payments/:paymentId/invoice
// @access  Private
export const downloadInvoice = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;
  const user = req.user;

  const payment = await Payment.findById(paymentId)
    .populate("payer", "name email profile.companyName")
    .populate("payee", "name email")
    .populate("gig", "title")
    .populate("subscription", "planType duration");

  if (!payment) {
    throw new apiError("Payment not found", 404);
  }

  // Check authorization
  const isAuthorized =
    payment.payer._id.toString() === user._id.toString() ||
    payment.payee._id.toString() === user._id.toString();

  if (!isAuthorized) {
    throw new apiError("Not authorized to access this invoice", 403);
  }

  if (payment.status !== "completed") {
    throw new apiError("Invoice only available for completed payments", 400);
  }

  // Generate PDF invoice
  const doc = new PDFDocument({ margin: 50 });

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${payment._id}.pdf"`
  );

  // Pipe PDF to response
  doc.pipe(res);

  // Add content to PDF
  generateInvoicePDF(doc, payment, user);

  doc.end();
});

// @desc    Get freelancer wallet details
// @route   GET /api/payments/wallet
// @access  Private (Freelancers only)
export const getWalletDetails = asyncHandler(async (req, res) => {
  const user = req.user;

  if (user.role !== "freelancer") {
    throw new apiError("Only freelancers can access wallet", 403);
  }

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    // Calculate earnings data for wallet creation
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

  // Get in-progress amount (accepted gigs but not yet completed)
  const inProgressGigs = await Gig.find({
    "applications.freelancer": user._id,
    "applications.applicationStatus": "accepted",
    status: { $in: ["in_progress", "active"] },
  }).populate("applications");

  let moneyInProgress = 0;
  inProgressGigs.forEach((gig) => {
    const application = gig.applications.find(
      (app) =>
        app.freelancer.toString() === user._id.toString() &&
        app.applicationStatus === "accepted"
    );
    if (application) {
      moneyInProgress += application.proposedRate || gig.budget;
    }
  });

  // Get recent transactions
  const recentTransactions = wallet.getRecentTransactions(10);

  const walletData = {
    balance: wallet.balance,
    moneyInProgress,
    totalEarned: wallet.totalEarned,
    totalWithdrawn: wallet.totalWithdrawn,
    pendingAmount: wallet.pendingAmount,
    formattedBalance: `₹${wallet.balance.toLocaleString()}`,
    formattedInProgress: `₹${moneyInProgress.toLocaleString()}`,
    formattedTotalEarned: `₹${wallet.totalEarned.toLocaleString()}`,
    canWithdraw: wallet.balance >= 100, // Minimum withdrawal amount
    recentTransactions: recentTransactions.map((tx) => ({
      ...tx.toObject(),
      formattedAmount: `₹${tx.amount.toLocaleString()}`,
      relativeTime: getRelativeTime(tx.createdAt),
    })),
    walletHealth: wallet.checkHealth(),
  };

  res
    .status(200)
    .json(
      new apiResponse(200, walletData, "Wallet details fetched successfully")
    );
});

// @desc    Request withdrawal - UPDATED WITH NOTIFICATIONS
// @route   POST /api/payments/withdraw
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
    description: `Withdrawal request by ${user.name}`,
    bankAccountDetails: bankDetails,
    metadata: {
      withdrawalId,
      availableBalanceBefore: wallet.balance,
    },
  });

  // Update wallet
  await wallet.withdrawFunds(amount, `Withdrawal request ${withdrawalId}`, {
    withdrawalId,
    status: "pending",
  });

  // AUTO-NOTIFY USER ABOUT WITHDRAWAL REQUEST
  await autoNotifyPayment(withdrawal, user);

  res.status(201).json(
    new apiResponse(
      201,
      {
        withdrawalId,
        amount,
        status: "pending",
        estimatedProcessingTime: "7 business days",
      },
      "Withdrawal request submitted successfully"
    )
  );
});

// @desc    Process withdrawal (Admin only) - UPDATED WITH NOTIFICATIONS
// @route   POST /api/payments/withdraw/:withdrawalId/process
// @access  Private (Admin only)
export const processWithdrawal = asyncHandler(async (req, res) => {
  const { withdrawalId } = req.params;
  const { status, adminNote } = req.body;

  // Only admin can process withdrawals
  if (!req.user.isAdmin) {
    throw new apiError("Only admin can process withdrawals", 403);
  }

  if (!["approved", "rejected"].includes(status)) {
    throw new apiError("Status must be 'approved' or 'rejected'", 400);
  }

  const withdrawal = await Payment.findOne({
    "metadata.withdrawalId": withdrawalId,
    type: "withdrawal",
  }).populate("payer", "name email");

  if (!withdrawal) {
    throw new apiError("Withdrawal request not found", 404);
  }

  if (withdrawal.status !== "pending") {
    throw new apiError("Withdrawal already processed", 400);
  }

  // Update withdrawal status
  withdrawal.status = status === "approved" ? "processing" : "rejected";
  withdrawal.metadata.adminNote = adminNote;
  withdrawal.metadata.processedAt = new Date();
  withdrawal.metadata.processedBy = req.user._id;

  if (status === "rejected") {
    // If rejected, return funds to wallet
    const wallet = await Wallet.findOne({ user: withdrawal.payer._id });
    if (wallet) {
      await wallet.addFunds(
        withdrawal.amount,
        `Withdrawal ${withdrawalId} rejected - funds returned`,
        {
          type: "withdrawal_rejection",
          withdrawalId,
          adminNote,
        }
      );
    }
  }

  await withdrawal.save();

  // AUTO-NOTIFY USER ABOUT WITHDRAWAL STATUS UPDATE
  await autoNotifyPayment(withdrawal, withdrawal.payer);

  res.status(200).json(
    new apiResponse(
      200,
      {
        withdrawalId,
        status: withdrawal.status,
        message:
          status === "approved"
            ? "Withdrawal approved and is being processed"
            : "Withdrawal rejected and funds returned to wallet",
      },
      "Withdrawal processed successfully"
    )
  );
});

// @desc    Complete withdrawal (Admin only) - UPDATED WITH NOTIFICATIONS
// @route   POST /api/payments/withdraw/:withdrawalId/complete
// @access  Private (Admin only)
export const completeWithdrawal = asyncHandler(async (req, res) => {
  const { withdrawalId } = req.params;
  const { transactionId, completionNote } = req.body;

  // Only admin can complete withdrawals
  if (!req.user.isAdmin) {
    throw new apiError("Only admin can complete withdrawals", 403);
  }

  const withdrawal = await Payment.findOne({
    "metadata.withdrawalId": withdrawalId,
    type: "withdrawal",
  }).populate("payer", "name email");

  if (!withdrawal) {
    throw new apiError("Withdrawal request not found", 404);
  }

  if (withdrawal.status !== "processing") {
    throw new apiError("Withdrawal must be in processing status", 400);
  }

  // Update withdrawal to completed
  withdrawal.status = "completed";
  withdrawal.metadata.completedAt = new Date();
  withdrawal.metadata.completedBy = req.user._id;
  withdrawal.metadata.transactionId = transactionId;
  withdrawal.metadata.completionNote = completionNote;

  await withdrawal.save();

  // AUTO-NOTIFY USER ABOUT WITHDRAWAL COMPLETION
  await autoNotifyPayment(withdrawal, withdrawal.payer);

  res.status(200).json(
    new apiResponse(
      200,
      {
        withdrawalId,
        status: "completed",
        transactionId,
        message: "Withdrawal completed successfully",
      },
      "Withdrawal completed successfully"
    )
  );
});

// @desc    Create payment record - UPDATED WITH NOTIFICATIONS
// @route   POST /api/payments/create
// @access  Private (Admin only - for manual payment creation)
export const createPayment = asyncHandler(async (req, res) => {
  const { payerId, payeeId, amount, type, description, gigId, subscriptionId } =
    req.body;

  // Only admin can create manual payments
  if (!req.user.isAdmin) {
    throw new apiError("Only admin can create manual payments", 403);
  }

  // Validation
  if (!payerId || !payeeId || !amount || !type) {
    throw new apiError("Payer, payee, amount, and type are required", 400);
  }

  // Verify users exist
  const [payer, payee] = await Promise.all([
    User.findById(payerId),
    User.findById(payeeId),
  ]);

  if (!payer || !payee) {
    throw new apiError("Payer or payee not found", 404);
  }

  // Create payment record
  const paymentData = {
    payer: payerId,
    payee: payeeId,
    amount,
    type,
    status: "completed",
    description: description || `Manual payment - ${type}`,
    metadata: {
      createdManually: true,
      createdBy: req.user._id,
    },
  };

  if (gigId) paymentData.gig = gigId;
  if (subscriptionId) paymentData.subscription = subscriptionId;

  const payment = await Payment.create(paymentData);

  // Populate for response
  await payment.populate([
    { path: "payer", select: "name email" },
    { path: "payee", select: "name email" },
    { path: "gig", select: "title" },
    { path: "subscription", select: "planType duration" },
  ]);

  // AUTO-NOTIFY BOTH PARTIES ABOUT MANUAL PAYMENT
  await autoNotifyPayment(payment, payer);
  if (payerId !== payeeId) {
    await autoNotifyPayment(payment, payee);
  }

  res
    .status(201)
    .json(new apiResponse(201, payment, "Payment created successfully"));
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

const getPaymentStatusDescription = (status) => {
  const descriptions = {
    pending: "Payment is being prepared",
    processing: "Payment is being processed",
    completed: "Payment completed successfully",
    failed: "Payment failed",
    refunded: "Payment refunded",
    rejected: "Payment rejected",
  };
  return descriptions[status] || "Unknown status";
};

const getPaymentSummary = async (userId, userRole, type) => {
  let baseQuery = { $or: [{ payer: userId }, { payee: userId }] };
  if (type) baseQuery.type = type;

  const [totalSpent, totalReceived, totalPending] = await Promise.all([
    Payment.aggregate([
      { $match: { payer: userId, status: "completed", ...(type && { type }) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { payee: userId, status: "completed", ...(type && { type }) } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Payment.aggregate([
      { $match: { ...baseQuery, status: { $in: ["pending", "processing"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return {
    totalSpent: totalSpent[0]?.total || 0,
    totalReceived: totalReceived[0]?.total || 0,
    totalPending: totalPending[0]?.total || 0,
    netAmount: (totalReceived[0]?.total || 0) - (totalSpent[0]?.total || 0),
  };
};

const getMonthName = (monthNumber) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthNumber - 1];
};

const generateInvoicePDF = (doc, payment, user) => {
  // Header
  doc.fontSize(20).text("UNJOB", 50, 50);
  doc.fontSize(16).text("Payment Invoice", 50, 80);

  // Invoice details
  doc
    .fontSize(10)
    .text(`Invoice ID: INV-${payment._id}`, 50, 120)
    .text(`Payment ID: ${payment._id}`, 50, 140)
    .text(`Date: ${payment.createdAt.toLocaleDateString()}`, 50, 160)
    .text(`Status: ${payment.status.toUpperCase()}`, 50, 180);

  // Payer and Payee info
  doc
    .text("From:", 50, 220)
    .text(payment.payer.name, 50, 240)
    .text(payment.payer.email, 50, 260);

  doc
    .text("To:", 300, 220)
    .text(payment.payee.name, 300, 240)
    .text(payment.payee.email, 300, 260);

  // Payment details
  doc
    .text("Payment Details:", 50, 320)
    .text(`Amount: ₹${payment.amount.toLocaleString()}`, 50, 340)
    .text(`Type: ${payment.type}`, 50, 360);

  if (payment.gig) {
    doc.text(`Gig: ${payment.gig.title}`, 50, 380);
  }

  if (payment.subscription) {
    doc.text(
      `Subscription: ${payment.subscription.planType} (${payment.subscription.duration})`,
      50,
      380
    );
  }

  // Footer
  doc.text("Thank you for using UNJOB!", 50, 450);
};

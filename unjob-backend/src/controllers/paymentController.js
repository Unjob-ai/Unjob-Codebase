// controllers/paymentController.js
import  {Payment} from "../models/PaymentModel.js"
import  {User} from "../models/UserModel.js"
import  {Gig}  from "../models/GigModel.js"
import  {Project} from "../models/ProjectModel.js"
import  {Subscription} from "../models/SubscriptionModel.js"
import  {Wallet} from "../models/WalletModel.js"
import  { AppError, catchAsync } from "../middleware/errorHandler.js"
import  crypto from "crypto"
import asyncHandler from "../utils/asyncHandler.js"
import apiError from "../utils/apiError.js";
// Mock Razorpay - replace with actual Razorpay integration
const mockRazorpay = {
  orders: {
    create: async (options) => ({
      id: `order_${Date.now()}`,
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      status: "created",
    }),
  },
  payments: {
    fetch: async (paymentId) => ({
      id: paymentId,
      amount: 50000,
      currency: "INR",
      status: "captured",
      method: "card",
    }),
  },
};

// @desc    Create payment order
// @route   POST /api/payments/create-order
// @access  Private
const createPaymentOrder = asyncHandler(async (req, res, next) => {
  const { amount, type, gigId, projectId, subscriptionId, description } =
    req.body;

  if (!amount || amount <= 0) {
     throw new apiError("Valid amount is required", 400);
  }

  if (
    !type ||
    ![
      "subscription",
      "gig_payment",
      "gig_escrow",
      "milestone_payment",
    ].includes(type)
  ) {
    throw new apiError("Valid payment type is required", 400);
  }

  let payee = null;
  let relatedData = {};

  // Validate and get related data based on payment type
  switch (type) {
    case "gig_payment":
    case "gig_escrow":
      if (!gigId) {
        throw new apiError("Gig ID is required for gig payments", 400);
      }

      const gig = await Gig.findById(gigId).populate(
        "selectedFreelancer company"
      );
      if (!gig) {
        throw new apiError("Gig not found", 404);
      }

      // For gig payments, payee is the freelancer
      payee = gig.selectedFreelancer?._id;
      relatedData.gig = gigId;

      // Verify user is the company owner
      if (gig.company._id.toString() !== req.user._id.toString()) {
        throw new apiError("Not authorized to make payment for this gig", 403);
      }
      break;

    case "milestone_payment":
      if (!projectId) {
        throw new apiError("Project ID is required for milestone payments", 400);
      }

      const project = await Project.findById(projectId).populate(
        "freelancer company"
      );
      if (!project) {
        throw new apiError("Project not found", 404);
      }

      payee = project.freelancer._id;
      relatedData.project = projectId;

      // Verify user is the company owner
      if (project.company._id.toString() !== req.user._id.toString()) {
        throw new apiError("Not authorized to make payment for this project", 403);
      }
      break;

    case "subscription":
      // For subscriptions, payee is the platform (null or admin)
      payee = null;
      if (subscriptionId) {
        relatedData.subscription = subscriptionId;
      }
      break;
  }

  // Create Razorpay order
  const orderOptions = {
    amount: amount * 100, // Convert to paisa
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
    payment_capture: 1,
  };

  const razorpayOrder = await mockRazorpay.orders.create(orderOptions);

  // Create payment record
  const paymentData = {
    payer: req.user._id,
    payee,
    amount,
    type,
    description: description || `Payment for ${type}`,
    razorpayOrderId: razorpayOrder.id,
    netAmount: amount, // Will be updated after commission calculation
    status: "pending",
    ...relatedData,
  };

  const payment = await Payment.create(paymentData);

  res.status(201).json({
    success: true,
    message: "Payment order created successfully",
    payment,
    razorpayOrder,
  });
});

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res, next) => {
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature, paymentId } =
    req.body;

  if (
    !razorpayPaymentId ||
    !razorpayOrderId ||
    !razorpaySignature ||
    !paymentId
  ) {
    throw new apiError("All payment verification fields are required", 400);
  }

  // Find payment record
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new apiError("Payment record not found", 404);
  }

  // Verify payment belongs to current user
  if (payment.payer.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to verify this payment", 403);
  }

  // Verify Razorpay signature
  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "test_secret")
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    // Update payment status to failed
    payment.status = "failed";
    payment.failedAt = new Date();
    await payment.save();

    throw new apiError("Payment verification failed", 400);
  }

  // Update payment record
  payment.razorpayPaymentId = razorpayPaymentId;
  payment.razorpaySignature = razorpaySignature;
  payment.status = "completed";
  payment.processedAt = new Date();
  payment.completedAt = new Date();

  // Add to status history
  payment.statusHistory.push({
    status: "completed",
    timestamp: new Date(),
    description: "Payment verified and completed successfully",
  });

  await payment.save();

  // Handle post-payment actions based on payment type
  await handlePostPaymentActions(payment);

  await payment.populate([
    { path: "payer", select: "name email" },
    { path: "payee", select: "name email" },
    { path: "gig", select: "title budget" },
    { path: "project", select: "title" },
  ]);

  res.status(200).json({
    success: true,
    message: "Payment verified successfully",
    payment,
  });
});

// Handle actions after successful payment
const handlePostPaymentActions = async (payment) => {
  switch (payment.type) {
    case "subscription":
      if (payment.subscription) {
        await Subscription.findByIdAndUpdate(payment.subscription, {
          status: "active",
          paymentHistory: {
            $push: {
              paymentId: payment._id,
              amount: payment.amount,
              paidAt: payment.completedAt,
              status: "completed",
            },
          },
        });
      }
      break;

    case "gig_escrow":
      // Money goes to escrow - create or update wallet for freelancer
      if (payment.payee) {
        const wallet = await Wallet.findOne({ userId: payment.payee });
        if (wallet) {
          await wallet.addTransaction({
            type: "credit",
            amount: payment.netAmount,
            description: `Escrow payment for gig`,
            reference: payment.gig.toString(),
            referenceModel: "Gig",
          });
        }
      }
      break;

    case "gig_payment":
    case "milestone_payment":
      // Direct payment to freelancer
      if (payment.payee) {
        const wallet = await Wallet.findOne({ userId: payment.payee });
        if (wallet) {
          await wallet.addTransaction({
            type: "credit",
            amount: payment.netAmount,
            description: `Payment for ${payment.type.replace("_", " ")}`,
            reference: payment.project
              ? payment.project.toString()
              : payment.gig.toString(),
            referenceModel: payment.project ? "Project" : "Gig",
          });
        }
      }
      break;
  }
};

// @desc    Get user payments
// @route   GET /api/payments
// @access  Private
const getUserPayments = asyncHandler(async (req, res, next) => {
  const { type, status, page = 1, limit = 10, asPayee = false } = req.query;
  const skip = (page - 1) * limit;

  const filterQuery = {
    isDeleted: false,
  };

  // Filter by payer or payee
  if (asPayee === "true") {
    filterQuery.payee = req.user._id;
  } else {
    filterQuery.payer = req.user._id;
  }

  if (type) filterQuery.type = type;
  if (status) filterQuery.status = status;

  const payments = await Payment.find(filterQuery)
    .populate("payer", "name image profile.companyName")
    .populate("payee", "name image profile.companyName")
    .populate("gig", "title budget category")
    .populate("project", "title")
    .populate("subscription", "planType duration")
    .sort("-createdAt")
    .skip(skip)
    .limit(parseInt(limit));

  const totalPayments = await Payment.countDocuments(filterQuery);

  res.status(200).json({
    success: true,
    payments,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPayments / limit),
      totalPayments,
      hasNext: page < Math.ceil(totalPayments / limit),
      hasPrev: page > 1,
    },
  });
});

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate("payer", "name email image profile.companyName")
    .populate("payee", "name email image profile.companyName")
    .populate("gig", "title budget category description")
    .populate("project", "title description status")
    .populate("subscription", "planType duration status");

  if (!payment) {
    throw new apiError("Payment not found", 404);
  }

  // Check if user is involved in this payment
  const isAuthorized =
    payment.payer.toString() === req.user._id.toString() ||
    payment.payee?.toString() === req.user._id.toString() ||
    req.user.role === "admin";

  if (!isAuthorized) {
    throw new apiError("Not authorized to view this payment", 403);
  }

  res.status(200).json({
    success: true,
    payment,
  });
});

// @desc    Request refund
// @route   POST /api/payments/:id/refund
// @access  Private
const requestRefund = asyncHandler(async (req, res, next) => {
  const { reason, amount } = req.body;

  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    throw new apiError("Payment not found", 404);
  }

  // Check if user is the payer
  if (payment.payer.toString() !== req.user._id.toString()) {
    throw new apiError("Only the payer can request a refund", 403);
  }
  

  // Check if payment can be refunded
  if (payment.status !== "completed") {
    throw new apiError("Only completed payments can be refunded", 400);
  }

  if (payment.refundDetails?.refundedAt) {
    throw new apiError("Payment has already been refunded", 400);
  }

  const refundAmount = amount || payment.amount;

  if (refundAmount > payment.amount) {
  throw new apiError("Refund amount cannot exceed payment amount", 400)
    
  }

  // Create refund record
  const refundPayment = await Payment.create({
    payer: payment.payee, // Platform pays back to original payer
    payee: payment.payer,
    amount: refundAmount,
    type: "refund",
    status: "pending",
    description: `Refund for payment ${payment._id}`,
    gig: payment.gig,
    project: payment.project,
    subscription: payment.subscription,
  });

  // Update original payment
  payment.refundDetails = {
    reason,
    refundAmount,
    refundedAt: new Date(),
    refundedBy: req.user._id,
  };
  payment.status = "refunded";

  await payment.save();

  res.status(200).json({
    success: true,
    message: "Refund request submitted successfully",
    refundPayment,
  });
});

// @desc    Get payment statistics
// @route   GET /api/payments/stats
// @access  Private
const getPaymentStats = asyncHandler(async (req, res, next) => {
  const { timeframe = "30d" } = req.query;

  // Calculate date threshold
  let dateThreshold;
  switch (timeframe) {
    case "7d":
      dateThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      dateThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      dateThreshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "1y":
      dateThreshold = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      dateThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  const baseQuery = {
    createdAt: { $gte: dateThreshold },
    isDeleted: false,
  };

  // Stats for current user
  const userQuery = {
    ...baseQuery,
    $or: [{ payer: req.user._id }, { payee: req.user._id }],
  };

  const stats = await Payment.aggregate([
    { $match: userQuery },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        completedPayments: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] },
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        pendingAmount: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] },
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
      },
    },
  ]);

  // Payment breakdown by type
  const typeBreakdown = await Payment.aggregate([
    { $match: userQuery },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  // Recent transactions
  const recentTransactions = await Payment.find(userQuery)
    .populate("payer", "name image")
    .populate("payee", "name image")
    .populate("gig", "title")
    .populate("project", "title")
    .sort("-createdAt")
    .limit(5);

  const result = {
    timeframe,
    summary: stats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      completedPayments: 0,
      completedAmount: 0,
      pendingPayments: 0,
      pendingAmount: 0,
      failedPayments: 0,
    },
    typeBreakdown,
    recentTransactions,
  };

  res.status(200).json({
    success: true,
    stats: result,
  });
});

// @desc    Update payment status (Admin only)
// @route   PUT /api/payments/:id/status
// @access  Private (Admin only)
const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "admin") {
    throw new apiError("Only admins can update payment status", 403)
  }

  const { status, description } = req.body;

  if (
    !["pending", "processing", "completed", "failed", "refunded"].includes(
      status
    )
  ) {
    throw new apiError("Invalid payment status", 400);
  }

  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    throw new apiError("Payment not found", 404);
  }

  const oldStatus = payment.status;
  payment.status = status;

  // Add to status history
  payment.statusHistory.push({
    status,
    timestamp: new Date(),
    description:
      description || `Status updated from ${oldStatus} to ${status} by admin`,
  });

  // Set appropriate timestamps
  switch (status) {
    case "processing":
      payment.processedAt = new Date();
      break;
    case "completed":
      payment.completedAt = new Date();
      if (!payment.processedAt) payment.processedAt = new Date();
      break;
    case "failed":
      payment.failedAt = new Date();
      break;
  }

  await payment.save();

  // Handle post-payment actions if status changed to completed
  if (status === "completed" && oldStatus !== "completed") {
    await handlePostPaymentActions(payment);
  }

  res.status(200).json({
    success: true,
    message: `Payment status updated to ${status}`,
    payment,
  });
});

// @desc    Get payment methods for user
// @route   GET /api/payments/methods
// @access  Private
const getPaymentMethods = asyncHandler(async (req, res, next) => {
  // This would typically integrate with payment gateway to get saved cards/methods
  // For now, return default payment methods

  const paymentMethods = [
    {
      id: "card",
      type: "card",
      name: "Credit/Debit Card",
      description: "Pay using Visa, Mastercard, or RuPay",
      available: true,
    },
    {
      id: "netbanking",
      type: "netbanking",
      name: "Net Banking",
      description: "Pay directly from your bank account",
      available: true,
    },
    {
      id: "upi",
      type: "upi",
      name: "UPI",
      description: "Pay using Google Pay, PhonePe, Paytm, or any UPI app",
      available: true,
    },
    {
      id: "wallet",
      type: "wallet",
      name: "Wallet",
      description: "Pay using your UnJob wallet balance",
      available: true,
    },
  ];

  // Get user's wallet balance if available
  let walletBalance = 0;
  if (req.user.role === "freelancer") {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    walletBalance = wallet?.balance || 0;
  }

  res.status(200).json({
    success: true,
    paymentMethods,
    walletBalance,
  });
});

export {
  createPaymentOrder,
  verifyPayment,
  getUserPayments,
  getPaymentById,
  requestRefund,
  getPaymentStats,
  updatePaymentStatus,
  getPaymentMethods,
};

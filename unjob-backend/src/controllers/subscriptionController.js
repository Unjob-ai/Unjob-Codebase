// controllers/subscriptionController.js
import crypto from "crypto";
import Razorpay from "razorpay";
import { Subscription } from "../models/SubscriptionModel.js";
import { Payment } from "../models/PaymentModel.js";
import { User } from "../models/UserModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";

// Import plans data from utils
import {
  getPlanPricing,
  getPlansForRole,
  getComparisonData,
  getUpgradeOptions,
  getPlanLimits,
} from "../utils/subscriptionPlans.js";

// Razorpay instance - will be initialized lazily
let razorpay = null;
let razorpayInitialized = false;

// Initialize Razorpay with environment validation
const initializeRazorpay = () => {
  // Return existing instance if already initialized
  if (razorpayInitialized) {
    return razorpay;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  console.log("=== RAZORPAY INITIALIZATION DEBUG ===");
  console.log(`RAZORPAY_KEY_ID: ${keyId || "UNDEFINED"}`);
  console.log(`RAZORPAY_KEY_SECRET: ${keySecret || "UNDEFINED"}`);

  if (!keyId || !keySecret) {
    console.warn("⚠️ Razorpay credentials not found in environment variables");
    console.warn("⚠️ Payment features will be disabled");
    razorpayInitialized = true;
    razorpay = null;
    return null;
  }

  try {
    console.log("✅ Razorpay credentials found, initializing...");
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    razorpayInitialized = true;
    console.log("✅ Razorpay initialized successfully");
    return razorpay;
  } catch (error) {
    console.error("❌ Failed to initialize Razorpay:", error.message);
    razorpayInitialized = true;
    razorpay = null;
    return null;
  }
};

// Helper function to get Razorpay instance
const getRazorpayInstance = () => {
  if (!razorpayInitialized) {
    return initializeRazorpay();
  }
  return razorpay;
};

// @desc    Create subscription
// @route   POST /api/subscription/create
// @access  Private
const createSubscription = asyncHandler(async (req, res) => {
  const { planType, duration } = req.body;

  if (!planType || !duration) {
    throw new apiError("Plan type and duration are required", 400);
  }

  if (!["free", "basic", "pro"].includes(planType)) {
    throw new apiError(
      "Invalid plan type. Must be 'free', 'basic', or 'pro'",
      400
    );
  }

  if (!["monthly", "yearly", "lifetime"].includes(duration)) {
    throw new apiError(
      "Invalid duration. Must be 'monthly', 'yearly', or 'lifetime'",
      400
    );
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new apiError("User not found", 404);
  }

  // Handle free plan - CREATE AND ACTIVATE immediately
  if (planType === "free") {
    console.log("=== FREE PLAN ACTIVATION START ===");
    console.log("User Role:", user.role);
    console.log("Plan Type:", planType);
    console.log("Duration:", duration);

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      user: user._id,
      status: "active",
      endDate: { $gt: new Date() },
    });

    if (existingSubscription) {
      return res.status(200).json(
        new apiResponse(
          200,
          true,
          {
            paymentType: "free",
            subscriptionId: existingSubscription._id,
            planDetails: {
              type: existingSubscription.planType,
              duration: existingSubscription.duration,
              price: 0,
            },
            subscription: {
              id: existingSubscription._id,
              status: "active",
              planType: existingSubscription.planType,
              duration: existingSubscription.duration,
              startDate: existingSubscription.startDate,
              endDate: existingSubscription.endDate,
            },
          },
          "You already have an active subscription."
        )
      );
    }

    // Calculate subscription dates for free plan
    const startDate = new Date();
    let endDate = new Date(startDate);

    if (duration === "monthly") {
      endDate.setMonth(startDate.getMonth() + 1);
    } else if (duration === "yearly") {
      endDate.setFullYear(startDate.getFullYear() + 1);
    } else if (duration === "lifetime") {
      endDate.setFullYear(endDate.getFullYear() + 100);
    }

    // Get plan limits for free plan
    const planLimits = getPlanLimits("free", user.role);

    // Create and immediately activate the free subscription
    const freeSubscription = new Subscription({
      user: user._id,
      userRole: user.role,
      planType: "free",
      duration,
      price: 0,
      originalPrice: 0,
      discount: 0,
      status: "active", // IMMEDIATELY SET TO ACTIVE
      startDate,
      endDate,
      autoRenewal: false, // Free plans don't auto-renew
      ...planLimits, // Add plan-specific limits
      paymentDetails: {
        paymentType: "free",
        lastPaymentDate: new Date(), // Mark as "paid" (free)
        paymentHistory: [
          {
            paymentId: `free_${Date.now()}`,
            amount: 0,
            status: "success",
            paidAt: new Date(),
          },
        ],
      },
    });

    await freeSubscription.save();
    console.log("✅ Free subscription activated in DB:", freeSubscription._id);

    return res.status(200).json(
      new apiResponse(
        200,
        true,
        {
          paymentType: "free",
          subscriptionId: freeSubscription._id,
          planDetails: {
            type: planType,
            duration,
            price: 0,
            limits: planLimits,
          },
          subscription: {
            id: freeSubscription._id,
            status: "active",
            planType: "free",
            duration,
            startDate: freeSubscription.startDate,
            endDate: freeSubscription.endDate,
            limits: planLimits,
          },
        },
        "Free plan activated successfully."
      )
    );
  }

  // Handle paid plans (basic, pro) - Initialize Razorpay here
  const razorpayInstance = getRazorpayInstance();

  if (!razorpayInstance) {
    throw new apiError(
      "Payment service is currently unavailable. Please try again later.",
      503
    );
  }

  const pricing = getPlanPricing(user.role, planType, duration);

  if (!pricing) {
    throw new apiError(
      `Invalid plan configuration for ${user.role} - ${planType} - ${duration}`,
      400
    );
  }

  console.log("=== PAID SUBSCRIPTION CREATION START ===");
  console.log("User Role:", user.role);
  console.log("Plan Type:", planType);
  console.log("Duration:", duration);
  console.log("Pricing:", pricing);

  // Create Razorpay order for paid plans
  const shortUserId = user._id.toString().slice(-6);
  const orderOptions = {
    amount: pricing.price * 100, // in paise
    currency: "INR",
    receipt: `ord_${shortUserId}_${Date.now().toString().slice(-8)}`,
    notes: {
      userId: user._id.toString(),
      userRole: user.role,
      planType,
      duration,
      email: user.email,
      paymentType: "one-time",
    },
  };

  let razorpayOrder;
  try {
    razorpayOrder = await razorpayInstance.orders.create(orderOptions);
    console.log("✅ Razorpay order created:", razorpayOrder.id);
  } catch (error) {
    console.error("❌ Failed to create Razorpay order:", error);
    throw new apiError("Failed to create payment order: " + error.message, 500);
  }

  // Calculate subscription dates
  const startDate = new Date();
  let endDate = new Date(startDate);
  if (duration === "monthly") {
    endDate.setMonth(startDate.getMonth() + 1);
  } else if (duration === "yearly") {
    endDate.setFullYear(startDate.getFullYear() + 1);
  } else if (duration === "lifetime") {
    endDate.setFullYear(endDate.getFullYear() + 100);
  }

  // Get plan limits for paid plan
  const planLimits = getPlanLimits(planType, user.role);

  // Save subscription in DB (pending until payment success)
  const subscription = new Subscription({
    user: user._id,
    userRole: user.role,
    planType,
    duration,
    price: pricing.price,
    originalPrice: pricing.originalPrice,
    discount: pricing.discount,
    status: "pending",
    startDate,
    endDate,
    autoRenewal: false,
    ...planLimits, // Add plan-specific limits
    paymentDetails: {
      paymentType: "one-time",
      razorpayOrderId: razorpayOrder.id,
    },
  });

  await subscription.save();
  console.log("✅ Subscription record saved in DB:", subscription._id);

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        paymentType: "one-time",
        orderId: razorpayOrder.id,
        amount: pricing.price,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        dbSubscriptionId: subscription._id,
        planDetails: {
          type: planType,
          duration,
          originalPrice: pricing.originalPrice,
          discountedPrice: pricing.price,
          discount: pricing.discount,
          limits: planLimits,
        },
      },
      `Payment of ₹${pricing.price} created successfully.`
    )
  );
});

// @desc    Get plans for specific role
// @route   GET /api/subscription/plans?role=freelancer
// @access  Public
const getPlans = asyncHandler(async (req, res) => {
  const { role } = req.query;

  if (!role || !["freelancer", "hiring"].includes(role)) {
    throw new apiError(
      "Valid user role is required (freelancer or hiring)",
      400
    );
  }

  const plans = getPlansForRole(role);
  const comparisonData = getComparisonData();

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        plans,
        comparisonData,
        userRole: role,
      },
      "Plans fetched successfully"
    )
  );
});

// @desc    Check subscription status
// @route   GET /api/subscription/status
// @access  Private
const checkSubscriptionStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const subscription = await Subscription.findOne({
    user: userId,
    status: "active",
  }).sort({ startDate: -1 });

  if (!subscription) {
    return res.status(200).json(
      new apiResponse(
        200,
        true,
        {
          hasActiveSubscription: false,
          canPostGig: false,
          subscription: null,
        },
        "No active subscription found"
      )
    );
  }

  // Check if subscription is actually active
  const now = new Date();
  const isExpired =
    subscription.duration !== "lifetime" &&
    new Date(subscription.endDate) < now;

  if (isExpired) {
    // Update subscription status to expired
    await Subscription.findByIdAndUpdate(subscription._id, {
      status: "expired",
    });

    return res.status(200).json(
      new apiResponse(
        200,
        true,
        {
          hasActiveSubscription: false,
          canPostGig: false,
          subscription: null,
        },
        "Subscription has expired"
      )
    );
  }

  const daysLeft =
    subscription.duration === "lifetime"
      ? null
      : Math.max(
          0,
          Math.ceil(
            (new Date(subscription.endDate) - now) / (1000 * 60 * 60 * 24)
          )
        );

  // Get current plan limits
  const planLimits = getPlanLimits(
    subscription.planType,
    subscription.userRole
  );

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        hasActiveSubscription: true,
        canPostGig: true,
        subscription: {
          planId: subscription._id,
          planType: subscription.planType,
          duration: subscription.duration,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          isLifetime: subscription.duration === "lifetime",
          daysLeft,
          active: true,
          limits: planLimits,
          usage: {
            gigsPosted: subscription.gigsPosted || 0,
            applicationsSubmitted: subscription.applicationsSubmitted || 0,
          },
        },
      },
      "Active subscription found"
    )
  );
});

// @desc    Verify payment
// @route   POST /api/subscription/verify-payment
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    razorpay_subscription_id,
    subscriptionId,
    paymentType,
  } = req.body;

  console.log("Payment verification request:", {
    paymentType,
    subscriptionId,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_subscription_id,
  });

  // Find the subscription record
  const subscription = await Subscription.findById(subscriptionId);
  if (!subscription) {
    console.error("Subscription not found:", subscriptionId);
    throw new apiError("Subscription not found", 404);
  }

  // Get Razorpay instance for verification
  const razorpayInstance = getRazorpayInstance();

  // Verify the payment based on payment type
  let isVerified = false;
  let verificationError = null;

  try {
    if (paymentType === "recurring" && razorpay_subscription_id) {
      // For recurring subscriptions, verify the subscription
      if (!razorpayInstance) {
        throw new Error("Razorpay service unavailable");
      }

      const subscriptionData = await razorpayInstance.subscriptions.fetch(
        razorpay_subscription_id
      );
      console.log("Razorpay subscription data:", subscriptionData);

      if (
        subscriptionData.status === "active" ||
        subscriptionData.status === "authenticated"
      ) {
        isVerified = true;
      }

      // Update subscription with Razorpay subscription details
      subscription.paymentDetails.razorpaySubscriptionId =
        razorpay_subscription_id;
      subscription.paymentDetails.paymentType = "recurring";

      if (razorpay_payment_id) {
        subscription.paymentDetails.razorpayPaymentId = razorpay_payment_id;
      }
    } else {
      // For one-time payments, verify using signature
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        throw new Error("Missing payment verification parameters");
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      isVerified = expectedSignature === razorpay_signature;

      if (isVerified) {
        // Update subscription with payment details
        subscription.paymentDetails.razorpayOrderId = razorpay_order_id;
        subscription.paymentDetails.razorpayPaymentId = razorpay_payment_id;
        subscription.paymentDetails.razorpaySignature = razorpay_signature;
        subscription.paymentDetails.paymentType = "one-time";
      }
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    verificationError = error.message;
    isVerified = false;
  }

  if (!isVerified) {
    console.error("Payment verification failed:", verificationError);

    // Update subscription status to failed
    subscription.status = "cancelled";
    await subscription.save();

    throw new apiError(
      "Payment verification failed: " + verificationError,
      400
    );
  }

  // Payment verified successfully - activate subscription
  subscription.status = "active";
  subscription.paymentDetails.lastPaymentDate = new Date();

  // Record the payment in history
  subscription.paymentDetails.paymentHistory.push({
    paymentId: razorpay_payment_id || razorpay_subscription_id,
    amount: subscription.price,
    status: "success",
    paidAt: new Date(),
  });

  // Set next payment date for recurring subscriptions
  if (paymentType === "recurring" && subscription.autoRenewal) {
    const nextPaymentDate = new Date();
    if (subscription.duration === "monthly") {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    } else if (subscription.duration === "yearly") {
      nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
    }
    subscription.paymentDetails.nextPaymentDate = nextPaymentDate;
  }

  await subscription.save();
  console.log("Subscription activated:", subscription._id);

  // Create payment record for history tracking
  try {
    const paymentRecord = new Payment({
      payer: subscription.user,
      amount: subscription.price,
      currency: "INR",
      status: "completed",
      type: "subscription",
      paymentMethod: "razorpay",
      transactionId: razorpay_payment_id || razorpay_subscription_id,
      metadata: {
        subscriptionId: subscription._id,
        planType: subscription.planType,
        duration: subscription.duration,
        paymentType: paymentType,
      },
      razorpayDetails: {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        subscriptionId: razorpay_subscription_id,
        signature: razorpay_signature,
      },
    });

    await paymentRecord.save();
    console.log("Payment record created:", paymentRecord._id);
  } catch (paymentRecordError) {
    console.error("Failed to create payment record:", paymentRecordError);
  }

  // Get plan limits for response
  const planLimits = getPlanLimits(
    subscription.planType,
    subscription.userRole
  );

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        subscription: {
          id: subscription._id,
          status: subscription.status,
          planType: subscription.planType,
          duration: subscription.duration,
          endDate: subscription.endDate,
          autoRenewal: subscription.autoRenewal,
          limits: planLimits,
        },
      },
      "Payment verified and subscription activated"
    )
  );
});

// @desc    Get subscription management details
// @route   GET /api/subscription/manage
// @access  Private
const getSubscriptionManagement = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new apiError("User not found", 404);
  }

  // Get current active subscription
  const currentSubscription = await Subscription.findOne({
    user: user._id,
    status: "active",
    $or: [{ duration: "lifetime" }, { endDate: { $gt: new Date() } }],
  });

  // Get subscription history
  const subscriptionHistory = await Subscription.find({
    user: user._id,
  })
    .sort({ createdAt: -1 })
    .limit(10);

  // Get payment history for subscriptions
  const paymentHistory = await Payment.find({
    payer: user._id,
    type: "subscription",
  })
    .sort({ createdAt: -1 })
    .limit(5);

  let currentSubscriptionData = null;

  if (currentSubscription) {
    const planLimits = getPlanLimits(currentSubscription.planType, user.role);

    currentSubscriptionData = {
      id: currentSubscription._id,
      planType: currentSubscription.planType,
      duration: currentSubscription.duration,
      status: currentSubscription.status,
      startDate: currentSubscription.startDate,
      endDate:
        currentSubscription.duration === "lifetime"
          ? null
          : currentSubscription.endDate,
      isLifetime: currentSubscription.duration === "lifetime",
      remainingDays: currentSubscription.getRemainingDays
        ? currentSubscription.getRemainingDays()
        : null,
      autoRenewal: currentSubscription.autoRenewal,
      renewalDate: currentSubscription.renewalDate,
      features: currentSubscription.features,
      limits: planLimits,
      usage: {
        type: user.role === "hiring" ? "gigs" : "applications",
        used:
          user.role === "hiring"
            ? currentSubscription.gigsPosted || 0
            : currentSubscription.applicationsSubmitted || 0,
        limit:
          user.role === "hiring"
            ? planLimits.maxGigs
            : planLimits.maxApplications,
        remaining:
          user.role === "hiring"
            ? planLimits.maxGigs === -1
              ? "unlimited"
              : Math.max(
                  0,
                  planLimits.maxGigs - (currentSubscription.gigsPosted || 0)
                )
            : planLimits.maxApplications === -1
            ? "unlimited"
            : Math.max(
                0,
                planLimits.maxApplications -
                  (currentSubscription.applicationsSubmitted || 0)
              ),
        percentage:
          user.role === "hiring"
            ? planLimits.maxGigs === -1
              ? 0
              : Math.round(
                  ((currentSubscription.gigsPosted || 0) / planLimits.maxGigs) *
                    100
                )
            : planLimits.maxApplications === -1
            ? 0
            : Math.round(
                ((currentSubscription.applicationsSubmitted || 0) /
                  planLimits.maxApplications) *
                  100
              ),
      },
      billing: {
        price: currentSubscription.price,
        originalPrice: currentSubscription.originalPrice,
        discount: currentSubscription.discount,
        nextBillingDate:
          currentSubscription.duration === "lifetime"
            ? null
            : currentSubscription.renewalDate,
      },
    };
  }

  const responseData = {
    userRole: user.role,
    hasActiveSubscription: !!currentSubscription,
    currentSubscription: currentSubscriptionData,
    subscriptionHistory: subscriptionHistory.map((sub) => ({
      id: sub._id,
      planType: sub.planType,
      duration: sub.duration,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      price: sub.price,
      createdAt: sub.createdAt,
      cancelledAt: sub.cancelledAt,
      cancellationReason: sub.cancellationReason,
    })),
    paymentHistory: paymentHistory.map((payment) => ({
      id: payment._id,
      amount: payment.amount,
      status: payment.status,
      description: payment.description,
      createdAt: payment.createdAt,
      razorpayPaymentId: payment.razorpayDetails?.paymentId,
    })),
    upgradeOptions: currentSubscription
      ? getUpgradeOptions(currentSubscription.planType, user.role)
      : null,
  };

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        responseData,
        "Subscription details fetched successfully"
      )
    );
});

// @desc    Update subscription settings
// @route   PATCH /api/subscription/manage
// @access  Private
const updateSubscriptionSettings = asyncHandler(async (req, res) => {
  const { autoRenewal, action, subscriptionId } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new apiError("User not found", 404);
  }

  // Find subscription
  const subscription = await Subscription.findOne({
    _id: subscriptionId || undefined,
    user: user._id,
    status: "active",
  });

  if (!subscription) {
    throw new apiError("Active subscription not found", 404);
  }

  // Handle different actions
  if (action === "cancel") {
    // Cancel subscription
    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = "User requested cancellation";
    subscription.autoRenewal = false;

    await subscription.save();

    return res.status(200).json(
      new apiResponse(
        200,
        true,
        {
          subscription: {
            id: subscription._id,
            status: subscription.status,
            cancelledAt: subscription.cancelledAt,
            accessUntil: subscription.endDate,
          },
        },
        "Subscription cancelled successfully"
      )
    );
  } else if (action === "toggle_renewal") {
    // Toggle auto-renewal
    if (subscription.duration === "lifetime") {
      throw new apiError("Lifetime subscriptions don't have auto-renewal", 400);
    }

    subscription.autoRenewal = !subscription.autoRenewal;
    await subscription.save();

    return res.status(200).json(
      new apiResponse(
        200,
        true,
        {
          autoRenewal: subscription.autoRenewal,
        },
        `Auto-renewal ${subscription.autoRenewal ? "enabled" : "disabled"}`
      )
    );
  } else if (typeof autoRenewal === "boolean") {
    // Update auto-renewal setting
    if (subscription.duration === "lifetime") {
      throw new apiError("Lifetime subscriptions don't have auto-renewal", 400);
    }

    subscription.autoRenewal = autoRenewal;
    await subscription.save();

    return res.status(200).json(
      new apiResponse(
        200,
        true,
        {
          autoRenewal: subscription.autoRenewal,
        },
        `Auto-renewal ${autoRenewal ? "enabled" : "disabled"}`
      )
    );
  }

  throw new apiError("Invalid action or parameters", 400);
});

// @desc    Razorpay webhook handler
// @route   POST /api/subscription/webhook
// @access  Public (Webhook)
const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  if (!signature) {
    console.error("Missing Razorpay signature");
    throw new apiError("Missing signature", 400);
  }

  // Verify webhook signature
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) {
    console.error("Invalid webhook signature");
    throw new apiError("Invalid signature", 400);
  }

  const event = req.body;
  console.log("Razorpay webhook event:", event.event, event.payload);

  switch (event.event) {
    case "subscription.charged":
      await handleSubscriptionCharged(event.payload);
      break;

    case "subscription.completed":
      await handleSubscriptionCompleted(event.payload);
      break;

    case "subscription.cancelled":
      await handleSubscriptionCancelled(event.payload);
      break;

    case "subscription.paused":
      await handleSubscriptionPaused(event.payload);
      break;

    case "subscription.resumed":
      await handleSubscriptionResumed(event.payload);
      break;

    case "payment.failed":
      await handlePaymentFailed(event.payload);
      break;

    case "invoice.paid":
      await handleInvoicePaid(event.payload);
      break;

    case "subscription.activated":
      await handleSubscriptionActivated(event.payload);
      break;

    case "subscription.halted":
      await handleSubscriptionHalted(event.payload);
      break;

    default:
      console.log("Unhandled webhook event:", event.event);
  }

  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Webhook processed successfully"));
});

// Webhook event handlers (same as before but using the imported payment handling)
async function handleSubscriptionCharged(payload) {
  try {
    const { subscription: razorpaySubscription, payment } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    // Record successful payment
    subscription.paymentDetails.paymentHistory.push({
      paymentId: payment.id,
      amount: payment.amount / 100,
      status: "success",
      paidAt: new Date(),
    });
    subscription.paymentDetails.lastPaymentDate = new Date();
    await subscription.save();

    // Create payment record for history
    try {
      const paymentRecord = new Payment({
        payer: subscription.user,
        amount: payment.amount / 100,
        currency: "INR",
        status: "completed",
        type: "subscription",
        paymentMethod: "razorpay",
        transactionId: payment.id,
        metadata: {
          subscriptionId: subscription._id,
          planType: subscription.planType,
          duration: subscription.duration,
          razorpaySubscriptionId: razorpaySubscription.id,
        },
        razorpayDetails: {
          paymentId: payment.id,
          subscriptionId: razorpaySubscription.id,
        },
      });

      await paymentRecord.save();
      console.log("Payment record created from webhook:", paymentRecord._id);
    } catch (paymentError) {
      console.error(
        "Failed to create payment record in webhook:",
        paymentError
      );
    }

    console.log("Subscription charged successfully:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription charged:", error);
  }
}

async function handleSubscriptionCompleted(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    subscription.status = "expired";
    subscription.autoRenewal = false;
    await subscription.save();

    console.log("Subscription completed:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription completed:", error);
  }
}

async function handleSubscriptionCancelled(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    subscription.status = "cancelled";
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = "Cancelled via Razorpay";
    subscription.autoRenewal = false;
    await subscription.save();

    console.log("Subscription cancelled:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription cancelled:", error);
  }
}

async function handleSubscriptionPaused(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    subscription.status = "paused";
    await subscription.save();

    console.log("Subscription paused:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription paused:", error);
  }
}

async function handleSubscriptionResumed(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    subscription.status = "active";
    await subscription.save();

    console.log("Subscription resumed:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription resumed:", error);
  }
}

async function handleSubscriptionActivated(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    subscription.status = "active";
    await subscription.save();

    console.log("Subscription activated:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription activated:", error);
  }
}

async function handleSubscriptionHalted(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    subscription.status = "paused";
    await subscription.save();

    console.log("Subscription halted:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription halted:", error);
  }
}

async function handlePaymentFailed(payload) {
  try {
    const { payment } = payload;

    let subscription = null;

    if (payment.order_id) {
      subscription = await Subscription.findOne({
        "paymentDetails.razorpayOrderId": payment.order_id,
      });
    }

    if (!subscription && payment.notes && payment.notes.subscription_id) {
      subscription = await Subscription.findOne({
        "paymentDetails.razorpaySubscriptionId": payment.notes.subscription_id,
      });
    }

    if (!subscription) {
      console.error("Subscription not found for failed payment:", payment.id);
      return;
    }

    // Record failed payment
    subscription.paymentDetails.paymentHistory.push({
      paymentId: payment.id,
      amount: payment.amount / 100,
      status: "failed",
      paidAt: new Date(),
      failureReason: payment.error_description || "Payment failed",
    });
    await subscription.save();

    // Create failed payment record
    try {
      const paymentRecord = new Payment({
        payer: subscription.user,
        amount: payment.amount / 100,
        currency: "INR",
        status: "failed",
        type: "subscription",
        paymentMethod: "razorpay",
        transactionId: payment.id,
        metadata: {
          subscriptionId: subscription._id,
          planType: subscription.planType,
          duration: subscription.duration,
          failureReason: payment.error_description,
        },
        razorpayDetails: {
          paymentId: payment.id,
          orderId: payment.order_id,
        },
      });

      await paymentRecord.save();
      console.log("Failed payment record created:", paymentRecord._id);
    } catch (paymentError) {
      console.error("Failed to create failed payment record:", paymentError);
    }

    console.log("Payment failed handled for subscription:", subscription._id);
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}

async function handleInvoicePaid(payload) {
  try {
    const { invoice, payment } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": invoice.subscription_id,
    });

    if (!subscription) {
      console.error("Subscription not found for invoice:", invoice.id);
      return;
    }

    // Record successful payment from invoice
    subscription.paymentDetails.paymentHistory.push({
      paymentId: payment.id,
      amount: invoice.amount / 100,
      status: "success",
      paidAt: new Date(),
    });
    subscription.paymentDetails.lastPaymentDate = new Date();
    await subscription.save();

    console.log("Invoice paid handled for subscription:", subscription._id);
  } catch (error) {
    console.error("Error handling invoice paid:", error);
  }
}

export {
  createSubscription,
  getPlans,
  checkSubscriptionStatus,
  verifyPayment,
  getSubscriptionManagement,
  updateSubscriptionSettings,
  handleWebhook,
};

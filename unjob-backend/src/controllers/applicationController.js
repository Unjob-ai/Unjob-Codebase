// controllers/applicationController.js

import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { Gig } from "../models/GigModel.js";
import { User } from "../models/UserModel.js";
import { Subscription } from "../models/SubscriptionModel.js";
import { Conversation } from "../models/ConversationModel.js";
import { Payment } from "../models/PaymentModel.js";
import { Notification } from "../models/NotificationModel.js";
import crypto from "crypto";

// ADD THESE NOTIFICATION IMPORTS
import {
  autoNotifyGigApplication,
  autoNotifyApplicationStatusUpdate,
  autoNotifyPayment,
} from "../utils/notificationHelpers.js";

// Razorpay instance - will be initialized lazily
let razorpay = null;
let razorpayInitialized = false;
let razorpayError = null;

// Initialize Razorpay with lazy loading
const initializeRazorpay = async () => {
  // Return existing instance if already initialized
  if (razorpayInitialized) {
    return razorpay;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  console.log("=== APPLICATION CONTROLLER RAZORPAY INITIALIZATION ===");
  console.log(`RAZORPAY_KEY_ID: ${keyId || "UNDEFINED"}`);
  console.log(`RAZORPAY_KEY_SECRET: ${keySecret || "UNDEFINED"}`);

  if (!keyId || !keySecret) {
    razorpayError = "Razorpay credentials not configured";
    console.warn("⚠️ Razorpay credentials not found in environment variables");
    console.warn("⚠️ Payment features will be disabled");
    razorpayInitialized = true;
    razorpay = null;
    return null;
  }

  try {
    const Razorpay = (await import("razorpay")).default;
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    razorpayInitialized = true;
    console.log(
      "✅ Razorpay initialized successfully in application controller"
    );
    return razorpay;
  } catch (error) {
    razorpayError = error.message;
    console.error(
      "❌ Failed to initialize Razorpay in application controller:",
      error.message
    );
    console.warn("⚠️ Payment features will be disabled");
    razorpayInitialized = true;
    razorpay = null;
    return null;
  }
};

// Helper function to get Razorpay instance
const getRazorpayInstance = async () => {
  if (!razorpayInitialized) {
    return await initializeRazorpay();
  }
  return razorpay;
};

// Helper function to check if payment features are available
const isPaymentAvailable = async () => {
  const razorpayInstance = await getRazorpayInstance();
  if (!razorpayInstance) {
    throw new apiError(
      `Payment service unavailable: ${
        razorpayError || "Razorpay not initialized"
      }`,
      503
    );
  }
  return true;
};

// @desc    Create application for gig - UPDATED WITH NOTIFICATIONS
// @route   POST /api/applications/create
// @access  Private (Freelancers only)
export const createApplication = asyncHandler(async (req, res, next) => {
  const freelancer = req.user;

  if (!freelancer || freelancer.role !== "freelancer") {
    throw new apiError("Only freelancers can apply to gigs", 403);
  }

  // Check subscription
  const subscription = await Subscription.findOne({
    user: freelancer._id,
    userRole: "freelancer",
    status: "active",
  }).exec();

  if (!subscription) {
    throw new apiError("You need an active subscription to apply to gigs", 402);
  }

  // Auto-fix missing fields for old users
  if (subscription && !subscription.maxApplications) {
    let maxApplications;
    let givenIterations;

    if (subscription.planType === "free") {
      maxApplications = 20;
      givenIterations = 20;
    } else if (subscription.planType === "basic") {
      if (subscription.duration === "lifetime") {
        maxApplications = -1;
        givenIterations = -1;
      } else if (subscription.duration === "yearly") {
        maxApplications = 2400;
        givenIterations = 2400;
      } else {
        maxApplications = 200;
        givenIterations = 200;
      }
    } else if (subscription.planType === "pro") {
      maxApplications = -1;
      givenIterations = -1;
    }

    await Subscription.findByIdAndUpdate(subscription._id, {
      maxApplications: maxApplications,
      givenIterations: givenIterations,
      applicationsSubmitted: subscription.applicationsSubmitted || 0,
    });

    subscription.maxApplications = maxApplications;
  }

  // Enhanced subscription validation
  const isActiveSubscription = subscription.status === "active";
  const isNotExpired =
    !subscription.endDate || subscription.endDate > new Date();
  const isLifetime = subscription.duration === "lifetime";
  const isWithinGracePeriod =
    subscription.endDate &&
    new Date() - subscription.endDate < 7 * 24 * 60 * 60 * 1000;

  const subscriptionValid =
    isActiveSubscription && (isNotExpired || isLifetime || isWithinGracePeriod);

  if (!subscriptionValid) {
    throw new apiError("Your subscription has expired", 402);
  }

  // Enhanced application limit check
  const maxApps = subscription.maxApplications || 20;
  const usedApps = subscription.applicationsSubmitted || 0;

  // Special handling for legacy users
  const LEGACY_CUTOFF_DATE = new Date("2024-12-01");
  const isLegacyUser = subscription.createdAt < LEGACY_CUTOFF_DATE;

  let canApply;
  if (isLegacyUser && subscription.planType === "basic") {
    canApply = maxApps === -1 || usedApps < Math.max(maxApps, 100);
  } else {
    canApply = maxApps === -1 || usedApps < maxApps;
  }

  if (!canApply) {
    throw new apiError(
      `Application limit reached (${usedApps}/${
        maxApps === -1 ? "unlimited" : maxApps
      })`,
      402
    );
  }

  const { gigId, iterations, coverLetter } = req.body;

  // Validation
  if (!gigId) {
    throw new apiError("gigId is required", 400);
  }

  if (!iterations && !coverLetter) {
    throw new apiError(
      "Either iterations count or coverLetter is required",
      400
    );
  }

  // Validate iterations
  let iterationsNum = iterations ? parseInt(iterations) : 3;
  if (iterationsNum < 1 || iterationsNum > 20) {
    throw new apiError("Invalid number of iterations (1-20)", 400);
  }

  // Find and validate gig
  const gig = await Gig.findById(gigId).populate("company", "name email _id");
  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Check for correct status values
  const validStatuses = ["published", "active", "in_progress"];
  if (!validStatuses.includes(gig.status)) {
    throw new apiError(
      `Gig status is "${gig.status}", but must be one of: ${validStatuses.join(
        ", "
      )}`,
      400
    );
  }

  // Check for existing application
  const existingApplication = gig.applications?.find((app) => {
    const appUserId = app.user ? app.user.toString() : null;
    const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
    const currentUserId = freelancer._id.toString();
    return appUserId === currentUserId || appFreelancerId === currentUserId;
  });

  if (existingApplication) {
    throw new apiError("You have already applied to this gig", 400);
  }

  // Enhanced features based on plan type
  const subscriptionFeatures = {
    profileBoost: subscription.planType !== "free",
    skillVerification: subscription.planType !== "free",
    premiumBadge: subscription.planType !== "free",
    prioritySupport: subscription.planType === "pro",
    isLegacy: isLegacyUser,
  };

  // Create application object with all required fields
  const application = {
    user: freelancer._id,
    freelancer: freelancer._id,
    name: freelancer.name?.trim() || freelancer.email.split("@")[0],
    email: freelancer.email,
    image: freelancer.image || null,
    location: freelancer.profile?.location || "Not specified",
    skills: freelancer.profile?.skills || [],
    hourlyRate: freelancer.profile?.hourlyRate || 0,
    portfolio: freelancer.profile?.portfolio || [],
    proposedBudget: gig.budget,
    timeline: gig.timeline || "As per project requirements",
    totalIterations: iterationsNum,
    remainingIterations: iterationsNum,
    usedIterations: 0,
    coverLetter: coverLetter || `Application with ${iterationsNum} iterations`,
    appliedAt: new Date(),
    status: "pending",
    applicationStatus: "pending",
    isPriorityApplication: subscriptionFeatures.profileBoost,
    hasVerifiedSkills: subscriptionFeatures.skillVerification,
    hasPremiumBadge: subscriptionFeatures.premiumBadge,
    isLegacyUser: subscriptionFeatures.isLegacy,
    projectSubmissions: [],
    currentProjectId: null,
    projectStatus: "not_started",
  };

  // Add application to gig
  if (!gig.applications) {
    gig.applications = [];
  }
  gig.applications.push(application);
  gig.applicationsCount = gig.applications.length;
  await gig.save();

  // Get the newly created application for notification
  const newApplication = gig.applications[gig.applications.length - 1];

  // AUTO-NOTIFY GIG OWNER ABOUT NEW APPLICATION
  await autoNotifyGigApplication(gig, newApplication, freelancer);

  // Update subscription usage
  try {
    await Subscription.findByIdAndUpdate(subscription._id, {
      $inc: { applicationsSubmitted: 1 },
    });
  } catch (subscriptionError) {
    console.error("Failed to update subscription usage:", subscriptionError);
  }

  // Enhanced success response
  const remainingApps =
    maxApps === -1 ? "unlimited" : Math.max(0, maxApps - (usedApps + 1));

  const responseData = {
    success: true,
    message: subscriptionFeatures.profileBoost
      ? "Priority application submitted successfully!"
      : "Application submitted successfully!",
    application: {
      id: newApplication._id,
      gigId: gig._id,
      gigTitle: gig.title,
      companyName: gig.company?.name || "Company",
      appliedAt: newApplication.appliedAt,
      status: newApplication.status,
      applicationStatus: newApplication.applicationStatus,
      totalIterations: newApplication.totalIterations,
      remainingIterations: newApplication.remainingIterations,
      usedIterations: newApplication.usedIterations,
      isPriority: newApplication.isPriorityApplication,
      hasVerifiedSkills: newApplication.hasVerifiedSkills,
      hasPremiumBadge: newApplication.hasPremiumBadge,
      isLegacyUser: newApplication.isLegacyUser,
    },
    subscriptionInfo: {
      planType: subscription.planType,
      duration: subscription.duration,
      isLegacy: isLegacyUser,
      used: (subscription.applicationsSubmitted || 0) + 1,
      remaining: remainingApps,
      maxApplications: maxApps === -1 ? "unlimited" : maxApps,
    },
  };

  res
    .status(201)
    .json(
      new apiResponse(201, responseData, "Application created successfully")
    );
});

// @desc    Accept application (with negotiation or direct) - UPDATED WITH NOTIFICATIONS
// @route   POST /api/applications/:gigId/accept
// @access  Private (Hiring users only)
export const acceptApplication = asyncHandler(async (req, res, next) => {
  const company = req.user;

  if (!company || company.role !== "hiring") {
    throw new apiError("Only hiring users can accept applications", 403);
  }

  const { gigId } = req.params;
  const {
    freelancerId,
    userId: requestUserId,
    action,
    finalAgreedPrice,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const targetUserId = freelancerId || requestUserId;

  if (targetUserId && typeof targetUserId === "object" && targetUserId._id) {
    freelancerId = targetUserId._id.toString();
  } else if (targetUserId) {
    freelancerId = targetUserId.toString();
  }

  if (!freelancerId) {
    throw new apiError("User ID is required (freelancerId or userId)", 400);
  }

  const gig = await Gig.findById(gigId);
  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  if (gig.company.toString() !== company._id.toString()) {
    throw new apiError(
      "Unauthorized - You can only accept applications for your own gigs",
      403
    );
  }

  const application = gig.applications.find((app) => {
    const appUserId = app.user ? app.user.toString() : null;
    const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
    return appUserId === freelancerId || appFreelancerId === freelancerId;
  });

  if (!application) {
    throw new apiError("Application not found", 404);
  }

  const freelancerUser = await User.findById(freelancerId);
  if (!freelancerUser) {
    throw new apiError("Freelancer not found", 404);
  }

  // Payment verification after negotiation is completed
  if (action === "verify_negotiation_payment") {
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !finalAgreedPrice
    ) {
      throw new apiError("Missing required payment verification data", 400);
    }

    // Verify payment signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update((razorpay_order_id + "|" + razorpay_payment_id).toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      throw new apiError("Invalid payment signature", 400);
    }

    const totalPaid = finalAgreedPrice; // No platform fee

    application.status = "accepted";
    application.applicationStatus = "accepted";
    application.acceptedAt = new Date();
    application.finalAgreedBudget = finalAgreedPrice;
    application.paymentDetails = {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      paidAt: new Date(),
      amountPaid: totalPaid,
      agreedPrice: finalAgreedPrice,
      platformFee: 0, // No platform fee
    };

    // Reject other applications
    gig.applications.forEach((app) => {
      const appUserId = app.user ? app.user.toString() : null;
      const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
      const appCurrentStatus = app.status || app.applicationStatus;

      if (
        appUserId !== freelancerId &&
        appFreelancerId !== freelancerId &&
        appCurrentStatus === "pending"
      ) {
        app.status = "rejected";
        app.applicationStatus = "rejected";
        app.rejectedAt = new Date();
      }
    });

    gig.selectedFreelancer = freelancerId;
    gig.finalBudget = finalAgreedPrice;
    gig.freelancerReceivableAmount = finalAgreedPrice;

    await gig.save();

    // Create payment record
    const acceptancePayment = new Payment({
      payer: company._id,
      payee: company._id,
      gig: gig._id,
      amount: totalPaid,
      type: "gig_escrow",
      status: "completed",
      description: `Negotiated acceptance payment for gig: ${gig.title}`,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
      metadata: {
        originalBudget: gig.budget,
        finalAgreedBudget: finalAgreedPrice,
        platformCommission: 0, // No platform fee
        freelancerId,
        applicationId: application._id,
        wasNegotiated: finalAgreedPrice !== gig.budget,
      },
    });

    await acceptancePayment.save();

    // AUTO-NOTIFY ABOUT PAYMENT AND APPLICATION STATUS UPDATE
    await autoNotifyApplicationStatusUpdate(application, gig, "accepted");
    await autoNotifyPayment(acceptancePayment, company);

    // Find or create conversation
    let conversation = await Conversation.findOne({
      gigId: gig._id,
      participants: { $all: [company._id, freelancerId] },
    });

    if (conversation) {
      conversation.status = "active";
      conversation.metadata.paymentCompleted = true;
      conversation.metadata.finalAgreedPrice = finalAgreedPrice;
      if (conversation.metadata.currentNegotiation) {
        conversation.metadata.currentNegotiation.status = "accepted";
        conversation.metadata.currentNegotiation.completedAt = new Date();
      }
      await conversation.save();
    }

    // Create notification
    try {
      await Notification.create({
        user: freelancerId,
        type: "gig_accepted",
        title: "Payment Received - Project Started!",
        message: `Payment has been received for "${gig.title}". The project has officially started! Check your messages for details.`,
        relatedId: conversation._id,
        actionUrl: `/dashboard/messages`,
        metadata: {
          gigId: gig._id,
          conversationId: conversation._id,
          finalAgreedPrice: finalAgreedPrice,
          platformFee: 0, // No platform fee
          clientName: company.name,
        },
        priority: "high",
      });
    } catch (notificationError) {
      console.error(
        "Failed to create payment success notification:",
        notificationError
      );
    }

    const responseData = {
      success: true,
      conversationId: conversation._id,
      message: "Payment verified and project started successfully!",
      finalPrice: finalAgreedPrice,
      paymentCompleted: true,
    };

    return res
      .status(200)
      .json(
        new apiResponse(200, responseData, "Payment verified successfully")
      );
  }

  // Create negotiation payment order
  if (action === "create_negotiation_payment") {
    await isPaymentAvailable(); // Check if payment service is available

    if (!finalAgreedPrice || finalAgreedPrice <= 0) {
      throw new apiError("Final agreed price is required", 400);
    }

    const razorpayInstance = await getRazorpayInstance();
    const totalPayableByCompany = finalAgreedPrice; // No platform fee

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: totalPayableByCompany * 100,
      currency: "INR",
      receipt: `negotiate_${gig._id.toString().slice(-8)}_${freelancerId.slice(
        -4
      )}`,
      notes: {
        gigId: gig._id.toString(),
        companyId: company._id.toString(),
        freelancerId,
        applicationId: application._id.toString(),
        originalBudget: gig.budget,
        agreedBudget: finalAgreedPrice,
        platformFee: 0, // No platform fee
        totalPayable: totalPayableByCompany,
        type: "negotiated_gig_payment",
      },
    });

    const responseData = {
      success: true,
      requiresPayment: true,
      orderId: razorpayOrder.id,
      amount: totalPayableByCompany,
      agreedPrice: finalAgreedPrice,
      platformFee: 0, // No platform fee
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      gigDetails: {
        title: gig.title,
        timeline: gig.timeline,
        bannerImage: gig.bannerImage,
      },
      freelancerDetails: {
        name: freelancerUser.name,
        image: freelancerUser.image,
        username: freelancerUser.username,
      },
      message: "Please complete payment for the negotiated amount",
    };

    return res
      .status(200)
      .json(new apiResponse(200, responseData, "Payment order created"));
  }

  // Default flow - Start negotiation
  if (
    application.status === "accepted" ||
    application.applicationStatus === "accepted"
  ) {
    throw new apiError("Application already accepted", 400);
  }

  if (
    application.status === "negotiating" ||
    application.applicationStatus === "negotiating"
  ) {
    throw new apiError("Application is already in negotiation phase", 400);
  }

  // Update application status to negotiating
  application.status = "negotiating";
  application.applicationStatus = "negotiating";
  application.negotiationStartedAt = new Date();

  // AUTO-NOTIFY ABOUT STATUS UPDATE TO NEGOTIATING
  await autoNotifyApplicationStatusUpdate(application, gig, "negotiating");

  // Reject other applications
  const rejectedApplications = [];
  gig.applications.forEach((app) => {
    const appUserId = app.user ? app.user.toString() : null;
    const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
    const appCurrentStatus = app.status || app.applicationStatus;

    if (
      appUserId !== freelancerId &&
      appFreelancerId !== freelancerId &&
      appCurrentStatus === "pending"
    ) {
      app.status = "rejected";
      app.applicationStatus = "rejected";
      app.rejectedAt = new Date();
      rejectedApplications.push(app);
    }
  });

  await gig.save();

  // AUTO-NOTIFY REJECTED APPLICANTS
  for (const rejectedApp of rejectedApplications) {
    await autoNotifyApplicationStatusUpdate(rejectedApp, gig, "rejected");
  }

  // Create or find conversation
  let conversation = await Conversation.findOne({
    gigId: gig._id,
    participants: { $all: [company._id, freelancerId] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [company._id, freelancerId],
      gigId: gig._id,
      applicationId: application._id,
      status: "negotiating",
      settings: {
        allowNegotiation: true,
        allowFileSharing: true,
        allowProjectSubmission: true,
      },
      metadata: {
        projectTitle: gig.title,
        contractValue: gig.budget,
        deadline: gig.EndDate,
        negotiationEnabled: true,
        negotiationPhase: "initial",
        originalBudget: gig.budget,
      },
    });
  } else {
    conversation.status = "negotiating";
    if (!conversation.settings) conversation.settings = {};
    conversation.settings.allowNegotiation = true;
    if (!conversation.metadata) conversation.metadata = {};
    conversation.metadata.negotiationEnabled = true;
    conversation.metadata.negotiationPhase = "initial";
    conversation.metadata.originalBudget = gig.budget;
    await conversation.save();
  }

  let notificationResults = {
    acceptanceNotificationSent: false,
    rejectionNotificationsSent: 0,
  };

  // Create notification for freelancer
  try {
    await Notification.create({
      user: freelancerId,
      type: "gig_accepted",
      title: "Application Selected for Negotiation!",
      message: `Your application for "${gig.title}" has been selected! The client wants to negotiate the project details. Please check your messages to start the negotiation.`,
      relatedId: conversation._id,
      actionUrl: `/dashboard/messages`,
      metadata: {
        gigId: gig._id,
        conversationId: conversation._id,
        originalBudget: gig.budget,
        clientName: company.name,
        negotiationPhase: "initial",
      },
      priority: "high",
    });
    notificationResults.acceptanceNotificationSent = true;
  } catch (notificationError) {
    console.error(
      "Failed to create negotiation notification:",
      notificationError
    );
  }

  // Notify rejected freelancers
  try {
    for (const rejectedApp of rejectedApplications) {
      if (rejectedApp.user || rejectedApp.freelancer) {
        const rejectedUserId = (
          rejectedApp.user || rejectedApp.freelancer
        ).toString();

        try {
          await Notification.create({
            user: rejectedUserId,
            type: "gig_rejected",
            title: "Application Update",
            message: `Thank you for your interest in "${gig.title}". Another candidate was selected for this project.`,
            relatedId: gig._id,
            relatedModel: "Gig",
            actionUrl: `/dashboard/applications`,
            metadata: {
              gigId: gig._id,
              gigTitle: gig.title,
              rejectionReason: "Another candidate was selected for negotiation",
            },
            priority: "medium",
          });
          notificationResults.rejectionNotificationsSent++;
        } catch (rejNotError) {
          console.error(
            `Failed to create rejection notification for ${rejectedUserId}:`,
            rejNotError
          );
        }
      }
    }
  } catch (rejectionNotificationError) {
    console.error(
      "Failed to create rejection notifications:",
      rejectionNotificationError
    );
  }

  const responseData = {
    success: true,
    conversationId: conversation._id,
    message:
      "Application selected for negotiation! Please negotiate the project details in the conversation.",
    status: "negotiating",
    originalBudget: gig.budget,
    notifications: notificationResults,
  };

  res
    .status(200)
    .json(
      new apiResponse(200, responseData, "Application accepted for negotiation")
    );
});

// @desc    Reject application - UPDATED WITH NOTIFICATIONS
// @route   POST /api/applications/:gigId/reject
// @access  Private (Hiring users only)
export const rejectApplication = asyncHandler(async (req, res, next) => {
  const company = req.user;

  if (!company || company.role !== "hiring") {
    throw new apiError("Only hiring users can reject applications", 403);
  }

  const { gigId } = req.params;
  let { freelancerId, reason } = req.body;

  // Handle case where freelancerId might be an object with _id property
  if (typeof freelancerId === "object" && freelancerId._id) {
    freelancerId = freelancerId._id.toString();
  } else if (freelancerId) {
    freelancerId = freelancerId.toString();
  }

  if (!freelancerId) {
    throw new apiError("Freelancer ID is required", 400);
  }

  const gig = await Gig.findById(gigId);
  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  if (gig.company.toString() !== company._id.toString()) {
    throw new apiError(
      "Unauthorized - You can only reject applications for your own gigs",
      403
    );
  }

  // Find the application
  const application = gig.applications.find(
    (app) => app.freelancer.toString() === freelancerId
  );

  if (!application) {
    throw new apiError("Application not found", 404);
  }

  if (application.applicationStatus === "rejected") {
    throw new apiError("Application already rejected", 400);
  }

  if (application.applicationStatus === "accepted") {
    throw new apiError("Cannot reject an accepted application", 400);
  }

  // Update application status
  application.applicationStatus = "rejected";
  application.rejectedAt = new Date();

  if (reason && reason.trim()) {
    application.rejectionReason = reason.trim();
  }

  await gig.save();

  // AUTO-NOTIFY FREELANCER ABOUT REJECTION
  await autoNotifyApplicationStatusUpdate(application, gig, "rejected");

  // Create notification for freelancer
  try {
    const notificationMessage = reason
      ? `Your application for "${gig.title}" has been rejected. Reason: ${reason}`
      : `Your application for "${gig.title}" has been rejected`;

    await Notification.create({
      user: freelancerId,
      type: "gig_rejected",
      title: "Application Rejected",
      message: notificationMessage,
      relatedId: gig._id,
      actionUrl: `/freelancer/applications`,
    });
  } catch (notificationError) {
    console.error("Notification creation failed:", notificationError);
  }

  const responseData = {
    success: true,
    message: "Application rejected successfully!",
    data: {
      gigTitle: gig.title,
      freelancerName: application.name,
      rejectionReason: reason || null,
    },
  };

  res
    .status(200)
    .json(
      new apiResponse(200, responseData, "Application rejected successfully")
    );
});

// @desc    Direct accept application - UPDATED WITH NOTIFICATIONS
// @route   POST /api/applications/:gigId/direct-accept
// @access  Private (Hiring users only)
export const directAcceptApplication = asyncHandler(async (req, res, next) => {
  const company = req.user;
  const { gigId } = req.params;
  const {
    freelancerId,
    userId,
    action,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  // Handle payment verification
  if (action === "verify_payment") {
    try {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        throw new apiError("Invalid payment signature", 400);
      }

      // Payment verified, complete the acceptance
      const gig = await Gig.findById(gigId).populate([
        {
          path: "applications.user",
          select: "name email image username",
        },
        {
          path: "applications.freelancer",
          select: "name email image username",
        },
      ]);

      if (!gig) {
        throw new apiError("Gig not found", 404);
      }

      const targetUserId = freelancerId || userId;
      const application = gig.applications.find((app) => {
        const appUserId = app.user ? app.user.toString() : null;
        const appFreelancerId = app.freelancer
          ? app.freelancer.toString()
          : null;
        return appUserId === targetUserId || appFreelancerId === targetUserId;
      });

      if (!application) {
        throw new apiError("Application not found", 404);
      }

      // Update application status
      application.status = "accepted";
      application.applicationStatus = "accepted";
      application.acceptedAt = new Date();
      application.paymentDetails = {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
        amountPaid: gig.budget,
        agreedPrice: gig.budget,
        platformFee: 0,
      };

      // Reject other applications
      gig.applications.forEach((app) => {
        const appUserId = app.user ? app.user.toString() : null;
        const appFreelancerId = app.freelancer
          ? app.freelancer.toString()
          : null;

        if (
          appUserId !== targetUserId &&
          appFreelancerId !== targetUserId &&
          (app.status === "pending" || app.applicationStatus === "pending")
        ) {
          app.status = "rejected";
          app.applicationStatus = "rejected";
          app.rejectedAt = new Date();
        }
      });

      gig.selectedFreelancer = targetUserId;
      gig.finalBudget = gig.budget;
      gig.freelancerReceivableAmount = gig.budget;

      await gig.save();

      // Create payment record
      const directPayment = new Payment({
        payer: company._id,
        payee: company._id,
        gig: gig._id,
        amount: gig.budget,
        type: "gig_escrow",
        status: "completed",
        description: `Direct acceptance payment for gig: ${gig.title}`,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
        metadata: {
          originalBudget: gig.budget,
          finalAgreedBudget: gig.budget,
          platformCommission: 0,
          freelancerId: targetUserId,
          applicationId: application._id,
          wasDirectAccept: true,
        },
      });

      await directPayment.save();

      // AUTO-NOTIFY ABOUT PAYMENT AND APPLICATION ACCEPTANCE
      await autoNotifyApplicationStatusUpdate(application, gig, "accepted");
      await autoNotifyPayment(directPayment, company);

      // Find or create conversation
      let conversation = await Conversation.findOne({
        gigId: gig._id,
        participants: { $all: [company._id, targetUserId] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [company._id, targetUserId],
          gigId: gig._id,
          applicationId: application._id,
          status: "active",
          settings: {
            allowNegotiation: false,
            allowFileSharing: true,
            allowProjectSubmission: true,
          },
          metadata: {
            projectTitle: gig.title,
            contractValue: gig.budget,
            deadline: gig.EndDate,
            paymentCompleted: true,
            finalAgreedPrice: gig.budget,
          },
        });
      } else {
        conversation.status = "active";
        conversation.metadata.paymentCompleted = true;
        conversation.metadata.finalAgreedPrice = gig.budget;
        await conversation.save();
      }

      // Create notification
      try {
        await Notification.create({
          user: targetUserId,
          type: "gig_accepted",
          title: "Payment Received - Project Started!",
          message: `Payment has been received for "${gig.title}". The project has officially started! Check your messages for details.`,
          relatedId: conversation._id,
          actionUrl: `/dashboard/messages`,
          metadata: {
            gigId: gig._id,
            conversationId: conversation._id,
            finalAgreedPrice: gig.budget,
            platformFee: 0,
            clientName: company.name,
          },
          priority: "high",
        });
      } catch (notificationError) {
        console.error(
          "Failed to create payment success notification:",
          notificationError
        );
      }

      const responseData = {
        success: true,
        conversationId: conversation._id,
        message: "Payment verified and project started successfully!",
        finalPrice: gig.budget,
        paymentCompleted: true,
      };

      return res
        .status(200)
        .json(
          new apiResponse(200, responseData, "Payment verified successfully")
        );
    } catch (error) {
      console.error("Payment verification error:", error);
      throw new apiError("Payment verification failed", 400);
    }
  }

  // Create payment order for direct acceptance
  if (company.role !== "hiring") {
    throw new apiError("Only hiring users can accept applications", 403);
  }

  await isPaymentAvailable(); // Check if payment service is available

  const targetUserId = freelancerId || userId;
  if (!targetUserId) {
    throw new apiError("User ID is required (freelancerId or userId)", 400);
  }

  const gig = await Gig.findById(gigId);
  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  if (gig.company.toString() !== company._id.toString()) {
    throw new apiError(
      "Unauthorized - You can only accept applications for your own gigs",
      403
    );
  }

  const application = gig.applications.find((app) => {
    const appUserId = app.user ? app.user.toString() : null;
    const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
    return appUserId === targetUserId || appFreelancerId === targetUserId;
  });

  if (!application) {
    throw new apiError("Application not found", 404);
  }

  if (
    application.status === "accepted" ||
    application.applicationStatus === "accepted"
  ) {
    throw new apiError("Application already accepted", 400);
  }

  const freelancerUser = await User.findById(targetUserId);
  if (!freelancerUser) {
    throw new apiError("Freelancer not found", 404);
  }

  const razorpayInstance = await getRazorpayInstance();
  const totalPayableByCompany = gig.budget; // No platform fee

  try {
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: totalPayableByCompany * 100,
      currency: "INR",
      receipt: `direct_${gig._id.toString().slice(-8)}_${targetUserId.slice(
        -4
      )}`,
      notes: {
        gigId: gig._id.toString(),
        companyId: company._id.toString(),
        freelancerId: targetUserId,
        applicationId: application._id.toString(),
        budget: gig.budget,
        platformFee: 0,
        totalPayable: totalPayableByCompany,
        type: "direct_gig_payment",
      },
    });

    const responseData = {
      success: true,
      requiresPayment: true,
      orderId: razorpayOrder.id,
      amount: totalPayableByCompany,
      agreedPrice: gig.budget,
      platformFee: 0,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      gigDetails: {
        title: gig.title,
        timeline: gig.timeline,
        bannerImage: gig.bannerImage,
      },
      freelancerDetails: {
        name: freelancerUser.name,
        image: freelancerUser.image,
        username: freelancerUser.username,
      },
      message: "Please complete payment to accept this application",
    };

    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          responseData,
          "Payment order created for direct acceptance"
        )
      );
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    throw new apiError("Failed to create payment order", 500);
  }
});

// All remaining functions stay the same but let me continue with the rest...

// @desc    Get applications for a gig
// @route   GET /api/applications/:gigId
// @access  Private (Hiring users only)
export const getApplicationsForGig = asyncHandler(async (req, res, next) => {
  const company = req.user;

  if (!company || company.role !== "hiring") {
    throw new apiError("Only hiring users can view applications", 403);
  }

  const { gigId } = req.params;
  const { page = 1, limit = 10, status, sortBy = "appliedAt" } = req.query;

  const gig = await Gig.findById(gigId).populate([
    {
      path: "applications.user",
      select: "name email image username profile",
    },
    {
      path: "applications.freelancer",
      select: "name email image username profile",
    },
  ]);

  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  if (gig.company.toString() !== company._id.toString()) {
    throw new apiError(
      "Unauthorized - You can only view applications for your own gigs",
      403
    );
  }

  let applications = gig.applications || [];

  // Filter by status if provided
  if (status) {
    applications = applications.filter(
      (app) => app.status === status || app.applicationStatus === status
    );
  }

  // Sort applications
  applications.sort((a, b) => {
    if (sortBy === "appliedAt") {
      return new Date(b.appliedAt) - new Date(a.appliedAt);
    }
    return 0;
  });

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedApplications = applications.slice(startIndex, endIndex);

  const responseData = {
    applications: paginatedApplications.map((app) => ({
      id: app._id,
      freelancer: app.user || app.freelancer,
      name: app.name,
      email: app.email,
      image: app.image,
      location: app.location,
      skills: app.skills,
      hourlyRate: app.hourlyRate,
      portfolio: app.portfolio,
      proposedBudget: app.proposedBudget,
      timeline: app.timeline,
      totalIterations: app.totalIterations,
      remainingIterations: app.remainingIterations,
      usedIterations: app.usedIterations,
      coverLetter: app.coverLetter,
      appliedAt: app.appliedAt,
      status: app.status || app.applicationStatus,
      applicationStatus: app.applicationStatus,
      isPriorityApplication: app.isPriorityApplication,
      hasVerifiedSkills: app.hasVerifiedSkills,
      hasPremiumBadge: app.hasPremiumBadge,
      isLegacyUser: app.isLegacyUser,
      acceptedAt: app.acceptedAt,
      rejectedAt: app.rejectedAt,
      rejectionReason: app.rejectionReason,
      negotiationStartedAt: app.negotiationStartedAt,
      finalAgreedBudget: app.finalAgreedBudget,
      paymentDetails: app.paymentDetails,
      projectSubmissions: app.projectSubmissions,
      currentProjectId: app.currentProjectId,
      projectStatus: app.projectStatus,
    })),
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(applications.length / limit),
      totalApplications: applications.length,
      hasNext: endIndex < applications.length,
      hasPrev: startIndex > 0,
    },
    gigInfo: {
      title: gig.title,
      budget: gig.budget,
      status: gig.status,
      applicationsCount: applications.length,
    },
  };

  res
    .status(200)
    .json(
      new apiResponse(200, responseData, "Applications retrieved successfully")
    );
});

// @desc    Get freelancer's applications
// @route   GET /api/applications/my-applications
// @access  Private (Freelancers only)
export const getMyApplications = asyncHandler(async (req, res, next) => {
  const freelancer = req.user;

  if (!freelancer || freelancer.role !== "freelancer") {
    throw new apiError("Only freelancers can view their applications", 403);
  }

  const { page = 1, limit = 10, status, sortBy = "appliedAt" } = req.query;

  // Find all gigs where the user has applied
  const gigs = await Gig.find({
    "applications.freelancer": freelancer._id,
  })
    .populate("company", "name email image")
    .sort({ createdAt: -1 });

  let applications = [];

  gigs.forEach((gig) => {
    const userApplications = gig.applications.filter((app) => {
      const appUserId = app.user ? app.user.toString() : null;
      const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
      const currentUserId = freelancer._id.toString();
      return appUserId === currentUserId || appFreelancerId === currentUserId;
    });

    userApplications.forEach((app) => {
      applications.push({
        ...app.toObject(),
        gig: {
          _id: gig._id,
          title: gig.title,
          description: gig.description,
          budget: gig.budget,
          timeline: gig.timeline,
          status: gig.status,
          company: gig.company,
          bannerImage: gig.bannerImage,
          createdAt: gig.createdAt,
        },
      });
    });
  });

  // Filter by status if provided
  if (status) {
    applications = applications.filter(
      (app) => app.status === status || app.applicationStatus === status
    );
  }

  // Sort applications
  applications.sort((a, b) => {
    if (sortBy === "appliedAt") {
      return new Date(b.appliedAt) - new Date(a.appliedAt);
    }
    return 0;
  });

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedApplications = applications.slice(startIndex, endIndex);

  const responseData = {
    applications: paginatedApplications.map((app) => ({
      id: app._id,
      gig: app.gig,
      totalIterations: app.totalIterations,
      remainingIterations: app.remainingIterations,
      usedIterations: app.usedIterations,
      coverLetter: app.coverLetter,
      appliedAt: app.appliedAt,
      status: app.status || app.applicationStatus,
      applicationStatus: app.applicationStatus,
      isPriorityApplication: app.isPriorityApplication,
      hasVerifiedSkills: app.hasVerifiedSkills,
      hasPremiumBadge: app.hasPremiumBadge,
      isLegacyUser: app.isLegacyUser,
      acceptedAt: app.acceptedAt,
      rejectedAt: app.rejectedAt,
      rejectionReason: app.rejectionReason,
      negotiationStartedAt: app.negotiationStartedAt,
      finalAgreedBudget: app.finalAgreedBudget,
      paymentDetails: app.paymentDetails,
      projectSubmissions: app.projectSubmissions,
      currentProjectId: app.currentProjectId,
      projectStatus: app.projectStatus,
    })),
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(applications.length / limit),
      totalApplications: applications.length,
      hasNext: endIndex < applications.length,
      hasPrev: startIndex > 0,
    },
    stats: {
      total: applications.length,
      pending: applications.filter(
        (app) => (app.status || app.applicationStatus) === "pending"
      ).length,
      accepted: applications.filter(
        (app) => (app.status || app.applicationStatus) === "accepted"
      ).length,
      rejected: applications.filter(
        (app) => (app.status || app.applicationStatus) === "rejected"
      ).length,
      negotiating: applications.filter(
        (app) => (app.status || app.applicationStatus) === "negotiating"
      ).length,
    },
  };

  res
    .status(200)
    .json(
      new apiResponse(200, responseData, "Applications retrieved successfully")
    );
});

// @desc    Get single application details
// @route   GET /api/applications/:gigId/:applicationId
// @access  Private
export const getApplicationDetails = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const { gigId, applicationId } = req.params;

  const gig = await Gig.findById(gigId).populate([
    {
      path: "applications.user",
      select: "name email image username profile",
    },
    {
      path: "applications.freelancer",
      select: "name email image username profile",
    },
    {
      path: "company",
      select: "name email image",
    },
  ]);

  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  const application = gig.applications.find(
    (app) => app._id.toString() === applicationId
  );

  if (!application) {
    throw new apiError("Application not found", 404);
  }

  // Authorization check
  const isCompany =
    user.role === "hiring" &&
    gig.company._id.toString() === user._id.toString();

  const isFreelancer =
    user.role === "freelancer" &&
    (application.user?._id.toString() === user._id.toString() ||
      application.freelancer?._id.toString() === user._id.toString());

  if (!isCompany && !isFreelancer) {
    throw new apiError("Unauthorized to view this application", 403);
  }

  const responseData = {
    application: {
      id: application._id,
      gig: {
        _id: gig._id,
        title: gig.title,
        description: gig.description,
        budget: gig.budget,
        timeline: gig.timeline,
        status: gig.status,
        company: gig.company,
        bannerImage: gig.bannerImage,
      },
      freelancer: application.user || application.freelancer,
      name: application.name,
      email: application.email,
      image: application.image,
      location: application.location,
      skills: application.skills,
      hourlyRate: application.hourlyRate,
      portfolio: application.portfolio,
      proposedBudget: application.proposedBudget,
      timeline: application.timeline,
      totalIterations: application.totalIterations,
      remainingIterations: application.remainingIterations,
      usedIterations: application.usedIterations,
      coverLetter: application.coverLetter,
      appliedAt: application.appliedAt,
      status: application.status || application.applicationStatus,
      applicationStatus: application.applicationStatus,
      isPriorityApplication: application.isPriorityApplication,
      hasVerifiedSkills: application.hasVerifiedSkills,
      hasPremiumBadge: application.hasPremiumBadge,
      isLegacyUser: application.isLegacyUser,
      acceptedAt: application.acceptedAt,
      rejectedAt: application.rejectedAt,
      rejectionReason: application.rejectionReason,
      negotiationStartedAt: application.negotiationStartedAt,
      finalAgreedBudget: application.finalAgreedBudget,
      paymentDetails: application.paymentDetails,
      projectSubmissions: application.projectSubmissions,
      currentProjectId: application.currentProjectId,
      projectStatus: application.projectStatus,
    },
  };

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        responseData,
        "Application details retrieved successfully"
      )
    );
});

// @desc    Delete/Withdraw application
// @route   DELETE /api/applications/:gigId/withdraw
// @access  Private (Freelancers only)
export const withdrawApplication = asyncHandler(async (req, res, next) => {
  const freelancer = req.user;

  if (!freelancer || freelancer.role !== "freelancer") {
    throw new apiError("Only freelancers can withdraw applications", 403);
  }

  const { gigId } = req.params;

  const gig = await Gig.findById(gigId);
  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  const applicationIndex = gig.applications.findIndex((app) => {
    const appUserId = app.user ? app.user.toString() : null;
    const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
    const currentUserId = freelancer._id.toString();
    return appUserId === currentUserId || appFreelancerId === currentUserId;
  });

  if (applicationIndex === -1) {
    throw new apiError("Application not found", 404);
  }

  const application = gig.applications[applicationIndex];

  // Check if application can be withdrawn
  if (
    application.status === "accepted" ||
    application.applicationStatus === "accepted"
  ) {
    throw new apiError("Cannot withdraw an accepted application", 400);
  }

  if (
    application.status === "negotiating" ||
    application.applicationStatus === "negotiating"
  ) {
    throw new apiError("Cannot withdraw an application in negotiation", 400);
  }

  // Remove the application
  gig.applications.splice(applicationIndex, 1);
  gig.applicationsCount = gig.applications.length;
  await gig.save();

  // Update subscription (return the application count)
  try {
    const subscription = await Subscription.findOne({
      user: freelancer._id,
      userRole: "freelancer",
      status: "active",
    });

    if (subscription && subscription.applicationsSubmitted > 0) {
      await Subscription.findByIdAndUpdate(subscription._id, {
        $inc: { applicationsSubmitted: -1 },
      });
    }
  } catch (subscriptionError) {
    console.error("Failed to update subscription usage:", subscriptionError);
  }

  const responseData = {
    success: true,
    message: "Application withdrawn successfully",
    gigTitle: gig.title,
  };

  res
    .status(200)
    .json(
      new apiResponse(200, responseData, "Application withdrawn successfully")
    );
});

// @desc    Check subscription status
// @route   GET /api/subscriptions/status
// @access  Private
export const checkSubscriptionStatus = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    throw new apiError("User not authenticated", 401);
  }

  try {
    // Find active subscription for the user
    const subscription = await Subscription.findOne({
      user: user._id,
      userRole: user.role,
      status: "active",
    }).exec();

    if (!subscription) {
      return res.status(200).json(
        new apiResponse(
          200,
          {
            hasActiveSubscription: false,
            subscription: null,
            message: "No active subscription found",
          },
          "Subscription status checked"
        )
      );
    }

    // Check if subscription is expired
    const now = new Date();
    const isExpired = subscription.endDate && subscription.endDate < now;
    const isLifetime = subscription.duration === "lifetime";

    // Grace period check (7 days)
    const isWithinGracePeriod =
      subscription.endDate &&
      now - subscription.endDate < 7 * 24 * 60 * 60 * 1000;

    const isValid =
      subscription.status === "active" &&
      (isLifetime || !isExpired || isWithinGracePeriod);

    // Auto-fix missing fields for legacy subscriptions
    if (!subscription.maxApplications) {
      let maxApplications, givenIterations;

      if (subscription.planType === "free") {
        maxApplications = 20;
        givenIterations = 20;
      } else if (subscription.planType === "basic") {
        if (subscription.duration === "lifetime") {
          maxApplications = -1;
          givenIterations = -1;
        } else if (subscription.duration === "yearly") {
          maxApplications = 2400;
          givenIterations = 2400;
        } else {
          maxApplications = 200;
          givenIterations = 200;
        }
      } else if (subscription.planType === "pro") {
        maxApplications = -1;
        givenIterations = -1;
      }

      // Update the subscription with missing fields
      await Subscription.findByIdAndUpdate(subscription._id, {
        maxApplications,
        givenIterations,
        applicationsSubmitted: subscription.applicationsSubmitted || 0,
      });

      subscription.maxApplications = maxApplications;
      subscription.givenIterations = givenIterations;
    }

    const responseData = {
      hasActiveSubscription: isValid,
      subscription: {
        id: subscription._id,
        planType: subscription.planType,
        duration: subscription.duration,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isLifetime: isLifetime,
        isExpired: isExpired,
        isWithinGracePeriod: isWithinGracePeriod,
        maxApplications: subscription.maxApplications,
        applicationsSubmitted: subscription.applicationsSubmitted || 0,
        remainingApplications:
          subscription.maxApplications === -1
            ? "unlimited"
            : Math.max(
                0,
                subscription.maxApplications -
                  (subscription.applicationsSubmitted || 0)
              ),
        features: {
          profileBoost: subscription.planType !== "free",
          skillVerification: subscription.planType !== "free",
          premiumBadge: subscription.planType !== "free",
          prioritySupport: subscription.planType === "pro",
          unlimitedApplications: subscription.maxApplications === -1,
        },
      },
      message: isValid
        ? "Active subscription found"
        : "Subscription expired or inactive",
    };

    res
      .status(200)
      .json(new apiResponse(200, responseData, "Subscription status checked"));
  } catch (error) {
    console.error("Check subscription status error:", error);
    throw new apiError("Failed to check subscription status", 500);
  }
});

// Export all functions
export default {
  createApplication,
  acceptApplication,
  rejectApplication,
  directAcceptApplication,
  getApplicationsForGig,
  getMyApplications,
  getApplicationDetails,
  withdrawApplication,
  checkSubscriptionStatus,
};

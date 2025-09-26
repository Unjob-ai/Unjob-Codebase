// controllers/conversationController.js
import { Conversation } from "../models/ConversationModel.js";
import { Message } from "../models/MessageModel.js";
import { User } from "../models/UserModel.js";
import { Gig } from "../models/GigModel.js";
import { Project } from "../models/ProjectModel.js";
import { Payment } from "../models/PaymentModel.js";
import { Notification } from "../models/NotificationModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import crypto from "crypto";
import Razorpay from "razorpay";
import { onlineUsers, userSockets } from "../Sockets/index.js";
import mongoose from "mongoose";

// Initialize Razorpay
let razorpay = null;
const initializeRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret) {
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpay;
};

// Helper function to emit socket events
const emitConversationEvent = (
  eventName,
  data,
  participants,
  excludeUserId = null
) => {
  try {
    participants.forEach((participantId) => {
      const participantIdStr = participantId.toString();
      if (excludeUserId && participantIdStr === excludeUserId.toString()) {
        return;
      }

      const userOnlineData = onlineUsers.get(participantIdStr);
      if (userOnlineData) {
        global.io.to(userOnlineData.socketId).emit(eventName, data);
      }
    });
  } catch (error) {
    console.error("Socket event error:", error);
  }
};

// Helper function to get conversation display status
const getConversationDisplayStatus = (
  conversation,
  projectStatus,
  userRole
) => {
  // If there's a project status, prioritize that
  if (projectStatus) {
    switch (projectStatus) {
      case "submitted":
        return userRole === "hiring" ? "pending_review" : "under_review";
      case "approved":
        return "project_completed";
      case "rejected":
        return "needs_revision";
      case "revision_requested":
        return "needs_revision";
      default:
        return projectStatus;
    }
  }

  // Fall back to conversation status
  switch (conversation.status) {
    case "active":
      return "active";
    case "negotiating":
      return "negotiating";
    case "payment_pending":
      return "payment_pending";
    case "completed":
      return "completed";
    case "archived":
      return "archived";
    default:
      return conversation.status;
  }
};

// @desc    Get user conversations
// @route   GET /api/conversations
// @access  Private
export const getConversations = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, status, includeArchived = false } = req.query;

  const conversations = await Conversation.getUserConversations(req.user._id, {
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    includeArchived: includeArchived === "true",
  });

  // Add unread count and project status for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      try {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: req.user._id },
          "readBy.user": { $ne: req.user._id },
          isDeleted: false,
        });

        // Check for pending project reviews
        let hasProjectSubmission = false;
        let projectStatus = null;
        let requiresReview = false;

        if (conv.gigId) {
          const latestProject = await Project.findOne({
            conversation: conv._id,
            isLatestVersion: true,
          }).select("status submittedAt");

          if (latestProject) {
            hasProjectSubmission = true;
            projectStatus = latestProject.status;

            // Check if project needs review (from client perspective)
            if (
              req.user.role === "hiring" &&
              latestProject.status === "submitted"
            ) {
              requiresReview = true;
            }
          }
        }

        return {
          ...conv.toObject(),
          unreadCount,
          hasProjectSubmission,
          projectStatus,
          requiresReview,
          displayStatus: getConversationDisplayStatus(
            conv,
            projectStatus,
            req.user.role
          ),
          isArchivedForUser: conv.isArchivedForUser(req.user._id),
        };
      } catch (error) {
        console.error("Error processing conversation:", conv._id, error);
        return {
          ...conv.toObject(),
          unreadCount: 0,
          hasProjectSubmission: false,
          projectStatus: null,
          requiresReview: false,
          displayStatus: conv.status,
          isArchivedForUser: false,
        };
      }
    })
  );

  const totalConversations = await Conversation.countDocuments({
    participants: req.user._id,
    isDeleted: false,
    status:
      status && status !== "all"
        ? status
        : { $nin: ["deleted", "permanently_deleted"] },
  });

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        conversations: conversationsWithUnread,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalConversations / limit),
          totalConversations,
          hasNext: page < Math.ceil(totalConversations / limit),
          hasPrev: page > 1,
        },
        debug: {
          userId: req.user._id,
          userRole: req.user.role,
          timestamp: new Date().toISOString(),
        },
      },
      "Conversations fetched successfully"
    )
  );
});

// @desc    Create or get conversation
// @route   POST /api/conversations
// @access  Private
export const createConversation = asyncHandler(async (req, res, next) => {
  const { participantId, gigId, initialMessage, type = "direct" } = req.body;

  if (!participantId) {
    throw new apiError("Participant ID is required", 400);
  }

  if (participantId === req.user._id.toString()) {
    throw new apiError("Cannot create conversation with yourself", 400);
  }

  // Check if participant exists
  const participant = await User.findById(participantId);
  if (!participant) {
    throw new apiError("Participant not found", 404);
  }

  // Check if conversation already exists
  const existingConversation = await Conversation.findByParticipants(
    req.user._id,
    participantId,
    gigId
  );

  if (existingConversation) {
    await existingConversation.populate(
      "participants",
      "name image role profile.companyName"
    );
    if (gigId) {
      await existingConversation.populate("gigId", "title budget");
    }

    return res.status(200).json(
      new apiResponse(
        200,
        true,
        {
          conversation: existingConversation,
          isNew: false,
        },
        "Existing conversation found"
      )
    );
  }

  // Create new conversation
  const conversationData = {
    participants: [req.user._id, participantId],
    type,
    status: "active",
    lastActivity: new Date(),
    settings: {
      allowFileUploads: true,
      allowProjectSubmissions: true,
      allowNegotiation: true,
      notificationsEnabled: true,
    },
    metadata: {
      initiatedBy: req.user._id,
      negotiationEnabled: true,
    },
  };

  if (gigId) {
    const gig = await Gig.findById(gigId);
    if (gig) {
      conversationData.gigId = gigId;
      conversationData.title = `Gig: ${gig.title}`;
      conversationData.type = "gig_related";
      conversationData.metadata.projectTitle = gig.title;
      conversationData.metadata.contractValue = gig.budget;
      conversationData.metadata.relatedToGig = true;
      conversationData.metadata.originalBudget = gig.budget;
    }
  }

  const conversation = await Conversation.create(conversationData);

  // Send initial message if provided
  if (initialMessage && initialMessage.trim()) {
    const message = await Message.create({
      conversationId: conversation._id,
      sender: req.user._id,
      content: initialMessage.trim(),
      type: "text",
      readBy: [{ user: req.user._id, readAt: new Date() }],
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message._id,
      lastActivity: new Date(),
    });
  }

  // Populate conversation data
  await conversation.populate(
    "participants",
    "name image role profile.companyName"
  );
  if (gigId) {
    await conversation.populate("gigId", "title budget");
  }

  // Emit socket event to participants
  emitConversationEvent(
    "newConversation",
    {
      conversation: conversation.toObject(),
    },
    conversation.participants.map((p) => p._id)
  );

  // Create notification for the other participant
  try {
    await Notification.create({
      user: participantId,
      type: "message",
      title: `New conversation started`,
      message: `${req.user.name} started a new conversation with you.`,
      relatedId: conversation._id,
      actionUrl: `/dashboard/messages`,
      metadata: {
        conversationId: conversation._id,
        initiatorName: req.user.name,
      },
    });
  } catch (notificationError) {
    console.error(
      "Failed to create conversation notification:",
      notificationError
    );
  }

  res.status(201).json(
    new apiResponse(
      201,
      true,
      {
        conversation,
        isNew: true,
      },
      "Conversation created successfully"
    )
  );
});

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
export const getConversationById = asyncHandler(async (req, res, next) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user._id,
  })
    .populate("participants", "name image role profile.companyName profile.bio")
    .populate("gigId", "title budget category company status");

  if (!conversation) {
    throw new apiError("Conversation not found", 404);
  }

  const unreadCount = await Message.getUnreadCount(
    conversation._id,
    req.user._id
  );

  // Check for project status
  let projectStatus = null;
  let hasProjectSubmission = false;

  if (conversation.gigId) {
    const latestProject = await Project.findOne({
      conversation: conversation._id,
      isLatestVersion: true,
    }).select("status submittedAt");

    if (latestProject) {
      hasProjectSubmission = true;
      projectStatus = latestProject.status;
    }
  }

  const conversationData = {
    ...conversation.toObject(),
    unreadCount,
    hasProjectSubmission,
    projectStatus,
    displayStatus: getConversationDisplayStatus(
      conversation,
      projectStatus,
      req.user.role
    ),
    isArchivedForUser: conversation.isArchivedForUser(req.user._id),
  };

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        { conversation: conversationData },
        "Conversation fetched successfully"
      )
    );
});

// @desc    Update conversation settings/status
// @route   PATCH /api/conversations/:id
// @access  Private
export const updateConversation = asyncHandler(async (req, res, next) => {
  const { action, settings, status, negotiationState } = req.body;

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  let updateResult = {};

  switch (action) {
    case "archive":
      await conversation.archiveForUser(req.user._id);
      updateResult.message = "Conversation archived successfully";
      break;

    case "unarchive":
      await conversation.unarchiveForUser(req.user._id);
      updateResult.message = "Conversation unarchived successfully";
      break;

    case "close":
      conversation.status = "closed";
      conversation.settings.isReadOnly = true;
      conversation.settings.readOnlyReason = "manual";
      await conversation.save();
      updateResult.message = "Conversation closed successfully";
      break;

    case "reopen":
      conversation.status = "active";
      conversation.settings.isReadOnly = false;
      conversation.settings.readOnlyReason = null;
      await conversation.save();
      updateResult.message = "Conversation reopened successfully";
      break;

    case "update_settings":
      if (settings) {
        conversation.settings = { ...conversation.settings, ...settings };

        // Sync negotiation settings
        if (settings.allowNegotiation !== undefined) {
          conversation.metadata.negotiationEnabled = settings.allowNegotiation;
        }

        await conversation.save();
        updateResult.message = "Conversation settings updated successfully";
      }
      break;

    case "enable_auto_close":
      const { reason = "project_completed", delayHours = 24 } = req.body;
      await conversation.enableAutoClose(reason, delayHours);
      updateResult.message = "Auto-close enabled successfully";
      break;

    case "delay_auto_close":
      const { additionalHours = 7 } = req.body;
      await conversation.delayAutoClose(additionalHours, req.user._id);
      updateResult.message = "Auto-close delayed successfully";
      break;

    default:
      throw new apiError("Invalid action", 400);
  }

  // Emit socket event to participants
  emitConversationEvent(
    "conversationUpdated",
    {
      conversationId: conversation._id,
      action,
      updatedBy: req.user._id,
      ...updateResult,
    },
    conversation.participants
  );

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        conversation: {
          _id: conversation._id,
          status: conversation.status,
          settings: conversation.settings,
          metadata: conversation.metadata,
        },
        ...updateResult,
      },
      updateResult.message || "Conversation updated successfully"
    )
  );
});

// @desc    Delete conversation (soft delete)
// @route   DELETE /api/conversations/:id
// @access  Private
export const deleteConversation = asyncHandler(async (req, res, next) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  await conversation.softDelete(req.user._id);

  // Emit socket event
  emitConversationEvent(
    "conversationDeleted",
    {
      conversationId: conversation._id,
      deletedBy: req.user._id,
    },
    conversation.participants
  );

  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Conversation deleted successfully"));
});

// @desc    Start negotiation in conversation
// @route   POST /api/conversations/:id/negotiate
// @access  Private
export const startNegotiation = asyncHandler(async (req, res, next) => {
  const { proposedPrice, timeline, additionalTerms } = req.body;

  if (!proposedPrice || proposedPrice <= 0) {
    throw new apiError("Valid proposed price is required", 400);
  }

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user._id,
  }).populate("participants", "name email role");

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  if (!conversation.canNegotiate) {
    throw new apiError("Negotiation is not allowed for this conversation", 400);
  }

  // Determine proposer role
  const proposedBy = req.user.role === "freelancer" ? "freelancer" : "client";

  // Get previous price for comparison
  const previousPrice =
    conversation.metadata?.finalAgreedPrice ||
    conversation.metadata?.contractValue ||
    0;

  // Create negotiation data
  const negotiationData = {
    _id: new mongoose.Types.ObjectId(),
    proposedPrice: parseInt(proposedPrice),
    timeline: timeline || null,
    additionalTerms: additionalTerms || null,
    proposedBy,
    proposedAt: new Date(),
    status: "pending",
    previousPrice,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  };

  // Calculate price change
  if (previousPrice > 0) {
    const difference = negotiationData.proposedPrice - previousPrice;
    const percentage = ((Math.abs(difference) / previousPrice) * 100).toFixed(
      1
    );

    negotiationData.priceChange = {
      amount: Math.abs(difference),
      percentage: parseFloat(percentage),
      type: difference > 0 ? "increase" : difference < 0 ? "decrease" : "same",
    };
  }

  // Start negotiation
  await conversation.startNegotiation(negotiationData);

  // Create negotiation message
  const negotiationMessage = await Message.createNegotiationMessage(
    req.params.id,
    req.user._id,
    {
      ...negotiationData,
      round: (conversation.metadata?.totalNegotiations || 0) + 1,
    }
  );

  // Update conversation's last message
  conversation.lastMessage = negotiationMessage._id;
  conversation.lastActivity = new Date();
  await conversation.save();

  // Get the other participant for notifications
  const otherParticipant = conversation.participants.find(
    (p) => p._id.toString() !== req.user._id.toString()
  );

  // Create notification
  if (otherParticipant) {
    const priceChangeText = negotiationData.priceChange
      ? `${
          negotiationData.priceChange.type === "increase"
            ? "increased"
            : "decreased"
        } by ₹${negotiationData.priceChange.amount.toLocaleString()}`
      : `set to ₹${negotiationData.proposedPrice.toLocaleString()}`;

    await Notification.create({
      user: otherParticipant._id,
      type: "gig_accepted",
      title: "💰 New Price Proposal",
      message: `${req.user.name} has ${priceChangeText} for the project. The offer expires in 7 days.`,
      relatedId: req.params.id,
      actionUrl: `/dashboard/messages`,
      metadata: {
        negotiationId: negotiationData._id,
        proposedPrice: negotiationData.proposedPrice,
        proposedBy: proposedBy,
        conversationId: req.params.id,
        priceChange: negotiationData.priceChange,
      },
    });
  }

  // Emit socket event
  emitConversationEvent(
    "negotiationStarted",
    {
      conversationId: req.params.id,
      negotiation: negotiationData,
      message: negotiationMessage,
    },
    conversation.participants
  );

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        negotiation: negotiationData,
        message: negotiationMessage,
        conversation: {
          status: conversation.status,
          totalNegotiations: conversation.metadata?.totalNegotiations || 0,
        },
      },
      "Negotiation started successfully"
    )
  );
});

// @desc    Respond to negotiation (accept/reject/counter)
// @route   POST /api/conversations/:id/negotiate/actions
// @access  Private
export const respondToNegotiation = asyncHandler(async (req, res, next) => {
  const { action, counterOffer, rejectionReason } = req.body;
  const conversationId = req.params.id;

  const validActions = ["accept", "reject", "counter"];
  if (!validActions.includes(action)) {
    throw new apiError("Invalid action", 400);
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  }).populate("participants", "name email role image");

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  const currentNegotiation = conversation.metadata?.currentNegotiation;
  if (!currentNegotiation) {
    throw new apiError("No active negotiation found", 404);
  }

  const respondedBy = req.user.role === "freelancer" ? "freelancer" : "client";
  const otherParticipant = conversation.participants.find(
    (p) => p._id.toString() !== req.user._id.toString()
  );

  let responseMessage;
  let notificationTitle;
  let notificationMessage;

  switch (action) {
    case "accept":
      await conversation.acceptNegotiation(respondedBy);

      responseMessage = new Message({
        conversationId: conversationId,
        sender: req.user._id,
        content: `✅ **OFFER ACCEPTED**\n\n${
          req.user.name
        } accepted the price proposal of ₹${currentNegotiation.proposedPrice.toLocaleString()}.\n\nThe project will start once payment is completed.`,
        type: "negotiation",
        negotiationData: {
          ...currentNegotiation,
          status: "accepted",
          responseAction: "accept",
          respondedAt: new Date(),
          respondedBy: respondedBy,
        },
        priority: "urgent",
      });

      await responseMessage.save();

      notificationTitle = "✅ Offer Accepted";
      notificationMessage = `${
        req.user.name
      } accepted your price proposal of ₹${currentNegotiation.proposedPrice.toLocaleString()}.`;
      break;

    case "reject":
      await conversation.rejectNegotiation(respondedBy, rejectionReason);

      responseMessage = new Message({
        conversationId: conversationId,
        sender: req.user._id,
        content: `❌ **OFFER REJECTED**\n\n${
          req.user.name
        } rejected the price proposal of ₹${currentNegotiation.proposedPrice.toLocaleString()}.\n\n${
          rejectionReason ? `Reason: ${rejectionReason}` : "No reason provided."
        }`,
        type: "negotiation",
        negotiationData: {
          ...currentNegotiation,
          status: "rejected",
          responseAction: "reject",
          respondedAt: new Date(),
          respondedBy: respondedBy,
          rejectionReason: rejectionReason,
        },
        priority: "high",
      });

      await responseMessage.save();

      notificationTitle = "❌ Offer Rejected";
      notificationMessage = `${
        req.user.name
      } rejected your price proposal of ₹${currentNegotiation.proposedPrice.toLocaleString()}.`;
      break;

    case "counter":
      if (!counterOffer || !counterOffer.proposedPrice) {
        throw new apiError("Counter offer details are required", 400);
      }

      // Reject current negotiation first
      await conversation.rejectNegotiation(
        respondedBy,
        "Counter offer provided"
      );

      // Create new negotiation with counter offer
      const counterNegotiationData = {
        _id: new mongoose.Types.ObjectId(),
        proposedPrice: parseInt(counterOffer.proposedPrice),
        timeline: counterOffer.timeline || null,
        additionalTerms: counterOffer.additionalTerms || null,
        proposedBy: respondedBy,
        proposedAt: new Date(),
        status: "pending",
        previousPrice: currentNegotiation.proposedPrice,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      // Calculate price change
      const difference =
        counterNegotiationData.proposedPrice - currentNegotiation.proposedPrice;
      const percentage = (
        (Math.abs(difference) / currentNegotiation.proposedPrice) *
        100
      ).toFixed(1);

      counterNegotiationData.priceChange = {
        amount: Math.abs(difference),
        percentage: parseFloat(percentage),
        type:
          difference > 0 ? "increase" : difference < 0 ? "decrease" : "same",
      };

      // Start new negotiation
      await conversation.startNegotiation(counterNegotiationData);

      // Create counter offer message
      responseMessage = await Message.createNegotiationMessage(
        conversationId,
        req.user._id,
        {
          ...counterNegotiationData,
          isCounterOffer: true,
          originalOfferId: currentNegotiation._id,
          counterOfferNumber: (currentNegotiation.counterOfferNumber || 0) + 1,
        }
      );

      notificationTitle = "🔄 Counter Offer Received";
      notificationMessage = `${
        req.user.name
      } made a counter offer of ₹${counterNegotiationData.proposedPrice.toLocaleString()}.`;
      break;
  }

  // Update conversation's last message and activity
  if (responseMessage) {
    conversation.lastMessage = responseMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    await responseMessage.populate("sender", "name image role");
  }

  // Create notification for the other party
  if (otherParticipant && notificationTitle && notificationMessage) {
    await Notification.create({
      user: otherParticipant._id,
      type: "gig_accepted",
      title: notificationTitle,
      message: notificationMessage,
      relatedId: conversationId,
      actionUrl: `/dashboard/messages`,
      metadata: {
        action: action,
        conversationId: conversationId,
        negotiationId:
          action === "counter"
            ? conversation.metadata?.currentNegotiation?._id
            : currentNegotiation._id,
      },
    });
  }

  // Emit socket event
  emitConversationEvent(
    "negotiationResponse",
    {
      conversationId: conversationId,
      action,
      message: responseMessage,
      negotiation: conversation.metadata?.currentNegotiation,
    },
    conversation.participants
  );

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        action: action,
        message: responseMessage,
        conversation: {
          status: conversation.status,
          currentNegotiation: conversation.metadata?.currentNegotiation,
        },
        notification: {
          title: notificationTitle,
          message: notificationMessage,
        },
      },
      "Negotiation response processed successfully"
    )
  );
});

// @desc    Initiate payment for negotiated project
// @route   POST /api/conversations/:id/initiate-payment
// @access  Private
export const initiatePayment = asyncHandler(async (req, res, next) => {
  const { finalAmount, agreementTerms } = req.body;
  const conversationId = req.params.id;

  if (!razorpay) {
    razorpay = initializeRazorpay();
  }

  if (!razorpay) {
    throw new apiError("Payment service is currently unavailable", 503);
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  })
    .populate("participants")
    .populate("gigId");

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  // Verify user is hiring manager
  if (req.user.role !== "hiring") {
    throw new apiError("Only hiring managers can initiate payments", 403);
  }

  // Get negotiated amount or use provided amount
  const projectAmount =
    finalAmount || conversation.metadata?.currentNegotiation?.proposedPrice;

  if (!projectAmount || projectAmount <= 0) {
    throw new apiError("Invalid project amount", 400);
  }

  // Calculate fees
  const platformFee = Math.round(projectAmount * 0.05); // 5% platform fee
  const totalPayable = projectAmount + platformFee;

  // Get freelancer details
  const freelancer = conversation.participants.find(
    (p) => p._id.toString() !== req.user._id.toString()
  );

  if (!freelancer) {
    throw new apiError("Freelancer not found", 404);
  }

  // Create Razorpay order
  const razorpayOrder = await razorpay.orders.create({
    amount: totalPayable * 100, // Amount in paise
    currency: "INR",
    receipt: `negotiate_${conversationId}_${Date.now()}`,
    notes: {
      conversationId: conversationId,
      gigId: conversation.gigId?._id.toString(),
      companyId: req.user._id.toString(),
      freelancerId: freelancer._id.toString(),
      projectAmount: projectAmount,
      platformFee: platformFee,
      totalPayable: totalPayable,
      type: "negotiated_payment",
      agreementTerms: agreementTerms || "",
    },
  });

  // Update conversation status
  conversation.status = "payment_processing";
  conversation.metadata = {
    ...conversation.metadata,
    paymentInitiated: new Date(),
    paymentOrderId: razorpayOrder.id,
    agreedAmount: projectAmount,
    platformFee: platformFee,
    totalPayable: totalPayable,
  };
  await conversation.save();

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        requiresPayment: true,
        orderId: razorpayOrder.id,
        amount: totalPayable,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        projectDetails: {
          title:
            conversation.metadata?.projectTitle || conversation.gigId?.title,
          amount: projectAmount,
          platformFee: platformFee,
          totalPayable: totalPayable,
          timeline: conversation.metadata?.currentNegotiation?.timeline,
          terms: agreementTerms,
        },
        freelancerDetails: {
          name: freelancer.name,
          image: freelancer.image,
          username: freelancer.username,
        },
      },
      "Payment order created successfully"
    )
  );
});

// @desc    Verify payment for negotiated project
// @route   POST /api/conversations/:id/verify-payment
// @access  Private
export const verifyPayment = asyncHandler(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  const conversationId = req.params.id;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
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

  // Find conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  })
    .populate("participants")
    .populate("gigId");

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  // Get user details
  const company = await User.findById(req.user._id);
  const freelancer = conversation.participants.find(
    (p) => p._id.toString() !== req.user._id.toString()
  );

  if (!company || !freelancer) {
    throw new apiError("User details not found", 404);
  }

  // Create payment record
  const projectAmount = conversation.metadata?.agreedAmount;
  const platformFee = conversation.metadata?.platformFee;
  const totalPaid = conversation.metadata?.totalPayable;

  const payment = new Payment({
    payer: company._id,
    payee: freelancer._id,
    gig: conversation.gigId?._id,
    amount: projectAmount,
    totalAmount: totalPaid,
    platformFee: platformFee,
    type: "negotiated_gig_payment",
    status: "completed",
    description: `Negotiated payment for: ${conversation.metadata?.projectTitle}`,
    razorpayPaymentId: razorpay_payment_id,
    razorpayOrderId: razorpay_order_id,
    razorpaySignature: razorpay_signature,
    metadata: {
      conversationId: conversationId,
      negotiationId: conversation.metadata?.currentNegotiation?._id,
      agreedTerms: conversation.metadata?.currentNegotiation?.additionalTerms,
      timeline: conversation.metadata?.currentNegotiation?.timeline,
    },
  });

  await payment.save();

  // Update conversation status
  conversation.status = "active";
  conversation.metadata = {
    ...conversation.metadata,
    paymentCompleted: new Date(),
    paymentId: payment._id,
    projectStarted: new Date(),
  };
  await conversation.save();

  // Update gig status if present
  if (conversation.gigId) {
    await Gig.findByIdAndUpdate(conversation.gigId._id, {
      status: "in_progress",
      paymentCompleted: new Date(),
      projectStarted: new Date(),
    });
  }

  // Send project start message
  const projectStartMessage = await Message.create({
    conversationId: conversation._id,
    sender: company._id,
    content: `🎉 Payment of ₹${projectAmount.toLocaleString()} has been completed! 

The project officially starts now. Looking forward to working with you on "${
      conversation.metadata?.projectTitle
    }". 

You can now submit your project deliverables when ready.`,
    type: "system",
    readBy: [{ user: company._id, readAt: new Date() }],
  });

  // Update conversation's last message
  conversation.lastMessage = projectStartMessage._id;
  conversation.lastActivity = new Date();
  await conversation.save();

  // Emit socket events
  emitConversationEvent(
    "paymentCompleted",
    {
      conversationId: conversation._id,
      paymentAmount: projectAmount,
      message: projectStartMessage,
    },
    conversation.participants
  );

  // Send notifications
  try {
    // Notify freelancer
    await Notification.create({
      user: freelancer._id,
      type: "payment_completed",
      title: "Payment Received!",
      message: `Payment of ₹${projectAmount.toLocaleString()} has been completed for "${
        conversation.metadata?.projectTitle
      }". The project has officially started!`,
      actionUrl: `/dashboard/messages`,
      relatedId: conversation._id,
    });

    // Notify company
    await Notification.create({
      user: company._id,
      type: "payment_completed",
      title: "Payment Successful",
      message: `Payment of ₹${totalPaid.toLocaleString()} has been processed successfully. The project "${
        conversation.metadata?.projectTitle
      }" has started.`,
      actionUrl: `/dashboard/messages`,
      relatedId: conversation._id,
    });
  } catch (notificationError) {
    console.error("Notification error:", notificationError);
  }

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        paymentId: payment._id,
        projectAmount: projectAmount,
        conversationId: conversation._id,
        message: "Payment verified and project started successfully!",
      },
      "Payment verified successfully"
    )
  );
});

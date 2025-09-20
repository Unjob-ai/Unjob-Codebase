// controllers/conversationController.js
import {Conversation} from "../models/ConversationModel.js";
import {Message} from "../models/MessageModel.js";
import {User} from "../models/UserModel.js";
import {Gig} from "../models/GigModel.js";
import { AppError, catchAsync } from "../middleware/errorHandler.js";
import asyncHandler from "../utils/asyncHandler.js"
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
// @desc    Get user conversations
// @route   GET /api/conversations
// @access  Private
const getConversations = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const conversations = await Conversation.find({
    participants: req.user._id,
    isDeleted: false,
  })
    .populate("participants", "name image role profile.companyName")
    .populate("lastMessage", "content type createdAt sender")
    .populate("gigId", "title budget category company")
    .sort("-lastActivity")
    .skip(skip)
    .limit(parseInt(limit));

  // Add unread count for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await Message.getUnreadCount(conv._id, req.user._id);
      return {
        ...conv.toObject(),
        unreadCount,
      };
    })
  );

  const totalConversations = await Conversation.countDocuments({
    participants: req.user._id,
    isDeleted: false,
  });

  res.status(200).json(new apiResponse(200, true, {
    conversations: conversationsWithUnread,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalConversations / limit),
      totalConversations,
      hasNext: page < Math.ceil(totalConversations / limit),
      hasPrev: page > 1,
    },
  }));
});

// @desc    Create or get conversation
// @route   POST /api/conversations
// @access  Private
const createConversation = asyncHandler(async (req, res, next) => {
  const { participantId, gigId, type = "direct" } = req.body;

  if (!participantId) {
    throw new apiError("Participant ID is required", 400);
  }

  if (participantId === req.user._id.toString()) {
    throw new apiError("Cannot create conversation with yourself", 400 );
  }

  // Check if participant exists
  const participant = await User.findById(participantId);
  if (!participant) {
    throw new apiError("Participant not found", 404);
  }

  // Check if conversation already exists
  const existingConversation = await Conversation.findOne({
    participants: { $all: [req.user._id, participantId] },
    gigId: gigId || { $exists: false },
  });

  if (existingConversation) {
    await existingConversation.populate(
      "participants",
      "name image role profile.companyName"
    );
    return res.status(200).json({
      success: true,
      conversation: existingConversation,
      isNew: false,
    });
  }

  // Create new conversation
  const conversationData = {
    participants: [req.user._id, participantId],
    type,
    lastActivity: new Date(),
  };

  if (gigId) {
    const gig = await Gig.findById(gigId);
    if (gig) {
      conversationData.gigId = gigId;
      conversationData.title = `Gig: ${gig.title}`;
    }
  }

  const conversation = await Conversation.create(conversationData);
  await conversation.populate(
    "participants",
    "name image role profile.companyName"
  );

  res.status(201).json({
    success: true,
    conversation,
    isNew: true,
  });
});

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
const getConversationById = asyncHandler(async (req, res, next) => {
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

  res.status(200).json({
    success: true,
    conversation: {
      ...conversation.toObject(),
      unreadCount,
    },
  });
});

export  {
  getConversations,
  createConversation,
  getConversationById,
};

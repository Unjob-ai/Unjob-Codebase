// controllers/conversationController.js
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Gig = require("../models/Gig");
const { AppError, catchAsync } = require("../middleware/errorHandler");

// @desc    Get user conversations
// @route   GET /api/conversations
// @access  Private
const getConversations = catchAsync(async (req, res, next) => {
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

  res.status(200).json({
    success: true,
    conversations: conversationsWithUnread,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalConversations / limit),
      totalConversations,
      hasNext: page < Math.ceil(totalConversations / limit),
      hasPrev: page > 1,
    },
  });
});

// @desc    Create or get conversation
// @route   POST /api/conversations
// @access  Private
const createConversation = catchAsync(async (req, res, next) => {
  const { participantId, gigId, type = "direct" } = req.body;

  if (!participantId) {
    return next(new AppError("Participant ID is required", 400));
  }

  if (participantId === req.user._id.toString()) {
    return next(new AppError("Cannot create conversation with yourself", 400));
  }

  // Check if participant exists
  const participant = await User.findById(participantId);
  if (!participant) {
    return next(new AppError("Participant not found", 404));
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
const getConversationById = catchAsync(async (req, res, next) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user._id,
  })
    .populate("participants", "name image role profile.companyName profile.bio")
    .populate("gigId", "title budget category company status");

  if (!conversation) {
    return next(new AppError("Conversation not found", 404));
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

module.exports = {
  getConversations,
  createConversation,
  getConversationById,
};

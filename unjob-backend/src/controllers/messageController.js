// controllers/messageController.js
import  {Message} from "../models/MessageModel.js"
import  {Conversation} from "../models/ConversationModel.js"
import  {User} from "../models/UserModel.js";
import  { AppError, catchAsync } from "../middleware/errorHandler.js"
import asyncHandler from "../utils/asyncHandler.js"
import apiError from "../utils/apiError.js";
// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res, next) => {
  const { conversationId, content, type = "text", replyTo } = req.body;

  // Verify conversation exists and user is participant
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  const messageData = {
    conversationId,
    sender: req.user._id,
    content: content?.trim(),
    type,
    replyTo,
  };

  // Handle file upload
  if (req.file) {
    messageData.fileUrl = req.file.path || req.file.secure_url;
    messageData.fileName = req.file.originalname;
    messageData.fileSize = req.file.size;
    messageData.fileMimeType = req.file.mimetype;
  }

  const message = await Message.create(messageData);

  // Update conversation's last message and activity
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    lastActivity: new Date(),
  });

  // Populate sender info
  await message.populate("sender", "name image role");

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: message,
  });
});

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  // Verify user is part of conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  const messages = await Message.getConversationMessages(conversationId, {
    page: parseInt(page),
    limit: parseInt(limit),
    userId: req.user._id,
  });

  const totalMessages = await Message.countDocuments({
    conversationId,
    isDeleted: false,
  });

  res.status(200).json({
    success: true,
    messages: messages.reverse(), // Show oldest first
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalMessages / limit),
      totalMessages,
      hasMore: messages.length === parseInt(limit),
    },
  });
});

// @desc    Mark messages as read
// @route   PUT /api/messages/:conversationId/read
// @access  Private
const markMessagesAsRead = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const { messageIds } = req.body;

  // Verify user is part of conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  let result;

  if (messageIds && messageIds.length > 0) {
    // Mark specific messages as read
    result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        conversationId,
        sender: { $ne: req.user._id },
      },
      {
        $addToSet: {
          readBy: {
            user: req.user._id,
            readAt: new Date(),
          },
        },
        $set: { status: "read" },
      }
    );
  } else {
    // Mark all unread messages as read
    result = await Message.markAllAsRead(conversationId, req.user._id);
  }

  res.status(200).json({
    success: true,
    message: "Messages marked as read",
    modifiedCount: result.modifiedCount,
  });
});

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
const deleteMessage = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new apiError("Message not found", 404);
  }

  // Check if user owns the message
  if (message.sender.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to delete this message", 403);
  }

  await message.softDelete(req.user._id);

  res.status(200).json({
    success: true,
    message: "Message deleted successfully",
  });
});

export{
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
};

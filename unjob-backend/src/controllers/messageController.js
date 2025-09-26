// controllers/messageController.js
import { Message } from "../models/MessageModel.js";
import { Conversation } from "../models/ConversationModel.js";
import { User } from "../models/UserModel.js";
import { Notification } from "../models/NotificationModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { uploadToCloudinary } from "../config/cloudinaryConfig.js";
import { onlineUsers, userSockets } from "../Sockets/index.js";

// Helper function to get file details for uploads
const getFileDetails = (mimeType, fileName) => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  // Images
  if (mimeType.startsWith("image/")) {
    return {
      folder: "unjob/chat/images",
      resourceType: "image",
      category: "image",
    };
  }

  // Videos
  if (mimeType.startsWith("video/")) {
    return {
      folder: "unjob/chat/videos",
      resourceType: "video",
      category: "video",
    };
  }

  // Audio files
  if (mimeType.startsWith("audio/")) {
    return {
      folder: "unjob/chat/audio",
      resourceType: "video", // Cloudinary uses 'video' for audio too
      category: "audio",
    };
  }

  // Documents - PDF
  if (mimeType === "application/pdf" || extension === "pdf") {
    return {
      folder: "unjob/chat/documents/pdf",
      resourceType: "raw",
      category: "document",
    };
  }

  // Documents - Microsoft Office
  if (
    mimeType.includes("application/vnd.openxmlformats-officedocument") ||
    mimeType.includes("application/vnd.ms-") ||
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension)
  ) {
    return {
      folder: "unjob/chat/documents/office",
      resourceType: "raw",
      category: "document",
    };
  }

  // Text files
  if (
    mimeType.startsWith("text/") ||
    ["txt", "md", "csv", "json", "xml", "html", "css", "js", "ts"].includes(
      extension
    )
  ) {
    return {
      folder: "unjob/chat/documents/text",
      resourceType: "raw",
      category: "document",
    };
  }

  // Archives/Compressed files
  if (
    ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(extension) ||
    mimeType.includes("zip") ||
    mimeType.includes("compressed")
  ) {
    return {
      folder: "unjob/chat/archives",
      resourceType: "raw",
      category: "archive",
    };
  }

  // Code files
  if (
    ["py", "java", "cpp", "c", "php", "rb", "go", "rs", "swift", "kt"].includes(
      extension
    )
  ) {
    return {
      folder: "unjob/chat/documents/code",
      resourceType: "raw",
      category: "code",
    };
  }

  // Default for any other file type
  return {
    folder: "unjob/chat/files/other",
    resourceType: "raw",
    category: "file",
  };
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Helper function to emit socket events
const emitMessageEvent = (
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

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res, next) => {
  const {
    conversationId,
    content,
    type = "text",
    replyTo,
    metadata,
  } = req.body;

  // Validate required fields
  if (!conversationId) {
    throw new apiError("Conversation ID is required", 400);
  }

  if (type === "text" && (!content || !content.trim())) {
    throw new apiError("Message content is required for text messages", 400);
  }

  // Verify conversation exists and user is participant
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  }).populate("participants", "name image role");

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  // Check if conversation is read-only
  if (conversation.settings?.isReadOnly) {
    throw new apiError("This conversation is read-only", 403);
  }

  // Prepare message data
  const messageData = {
    conversationId,
    sender: req.user._id,
    content: content?.trim(),
    type,
    metadata: metadata || {},
    readBy: [
      {
        user: req.user._id,
        readAt: new Date(),
      },
    ],
  };

  // Handle reply
  if (replyTo) {
    const replyMessage = await Message.findById(replyTo);
    if (
      replyMessage &&
      replyMessage.conversationId.toString() === conversationId
    ) {
      messageData.replyTo = replyTo;
    }
  }

  // Handle file upload if present
  if (req.file) {
    const { folder, resourceType, category } = getFileDetails(
      req.file.mimetype,
      req.file.originalname
    );

    try {
      const fileUrl = await uploadToCloudinary(
        req.file.buffer,
        folder,
        resourceType
      );

      messageData.fileUrl = fileUrl;
      messageData.fileName = req.file.originalname;
      messageData.fileSize = formatFileSize(req.file.size);
      messageData.fileType = category;
      messageData.fileMimeType = req.file.mimetype;
      messageData.type =
        category === "image"
          ? "image"
          : category === "video"
          ? "video"
          : category === "audio"
          ? "audio"
          : "file";
    } catch (uploadError) {
      console.error("File upload error:", uploadError);
      throw new apiError("Failed to upload file", 500);
    }
  }

  // Create message
  const message = await Message.create(messageData);

  // Update conversation's last message and activity
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    lastActivity: new Date(),
  });

  // Populate sender info
  await message.populate("sender", "name image role");
  await message.populate("replyTo", "content sender");

  // Emit socket event to other participants
  const otherParticipants = conversation.participants.filter(
    (p) => p._id.toString() !== req.user._id.toString()
  );

  emitMessageEvent(
    "newMessage",
    {
      message: message.toObject(),
      conversationId: conversationId,
    },
    otherParticipants.map((p) => p._id),
    req.user._id
  );

  // Create notifications for other participants
  for (const participant of otherParticipants) {
    try {
      await Notification.create({
        user: participant._id,
        type: "message",
        title: `New message from ${req.user.name}`,
        message: content
          ? content.length > 50
            ? content.substring(0, 50) + "..."
            : content
          : `Sent ${
              messageData.type === "image"
                ? "an image"
                : messageData.type === "file"
                ? "a file"
                : "a message"
            }`,
        relatedId: conversationId,
        actionUrl: `/dashboard/messages`,
        metadata: {
          conversationId,
          messageId: message._id,
          senderName: req.user.name,
        },
      });
    } catch (notificationError) {
      console.error(
        "Failed to create message notification:",
        notificationError
      );
    }
  }

  res
    .status(201)
    .json(new apiResponse(201, true, message, "Message sent successfully"));
});

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
export const getMessages = asyncHandler(async (req, res, next) => {
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

  // Emit socket event to mark messages as seen
  emitMessageEvent(
    "messagesViewed",
    {
      conversationId,
      viewedBy: req.user._id,
      viewedAt: new Date(),
    },
    conversation.participants,
    req.user._id
  );

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        messages: messages.reverse(), // Show oldest first
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalMessages / limit),
          totalMessages,
          hasMore: messages.length === parseInt(limit),
        },
        conversation: {
          _id: conversation._id,
          participants: conversation.participants,
          status: conversation.status,
          settings: conversation.settings,
        },
      },
      "Messages fetched successfully"
    )
  );
});

// @desc    Mark messages as read
// @route   PUT /api/messages/:conversationId/read
// @access  Private
export const markMessagesAsRead = asyncHandler(async (req, res, next) => {
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

  // Emit socket event
  emitMessageEvent(
    "messagesRead",
    {
      conversationId,
      readBy: req.user._id,
      messageIds: messageIds || "all",
    },
    conversation.participants,
    req.user._id
  );

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        { messagesMarked: result.modifiedCount },
        "Messages marked as read successfully"
      )
    );
});

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new apiError("Message not found", 404);
  }

  // Check if user owns the message
  if (message.sender.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to delete this message", 403);
  }

  // Check if message is a system message
  if (message.type === "system" || message.isSystemMessage) {
    throw new apiError("System messages cannot be deleted", 403);
  }

  await message.softDelete(req.user._id);

  // Get conversation for socket event
  const conversation = await Conversation.findById(message.conversationId);

  if (conversation) {
    // Emit socket event
    emitMessageEvent(
      "messageDeleted",
      {
        messageId: message._id,
        conversationId: message.conversationId,
        deletedBy: req.user._id,
      },
      conversation.participants
    );
  }

  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Message deleted successfully"));
});

// @desc    React to a message
// @route   POST /api/messages/:messageId/react
// @access  Private
export const reactToMessage = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    throw new apiError("Emoji is required", 400);
  }

  const message = await Message.findById(messageId).populate("sender", "name");

  if (!message) {
    throw new apiError("Message not found", 404);
  }

  // Verify user is part of conversation
  const conversation = await Conversation.findOne({
    _id: message.conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Access denied", 403);
  }

  await message.addReaction(req.user._id, emoji);

  // Emit socket event
  emitMessageEvent(
    "messageReaction",
    {
      messageId: message._id,
      conversationId: message.conversationId,
      reaction: {
        user: req.user._id,
        emoji,
        reactedAt: new Date(),
      },
    },
    conversation.participants
  );

  res
    .status(200)
    .json(new apiResponse(200, true, message, "Reaction added successfully"));
});

// @desc    Remove reaction from message
// @route   DELETE /api/messages/:messageId/react
// @access  Private
export const removeReaction = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new apiError("Message not found", 404);
  }

  // Verify user is part of conversation
  const conversation = await Conversation.findOne({
    _id: message.conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Access denied", 403);
  }

  await message.removeReaction(req.user._id);

  // Emit socket event
  emitMessageEvent(
    "reactionRemoved",
    {
      messageId: message._id,
      conversationId: message.conversationId,
      user: req.user._id,
    },
    conversation.participants
  );

  res
    .status(200)
    .json(new apiResponse(200, true, message, "Reaction removed successfully"));
});

// @desc    Edit a message
// @route   PUT /api/messages/:messageId
// @access  Private
export const editMessage = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;
  const { content, editReason } = req.body;

  if (!content || !content.trim()) {
    throw new apiError("Message content is required", 400);
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new apiError("Message not found", 404);
  }

  // Check if user owns the message
  if (message.sender.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to edit this message", 403);
  }

  // Check if message type allows editing
  if (message.type !== "text") {
    throw new apiError("Only text messages can be edited", 400);
  }

  // Check if message is too old (e.g., more than 24 hours)
  const messageAge = Date.now() - message.createdAt.getTime();
  const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours

  if (messageAge > maxEditAge) {
    throw new apiError("Message is too old to edit", 400);
  }

  await message.editContent(content.trim(), editReason);

  // Get conversation for socket event
  const conversation = await Conversation.findById(message.conversationId);

  if (conversation) {
    // Emit socket event
    emitMessageEvent(
      "messageEdited",
      {
        messageId: message._id,
        conversationId: message.conversationId,
        newContent: content.trim(),
        editedAt: new Date(),
        editedBy: req.user._id,
      },
      conversation.participants
    );
  }

  res
    .status(200)
    .json(new apiResponse(200, true, message, "Message edited successfully"));
});

// @desc    Upload file for message
// @route   POST /api/messages/upload
// @access  Private
export const uploadMessageFile = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.body;

  if (!req.file) {
    throw new apiError("File is required", 400);
  }

  if (!conversationId) {
    throw new apiError("Conversation ID is required", 400);
  }

  // Verify user is part of conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Access denied", 403);
  }

  // Check file size limits
  const maxSize =
    req.file.mimetype.startsWith("image/") ||
    req.file.mimetype.startsWith("video/")
      ? 25 * 1024 * 1024 // 25MB for media
      : 50 * 1024 * 1024; // 50MB for documents

  if (req.file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    throw new apiError(`File too large. Maximum size is ${maxSizeMB}MB.`, 400);
  }

  const { folder, resourceType, category } = getFileDetails(
    req.file.mimetype,
    req.file.originalname
  );

  try {
    const fileUrl = await uploadToCloudinary(
      req.file.buffer,
      folder,
      resourceType
    );

    const fileData = {
      fileUrl,
      fileName: req.file.originalname,
      fileSize: formatFileSize(req.file.size),
      fileType: category,
      fileMimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
    };

    res
      .status(200)
      .json(new apiResponse(200, true, fileData, "File uploaded successfully"));
  } catch (uploadError) {
    console.error("File upload error:", uploadError);
    throw new apiError("Failed to upload file", 500);
  }
});

// @desc    Get message statistics for conversation
// @route   GET /api/messages/:conversationId/stats
// @access  Private
export const getMessageStats = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;

  // Verify user is part of conversation
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Conversation not found or access denied", 404);
  }

  const stats = await Message.aggregate([
    {
      $match: {
        conversationId: mongoose.Types.ObjectId(conversationId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        textMessages: { $sum: { $cond: [{ $eq: ["$type", "text"] }, 1, 0] } },
        fileMessages: { $sum: { $cond: [{ $ne: ["$type", "text"] }, 1, 0] } },
        systemMessages: { $sum: { $cond: ["$isSystemMessage", 1, 0] } },
      },
    },
  ]);

  const unreadCount = await Message.getUnreadCount(
    conversationId,
    req.user._id
  );

  const result = {
    ...(stats[0] || {
      totalMessages: 0,
      textMessages: 0,
      fileMessages: 0,
      systemMessages: 0,
    }),
    unreadCount,
    conversationId,
  };

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        result,
        "Message statistics fetched successfully"
      )
    );
});

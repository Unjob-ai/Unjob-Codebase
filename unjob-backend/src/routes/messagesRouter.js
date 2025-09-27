// routes/messageRoutes.js
import express from "express";
import {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
  reactToMessage,
  removeReaction,
  editMessage,
  uploadMessageFile,
  getMessageStats,
} from "../controllers/messageController.js";

import {
  validateMessage,
  validateObjectId,
  validatePagination,
} from "../middleware/validationMiddleWare.js";

import { uploadConfigs } from "../middleware/uploadToS3Middleware.js";
import { requireCompleteProfile } from "../middleware/authMiddleware.js";
import { messageLimiter } from "../middleware/rateLimitMiddleWare.js";

const router = express.Router();

// All routes require authentication
router.use(requireCompleteProfile);

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
router.post(
  "/",
  messageLimiter,
  uploadConfigs.messageFile,

  validateMessage,
  sendMessage
);

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
router.get(
  "/:conversationId",
  validateObjectId("conversationId"),
  validatePagination,
  getMessages
);

// @desc    Mark messages as read
// @route   PUT /api/messages/:conversationId/read
// @access  Private
router.put(
  "/:conversationId/read",
  validateObjectId("conversationId"),
  markMessagesAsRead
);

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
router.delete("/:messageId", validateObjectId("messageId"), deleteMessage);

// @desc    React to a message
// @route   POST /api/messages/:messageId/react
// @access  Private
router.post("/:messageId/react", validateObjectId("messageId"), reactToMessage);

// @desc    Remove reaction from message
// @route   DELETE /api/messages/:messageId/react
// @access  Private
router.delete(
  "/:messageId/react",
  validateObjectId("messageId"),
  removeReaction
);

// @desc    Edit a message
// @route   PUT /api/messages/:messageId
// @access  Private
router.put("/:messageId", validateObjectId("messageId"), editMessage);

// @desc    Upload file for message
// @route   POST /api/messages/upload
// @access  Private
router.post("/upload", uploadConfigs.messageFile, uploadMessageFile);

// @desc    Get message statistics for conversation
// @route   GET /api/messages/:conversationId/stats
// @access  Private
router.get(
  "/:conversationId/stats",
  validateObjectId("conversationId"),
  getMessageStats
);

export default router;

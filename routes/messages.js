// routes/messages.js
const express = require("express");
const {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
} = require("../controllers/messageController");

const {
  validateMessage,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const { uploadConfigs } = require("../middleware/upload");
const { requireCompleteProfile } = require("../middleware/auth");
const { messageLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Message operations
router.post(
  "/",
  messageLimiter,
  requireCompleteProfile,
  uploadConfigs.messageFile,
  validateMessage,
  sendMessage
);
router.get(
  "/:conversationId",
  requireCompleteProfile,
  validateObjectId("conversationId"),
  validatePagination,
  getMessages
);
router.put(
  "/:conversationId/read",
  requireCompleteProfile,
  validateObjectId("conversationId"),
  markMessagesAsRead
);
router.delete(
  "/:messageId",
  requireCompleteProfile,
  validateObjectId("messageId"),
  deleteMessage
);

module.exports = router;

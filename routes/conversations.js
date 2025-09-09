// routes/conversations.js
const express = require("express");
const {
  getConversations,
  createConversation,
  getConversationById,
} = require("../controllers/conversationController");

const {
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const { requireCompleteProfile } = require("../middleware/auth");

const router = express.Router();

// Conversation routes
router.get("/", requireCompleteProfile, validatePagination, getConversations);
router.post("/", requireCompleteProfile, createConversation);
router.get(
  "/:id",
  requireCompleteProfile,
  validateObjectId(),
  getConversationById
);

module.exports = router;

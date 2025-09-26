// routes/conversationRoutes.js
import express from "express";
import {
  getConversations,
  createConversation,
  getConversationById,
  updateConversation,
  deleteConversation,
  startNegotiation,
  respondToNegotiation,
  initiatePayment,
  verifyPayment,
} from "../controllers/conversationController.js";

import {
  validateObjectId,
  validatePagination,
} from "../middleware/validationMiddleWare.js";

import { requireCompleteProfile } from "../middleware/authMiddleware.js";

const conversationRouter = express.Router();

// All routes require authentication and complete profile
conversationRouter.use(requireCompleteProfile);

// @desc    Get user conversations
// @route   GET /api/conversations
// @access  Private
conversationRouter.get("/", validatePagination, getConversations);

// @desc    Create or get conversation
// @route   POST /api/conversations
// @access  Private
conversationRouter.post("/", createConversation);

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
conversationRouter.get("/:id", validateObjectId("id"), getConversationById);

// @desc    Update conversation settings/status
// @route   PATCH /api/conversations/:id
// @access  Private
conversationRouter.patch("/:id", validateObjectId("id"), updateConversation);

// @desc    Delete conversation (soft delete)
// @route   DELETE /api/conversations/:id
// @access  Private
conversationRouter.delete("/:id", validateObjectId("id"), deleteConversation);

// @desc    Start negotiation in conversation
// @route   POST /api/conversations/:id/negotiate
// @access  Private
conversationRouter.post(
  "/:id/negotiate",
  validateObjectId("id"),
  startNegotiation
);

// @desc    Respond to negotiation (accept/reject/counter)
// @route   POST /api/conversations/:id/negotiate/actions
// @access  Private
conversationRouter.post(
  "/:id/negotiate/actions",
  validateObjectId("id"),
  respondToNegotiation
);

// @desc    Initiate payment for negotiated project
// @route   POST /api/conversations/:id/initiate-payment
// @access  Private
conversationRouter.post(
  "/:id/initiate-payment",
  validateObjectId("id"),
  initiatePayment
);

// @desc    Verify payment for negotiated project
// @route   POST /api/conversations/:id/verify-payment
// @access  Private
conversationRouter.post(
  "/:id/verify-payment",
  validateObjectId("id"),
  verifyPayment
);

export { conversationRouter };

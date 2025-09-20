// routes/conversations.js
import express  from "express"
import  {
  getConversations,
  createConversation,
  getConversationById,
} from "../controllers/conversationController.js"

import {
  validateObjectId,
  validatePagination,
}  from  "../middleware/validationMiddleWare.js"

import  { requireCompleteProfile }  from "../middleware/authMiddleware.js"

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

export default  router;

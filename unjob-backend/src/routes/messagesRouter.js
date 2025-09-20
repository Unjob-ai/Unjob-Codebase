// routes/messages.js
import express  from "express"
import  {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
}  from "../controllers/messageController.js"

import  {
  validateMessage,
  validateObjectId,
  validatePagination,
} from "../middleware/validationMiddleWare.js"

import  { uploadConfigs } from "../middleware/uploadMiddleWare.js"
import  { requireCompleteProfile } from "../middleware/authMiddleware.js"
import  { messageLimiter } from "../middleware/rateLimitMiddleWare.js"

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

export default router;

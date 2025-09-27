// routes/notificationsRouter.js
import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteNotifications,
  getNotificationStats,
  createNotification,
  sendTestNotification,
  triggerCommentNotification,
  triggerGigInvitationNotification,
  triggerGigApplicationNotification,
  triggerSubscriptionNotification,
  triggerApplicationStatusNotification,
  triggerProjectSubmissionNotification,
  triggerProjectReviewNotification,
  triggerProjectCompletionNotification,
  triggerPaymentNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
} from "../controllers/notificationController.js";
import { authMiddleware, requireAdmin } from "../middleware/authMiddleware.js";
import {
  validateObjectId,
  validateNotification,
} from "../middleware/validationMiddleWare.js";

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware); // ← Fixed function name

// Basic notification routes
router.get("/", getNotifications);
router.get("/stats", getNotificationStats);
router.post("/", validateNotification, createNotification);
router.patch("/:id/read", validateObjectId, markAsRead);
router.patch("/read-all", markAllAsRead);
router.delete("/:id", validateObjectId, deleteNotification);
router.delete("/", deleteNotifications); // ← Fixed function name

// Notification preferences
router.get("/preferences", getNotificationPreferences);
router.put("/preferences", updateNotificationPreferences);

// Test notification (admin only)
router.post("/test", requireAdmin, sendTestNotification);

// Notification triggers for different events
router.post("/trigger/comment", triggerCommentNotification);
router.post("/trigger/gig-invitation", triggerGigInvitationNotification);
router.post("/trigger/gig-application", triggerGigApplicationNotification);
router.post("/trigger/subscription", triggerSubscriptionNotification);
router.post(
  "/trigger/application-status",
  triggerApplicationStatusNotification
);
router.post(
  "/trigger/project-submission",
  triggerProjectSubmissionNotification
);
router.post("/trigger/project-review", triggerProjectReviewNotification);
router.post(
  "/trigger/project-completion",
  triggerProjectCompletionNotification
);
router.post("/trigger/payment", triggerPaymentNotification);

export default router;

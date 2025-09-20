// routes/notifications.js
import  express from "express"
import  {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
  deleteAllNotifications,
  deleteReadNotifications,
  getNotificationStats,
} from "../controllers/notificationController.js"

const router = express.Router();

// GET /api/notifications - Get user's notifications with pagination
router.get("/", getNotifications);

// GET /api/notifications/stats - Get notification statistics
router.get("/stats", getNotificationStats);

// POST /api/notifications - Create a new notification (admin/system use)
router.post("/", createNotification);

// PATCH /api/notifications/:id/read - Mark specific notification as read
router.patch("/:id/read", markAsRead);

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch("/read-all", markAllAsRead);

// DELETE /api/notifications/:id - Delete specific notification
router.delete("/:id", deleteNotification);

// DELETE /api/notifications - Delete notifications (with query params)
// Query params: ?deleteAll=true OR ?deleteRead=true
router.delete("/", deleteAllNotifications);

// DELETE /api/notifications/read - Delete all read notifications
router.delete("/read", deleteReadNotifications);

export default router;

// controllers/notificationController.js
import  {Notification}  from "../models/NotificationModel.js";
import  {User}  from "../models/UserModel.js"
import  { AppError }  from "../middleware/errorHandler.js"
import asyncHandler from "../utils/asyncHandler.js"
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
// @desc    Get user's notifications with pagination and filtering
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res, next) => {
    const {
      page = 1,
      limit = 20,
      type,
      read,
      priority,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    const userId = req.user._id;

    // Build filter object
    const filter = { user: userId };

    if (type) filter.type = type;
    if (read !== undefined) filter.read = read === "true";
    if (priority) filter.priority = priority;

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === "desc" ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count for pagination
    const totalCount = await Notification.countDocuments(filter);

    // Get notifications
    const notifications = await Notification.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      user: userId,
      read: false,
    });

    const summary = {
      total: totalCount,
      unread: unreadCount,
      read: totalCount - unreadCount,
    };

    const data={
      notifications,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasMore: skip + notifications.length < totalCount,
      },
    }
    res.status(200).json(new apiResponse(200,true,data,"notifications fetched successfully"));
});

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
const getNotificationStats = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

    const stats = await Notification.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] },
          },
          byType: {
            $push: {
              type: "$type",
              read: "$read",
              priority: "$priority",
            },
          },
        },
      },
    ]);

    const summary = stats.length > 0 ? stats[0] : { total: 0, unread: 0 };

    // Calculate type breakdown
    const typeBreakdown = {};
    if (summary.byType) {
      summary.byType.forEach((item) => {
        if (!typeBreakdown[item.type]) {
          typeBreakdown[item.type] = { total: 0, unread: 0 };
        }
        typeBreakdown[item.type].total++;
        if (!item.read) {
          typeBreakdown[item.type].unread++;
        }
      });
    }
    const statsData= {
        total: summary.total,
        unread: summary.unread,
        read: summary.total - summary.unread,
        typeBreakdown,
      }

    res.status(200).json(new apiResponse(200, true,statsData, "notification stats fetched successfully"));
  });
// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Private (Admin/System)
const createNotification = asyncHandler(async (req, res, next) => {
  const {
    userId,
    type,
    title,
    message,
    relatedId,
      relatedModel,
      actionUrl,
      metadata,
      priority = "medium",
      avatar,
      senderName,
    } = req.body;

    // Verify the target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new apiError("Target user not found", 404);
    }

    // Create the notification
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      relatedId,
      relatedModel,
      actionUrl,
      metadata,
      priority,
      avatar,
      senderName,
    });

    await notification.save();

    res.status(201).json(new apiResponse(201,true,notification,"Notification created successfully"));
});

// @desc    Mark specific notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      throw new apiError("Notification not found", 404);
    }

    res.status(200).json(new apiResponse(200,true,notification,"Notification marked as read"))
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

    const result = await Notification.updateMany(
      { user: userId, read: false },
      { read: true, readAt: new Date() }
    );
const updatedCount=result.modifiedCount
    res.status(200).json(new apiResponse(200,true,updatedCount, `Marked ${result.modifiedCount} notifications as read`));
});

// @desc    Delete specific notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

    const result = await Notification.deleteOne({
      _id: id,
      user: userId,
    });

    if (result.deletedCount === 0) {
      throw new apiError("Notification not found", 404)
    }

    res.status(200).json(new apiResponse(200,true,{}, "Notification deleted successfully"));
});

// @desc    Delete notifications based on query params
// @route   DELETE /api/notifications
// @access  Private
const deleteAllNotifications = asyncHandler(async (req, res, next) => {
  const { deleteAll, deleteRead } = req.query;
    const userId = req.user._id;

    let filter = { user: userId };
    let message = "";

    if (deleteAll === "true") {
      // Delete all notifications
      message = "all notifications";
    } else if (deleteRead === "true") {
      // Delete only read notifications
      filter.read = true;
      message = "read notifications";
    } else {
     throw new apiError("Specify deleteAll=true to delete all or deleteRead=true to delete read notifications", 400);
    }

    const result = await Notification.deleteMany(filter);

    res.status(200).json(new apiResponse(200,true,result.deletedCount, `Deleted ${result.deletedCount} ${message}`));
});

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/read
// @access  Private
const deleteReadNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

    const result = await Notification.deleteMany({
      user: userId,
      read: true,
    });

    res.status(200).json(new apiResponse(200,true,result.deletedCount,`Deleted ${result.deletedCount} read notifications`));
});

export {
  getNotifications,
  getNotificationStats,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  deleteReadNotifications,
};

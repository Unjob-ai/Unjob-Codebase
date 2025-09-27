// controllers/enhancedNotificationController.js
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { Notification } from "../models/NotificationModel.js";
import { User } from "../models/UserModel.js";
import { enhancedNotificationService } from "../services/enhancedNotificationService.js";

// @desc    Get user notifications with enhanced filtering
// @route   GET /api/notifications
// @access  Private
export const getNotifications = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    read,
    priority,
    relatedModel,
    startDate,
    endDate,
  } = req.query;

  const skip = (page - 1) * limit;
  const userId = req.user._id;

  // Build query
  let query = { user: userId };

  if (type) query.type = type;
  if (read !== undefined) query.read = read === "true";
  if (priority) query.priority = priority;
  if (relatedModel) query.relatedModel = relatedModel;

  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const totalNotifications = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({
    user: userId,
    read: false,
  });

  const pagination = {
    currentPage: parseInt(page),
    totalPages: Math.ceil(totalNotifications / limit),
    totalNotifications,
    hasNextPage: page < Math.ceil(totalNotifications / limit),
    hasPrevPage: page > 1,
  };

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        notifications,
        pagination,
        unreadCount,
      },
      "Notifications fetched successfully"
    )
  );
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: userId },
    { read: true },
    { new: true }
  );

  if (!notification) {
    throw new apiError("Notification not found", 404);
  }

  res
    .status(200)
    .json(
      new apiResponse(200, true, notification, "Notification marked as read")
    );
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await Notification.updateMany(
    { user: userId, read: false },
    { read: true }
  );

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        { modifiedCount: result.modifiedCount },
        "All notifications marked as read"
      )
    );
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findOneAndDelete({
    _id: id,
    user: userId,
  });

  if (!notification) {
    throw new apiError("Notification not found", 404);
  }

  res
    .status(200)
    .json(
      new apiResponse(200, true, null, "Notification deleted successfully")
    );
});

// @desc    Delete multiple notifications
// @route   DELETE /api/notifications
// @access  Private
export const deleteNotifications = asyncHandler(async (req, res) => {
  const { ids, deleteAll, deleteRead } = req.body;
  const userId = req.user._id;

  let query = { user: userId };

  if (deleteAll) {
    // Delete all notifications
  } else if (deleteRead) {
    query.read = true;
  } else if (ids && Array.isArray(ids)) {
    query._id = { $in: ids };
  } else {
    throw new apiError("Invalid delete operation", 400);
  }

  const result = await Notification.deleteMany(query);

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        { deletedCount: result.deletedCount },
        "Notifications deleted successfully"
      )
    );
});

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
export const getNotificationStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const stats = await Notification.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
        byType: {
          $push: {
            type: "$type",
            read: "$read",
            priority: "$priority",
          },
        },
        byPriority: {
          $push: {
            priority: "$priority",
            read: "$read",
          },
        },
      },
    },
  ]);

  const statsData = stats[0] || {
    total: 0,
    unread: 0,
    byType: [],
    byPriority: [],
  };

  // Calculate type breakdown
  const typeBreakdown = {};
  statsData.byType.forEach((item) => {
    if (!typeBreakdown[item.type]) {
      typeBreakdown[item.type] = { total: 0, unread: 0 };
    }
    typeBreakdown[item.type].total++;
    if (!item.read) {
      typeBreakdown[item.type].unread++;
    }
  });

  // Calculate priority breakdown
  const priorityBreakdown = {};
  statsData.byPriority.forEach((item) => {
    if (!priorityBreakdown[item.priority]) {
      priorityBreakdown[item.priority] = { total: 0, unread: 0 };
    }
    priorityBreakdown[item.priority].total++;
    if (!item.read) {
      priorityBreakdown[item.priority].unread++;
    }
  });

  const response = {
    total: statsData.total,
    unread: statsData.unread,
    read: statsData.total - statsData.unread,
    typeBreakdown,
    priorityBreakdown,
  };

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        response,
        "Notification stats fetched successfully"
      )
    );
});

// @desc    Create notification (Admin/System use)
// @route   POST /api/notifications
// @access  Private (Admin)
export const createNotification = asyncHandler(async (req, res) => {
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

  res
    .status(201)
    .json(
      new apiResponse(
        201,
        true,
        notification,
        "Notification created successfully"
      )
    );
});

// @desc    Send test notification
// @route   POST /api/notifications/test
// @access  Private (Admin)
export const sendTestNotification = asyncHandler(async (req, res) => {
  const { type = "comment", recipientEmail } = req.body;
  const targetEmail = recipientEmail || req.user.email;

  const testData = {
    postOwnerId: req.user._id,
    postOwnerEmail: targetEmail,
    postOwnerName: req.user.name || "Test User",
    commenterName: "Test Commenter",
    commentContent:
      "This is a test comment to verify the notification system is working correctly.",
    postTitle: "Test Post",
    postId: "test-post-id",
  };

  const result = await enhancedNotificationService.notifyCommentAdded(testData);

  res
    .status(200)
    .json(
      new apiResponse(200, true, result, "Test notification sent successfully")
    );
});

// @desc    Trigger comment notification
// @route   POST /api/notifications/trigger/comment
// @access  Private
export const triggerCommentNotification = asyncHandler(async (req, res) => {
  const { postOwnerId, commenterName, commentContent, postTitle, postId } =
    req.body;

  const postOwner = await User.findById(postOwnerId);
  if (!postOwner) {
    throw new apiError("Post owner not found", 404);
  }

  const result = await enhancedNotificationService.notifyCommentAdded({
    postOwnerId,
    postOwnerEmail: postOwner.email,
    postOwnerName: postOwner.name,
    commenterName,
    commentContent,
    postTitle,
    postId,
  });

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        result,
        "Comment notification sent successfully"
      )
    );
});

// @desc    Trigger gig invitation notification
// @route   POST /api/notifications/trigger/gig-invitation
// @access  Private
export const triggerGigInvitationNotification = asyncHandler(
  async (req, res) => {
    const { inviteeId, inviterName, gigTitle, gigId, invitationId } = req.body;

    const invitee = await User.findById(inviteeId);
    if (!invitee) {
      throw new apiError("Invitee not found", 404);
    }

    const result = await enhancedNotificationService.notifyGigInvitation({
      inviteeId,
      inviteeEmail: invitee.email,
      inviteeName: invitee.name,
      inviterName,
      gigTitle,
      gigId,
      invitationId,
    });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          true,
          result,
          "Gig invitation notification sent successfully"
        )
      );
  }
);

// @desc    Trigger gig application notification
// @route   POST /api/notifications/trigger/gig-application
// @access  Private
export const triggerGigApplicationNotification = asyncHandler(
  async (req, res) => {
    const { gigOwnerId, applicantName, gigTitle, gigId, applicationId } =
      req.body;

    const gigOwner = await User.findById(gigOwnerId);
    if (!gigOwner) {
      throw new apiError("Gig owner not found", 404);
    }

    const result = await enhancedNotificationService.notifyGigApplication({
      gigOwnerId,
      gigOwnerEmail: gigOwner.email,
      gigOwnerName: gigOwner.name,
      applicantName,
      gigTitle,
      gigId,
      applicationId,
    });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          true,
          result,
          "Gig application notification sent successfully"
        )
      );
  }
);

// @desc    Trigger subscription notification
// @route   POST /api/notifications/trigger/subscription
// @access  Private
export const triggerSubscriptionNotification = asyncHandler(
  async (req, res) => {
    const { userId, planType, amount, subscriptionId, invoiceData } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new apiError("User not found", 404);
    }

    const result = await enhancedNotificationService.notifySubscriptionCreated({
      userId,
      userEmail: user.email,
      userName: user.name,
      planType,
      amount,
      subscriptionId,
      invoiceData,
    });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          true,
          result,
          "Subscription notification sent successfully"
        )
      );
  }
);

// @desc    Trigger application status update notification
// @route   POST /api/notifications/trigger/application-status
// @access  Private
export const triggerApplicationStatusNotification = asyncHandler(
  async (req, res) => {
    const { applicantId, gigTitle, newStatus, gigId, applicationId } = req.body;

    const applicant = await User.findById(applicantId);
    if (!applicant) {
      throw new apiError("Applicant not found", 404);
    }

    const result =
      await enhancedNotificationService.notifyApplicationStatusUpdate({
        applicantId,
        applicantEmail: applicant.email,
        applicantName: applicant.name,
        gigTitle,
        newStatus,
        gigId,
        applicationId,
      });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          true,
          result,
          "Application status notification sent successfully"
        )
      );
  }
);

// @desc    Trigger project submission notification
// @route   POST /api/notifications/trigger/project-submission
// @access  Private
export const triggerProjectSubmissionNotification = asyncHandler(
  async (req, res) => {
    const { gigOwnerId, freelancerName, projectTitle, gigId, projectId } =
      req.body;

    const gigOwner = await User.findById(gigOwnerId);
    if (!gigOwner) {
      throw new apiError("Gig owner not found", 404);
    }

    const result = await enhancedNotificationService.notifyProjectSubmission({
      gigOwnerId,
      gigOwnerEmail: gigOwner.email,
      gigOwnerName: gigOwner.name,
      freelancerName,
      projectTitle,
      gigId,
      projectId,
    });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          true,
          result,
          "Project submission notification sent successfully"
        )
      );
  }
);

// @desc    Trigger project review notification
// @route   POST /api/notifications/trigger/project-review
// @access  Private
export const triggerProjectReviewNotification = asyncHandler(
  async (req, res) => {
    const { freelancerId, reviewContent, projectTitle, rating, projectId } =
      req.body;

    const freelancer = await User.findById(freelancerId);
    if (!freelancer) {
      throw new apiError("Freelancer not found", 404);
    }

    const result = await enhancedNotificationService.notifyProjectReview({
      freelancerId,
      freelancerEmail: freelancer.email,
      freelancerName: freelancer.name,
      reviewContent,
      projectTitle,
      rating,
      projectId,
    });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          true,
          result,
          "Project review notification sent successfully"
        )
      );
  }
);

// @desc    Trigger project completion notification
// @route   POST /api/notifications/trigger/project-completion
// @access  Private
export const triggerProjectCompletionNotification = asyncHandler(
  async (req, res) => {
    const { freelancerId, gigOwnerId, projectTitle, projectId } = req.body;

    const [freelancer, gigOwner] = await Promise.all([
      User.findById(freelancerId),
      User.findById(gigOwnerId),
    ]);

    if (!freelancer || !gigOwner) {
      throw new apiError("User not found", 404);
    }

    const result = await enhancedNotificationService.notifyProjectCompletion({
      freelancerId,
      freelancerEmail: freelancer.email,
      freelancerName: freelancer.name,
      gigOwnerId,
      gigOwnerEmail: gigOwner.email,
      gigOwnerName: gigOwner.name,
      projectTitle,
      projectId,
    });

    res
      .status(200)
      .json(
        new apiResponse(
          200,
          true,
          result,
          "Project completion notification sent successfully"
        )
      );
  }
);

// @desc    Trigger payment notification
// @route   POST /api/notifications/trigger/payment
// @access  Private
export const triggerPaymentNotification = asyncHandler(async (req, res) => {
  const { userId, amount, paymentType, transactionId, paymentId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new apiError("User not found", 404);
  }

  const result = await enhancedNotificationService.notifyPayment({
    userId,
    userEmail: user.email,
    userName: user.name,
    amount,
    paymentType,
    transactionId,
    paymentId,
  });

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        result,
        "Payment notification sent successfully"
      )
    );
});

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
export const getNotificationPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "notificationPreferences"
  );

  const defaultPreferences = {
    email: {
      comments: true,
      gigInvitations: true,
      applications: true,
      projectUpdates: true,
      payments: true,
      marketing: false,
    },
    push: {
      comments: true,
      gigInvitations: true,
      applications: true,
      projectUpdates: true,
      payments: true,
      marketing: false,
    },
  };

  const preferences = user.notificationPreferences || defaultPreferences;

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        preferences,
        "Notification preferences fetched successfully"
      )
    );
});

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const { email, push } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      notificationPreferences: {
        email: email || {},
        push: push || {},
      },
    },
    { new: true }
  ).select("notificationPreferences");

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        user.notificationPreferences,
        "Notification preferences updated successfully"
      )
    );
});

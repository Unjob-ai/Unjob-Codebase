// models/Conversation.js - Complete version with 14-day auto-archive
import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false, // Made optional since payment-initiated chats might not have application
    },
    status: {
      type: String,
      enum: ["active", "archived", "blocked", "pending", "closed"],
      default: "active",
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    // Payment-related fields
    paymentCompleted: {
      type: Boolean,
      default: false,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    isBusinessRelated: {
      type: Boolean,
      default: true,
    },
    // AUTO-CLOSE functionality (14-day archive system)
    autoCloseAt: {
      type: Date,
      default: null,
    },
    autoCloseReason: {
      type: String,
      enum: [
        "project_completion",
        "timeout",
        "manual",
        "project_submitted",
        "14_day_auto_archive",
      ],
      default: null,
    },
    autoCloseEnabled: {
      type: Boolean,
      default: false,
    },
    projectSubmittedAt: {
      type: Date,
      default: null,
    },
    // Project tracking
    hasProjectSubmission: {
      type: Boolean,
      default: false,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    metadata: {
      projectTitle: String,
      contractValue: Number,
      deadline: Date,
      paymentCompletedAt: Date,
      projectStartedAt: Date,
      projectStatus: {
        type: String,
        enum: [
          "not_started",
          "in_progress",
          "review",
          "completed",
          "cancelled",
          "submitted",
        ],
        default: "not_started",
      },
      // Auto-close tracking
      autoCloseWarningsSent: {
        type: Number,
        default: 0,
      },
      autoCloseHistory: [
        {
          scheduledAt: Date,
          reason: String,
          delayHours: Number,
          cancelled: { type: Boolean, default: false },
          cancelledReason: String,
          executedAt: Date,
        },
      ],
      // 14-day archive tracking
      autoArchiveScheduled: {
        type: Boolean,
        default: false,
      },
      autoArchiveReason: String,
      warningsShown: {
        type: Number,
        default: 0,
      },
      lastWarningAt: Date,
    },
    // Chat settings
    settings: {
      allowFileUploads: {
        type: Boolean,
        default: true,
      },
      allowProjectSubmissions: {
        type: Boolean,
        default: true,
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      autoCloseAfterSubmission: {
        type: Boolean,
        default: true, // Enable auto-close by default
      },
      autoCloseDelayHours: {
        type: Number,
        default: 336, // 14 days = 336 hours
        min: 1,
        max: 8760, // Max 1 year
      },
      isReadOnly: {
        type: Boolean,
        default: false,
      },
      readOnlyReason: String,
      archivedAt: Date,
      completedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only two participants per conversation
ConversationSchema.pre("save", function (next) {
  if (this.isNew && this.participants.length !== 2) {
    return next(new Error("Conversation must have exactly 2 participants"));
  }
  next();
});

// Method to check if conversation is active
ConversationSchema.methods.isActive = function () {
  return this.status === "active";
};

// Method to check if conversation should be auto-closed
ConversationSchema.methods.shouldAutoClose = function () {
  if (!this.autoCloseEnabled || !this.autoCloseAt) {
    return false;
  }
  return new Date() >= this.autoCloseAt;
};

// Method to schedule auto-close after project submission (14 days)
ConversationSchema.methods.scheduleAutoClose = function (
  reason = "project_submitted",
  delayHours = null
) {
  // Set 14 days (336 hours) as default for project submissions
  let delay;
  if (reason === "project_submitted") {
    delay = 336; // 14 days * 24 hours
  } else {
    delay = delayHours || this.settings.autoCloseDelayHours || 336;
  }

  const autoCloseTime = new Date(Date.now() + delay * 60 * 60 * 1000);

  this.autoCloseAt = autoCloseTime;
  this.autoCloseReason = reason;
  this.autoCloseEnabled = true;

  // Update metadata
  this.metadata = this.metadata || {};
  this.metadata.autoArchiveScheduled = true;
  this.metadata.autoArchiveReason = "14_day_project_completion_period";

  if (!this.metadata.autoCloseHistory) {
    this.metadata.autoCloseHistory = [];
  }

  this.metadata.autoCloseHistory.push({
    scheduledAt: new Date(),
    reason: reason,
    delayHours: delay,
  });

  console.log(
    `📅 Conversation ${
      this._id
    } scheduled to auto-archive in ${delay} hours (${Math.ceil(
      delay / 24
    )} days)`
  );
  return this.save();
};

// Method to cancel auto-close
ConversationSchema.methods.cancelAutoClose = function (reason = "manual") {
  if (
    this.metadata.autoCloseHistory &&
    this.metadata.autoCloseHistory.length > 0
  ) {
    const lastScheduled =
      this.metadata.autoCloseHistory[this.metadata.autoCloseHistory.length - 1];
    lastScheduled.cancelled = true;
    lastScheduled.cancelledReason = reason;
  }

  this.autoCloseAt = null;
  this.autoCloseReason = null;
  this.autoCloseEnabled = false;

  // Reset metadata
  if (this.metadata) {
    this.metadata.autoArchiveScheduled = false;
    this.metadata.autoArchiveReason = null;
  }

  console.log(
    `❌ Auto-archive cancelled for conversation ${this._id}. Reason: ${reason}`
  );
  return this.save();
};

// Method to execute auto-close (archive the conversation)
ConversationSchema.methods.executeAutoClose = function () {
  if (!this.shouldAutoClose()) {
    return Promise.resolve(this);
  }

  console.log(`🗄️ Auto-archiving conversation ${this._id}...`);

  // Archive the conversation instead of closing it
  this.status = "archived";
  this.autoCloseEnabled = false;
  this.settings.allowFileUploads = false;
  this.settings.allowProjectSubmissions = false;
  this.settings.isReadOnly = true;
  this.settings.readOnlyReason = "auto_archived_after_14_days";
  this.settings.archivedAt = new Date();

  // Update metadata
  if (this.metadata && this.metadata.autoCloseHistory) {
    const lastScheduled =
      this.metadata.autoCloseHistory[this.metadata.autoCloseHistory.length - 1];
    if (lastScheduled) {
      lastScheduled.executedAt = new Date();
    }
  }

  console.log(`✅ Conversation ${this._id} auto-archived successfully`);
  return this.save();
};

// Method to handle project submission and schedule 14-day archive
ConversationSchema.methods.onProjectSubmitted = function (projectId) {
  this.hasProjectSubmission = true;
  this.projectId = projectId;
  this.projectSubmittedAt = new Date();

  if (!this.metadata) {
    this.metadata = {};
  }
  this.metadata.projectStatus = "submitted";

  // Always schedule 14-day auto-archive after project submission
  console.log(
    `📋 Project submitted in conversation ${this._id}. Scheduling 14-day auto-archive...`
  );
  return this.scheduleAutoClose("project_submitted");
};

// Method to mark payment as completed
ConversationSchema.methods.markPaymentCompleted = function (paymentId, amount) {
  this.paymentCompleted = true;
  this.paymentId = paymentId;
  this.metadata = this.metadata || {};
  this.metadata.contractValue = amount;
  this.metadata.paymentCompletedAt = new Date();
  this.metadata.projectStatus = "in_progress";
  return this.save();
};

// Method to get other participant
ConversationSchema.methods.getOtherParticipant = function (currentUserId) {
  return this.participants.find(
    (p) => p.toString() !== currentUserId.toString()
  );
};

// Method to get time remaining before auto-archive (enhanced for 14 days)
ConversationSchema.methods.getAutoCloseTimeRemaining = function () {
  if (!this.autoCloseEnabled || !this.autoCloseAt) {
    return null;
  }

  const now = new Date();
  const timeRemaining = this.autoCloseAt.getTime() - now.getTime();

  if (timeRemaining <= 0) {
    return {
      expired: true,
      formattedTime: "Expired",
      hours: 0,
      minutes: 0,
      seconds: 0,
      days: 0,
      totalMinutes: 0,
      totalHours: 0,
      totalDays: 0,
    };
  }

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

  const totalHours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const totalDays = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));

  return {
    expired: false,
    days,
    hours,
    minutes,
    seconds,
    totalMinutes: Math.floor(timeRemaining / (1000 * 60)),
    totalHours,
    totalDays,
    formattedTime:
      days > 0
        ? `${days}d ${hours}h ${minutes}m`
        : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m ${seconds}s`,
    friendlyTime:
      days > 1
        ? `${days} days`
        : days === 1
        ? "1 day"
        : hours > 1
        ? `${hours} hours`
        : hours === 1
        ? "1 hour"
        : minutes > 1
        ? `${minutes} minutes`
        : "Less than a minute",
  };
};

// Method to check if conversation needs warning about upcoming archive
ConversationSchema.methods.needsArchiveWarning = function () {
  if (!this.autoCloseEnabled || !this.autoCloseAt) {
    return false;
  }

  const timeRemaining = this.getAutoCloseTimeRemaining();
  if (!timeRemaining || timeRemaining.expired) {
    return false;
  }

  const warningsShown = this.metadata?.warningsShown || 0;
  const lastWarningAt = this.metadata?.lastWarningAt;

  // Show warnings at 3 days, 1 day, and 1 hour before archive
  if (timeRemaining.totalDays <= 3 && warningsShown === 0) {
    return {
      type: "3_days",
      message: "This conversation will be archived in 3 days",
    };
  }

  if (timeRemaining.totalDays <= 1 && warningsShown <= 1) {
    return {
      type: "1_day",
      message: "This conversation will be archived in 1 day",
    };
  }

  if (timeRemaining.totalHours <= 1 && warningsShown <= 2) {
    return {
      type: "1_hour",
      message: "This conversation will be archived in 1 hour",
    };
  }

  return false;
};

// Method to record warning shown
ConversationSchema.methods.recordWarningShown = function (warningType) {
  if (!this.metadata) {
    this.metadata = {};
  }

  this.metadata.warningsShown = (this.metadata.warningsShown || 0) + 1;
  this.metadata.lastWarningAt = new Date();

  return this.save();
};

// Static method to find conversations that need auto-archiving
ConversationSchema.statics.findExpiredConversations = function () {
  return this.find({
    autoCloseEnabled: true,
    autoCloseAt: { $lte: new Date() },
    status: "active",
  });
};

// Static method to find conversations that need archive warnings
ConversationSchema.statics.findConversationsNeedingWarnings = function () {
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  return this.find({
    autoCloseEnabled: true,
    autoCloseAt: { $lte: threeDaysFromNow },
    status: "active",
    $or: [
      { "metadata.warningsShown": { $exists: false } },
      { "metadata.warningsShown": { $lt: 3 } },
    ],
  });
};

// Static method to process auto-close for expired conversations
ConversationSchema.statics.processAutoClose = async function () {
  const expiredConversations = await this.findExpiredConversations();
  console.log(
    `🔄 Processing ${expiredConversations.length} conversations for auto-archive`
  );

  const results = [];
  for (const conversation of expiredConversations) {
    try {
      await conversation.executeAutoClose();
      results.push({
        id: conversation._id,
        success: true,
        archivedAt: new Date(),
      });
    } catch (error) {
      console.error(
        `Failed to auto-archive conversation ${conversation._id}:`,
        error
      );
      results.push({
        id: conversation._id,
        success: false,
        error: error.message,
      });
    }
  }

  console.log(
    `✅ Auto-archive processing complete. ${
      results.filter((r) => r.success).length
    }/${results.length} successful`
  );
  return results;
};

// Indexes for better query performance
ConversationSchema.index({ participants: 1, lastActivity: -1 });
ConversationSchema.index({ gigId: 1 });
ConversationSchema.index({ status: 1 });
ConversationSchema.index({ autoCloseEnabled: 1, autoCloseAt: 1, status: 1 });
ConversationSchema.index({ projectSubmittedAt: -1 });
ConversationSchema.index({ "metadata.autoArchiveScheduled": 1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);

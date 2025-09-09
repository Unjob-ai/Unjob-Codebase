// models/Notification.js
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        // Post interactions
        "post_like",
        "post_comment",
        "post_mention",
        "post_share",

        // Gig/Application related
        "gig_application",
        "priority_gig_application",
        "gig_accepted",
        "gig_rejected",
        "gig_completed",
        "gig_invitation",
        "gig_invitation_accepted",
        "gig_invitation_declined",
        "post_gig_invitation",
        "application_status_update",

        // Project related
        "project_submission",
        "project_status_update",
        "project_milestone",
        "project_deadline_reminder",

        // Payment related
        "payment",
        "payment_completed",
        "payment_processing",
        "payment_failed",
        "payment_update",
        "payment_request_submitted",
        "payment_request_confirmation",
        "payment_request_approved",
        "payment_request_rejected",
        "withdrawal_requested",
        "withdrawal_approved",
        "withdrawal_rejected",

        // Subscription related
        "subscription_activated",
        "subscription_expired",
        "subscription_reminder",
        "subscription_cancelled",
        "subscription_renewed",
        "subscription_upgrade",

        // Messages
        "message",
        "message_unread_reminder",

        // System notifications
        "welcome",
        "profile_incomplete",
        "verification_required",
        "account_suspended",
        "system_maintenance",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedId: mongoose.Schema.Types.ObjectId,
    relatedModel: {
      type: String,
      enum: [
        "Post",
        "Gig",
        "GigInvitation",
        "Application",
        "Project",
        "Payment",
        "Subscription",
        "Message",
      ],
    },
    actionUrl: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    avatar: String,
    senderName: String,
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
NotificationSchema.index({ user: 1, read: 1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, type: 1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);

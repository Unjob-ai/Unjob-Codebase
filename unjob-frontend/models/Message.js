// models/Message.js - Enhanced version
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: function () {
        return this.type === "text" || this.type === "system";
      },
    },
    type: {
      type: String,
      enum: [
        "text",
        "image",
        "file",
        "voice",
        "system", // ✅ For system messages like payment confirmations
        "project_submission", // ✅ For project submissions
        "payment_notification", // ✅ For payment-related messages
      ],
      default: "text",
    },
    fileUrl: {
      type: String,
      required: function () {
        return (
          this.type === "file" || this.type === "image" || this.type === "voice"
        );
      },
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    // ✅ Project submission specific fields
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    projectData: {
      title: String,
      description: String,
      files: [
        {
          name: String,
          url: String,
          type: String,
          size: Number,
        },
      ],
    },
    // ✅ Payment notification specific fields
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
    paymentData: {
      amount: Number,
      status: String,
      gigTitle: String,
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // ✅ Message status for delivery confirmation
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read", "failed"],
      default: "sent",
    },
    editedAt: Date,
    isEdited: {
      type: Boolean,
      default: false,
    },
    // ✅ System message styling
    isSystemMessage: {
      type: Boolean,
      default: false,
    },
    // ✅ Message priority for important notifications
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Pre-save middleware to set system message flag
MessageSchema.pre("save", function (next) {
  if (this.type === "system" || this.type === "payment_notification") {
    this.isSystemMessage = true;
    this.priority = "high";
  }
  next();
});

// ✅ Method to mark message as read by a user
MessageSchema.methods.markAsReadBy = function (userId) {
  const existingRead = this.readBy.find(
    (r) => r.user.toString() === userId.toString()
  );
  if (!existingRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date(),
    });
    this.status = "read";
  }
  return this.save();
};

// ✅ Method to check if message is read by a user
MessageSchema.methods.isReadBy = function (userId) {
  return this.readBy.some((r) => r.user.toString() === userId.toString());
};

// ✅ Virtual for message age
MessageSchema.virtual("age").get(function () {
  return Date.now() - this.createdAt;
});

// ✅ Virtual for formatted time
MessageSchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diffInMs = now - this.createdAt;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays}d ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours}h ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes}m ago`;
  } else {
    return "Just now";
  }
});

// Index for better query performance
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ type: 1 });
MessageSchema.index({ status: 1 });
MessageSchema.index({ isSystemMessage: 1 });

export default mongoose.models.Message ||
  mongoose.model("Message", MessageSchema);

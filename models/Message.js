// models/Message.js
const mongoose = require("mongoose");

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
        "system",
        "project_submission",
        "payment_notification",
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
    fileMimeType: {
      type: String,
    },

    // Project submission specific fields
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

    // Payment notification specific fields
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

    // Message status for delivery confirmation
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read", "failed"],
      default: "sent",
    },

    // Message reactions
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: {
          type: String,
          required: true,
        },
        reactedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Message editing
    editedAt: Date,
    isEdited: {
      type: Boolean,
      default: false,
    },
    originalContent: String,

    // System message styling
    isSystemMessage: {
      type: Boolean,
      default: false,
    },

    // Message priority for important notifications
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // Reply functionality
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    // Forward functionality
    forwardedFrom: {
      originalMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      originalSender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Message metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to set system message flag
MessageSchema.pre("save", function (next) {
  if (this.type === "system" || this.type === "payment_notification") {
    this.isSystemMessage = true;
    this.priority = "high";
  }

  // Set original content for edited messages
  if (this.isModified("content") && !this.isNew && !this.originalContent) {
    this.originalContent = this.content;
    this.isEdited = true;
    this.editedAt = new Date();
  }

  next();
});

// Instance methods
MessageSchema.methods.markAsReadBy = function (userId) {
  const existingRead = this.readBy.find(
    (read) => read.user.toString() === userId.toString()
  );

  if (!existingRead) {
    this.readBy.push({ user: userId });
    this.status = "read";
  }

  return this.save();
};

MessageSchema.methods.addReaction = function (userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    (reaction) => reaction.user.toString() !== userId.toString()
  );

  // Add new reaction
  this.reactions.push({ user: userId, emoji });

  return this.save();
};

MessageSchema.methods.removeReaction = function (userId) {
  this.reactions = this.reactions.filter(
    (reaction) => reaction.user.toString() !== userId.toString()
  );

  return this.save();
};

MessageSchema.methods.editContent = function (newContent) {
  if (!this.originalContent) {
    this.originalContent = this.content;
  }

  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();

  return this.save();
};

MessageSchema.methods.softDelete = function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;

  return this.save();
};

MessageSchema.methods.isReadBy = function (userId) {
  return this.readBy.some((read) => read.user.toString() === userId.toString());
};

// Static methods
MessageSchema.statics.findUnreadInConversation = function (
  conversationId,
  userId
) {
  return this.find({
    conversationId,
    sender: { $ne: userId },
    "readBy.user": { $ne: userId },
    isDeleted: false,
  });
};

MessageSchema.statics.markAllAsRead = function (conversationId, userId) {
  return this.updateMany(
    {
      conversationId,
      sender: { $ne: userId },
      "readBy.user": { $ne: userId },
      isDeleted: false,
    },
    {
      $addToSet: {
        readBy: {
          user: userId,
          readAt: new Date(),
        },
      },
      $set: { status: "read" },
    }
  );
};

MessageSchema.statics.getConversationMessages = function (
  conversationId,
  options = {}
) {
  const { page = 1, limit = 50, userId = null } = options;
  const skip = (page - 1) * limit;

  const query = {
    conversationId,
    isDeleted: false,
  };

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "name image")
    .populate("replyTo", "content sender type")
    .lean();
};

MessageSchema.statics.getUnreadCount = function (conversationId, userId) {
  return this.countDocuments({
    conversationId,
    sender: { $ne: userId },
    "readBy.user": { $ne: userId },
    isDeleted: false,
  });
};

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, "readBy.user": 1 });
MessageSchema.index({ type: 1 });
MessageSchema.index({ status: 1 });
MessageSchema.index({ projectId: 1 });
MessageSchema.index({ paymentId: 1 });
MessageSchema.index({ isDeleted: 1, createdAt: -1 });
MessageSchema.index({ replyTo: 1 });

module.exports = mongoose.model("Message", MessageSchema);

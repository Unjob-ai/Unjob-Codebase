// models/MessageModel.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type !== "system";
      },
    },
    content: {
      type: String,
      required: function () {
        return this.type === "text" && !this.fileUrl;
      },
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "text",
        "file",
        "image",
        "video",
        "audio",
        "document",
        "system",
        "negotiation",
        "project_submission",
        "payment_confirmation",
      ],
      default: "text",
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
    },
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // File-related fields
    fileUrl: String,
    fileName: String,
    fileSize: String,
    fileType: String,
    fileMimeType: String,

    // Project submission fields
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    // Negotiation-related fields
    negotiationData: {
      _id: mongoose.Schema.Types.ObjectId,
      proposedPrice: Number,
      timeline: String,
      additionalTerms: String,
      proposedBy: {
        type: String,
        enum: ["freelancer", "client", "hiring"],
      },
      proposedAt: Date,
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "countered"],
        default: "pending",
      },
      responseAction: String,
      respondedAt: Date,
      respondedBy: String,
      rejectionReason: String,
      priceChange: {
        amount: Number,
        percentage: Number,
        type: String,
      },
      previousPrice: Number,
      expiresAt: Date,
    },

    // System message fields
    isSystemMessage: {
      type: Boolean,
      default: false,
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
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

    // Edit history
    editHistory: [
      {
        editedAt: Date,
        originalContent: String,
        editReason: String,
      },
    ],

    // Reply/thread functionality
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    // Reactions
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        emoji: String,
        reactedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ "readBy.user": 1 });
messageSchema.index({ type: 1 });
messageSchema.index({ isDeleted: 1 });

// Virtual for unread status
messageSchema.virtual("isUnread").get(function () {
  return this.status !== "read";
});

// Static methods
messageSchema.statics.getConversationMessages = async function (
  conversationId,
  options = {}
) {
  const { page = 1, limit = 50, userId } = options;
  const skip = (page - 1) * limit;

  const messages = await this.find({
    conversationId,
    isDeleted: false,
  })
    .populate("sender", "name image role")
    .populate("replyTo", "content sender")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Mark messages as read if userId is provided
  if (userId) {
    const unreadMessageIds = messages
      .filter(
        (msg) =>
          msg.sender?._id?.toString() !== userId.toString() &&
          !msg.readBy.some((read) => read.user.toString() === userId.toString())
      )
      .map((msg) => msg._id);

    if (unreadMessageIds.length > 0) {
      await this.updateMany(
        { _id: { $in: unreadMessageIds } },
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
    }
  }

  return messages;
};

messageSchema.statics.getUnreadCount = async function (conversationId, userId) {
  return await this.countDocuments({
    conversationId,
    sender: { $ne: userId },
    "readBy.user": { $ne: userId },
    isDeleted: false,
  });
};

messageSchema.statics.markAllAsRead = async function (conversationId, userId) {
  return await this.updateMany(
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

// Static method to create negotiation messages
messageSchema.statics.createNegotiationMessage = async function (
  conversationId,
  senderId,
  negotiationData
) {
  const priceChangeText = negotiationData.priceChange
    ? `${
        negotiationData.priceChange.type === "increase"
          ? "increased"
          : negotiationData.priceChange.type === "decrease"
          ? "decreased"
          : "set"
      } by ₹${negotiationData.priceChange.amount.toLocaleString()}`
    : `set to ₹${negotiationData.proposedPrice.toLocaleString()}`;

  let content;
  if (negotiationData.isCounterOffer) {
    content = `🔄 **COUNTER OFFER**\n\nProposed price: ₹${negotiationData.proposedPrice.toLocaleString()}\n\n`;
    if (negotiationData.timeline) {
      content += `Timeline: ${negotiationData.timeline}\n`;
    }
    if (negotiationData.additionalTerms) {
      content += `Additional Terms: ${negotiationData.additionalTerms}\n`;
    }
    content += `\nThis offer expires in 7 days.`;
  } else {
    content = `💰 **PRICE PROPOSAL**\n\nI would like to propose ₹${negotiationData.proposedPrice.toLocaleString()} for this project.\n\n`;
    if (negotiationData.timeline) {
      content += `Timeline: ${negotiationData.timeline}\n`;
    }
    if (negotiationData.additionalTerms) {
      content += `Additional Terms: ${negotiationData.additionalTerms}\n`;
    }
    content += `\nThis offer expires in 7 days.`;
  }

  const message = new this({
    conversationId,
    sender: senderId,
    content,
    type: "negotiation",
    negotiationData: {
      ...negotiationData,
      negotiationId: negotiationData._id,
    },
    metadata: {
      systemMessageType: negotiationData.isCounterOffer
        ? "negotiation_countered"
        : "negotiation_proposed",
      isCounterOffer: negotiationData.isCounterOffer || false,
      originalOfferId: negotiationData.originalOfferId,
      counterOfferNumber: negotiationData.counterOfferNumber || 1,
    },
    priority: "urgent",
    readBy: [
      {
        user: senderId,
        readAt: new Date(),
      },
    ],
  });

  return await message.save();
};

// Instance methods
messageSchema.methods.softDelete = async function (deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return await this.save();
};

messageSchema.methods.addReaction = async function (userId, emoji) {
  const existingReaction = this.reactions.find(
    (reaction) => reaction.user.toString() === userId.toString()
  );

  if (existingReaction) {
    existingReaction.emoji = emoji;
    existingReaction.reactedAt = new Date();
  } else {
    this.reactions.push({
      user: userId,
      emoji,
      reactedAt: new Date(),
    });
  }

  return await this.save();
};

messageSchema.methods.removeReaction = async function (userId) {
  this.reactions = this.reactions.filter(
    (reaction) => reaction.user.toString() !== userId.toString()
  );
  return await this.save();
};

messageSchema.methods.editContent = async function (
  newContent,
  editReason = ""
) {
  this.editHistory.push({
    editedAt: new Date(),
    originalContent: this.content,
    editReason,
  });

  this.content = newContent;
  return await this.save();
};

// Pre-save middleware
messageSchema.pre("save", function (next) {
  if (this.isNew) {
    // Ensure sender is in readBy for their own messages
    if (
      this.sender &&
      !this.readBy.some((read) => read.user.equals(this.sender))
    ) {
      this.readBy.push({
        user: this.sender,
        readAt: new Date(),
      });
    }

    // Set system message flag
    if (this.type === "system") {
      this.isSystemMessage = true;
    }
  }
  next();
});

// Post-save middleware to emit socket events
messageSchema.post("save", async function (doc) {
  try {
    // Import here to avoid circular dependency
    const { default: socketEventHandlers } = await import(
      "../Sockets/messageHandlers.js"
    );

    if (socketEventHandlers && socketEventHandlers.emitNewMessage) {
      socketEventHandlers.emitNewMessage(doc);
    }
  } catch (error) {
    console.error("Error emitting message event:", error);
  }
});

export const Message = mongoose.model("Message", messageSchema);

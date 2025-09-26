// models/ConversationModel.js
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
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
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        "active",
        "archived",
        "blocked",
        "closed",
        "completed",
        "cancelled",
        "negotiating",
        "payment_pending",
        "payment_processing",
        "in_progress",
        "under_review",
        "deleted",
        "permanently_deleted",
      ],
      default: "active",
    },
    type: {
      type: String,
      enum: ["direct", "gig_related", "project", "support"],
      default: "direct",
    },
    title: String,

    // Settings for conversation behavior
    settings: {
      allowFileUploads: {
        type: Boolean,
        default: true,
      },
      allowProjectSubmissions: {
        type: Boolean,
        default: true,
      },
      allowNegotiation: {
        type: Boolean,
        default: true,
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      autoCloseAfterSubmission: {
        type: Boolean,
        default: false,
      },
      autoCloseDelayHours: {
        type: Number,
        default: 24,
      },
      isReadOnly: {
        type: Boolean,
        default: false,
      },
      readOnlyReason: String,
      completedAt: Date,
    },

    // Project and payment metadata
    metadata: {
      projectTitle: String,
      contractValue: Number,
      finalAgreedPrice: Number,
      deadline: Date,
      projectStatus: String,
      paymentCompleted: Boolean,
      paymentCompletedAt: Date,
      paymentProcessed: Boolean,
      paymentAmount: Number,
      projectStartedAt: Date,
      projectSubmittedAt: Date,
      finalStatus: String,
      initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      // Negotiation tracking
      negotiationEnabled: {
        type: Boolean,
        default: true,
      },
      negotiationPhase: {
        type: String,
        enum: ["initial", "active", "finalizing", "completed"],
        default: "initial",
      },
      totalNegotiations: {
        type: Number,
        default: 0,
      },
      currentNegotiation: {
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
          enum: ["pending", "accepted", "rejected", "expired"],
          default: "pending",
        },
        responseAction: String,
        respondedAt: Date,
        respondedBy: String,
        rejectionReason: String,
        acceptedBy: String,
        acceptedAt: Date,
        completedAt: Date,
        priceChange: {
          amount: Number,
          percentage: Number,
          type: String,
        },
        previousPrice: Number,
        expiresAt: Date,
        counterOfferNumber: {
          type: Number,
          default: 1,
        },
      },
      negotiationHistory: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          proposedPrice: Number,
          timeline: String,
          additionalTerms: String,
          proposedBy: String,
          proposedAt: Date,
          status: String,
          respondedAt: Date,
          respondedBy: String,
          acceptedAt: Date,
          rejectionReason: String,
          priceChange: mongoose.Schema.Types.Mixed,
          counterOfferNumber: Number,
          expiresAt: Date,
        },
      ],

      // Payment tracking
      paymentOrderId: String,
      paymentInitiated: Date,
      agreedAmount: Number,
      platformFee: Number,
      totalPayable: Number,

      // Auto-close functionality
      autoCloseEnabled: {
        type: Boolean,
        default: false,
      },
      autoCloseAt: Date,
      autoCloseReason: String,
      autoCloseWarningsSent: {
        type: Number,
        default: 0,
      },

      // Other metadata
      relatedToGig: {
        type: Boolean,
        default: false,
      },
      originalBudget: Number,
    },

    // Auto-close functionality
    autoCloseEnabled: {
      type: Boolean,
      default: false,
    },
    autoCloseAt: Date,
    autoCloseReason: String,
    autoClose: {
      warningsShown: {
        type: Number,
        default: 0,
      },
      lastWarningAt: Date,
      delayRequested: {
        type: Boolean,
        default: false,
      },
      delayRequestedAt: Date,
      delayRequestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Archival and deletion
    archivedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        archivedAt: Date,
      },
    ],
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastActivity: -1 });
conversationSchema.index({ status: 1 });
conversationSchema.index({ gigId: 1 });
conversationSchema.index({ "metadata.negotiationEnabled": 1 });
conversationSchema.index({ isDeleted: 1 });

// Virtual properties
conversationSchema.virtual("isActive").get(function () {
  return this.status === "active";
});

conversationSchema.virtual("canNegotiate").get(function () {
  return (
    this.settings?.allowNegotiation &&
    this.metadata?.negotiationEnabled &&
    !this.settings?.isReadOnly &&
    this.status !== "completed" &&
    this.status !== "cancelled"
  );
});

conversationSchema.virtual("totalMessages").get(function () {
  // This should be populated when needed
  return this._totalMessages || 0;
});

// Static methods
conversationSchema.statics.findByParticipants = async function (
  participant1Id,
  participant2Id,
  gigId = null
) {
  const query = {
    participants: { $all: [participant1Id, participant2Id] },
    isDeleted: false,
  };

  if (gigId) {
    query.gigId = gigId;
  }

  return await this.findOne(query);
};

conversationSchema.statics.getUserConversations = async function (
  userId,
  options = {}
) {
  const {
    page = 1,
    limit = 20,
    status = "active",
    includeArchived = false,
  } = options;

  const skip = (page - 1) * limit;

  const query = {
    participants: userId,
    isDeleted: false,
  };

  if (!includeArchived && status === "active") {
    query.status = { $nin: ["archived", "deleted", "permanently_deleted"] };
  } else if (status && status !== "all") {
    query.status = status;
  }

  return await this.find(query)
    .populate("participants", "name image role profile.companyName")
    .populate("gigId", "title budget category")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "name image",
      },
    })
    .sort({ lastActivity: -1 })
    .skip(skip)
    .limit(limit);
};

// Instance methods for negotiation management
conversationSchema.methods.startNegotiation = async function (negotiationData) {
  // Move current negotiation to history if exists
  if (this.metadata?.currentNegotiation) {
    if (!this.metadata.negotiationHistory) {
      this.metadata.negotiationHistory = [];
    }
    this.metadata.negotiationHistory.push({
      ...this.metadata.currentNegotiation,
      completedAt: new Date(),
    });
  }

  // Set new current negotiation
  this.metadata.currentNegotiation = negotiationData;
  this.metadata.totalNegotiations = (this.metadata.totalNegotiations || 0) + 1;
  this.metadata.negotiationPhase = "active";
  this.status = "negotiating";
  this.lastActivity = new Date();

  return await this.save();
};

conversationSchema.methods.acceptNegotiation = async function (acceptedBy) {
  if (!this.metadata?.currentNegotiation) {
    throw new Error("No active negotiation to accept");
  }

  this.metadata.currentNegotiation.status = "accepted";
  this.metadata.currentNegotiation.acceptedBy = acceptedBy;
  this.metadata.currentNegotiation.acceptedAt = new Date();
  this.metadata.currentNegotiation.completedAt = new Date();
  this.metadata.negotiationPhase = "completed";
  this.metadata.finalAgreedPrice =
    this.metadata.currentNegotiation.proposedPrice;

  // Move to payment pending
  this.status = "payment_pending";
  this.lastActivity = new Date();

  return await this.save();
};

conversationSchema.methods.rejectNegotiation = async function (
  rejectedBy,
  reason
) {
  if (!this.metadata?.currentNegotiation) {
    throw new Error("No active negotiation to reject");
  }

  this.metadata.currentNegotiation.status = "rejected";
  this.metadata.currentNegotiation.respondedBy = rejectedBy;
  this.metadata.currentNegotiation.respondedAt = new Date();
  this.metadata.currentNegotiation.rejectionReason = reason;
  this.metadata.currentNegotiation.completedAt = new Date();

  // Move current to history
  if (!this.metadata.negotiationHistory) {
    this.metadata.negotiationHistory = [];
  }
  this.metadata.negotiationHistory.push({
    ...this.metadata.currentNegotiation,
  });

  // Clear current negotiation
  this.metadata.currentNegotiation = null;
  this.lastActivity = new Date();

  return await this.save();
};

conversationSchema.methods.enableAutoClose = async function (
  reason = "project_completed",
  delayHours = 24
) {
  this.autoCloseEnabled = true;
  this.autoCloseAt = new Date(Date.now() + delayHours * 60 * 60 * 1000);
  this.autoCloseReason = reason;
  this.autoClose = {
    warningsShown: 0,
    lastWarningAt: null,
    delayRequested: false,
  };

  return await this.save();
};

conversationSchema.methods.delayAutoClose = async function (
  additionalHours = 7,
  requestedBy
) {
  if (!this.autoCloseEnabled) {
    throw new Error("Auto-close is not enabled for this conversation");
  }

  this.autoCloseAt = new Date(
    this.autoCloseAt.getTime() + additionalHours * 60 * 60 * 1000
  );
  this.autoClose.delayRequested = true;
  this.autoClose.delayRequestedAt = new Date();
  this.autoClose.delayRequestedBy = requestedBy;

  return await this.save();
};

conversationSchema.methods.markAsReadOnly = async function (
  reason,
  completedAt
) {
  this.settings.isReadOnly = true;
  this.settings.readOnlyReason = reason;
  this.settings.completedAt = completedAt || new Date();
  this.status = "completed";
  this.lastActivity = new Date();

  // Disable various actions
  this.settings.allowFileUploads = false;
  this.settings.allowProjectSubmissions = false;
  this.settings.allowNegotiation = false;
  this.metadata.negotiationEnabled = false;

  return await this.save();
};

conversationSchema.methods.archiveForUser = async function (userId) {
  const existingArchive = this.archivedBy.find(
    (archive) => archive.user.toString() === userId.toString()
  );

  if (!existingArchive) {
    this.archivedBy.push({
      user: userId,
      archivedAt: new Date(),
    });
    await this.save();
  }

  return this;
};

conversationSchema.methods.unarchiveForUser = async function (userId) {
  this.archivedBy = this.archivedBy.filter(
    (archive) => archive.user.toString() !== userId.toString()
  );

  await this.save();
  return this;
};

conversationSchema.methods.isArchivedForUser = function (userId) {
  return this.archivedBy.some(
    (archive) => archive.user.toString() === userId.toString()
  );
};

conversationSchema.methods.softDelete = async function (deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.status = "deleted";

  return await this.save();
};

conversationSchema.methods.getOtherParticipant = function (currentUserId) {
  return this.participants.find(
    (participant) => participant._id.toString() !== currentUserId.toString()
  );
};

conversationSchema.methods.canUserAccess = function (userId) {
  return (
    this.participants.some(
      (participant) => participant._id.toString() === userId.toString()
    ) && !this.isDeleted
  );
};

// Pre-save middleware
conversationSchema.pre("save", function (next) {
  if (this.isModified("lastMessage") || this.isModified("participants")) {
    this.lastActivity = new Date();
  }

  // Sync settings and metadata
  if (this.isModified("settings.allowNegotiation")) {
    if (!this.metadata) this.metadata = {};
    this.metadata.negotiationEnabled = this.settings.allowNegotiation;
  }

  next();
});

// Post-save middleware to emit socket events
conversationSchema.post("save", async function (doc) {
  try {
    // Import here to avoid circular dependency
    const { default: socketEventHandlers } = await import(
      "../Sockets/conversationHandlers.js"
    );

    if (socketEventHandlers && socketEventHandlers.emitConversationUpdate) {
      socketEventHandlers.emitConversationUpdate(doc);
    }
  } catch (error) {
    console.error("Error emitting conversation event:", error);
  }
});

export const Conversation = mongoose.model("Conversation", conversationSchema);

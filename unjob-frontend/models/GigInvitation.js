// /models/GigInvitation.js - MongoDB model for gig invitations
import mongoose from "mongoose";

const GigInvitationSchema = new mongoose.Schema(
  {
    // Core relationships
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    hiringUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: false, // Optional for custom gig invitations
      index: true,
    },

    // Invitation type
    invitationType: {
      type: String,
      enum: ["existing_gig", "custom_gig"],
      required: true,
      default: "existing_gig",
    },

    // Gig details (stored here for custom gigs or as cache for existing gigs)
    gigTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    gigDescription: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    budget: {
      type: Number,
      required: true,
      min: 100,
    },
    timeline: {
      type: String,
      maxlength: 100,
    },
    category: {
      type: String,
      maxlength: 100,
    },

    // Custom gig data (for invitations that create new gigs)
    customGigData: {
      subCategory: String,
      tags: [String],
      requirements: String,
      deliverables: [String],
      location: String,
      workType: {
        type: String,
        enum: ["remote", "onsite", "hybrid"],
        default: "remote",
      },
      urgency: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
      },
      skills: [String],
      experienceLevel: {
        type: String,
        enum: ["entry", "intermediate", "expert", "any"],
        default: "any",
      },
    },

    // Messages
    personalMessage: {
      type: String,
      maxlength: 1000,
      trim: true,
    },
    freelancerResponse: {
      type: String,
      maxlength: 1000,
      trim: true,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired", "withdrawn"],
      default: "pending",
      index: true,
    },

    // Timestamps
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    respondedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from creation
      index: true,
    },

    // Metadata
    metadata: {
      sourcePost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post", // If invitation came from swiping on a post
      },
      swipeData: {
        swipedAt: Date,
        deviceInfo: String,
      },
      viewedAt: Date,
      remindersSent: {
        type: Number,
        default: 0,
      },
      priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
      },
    },

    // Conversation thread (if they start discussing)
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },

    // Analytics
    analytics: {
      viewCount: { type: Number, default: 0 },
      clickCount: { type: Number, default: 0 },
      responseTime: Number, // Time taken to respond in milliseconds
    },
  },
  {
    timestamps: true,
    collection: "giginvitations",
  }
);

// Compound indexes for efficient querying
GigInvitationSchema.index({ freelancer: 1, status: 1 });
GigInvitationSchema.index({ hiringUser: 1, status: 1 });
GigInvitationSchema.index(
  { freelancer: 1, hiringUser: 1, gig: 1 },
  { unique: true, sparse: true }
);
GigInvitationSchema.index({ status: 1, expiresAt: 1 });
GigInvitationSchema.index({ createdAt: -1 });

// Virtual for display budget
GigInvitationSchema.virtual("displayBudget").get(function () {
  if (this.budget >= 100000) {
    return `₹${(this.budget / 100000).toFixed(1)}L`;
  } else if (this.budget >= 1000) {
    return `₹${(this.budget / 1000).toFixed(1)}K`;
  } else {
    return `₹${this.budget}`;
  }
});

// Virtual for time remaining
GigInvitationSchema.virtual("timeRemaining").get(function () {
  if (!this.expiresAt) return null;

  const now = new Date();
  const timeLeft = this.expiresAt - now;

  if (timeLeft <= 0) return "Expired";

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;

  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m left`;
});

// Virtual for checking if expired
GigInvitationSchema.virtual("isExpired").get(function () {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Pre-save middleware to handle expiration
GigInvitationSchema.pre("save", function (next) {
  // Auto-expire if past expiration date
  if (this.isExpired && this.status === "pending") {
    this.status = "expired";
  }

  // Set response time if status changed to accepted/declined
  if (
    (this.status === "accepted" || this.status === "declined") &&
    !this.analytics.responseTime &&
    this.respondedAt
  ) {
    this.analytics.responseTime = this.respondedAt - this.createdAt;
  }

  next();
});

// Static methods
GigInvitationSchema.statics.findPendingForFreelancer = function (freelancerId) {
  return this.find({
    freelancer: freelancerId,
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .populate("hiringUser", "name email image profile")
    .populate("gig", "title category budget")
    .sort({ createdAt: -1 });
};

GigInvitationSchema.statics.findByHiringUser = function (
  hiringUserId,
  status = null
) {
  const query = { hiringUser: hiringUserId };
  if (status) query.status = status;

  return this.find(query)
    .populate("freelancer", "name email image profile")
    .populate("gig", "title category budget")
    .sort({ createdAt: -1 });
};

GigInvitationSchema.statics.getInvitationStats = function (userId, userRole) {
  const matchStage =
    userRole === "freelancer" ? { freelancer: userId } : { hiringUser: userId };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$analytics.responseTime" },
      },
    },
  ]);
};

// Instance methods
GigInvitationSchema.methods.markAsViewed = function () {
  this.metadata.viewedAt = new Date();
  this.analytics.viewCount += 1;
  return this.save();
};

GigInvitationSchema.methods.incrementClick = function () {
  this.analytics.clickCount += 1;
  return this.save();
};

GigInvitationSchema.methods.canBeAccepted = function () {
  return this.status === "pending" && !this.isExpired;
};

GigInvitationSchema.methods.withdraw = function () {
  if (this.status !== "pending") {
    throw new Error("Can only withdraw pending invitations");
  }
  this.status = "withdrawn";
  return this.save();
};

// Clean up expired invitations (for background job)
GigInvitationSchema.statics.expireOldInvitations = function () {
  return this.updateMany(
    {
      status: "pending",
      expiresAt: { $lt: new Date() },
    },
    { status: "expired" }
  );
};

const GigInvitation =
  mongoose.models.GigInvitation ||
  mongoose.model("GigInvitation", GigInvitationSchema);

export default GigInvitation;

// models/Project.js
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
      required: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    description: {
      type: String,
      required: true,
      maxLength: 2000,
    },
    files: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: [
        "submitted",
        "under_review",
        "revision_requested",
        "approved",
        "rejected",
      ],
      default: "submitted",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    companyFeedback: {
      type: String,
      maxLength: 1000,
    },
    revisionNotes: [
      {
        note: {
          type: String,
          required: true,
          maxLength: 1000,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    iterations: {
      current: {
        type: Number,
        default: 1,
      },
      maximum: {
        type: Number,
        default: 3,
      },
      remaining: {
        type: Number,
        default: 2,
      },
    },
    milestones: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        dueDate: Date,
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed", "overdue"],
          default: "pending",
        },
        completedAt: Date,
        payment: {
          amount: Number,
          status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
          },
          paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
          },
        },
      },
    ],
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    estimatedCompletion: Date,
    actualCompletion: Date,
    rating: {
      companyRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      freelancerRating: {
        type: Number,
        min: 1,
        max: 5,
      },
      companyReview: String,
      freelancerReview: String,
    },
    payment: {
      amount: {
        type: Number,
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "escrowed", "released", "disputed"],
        default: "pending",
      },
      escrowedAt: Date,
      releasedAt: Date,
      paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
    },
    communication: {
      lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      lastActivity: Date,
      unreadCount: {
        company: {
          type: Number,
          default: 0,
        },
        freelancer: {
          type: Number,
          default: 0,
        },
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
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

// Middleware
projectSchema.pre("save", function (next) {
  // Update remaining iterations
  if (
    this.isModified("iterations.current") ||
    this.isModified("iterations.maximum")
  ) {
    this.iterations.remaining = Math.max(
      0,
      this.iterations.maximum - this.iterations.current
    );
  }

  // Set completion date when approved
  if (
    this.isModified("status") &&
    this.status === "approved" &&
    !this.actualCompletion
  ) {
    this.actualCompletion = new Date();
  }

  next();
});

// Instance methods
projectSchema.methods.addRevisionNote = function (note, userId) {
  this.revisionNotes.push({
    note,
    addedBy: userId,
  });
  return this.save();
};

projectSchema.methods.updateStatus = function (newStatus, feedback = null) {
  this.status = newStatus;
  this.reviewedAt = new Date();

  if (feedback) {
    this.companyFeedback = feedback;
  }

  if (newStatus === "revision_requested") {
    this.iterations.current += 1;
    this.iterations.remaining = Math.max(
      0,
      this.iterations.maximum - this.iterations.current
    );
  }

  return this.save();
};

projectSchema.methods.addMilestone = function (milestoneData) {
  this.milestones.push(milestoneData);
  return this.save();
};

projectSchema.methods.updateMilestone = function (milestoneId, updateData) {
  const milestone = this.milestones.id(milestoneId);
  if (!milestone) {
    throw new Error("Milestone not found");
  }

  Object.assign(milestone, updateData);

  if (updateData.status === "completed") {
    milestone.completedAt = new Date();
  }

  return this.save();
};

projectSchema.methods.canRequestRevision = function () {
  return this.iterations.remaining > 0 && this.status !== "approved";
};

// Static methods
projectSchema.statics.findByUser = function (userId, role = null) {
  const query = { isActive: true, isDeleted: false };

  if (role === "freelancer") {
    query.freelancer = userId;
  } else if (role === "company") {
    query.company = userId;
  } else {
    query.$or = [{ freelancer: userId }, { company: userId }];
  }

  return this.find(query);
};

projectSchema.statics.findByStatus = function (status, userId = null) {
  const query = { status, isActive: true, isDeleted: false };

  if (userId) {
    query.$or = [{ freelancer: userId }, { company: userId }];
  }

  return this.find(query);
};

// Indexes
projectSchema.index({ freelancer: 1, status: 1 });
projectSchema.index({ company: 1, status: 1 });
projectSchema.index({ gig: 1 });
projectSchema.index({ conversation: 1 });
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ submittedAt: -1 });
projectSchema.index({ estimatedCompletion: 1 });
projectSchema.index({ isActive: 1, isDeleted: 1 });
projectSchema.index({ "payment.status": 1 });

module.exports = mongoose.model("Project", projectSchema);

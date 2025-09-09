// models/Gig.js
const mongoose = require("mongoose");

// Application schema
const ApplicationSchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: String,
    image: String,
    location: String,
    skills: [String],
    hourlyRate: Number,
    portfolio: [String],

    // Iterations system
    totalIterations: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      default: 3,
    },
    remainingIterations: {
      type: Number,
      required: true,
      min: 0,
      default: function () {
        return this.totalIterations;
      },
    },
    usedIterations: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Project tracking
    projectSubmissions: [
      {
        projectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Project",
        },
        submittedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: [
            "submitted",
            "under_review",
            "approved",
            "rejected",
            "revision_requested",
          ],
          default: "submitted",
        },
        iterationNumber: {
          type: Number,
          required: true,
        },
        companyFeedback: String,
        reviewedAt: Date,
      },
    ],

    currentProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },

    projectStatus: {
      type: String,
      enum: [
        "not_started",
        "in_progress",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "completed",
        "dispute_raised",
      ],
      default: "not_started",
    },

    // Application basic info
    proposedRate: Number,
    estimatedDuration: String,
    applicationStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: Date,
    acceptedAt: Date,
    rejectedAt: Date,
    projectStartedAt: Date,
    projectCompletedAt: Date,

    companyNotes: String,
    freelancerNotes: String,
  },
  { _id: true }
);

// Application methods
ApplicationSchema.methods.updateProjectStatus = function (
  status,
  feedback = null
) {
  this.projectStatus = status;

  const currentSubmission = this.projectSubmissions.find(
    (sub) =>
      sub.projectId &&
      sub.projectId.toString() === this.currentProjectId.toString()
  );

  if (currentSubmission) {
    currentSubmission.status = status;
    currentSubmission.reviewedAt = new Date();
    if (feedback) {
      currentSubmission.companyFeedback = feedback;
    }
  }

  if (status === "approved") {
    this.projectCompletedAt = new Date();
    this.projectStatus = "completed";
  } else if (status === "rejected" && this.remainingIterations === 0) {
    this.projectStatus = "rejected";
  }
};

// Main Gig Schema
const GigSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },
    description: {
      type: String,
      maxLength: 2000,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: {
      type: String,
    },
    projectOverview: {
      type: String,
      maxLength: 2000,
    },

    // Financial Details
    budget: {
      type: Number,
      required: true,
      min: 100,
    },
    displayBudget: {
      type: Number,
      required: true,
    },
    companyPayableAmount: {
      type: Number,
      required: true,
    },
    freelancerReceivableAmount: {
      type: Number,
      required: true,
    },
    platformCommission: {
      companyCommission: {
        type: Number,
        default: 0,
      },
      freelancerCommission: {
        type: Number,
        default: 0,
      },
      totalCommission: {
        type: Number,
        default: 0,
      },
    },
    budgetType: {
      type: String,
      enum: ["fixed"],
      default: "fixed",
    },
    timeline: {
      type: String,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },

    // Gig Requirements
    requirements: {
      type: String,
      maxLength: 2000,
    },
    deliverables: [String],
    skills: [String],
    experienceLevel: {
      type: String,
      enum: ["entry", "intermediate", "expert"],
      default: "intermediate",
    },

    // Location and Work Type
    location: {
      type: String,
    },
    workType: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      default: "remote",
    },

    // Applications
    applications: [ApplicationSchema],
    applicationsCount: {
      type: Number,
      default: 0,
    },
    maxApplications: {
      type: Number,
      default: 50,
    },

    // Gig Status
    status: {
      type: String,
      enum: [
        "draft",
        "active",
        "paused",
        "closed",
        "completed",
        "cancelled",
        "expired",
      ],
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPriority: {
      type: Boolean,
      default: false,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },

    // Selection and Assignment
    selectedFreelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    selectedApplication: ApplicationSchema,
    selectionDate: Date,

    // Completion and Review
    completedAt: Date,
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      maxLength: 1000,
    },
    freelancerRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    freelancerReview: {
      type: String,
      maxLength: 1000,
    },

    // Views and Analytics
    viewsCount: {
      type: Number,
      default: 0,
    },
    views: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
        ipAddress: String,
      },
    ],

    // Tags and SEO
    tags: [String],
    seoSlug: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Admin fields
    isApproved: {
      type: Boolean,
      default: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,

    rejectionReason: String,
    adminNotes: String,

    // Dates
    postedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: Date,
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware
GigSchema.pre("save", function (next) {
  if (this.isModified("applications")) {
    this.applicationsCount = this.applications.length;
  }

  this.lastUpdated = new Date();

  // Generate SEO slug if title changed
  if (this.isModified("title") && !this.seoSlug) {
    this.seoSlug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") +
      "-" +
      this._id.toString().slice(-6);
  }

  next();
});

// Instance methods
GigSchema.methods.addApplication = function (applicationData) {
  if (this.applications.length >= this.maxApplications) {
    throw new Error("Maximum applications limit reached");
  }

  // Check if user already applied
  const existingApplication = this.applications.find(
    (app) => app.freelancer.toString() === applicationData.freelancer.toString()
  );

  if (existingApplication) {
    throw new Error("You have already applied for this gig");
  }

  this.applications.push(applicationData);
  this.applicationsCount = this.applications.length;
  return this.save();
};

GigSchema.methods.selectFreelancer = function (applicationId) {
  const application = this.applications.id(applicationId);
  if (!application) {
    throw new Error("Application not found");
  }

  this.selectedFreelancer = application.freelancer;
  this.selectedApplication = application;
  this.selectionDate = new Date();
  this.status = "assigned";

  // Update application status
  application.applicationStatus = "accepted";
  application.acceptedAt = new Date();

  return this.save();
};

GigSchema.methods.incrementViews = function (userId = null, ipAddress = null) {
  this.viewsCount += 1;

  if (userId) {
    this.views.push({
      user: userId,
      ipAddress: ipAddress,
    });
  }

  return this.save();
};

// Static methods
GigSchema.statics.findActiveGigs = function () {
  return this.find({
    status: "active",
    isActive: true,
    isApproved: true,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
  });
};

GigSchema.statics.findByCategory = function (category, subCategory = null) {
  const query = {
    category,
    status: "active",
    isActive: true,
    isApproved: true,
  };
  if (subCategory) {
    query.subCategory = subCategory;
  }
  return this.find(query);
};

// Indexes
GigSchema.index({ company: 1, status: 1 });
GigSchema.index({ category: 1, subCategory: 1 });
GigSchema.index({ skills: 1 });
GigSchema.index({ status: 1, isActive: 1, isApproved: 1 });
GigSchema.index({ createdAt: -1 });
GigSchema.index({ postedAt: -1 });
GigSchema.index({ budget: 1 });
GigSchema.index({ workType: 1 });
GigSchema.index({ location: 1 });
GigSchema.index({ seoSlug: 1 });
GigSchema.index({ tags: 1 });
GigSchema.index({ expiresAt: 1 });

module.exports = mongoose.model("Gig", GigSchema);

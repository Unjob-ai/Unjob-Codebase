// models/GigModel.js - Fixed and unified version
import mongoose from "mongoose";

// Application schema
const ApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: String,
    email: String,
    image: String,
    location: String,
    skills: [String],
    hourlyRate: Number,
    portfolio: [String],

    // Application details
    coverLetter: {
      type: String,
      maxLength: 1000,
    },
    proposedRate: {
      type: Number,
      min: 0,
    },
    proposedBudget: {
      type: Number,
      min: 0,
    },
    estimatedDuration: String,
    timeline: String,

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

    // Application status and dates
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "interviewing",
        "negotiating",
        "contract_pending",
      ],
      default: "pending",
    },
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
    respondedAt: Date,
    projectStartedAt: Date,
    projectCompletedAt: Date,

    // Negotiation fields
    negotiationHistory: [
      {
        proposedBudget: {
          type: Number,
          required: true,
        },
        proposedBy: {
          type: String,
          enum: ["freelancer", "client"],
          required: true,
        },
        timeline: String,
        additionalTerms: String,
        proposedAt: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected", "countered"],
          default: "pending",
        },
        expiresAt: {
          type: Date,
          default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    ],

    currentNegotiation: {
      proposedBudget: Number,
      proposedBy: String,
      timeline: String,
      additionalTerms: String,
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
      expiresAt: Date,
      proposedAt: Date,
    },

    finalAgreedBudget: Number,
    budgetChangeReason: {
      type: String,
      enum: ["negotiation", "scope_change", "additional_work", "discount"],
    },

    // Payment and conversation
    paymentCompleted: {
      type: Boolean,
      default: false,
    },
    paymentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },

    // Priority and verification
    isPriorityApplication: {
      type: Boolean,
      default: false,
    },
    hasVerifiedSkills: {
      type: Boolean,
      default: false,
    },
    hasPremiumBadge: {
      type: Boolean,
      default: false,
    },

    // Additional fields
    companyNotes: String,
    freelancerNotes: String,
    rejectionReason: String,

    // Metadata
    metadata: {
      originalBudget: Number,
      negotiationRounds: {
        type: Number,
        default: 0,
      },
      lastNegotiationAt: Date,
      negotiationAllowed: {
        type: Boolean,
        default: true,
      },
      autoAcceptIfNoResponse: {
        type: Boolean,
        default: false,
      },
      skills: [String],
      estimatedHours: Number,
      urgency: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
      },
      experience_level: {
        type: String,
        enum: ["entry", "intermediate", "expert"],
        default: "intermediate",
      },
    },
  },
  { _id: true, timestamps: true }
);

// Main Gig Schema
const GigSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },
    description: {
      type: String,
      maxLength: 5000,
    },
    projectOverview: {
      type: String,
      maxLength: 5000,
    },

    // Company/Owner
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Category and Classification
    category: {
      type: String,
      required: true,
    },
    subCategory: String,
    subcategory: String, // Alternative field name for compatibility
    tags: [String],
    skills: [String],

    // Financial Details - Made compatible with controller expectations
    budget: {
      type: Number,
      required: true,
      min: 100,
    },
    displayBudget: {
      type: String, // Changed to String to match controller usage
      required: true,
      default: function () {
        return `₹${this.budget?.toLocaleString() || "0"}`;
      },
    },
    companyPayableAmount: {
      type: Number,
      required: true,
      default: function () {
        return this.budget || 0;
      },
    },
    freelancerReceivableAmount: {
      type: Number,
      required: true,
      default: function () {
        // Deduct 5% platform fee
        const platformFee = Math.round((this.budget || 0) * 0.05);
        return (this.budget || 0) - platformFee;
      },
    },
    platformCommission: {
      companyCommission: {
        type: Number,
        default: 0,
      },
      freelancerCommission: {
        type: Number,
        default: function () {
          return Math.round((this.budget || 0) * 0.05);
        },
      },
      totalCommission: {
        type: Number,
        default: function () {
          return Math.round((this.budget || 0) * 0.05);
        },
      },
    },
    budgetType: {
      type: String,
      enum: ["fixed", "hourly"],
      default: "fixed",
    },
    budgetRange: {
      min: {
        type: Number,
        min: 0,
        default: function () {
          return Math.floor((this.budget || 0) * 0.8);
        },
      },
      max: {
        type: Number,
        min: 0,
        default: function () {
          return Math.ceil((this.budget || 0) * 1.2);
        },
      },
    },
    currency: {
      type: String,
      default: "INR",
    },

    // Timeline and Dates
    timeline: String,
    timelineDays: {
      type: Number,
      default: 0,
    },
    startDate: Date,
    StartDate: Date, // Alternative field name for compatibility
    endDate: Date,
    EndDate: Date, // Alternative field name for compatibility
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Requirements and Deliverables
    requirements: String,
    deliverables: [String],
    experienceLevel: {
      type: String,
      enum: ["entry", "intermediate", "expert"],
      default: "intermediate",
    },

    // Location and Work Setup
    location: String,
    workType: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      default: "remote",
    },

    // Gig Status - FIXED to include "published"
    status: {
      type: String,
      enum: [
        "draft",
        "published", // Added this to fix the validation error
        "active",
        "paused",
        "closed",
        "completed",
        "cancelled",
        "expired",
        "in_progress",
        "negotiation_phase",
      ],
      default: "published", // Changed default to match controller
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isPriority: {
      type: Boolean,
      default: false,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    urgent: {
      type: Boolean,
      default: false,
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

    // Selection and Assignment
    selectedFreelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    selectedApplication: ApplicationSchema,
    selectionDate: Date,

    // Contract and Payment
    contractDetails: {
      agreedBudget: Number,
      originalBudget: Number,
      budgetNegotiated: {
        type: Boolean,
        default: false,
      },
      negotiationSummary: String,
      contractStartDate: Date,
      contractEndDate: Date,
      paymentSchedule: {
        type: String,
        enum: ["milestone", "hourly", "completion", "custom"],
        default: "completion",
      },
      milestones: [
        {
          title: String,
          description: String,
          amount: Number,
          dueDate: Date,
          status: {
            type: String,
            enum: ["pending", "in_progress", "completed", "approved"],
            default: "pending",
          },
        },
      ],
    },
    paymentStatus: {
      type: String,
      enum: ["not_required", "pending", "completed", "failed"],
      default: "not_required",
    },

    // Negotiation Settings
    negotiationAllowed: {
      type: Boolean,
      default: true,
    },
    negotiationGuidelines: {
      type: String,
      maxLength: 500,
    },

    // Reviews and Ratings
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
    analytics: {
      totalViews: {
        type: Number,
        default: 0,
      },
      totalApplications: {
        type: Number,
        default: 0,
      },
      averageProposedBudget: Number,
      negotiationRate: {
        type: Number,
        default: 0,
      },
      averageNegotiationRounds: Number,
      budgetFlexibilityUsed: Number,
    },

    // Assets and Media
    bannerImage: String,
    bannerSource: {
      type: String,
      enum: ["uploaded", "profile_fallback", "none"],
      default: "none",
    },
    autoUpdateBanner: {
      type: Boolean,
      default: false,
    },
    uploadAssets: [String],
    DerscribeAssets: {
      type: String,
      default: "Project assets and references",
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Visibility and Access
    visibility: {
      type: String,
      enum: ["public", "private", "invited_only"],
      default: "public",
    },
    invitedFreelancers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    promotionLevel: {
      type: String,
      enum: ["standard", "highlighted", "premium"],
      default: "standard",
    },

    // Deadlines
    deadlines: {
      applicationDeadline: Date,
      projectDeadline: Date,
      negotiationDeadline: Date,
    },

    // SEO and URLs
    seoSlug: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Admin and Approval
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

    // Timestamps
    postedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: Date,
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    closedAt: Date,

    // Metadata - for controller compatibility
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware
GigSchema.pre("save", function (next) {
  // Set default calculated fields
  if (!this.displayBudget) {
    this.displayBudget = `₹${this.budget?.toLocaleString() || "0"}`;
  }

  if (!this.companyPayableAmount) {
    this.companyPayableAmount = this.budget || 0;
  }

  if (!this.freelancerReceivableAmount) {
    const platformFee = Math.round((this.budget || 0) * 0.05);
    this.freelancerReceivableAmount = (this.budget || 0) - platformFee;
  }

  // Update platform commission
  if (!this.platformCommission.freelancerCommission) {
    this.platformCommission.freelancerCommission = Math.round(
      (this.budget || 0) * 0.05
    );
  }
  if (!this.platformCommission.totalCommission) {
    this.platformCommission.totalCommission = Math.round(
      (this.budget || 0) * 0.05
    );
  }

  // Update budget range if not set
  if (!this.budgetRange.min || !this.budgetRange.max) {
    this.budgetRange = {
      min: Math.floor((this.budget || 0) * 0.8),
      max: Math.ceil((this.budget || 0) * 1.2),
    };
  }

  // Update applications count
  if (this.isModified("applications")) {
    this.applicationsCount = this.applications.length;
    this.analytics.totalApplications = this.applications.length;
  }

  // Update last modified
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

  // Calculate average proposed budget
  if (this.applications.length > 0) {
    const totalProposed = this.applications.reduce(
      (sum, app) => sum + (app.proposedBudget || app.proposedRate || 0),
      0
    );
    this.analytics.averageProposedBudget =
      totalProposed / this.applications.length;
  }

  // Calculate negotiation metrics
  const negotiatingApps = this.applications.filter(
    (app) => app.status === "negotiating" || app.negotiationHistory.length > 0
  );

  if (this.applications.length > 0) {
    this.analytics.negotiationRate =
      (negotiatingApps.length / this.applications.length) * 100;
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
  this.status = "in_progress";

  // Update application status
  application.applicationStatus = "accepted";
  application.acceptedAt = new Date();

  return this.save();
};

GigSchema.methods.incrementViews = function (userId = null, ipAddress = null) {
  this.viewsCount += 1;
  this.analytics.totalViews = this.viewsCount;

  if (userId) {
    this.views.push({
      user: userId,
      ipAddress: ipAddress,
    });
  }

  return this.save();
};

GigSchema.methods.canNegotiate = function () {
  return (
    this.negotiationAllowed &&
    ["published", "active", "negotiation_phase"].includes(this.status) &&
    (!this.deadlines.negotiationDeadline ||
      new Date() < this.deadlines.negotiationDeadline)
  );
};

GigSchema.methods.getApplicationByFreelancer = function (freelancerId) {
  return this.applications.find(
    (app) => app.freelancer.toString() === freelancerId.toString()
  );
};

// Static methods
GigSchema.statics.findActiveGigs = function () {
  return this.find({
    status: { $in: ["published", "active"] },
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
    status: { $in: ["published", "active"] },
    isActive: true,
    isApproved: true,
  };
  if (subCategory) {
    query.subCategory = subCategory;
  }
  return this.find(query);
};

GigSchema.statics.findNegotiableGigs = function (filters = {}) {
  return this.find({
    negotiationAllowed: true,
    status: { $in: ["published", "active", "negotiation_phase"] },
    ...filters,
  });
};

// Indexes for better performance
GigSchema.index({ company: 1, status: 1 });
GigSchema.index({ category: 1, subCategory: 1 });
GigSchema.index({ skills: 1 });
GigSchema.index({ status: 1, isActive: 1, isApproved: 1 });
GigSchema.index({ createdAt: -1 });
GigSchema.index({ postedAt: -1 });
GigSchema.index({ budget: 1 });
GigSchema.index({ workType: 1 });
GigSchema.index({ location: 1 });
GigSchema.index({ tags: 1 });
GigSchema.index({ expiresAt: 1 });
GigSchema.index({ "applications.freelancer": 1 });
GigSchema.index({ "applications.status": 1 });

export const Gig = mongoose.model("Gig", GigSchema);

// Updated Gig.js model - FIXED: Complete schema consistency
import mongoose from "mongoose";

const GigSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    projectOverview: {
      type: String,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      maxlength: 100,
    },
    subCategory: {
      type: String,
      maxlength: 100,
    },
    tags: [
      {
        type: String,
        maxlength: 50,
      },
    ],
    skillsRequired: [
      {
        type: String,
        maxlength: 50,
      },
    ],
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    applications: [
      {
        // FIXED: Use 'user' consistently across all routes
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        // Keep freelancer as an alias for backward compatibility
        freelancer: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        // Application data that's embedded
        name: {
          type: String,
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        image: {
          type: String,
          default: null,
        },
        location: {
          type: String,
          default: "Not specified",
        },
        skills: [
          {
            type: String,
          },
        ],
        hourlyRate: {
          type: Number,
          default: 0,
        },
        portfolio: [
          {
            type: String,
          },
        ],
        totalIterations: {
          type: Number,
          required: true,
          min: 1,
          max: 20,
        },
        remainingIterations: {
          type: Number,
          required: true,
        },
        usedIterations: {
          type: Number,
          default: 0,
        },
        coverLetter: {
          type: String,
          required: true,
        },
        proposedRate: {
          type: Number,
          default: 0,
        },
        estimatedDuration: {
          type: String,
          default: "",
        },
        appliedAt: {
          type: Date,
          default: Date.now,
        },
        // Use 'status' as primary field for consistency
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected", "completed"],
          default: "pending",
        },
        // Keep applicationStatus as alias for backward compatibility
        applicationStatus: {
          type: String,
          enum: ["pending", "accepted", "rejected", "completed"],
          default: "pending",
        },
        acceptedAt: {
          type: Date,
        },
        rejectedAt: {
          type: Date,
        },
        rejectionReason: {
          type: String,
        },
        // Premium features
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
        // Project tracking
        projectSubmissions: [
          {
            type: mongoose.Schema.Types.Mixed,
          },
        ],
        currentProjectId: {
          type: mongoose.Schema.Types.ObjectId,
        },
        projectStatus: {
          type: String,
          enum: [
            "not_started",
            "in_progress",
            "submitted",
            "revision_requested",
            "completed",
          ],
          default: "not_started",
        },
        paymentDetails: {
          razorpayOrderId: String,
          razorpayPaymentId: String,
          razorpaySignature: String,
          paidAt: Date,
          amountPaid: Number,
        },
      },
    ],
    status: {
      type: String,
      enum: ["draft", "active", "paused", "completed", "cancelled"],
      default: "draft",
      index: true,
    },
    budget: {
      type: Number,
      min: 100,
    },
    budgetType: {
      type: String,
      enum: ["fixed", "hourly"],
      default: "fixed",
    },
    freelancerReceivableAmount: {
      type: Number,
      default: function() {
        // Calculate as full budget (commission temporarily disabled)
        return this.budget ? Math.round(this.budget * 1) : 0; // Was 0.95
      },
    },
    timeline: {
      type: String,
      maxlength: 100,
    },
    StartDate: {
      type: Date,
    },
    EndDate: {
      type: Date,
    },
    deliverables: [
      {
        type: String,
        maxlength: 200,
      },
    ],
    bannerImage: {
      type: String,
      default: "",
    },
    bannerSource: {
      type: String,
      enum: ["uploaded", "profile_fallback", "none"],
      default: "none",
    },
    uploadAssets: [String],
    DerscribeAssets: {
      type: String,
      default: "",
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    applicationsCount: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["not_required", "pending", "completed", "failed"],
      default: "not_required",
    },
    paymentDetails: {
      amount: Number,
      currency: {
        type: String,
        default: "INR",
      },
      transactionId: String,
      paidAt: Date,
    },
    location: {
      type: String,
      maxlength: 100,
    },
    workType: {
      type: String,
      enum: ["remote", "onsite", "hybrid"],
      default: "remote",
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "intermediate", "expert"],
      default: "intermediate",
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    closedAt: {
      type: Date,
    },
    selectedFreelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to sync user/freelancer fields and status fields
GigSchema.pre("save", function (next) {
  if (this.isModified("applications")) {
    this.applicationsCount = this.applications.length;

    // Sync user and freelancer fields + status fields
    this.applications.forEach((app) => {
      // Sync user and freelancer fields
      if (app.user && !app.freelancer) {
        app.freelancer = app.user;
      } else if (app.freelancer && !app.user) {
        app.user = app.freelancer;
      }

      // Sync status fields
      if (app.status && !app.applicationStatus) {
        app.applicationStatus = app.status;
      } else if (app.applicationStatus && !app.status) {
        app.status = app.applicationStatus;
      }
    });
  }
  next();
});

// Virtual for display budget
GigSchema.virtual("displayBudget").get(function () {
  if (!this.budget) return "Budget not specified";

  if (this.budgetType === "hourly") {
    return `₹${this.budget.toLocaleString()}/hour`;
  }

  return `₹${this.budget.toLocaleString()}`;
});

// Virtual for time ago
GigSchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diffInMs = now - this.createdAt;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  return `${Math.floor(diffInDays / 30)} months ago`;
});

// Method to check if gig should auto-update banner when profile image changes
GigSchema.methods.shouldAutoUpdateBanner = function () {
  return (
    this.bannerSource === "profile_fallback" ||
    (this.bannerSource === "none" &&
      (!this.bannerImage || this.bannerImage === ""))
  );
};

// Method to update banner with profile image
GigSchema.methods.updateBannerWithProfileImage = function (profileImageUrl) {
  if (this.shouldAutoUpdateBanner()) {
    this.bannerImage = profileImageUrl;
    this.bannerSource = "profile_fallback";
    return true;
  }
  return false;
};

// Static method to update all eligible gigs for a user
GigSchema.statics.updateBannersForUser = async function (
  userId,
  newProfileImage
) {
  try {
    console.log(
      `[GIG_MODEL] Updating banners for user ${userId} with image: ${newProfileImage}`
    );

    const gigsToUpdate = await this.find({
      company: userId,
      $or: [
        { bannerSource: "profile_fallback" },
        { bannerSource: "none" },
        { bannerSource: { $exists: false } },
        { bannerImage: { $exists: false } },
        { bannerImage: null },
        { bannerImage: "" },
      ],
    });

    console.log(
      `[GIG_MODEL] Found ${gigsToUpdate.length} gigs to update for user ${userId}`
    );

    if (gigsToUpdate.length > 0) {
      const updateResult = await this.updateMany(
        {
          _id: { $in: gigsToUpdate.map((g) => g._id) },
        },
        {
          $set: {
            bannerImage: newProfileImage,
            bannerSource: "profile_fallback",
          },
        }
      );

      console.log(
        `[GIG_MODEL] Updated ${updateResult.modifiedCount} gig banners for user ${userId}`
      );

      return {
        success: true,
        updatedCount: updateResult.modifiedCount,
        eligibleCount: gigsToUpdate.length,
      };
    }

    return {
      success: true,
      updatedCount: 0,
      eligibleCount: 0,
    };
  } catch (error) {
    console.error(
      `[GIG_MODEL] Error updating gig banners for user ${userId}:`,
      error
    );
    throw error;
  }
};

// Indexes for better performance
GigSchema.index({ company: 1, status: 1 });
GigSchema.index({ category: 1, status: 1 });
GigSchema.index({ featured: 1, status: 1 });
GigSchema.index({ createdAt: -1 });
GigSchema.index({ budget: 1 });
GigSchema.index({ bannerSource: 1 });
GigSchema.index({ "applications.user": 1 }); // Primary index
GigSchema.index({ "applications.freelancer": 1 }); // Backup compatibility index

// Ensure virtual fields are serialized
GigSchema.set("toJSON", { virtuals: true });
GigSchema.set("toObject", { virtuals: true });

const Gig = mongoose.models.Gig || mongoose.model("Gig", GigSchema);

export default Gig;

// models/Project.js - Complete version

import mongoose from "mongoose";

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
          required: true,
        },
      },
    ],
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
        },
    version: {
       type: Number,
      default: 1,
       },
    isLatestVersion: {
      type: Boolean,
      default: true,
    },
    previousVersion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    // ✅ Additional fields for better tracking
    autoCloseTriggered: {
      type: Boolean,
      default: false,
    },
    metadata: {
      submissionIP: String,
      userAgent: String,
      fileUploadDuration: Number, // in milliseconds
      totalUploadSize: Number,
       },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
projectSchema.index({ conversation: 1 });
projectSchema.index({ gig: 1 });
projectSchema.index({ freelancer: 1 });
projectSchema.index({ company: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ submittedAt: -1 });
projectSchema.index({ isLatestVersion: 1, version: -1 });
projectSchema.index({ autoCloseTriggered: 1 });


// ✅ Pre-save middleware to calculate metadata
projectSchema.pre("save", function (next) {
  if (this.isNew) {
    // Calculate total upload size
    if (this.files && this.files.length > 0) {
      this.metadata = this.metadata || {};
      this.metadata.totalUploadSize = this.files.reduce(
        (total, file) => total + file.size,
        0
      );
    }
  }
  next();
  });

// Method to create new version
projectSchema.methods.createNewVersion = function (updateData) {
  // Mark current version as not latest
  this.isLatestVersion = false;

  // Create new version
  const newVersion = new this.constructor({
    ...this.toObject(),
    _id: undefined,
    __v: undefined,
    version: this.version + 1,
    previousVersion: this._id,
    status: "submitted",
    submittedAt: new Date(),
    reviewedAt: undefined,
    companyFeedback: undefined,
    approvedAt: undefined,
    rejectedAt: undefined,
    isLatestVersion: true,
    autoCloseTriggered: false,
    ...updateData,
  });

    return newVersion;

};

// ✅ Method to update project status
projectSchema.methods.updateStatus = function (
  newStatus,
  feedback = null,
  userId = null
) {
  this.status = newStatus;
  this.reviewedAt = new Date();

  if (feedback) {
    this.companyFeedback = feedback;
     }

  switch (newStatus) {
    case "approved":
      this.approvedAt = new Date();
      break;
    case "rejected":
      this.rejectedAt = new Date();
      break;
    case "under_review":
      // Reset approval/rejection dates
      this.approvedAt = undefined;
      this.rejectedAt = undefined;
      break;
        }

 return this.save();

 };

// ✅ Method to add revision note
projectSchema.methods.addRevisionNote = function (note, addedBy) {
  this.revisionNotes.push({
    note: note,
    addedAt: new Date(),
    addedBy: addedBy,
  });
    return this.save();


    };

// ✅ Method to check if project can be revised
projectSchema.methods.canBeRevised = function () {
  return this.status === "revision_requested" && this.isLatestVersion;

  };

// ✅ Method to trigger auto-close
projectSchema.methods.triggerAutoClose = function () {
  this.autoCloseTriggered = true;
  return this.save();

  };

// Virtual for file count
projectSchema.virtual("fileCount").get(function () {
  return this.files ? this.files.length : 0;

  });

// Virtual for total file size

projectSchema.virtual("totalFileSize").get(function () {
  return this.files
    ? this.files.reduce((total, file) => total + file.size, 0)
     : 0;
});

// ✅ Virtual for formatted file size

projectSchema.virtual("formattedFileSize").get(function () {
  const bytes = this.totalFileSize;
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
});

// ✅ Virtual for project age


projectSchema.virtual("projectAge").get(function () {
  const now = new Date();
  const submitted = new Date(this.submittedAt);
  const diffHours = Math.floor((now - submitted) / (1000 * 60 * 60));

  if (diffHours < 1) {
    return "Just submitted";
    } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
});

// ✅ Static method to find projects needing auto-close
projectSchema.statics.findProjectsForAutoClose = function () {
  return this.find({
    status: "submitted",
    autoCloseTriggered: false,
    submittedAt: {
      $lte: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
    },
  }).populate("conversation");
};

// ✅ Static method to get project statistics
projectSchema.statics.getProjectStats = async function (userId, role) {
  const matchCondition =
    role === "freelancer" ? { freelancer: userId } : { company: userId };

  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalFiles: { $sum: { $size: "$files" } },
        avgFileSize: { $avg: "$metadata.totalUploadSize" },
      },
    },
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      count: stat.count,
      totalFiles: stat.totalFiles,
      avgFileSize: Math.round(stat.avgFileSize || 0),
    };
    return acc;
  }, {});
};

// Ensure virtuals are included in JSON output
projectSchema.set("toJSON", { virtuals: true });
projectSchema.set("toObject", { virtuals: true });

export default mongoose.models.Project ||
  mongoose.model("Project", projectSchema);
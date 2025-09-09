// models/GigInvitation.js
const mongoose = require("mongoose");

const GigInvitationSchema = new mongoose.Schema(
  {
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
      required: false,
      index: true,
    },

    invitationType: {
      type: String,
      enum: ["existing_gig", "custom_gig"],
      required: true,
      default: "existing_gig",
    },

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
      skills: [String],
      experienceLevel: {
        type: String,
        enum: ["entry", "intermediate", "expert"],
        default: "intermediate",
      },
    },

    personalMessage: {
      type: String,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired", "withdrawn"],
      default: "pending",
    },

    response: {
      message: String,
      respondedAt: Date,
    },

    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },

    acceptedAt: Date,
    declinedAt: Date,
    withdrawnAt: Date,

    createdGigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

GigInvitationSchema.index({ freelancer: 1, status: 1 });
GigInvitationSchema.index({ hiringUser: 1, status: 1 });
GigInvitationSchema.index({ status: 1, expiresAt: 1 });
GigInvitationSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.GigInvitation ||
  mongoose.model("GigInvitation", GigInvitationSchema);

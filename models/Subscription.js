// models/Subscription.js
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userRole: {
      type: String,
      enum: ["freelancer", "hiring"],
      required: true,
    },
    planType: {
      type: String,
      enum: ["basic", "premium", "enterprise"],
      required: true,
      default: "basic",
    },
    duration: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending", "paused"],
      default: "pending",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: function () {
        return this.duration !== "lifetime";
      },
    },
    price: {
      type: Number,
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },

    // Usage tracking for hiring users
    gigsPosted: {
      type: Number,
      default: 0,
    },
    maxGigs: {
      type: Number,
      default: function () {
        if (this.userRole === "hiring") {
          return this.duration === "lifetime"
            ? -1
            : this.duration === "yearly"
            ? 120
            : 10;
        }
        return -1;
      },
    },

    // Usage tracking for freelancers
    applicationsSubmitted: {
      type: Number,
      default: 0,
    },
    maxApplications: {
      type: Number,
      default: function () {
        if (this.userRole === "freelancer") {
          return this.duration === "lifetime"
            ? -1
            : this.duration === "yearly"
            ? 1200
            : 100;
        }
        return -1;
      },
    },

    features: [
      {
        type: String,
        enum: [
          "unlimited_gigs",
          "priority_support",
          "advanced_analytics",
          "custom_branding",
          "api_access",
          "bulk_operations",
          "dedicated_manager",
        ],
      },
    ],

    paymentHistory: [
      {
        paymentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Payment",
        },
        amount: Number,
        paidAt: Date,
        status: String,
      },
    ],

    autoRenew: {
      type: Boolean,
      default: true,
    },

    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: String,

    pausedAt: Date,
    pausedUntil: Date,
    pauseReason: String,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ userRole: 1, planType: 1 });

module.exports =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

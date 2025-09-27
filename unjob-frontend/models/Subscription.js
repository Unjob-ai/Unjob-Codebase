import mongoose from "mongoose";

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
      enum: ["free", "basic", "pro"], // ✅ FIXED: Added "free" and "pro"
      required: true,
      default: "free", // ✅ Changed default to "free"
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
    autoRenewal: {
      type: Boolean,
      default: false,
    },
    renewalDate: Date,
    billingCycleCount: {
      type: Number,
      default: 0,
    },
    totalBillingCycles: {
      type: Number,
      default: 1,
    },
    cancellationReason: String,
    cancelledAt: Date,
    pausedAt: Date,
    pauseReason: String,
    gracePeriodEnd: Date,

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
            ? 240
            : 20;
        }
        return -1;
      },
    },
    features: {
      prioritySupport: { type: Boolean, default: true },
      featuredListings: { type: Boolean, default: true },
      advancedAnalytics: { type: Boolean, default: true },
      customBranding: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      dedicatedManager: { type: Boolean, default: false },
      profileBoost: { type: Boolean, default: true },
      skillVerification: { type: Boolean, default: true },
      premiumBadge: { type: Boolean, default: true },
      candidateSearch: { type: Boolean, default: true },
      bulkMessaging: { type: Boolean, default: true },
      teamCollaboration: { type: Boolean, default: false },
    },
    // Enhanced payment details for both one-time and recurring payments
    paymentDetails: {
      paymentType: {
        type: String,
        enum: ["one-time", "recurring", "payment_link", "free"], // ✅ FIXED: Added "free"
        default: "one-time",
      },
      // One-time payment fields
      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,

      // Recurring subscription fields
      razorpaySubscriptionId: String,
      razorpayPlanId: String,

      // Payment link specific fields
      paymentLink: String,
      isPaymentLink: { type: Boolean, default: false },

      // Common fields
      transactionId: String,
      lastPaymentDate: Date,
      nextPaymentDate: Date,
      failedPaymentCount: {
        type: Number,
        default: 0,
      },
      paymentHistory: [
        {
          paymentId: String,
          amount: Number,
          status: {
            type: String,
            enum: ["success", "failed", "pending"],
          },
          paidAt: Date,
          failureReason: String,
        },
      ],
      // Auto-pay specific fields
      autoPayRequested: { type: Boolean, default: false },
      autoPaySucceeded: { type: Boolean, default: false },
      autoPayEligible: { type: Boolean, default: false },
      recurringPrice: Number,
      firstMonthDiscounted: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual to calculate remaining days
subscriptionSchema.virtual("remainingDays").get(function () {
  if (this.duration === "lifetime") return -1;
  const today = new Date();
  const diffTime = this.endDate - today;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
});

// Instance methods
subscriptionSchema.methods.getRemainingDays = function () {
  if (this.duration === "lifetime") return -1;
  const today = new Date();
  const diffTime = this.endDate - today;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// New methods for auto-pay functionality
subscriptionSchema.methods.pauseSubscription = function (
  reason = "User request"
) {
  this.status = "paused";
  this.pausedAt = new Date();
  this.pauseReason = reason;
  return this.save();
};

subscriptionSchema.methods.resumeSubscription = function () {
  if (this.status === "paused") {
    this.status = "active";
    this.pausedAt = undefined;
    this.pauseReason = undefined;

    // Extend end date by pause duration for non-recurring subscriptions
    if (this.paymentDetails.paymentType === "one-time" && this.pausedAt) {
      const pauseDuration = new Date() - this.pausedAt;
      this.endDate = new Date(this.endDate.getTime() + pauseDuration);
    }
  }
  return this.save();
};

subscriptionSchema.methods.cancelSubscription = function (
  reason = "User request"
) {
  this.status = "cancelled";
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  this.autoRenewal = false;
  return this.save();
};

subscriptionSchema.methods.recordPayment = function (paymentData) {
  const { paymentId, amount, status, failureReason } = paymentData;

  // Add to payment history
  this.paymentDetails.paymentHistory.push({
    paymentId,
    amount,
    status,
    paidAt: new Date(),
    failureReason,
  });

  if (status === "success") {
    this.paymentDetails.lastPaymentDate = new Date();
    this.paymentDetails.failedPaymentCount = 0;
    this.status = "active";
    this.gracePeriodEnd = undefined;

    // Update billing cycle count
    this.billingCycleCount += 1;

    // Calculate next payment date for recurring subscriptions
    if (this.paymentDetails.paymentType === "recurring") {
      const nextPayment = new Date();
      if (this.duration === "monthly") {
        nextPayment.setMonth(nextPayment.getMonth() + 1);
      } else if (this.duration === "yearly") {
        nextPayment.setFullYear(nextPayment.getFullYear() + 1);
      }
      this.paymentDetails.nextPaymentDate = nextPayment;
      this.endDate = nextPayment;
    }
  } else if (status === "failed") {
    this.paymentDetails.failedPaymentCount += 1;

    // Set grace period (7 days) for failed payments
    if (!this.gracePeriodEnd) {
      this.gracePeriodEnd = new Date();
      this.gracePeriodEnd.setDate(this.gracePeriodEnd.getDate() + 7);
    }

    // Cancel subscription after 3 failed attempts
    if (this.paymentDetails.failedPaymentCount >= 3) {
      this.cancelSubscription("Multiple payment failures");
    }
  }

  return this.save();
};

// Static methods
subscriptionSchema.statics.getPlanFeatures = function (planType, userRole) {
  const basicFeatures = {
    prioritySupport: true,
    featuredListings: true,
    advancedAnalytics: true,
    customBranding: false,
    apiAccess: false,
    dedicatedManager: false,
  };

  const roleSpecificFeatures = {
    freelancer: {
      profileBoost: true,
      skillVerification: true,
      premiumBadge: true,
    },
    hiring: {
      candidateSearch: true,
      bulkMessaging: true,
      teamCollaboration: false,
    },
  };

  return {
    ...basicFeatures,
    ...roleSpecificFeatures[userRole],
  };
};

// Find subscriptions due for renewal
subscriptionSchema.statics.findDueForRenewal = function () {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    autoRenewal: true,
    status: "active",
    "paymentDetails.paymentType": "recurring",
    "paymentDetails.nextPaymentDate": { $lte: tomorrow },
  });
};

// Pre-save middleware
subscriptionSchema.pre("save", function (next) {
  if (
    this.isNew ||
    this.isModified("planType") ||
    this.isModified("userRole")
  ) {
    this.features = this.constructor.getPlanFeatures(
      this.planType,
      this.userRole
    );
  }

  // Calculate end date and billing cycles for new subscriptions
  if (this.isNew && this.duration !== "lifetime") {
    const startDate = this.startDate || new Date();
    const endDate = new Date(startDate);

    if (this.duration === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
      if (this.paymentDetails.paymentType === "recurring") {
        this.totalBillingCycles = this.autoRenewal ? -1 : 12;
      }
    } else if (this.duration === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1);
      if (this.paymentDetails.paymentType === "recurring") {
        this.totalBillingCycles = this.autoRenewal ? -1 : 1;
      }
    }

    this.endDate = endDate;
    this.renewalDate = endDate;
    this.paymentDetails.nextPaymentDate = endDate;
  }

  next();
});

// Indexes for better performance
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ userRole: 1, planType: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });
subscriptionSchema.index({
  "paymentDetails.nextPaymentDate": 1,
  autoRenewal: 1,
});
subscriptionSchema.index({ "paymentDetails.razorpaySubscriptionId": 1 });
subscriptionSchema.index({ gracePeriodEnd: 1, status: 1 });

export default mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

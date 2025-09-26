// models/Payment.js
import mongoose from "mongoose";

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "refunded"],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    description: String,
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    payer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    payee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    gig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gig",
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: [
        "subscription",
        "gig_payment",
        "gig_escrow", // ✅ Added this missing enum value
        "milestone_payment",
        "refund",
        "commission",
        "penalty",
        "withdrawal",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "refunded"],
      default: "pending",
    },
    description: String,
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpaySignature: String,

    // Enhanced bank account details
    bankAccountDetails: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      bankName: String,
      upiId: String,
    },

    // Transfer tracking
    transferDetails: {
      transferId: String,
      transferredAt: Date,
      transferStatus: String,
      transferMode: {
        type: String,
        enum: ["bank", "upi", "razorpay"],
        default: "bank",
      },
      updatedAt: Date,
    },

    // Milestone payment details
    milestoneDetails: {
      milestoneNumber: Number,
      milestoneDescription: String,
      totalMilestones: Number,
    },

    // Status history for tracking
    statusHistory: [statusHistorySchema],

    // Admin notes for tracking
    adminNotes: [
      {
        note: String,
        addedBy: String,
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Additional metadata
    metadata: {
      originalBudget: Number,
      companyCommission: Number,
      freelancerCommission: Number,
      escrowAmount: Number,
      platformFee: Number,
    },

    // For admin-initiated payments
    adminInitiated: {
      type: Boolean,
      default: false,
    },
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
paymentSchema.index({ payer: 1, status: 1 });
paymentSchema.index({ payee: 1, status: 1 });
paymentSchema.index({ gig: 1 });
paymentSchema.index({ subscription: 1 });
paymentSchema.index({ type: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ razorpayPaymentId: 1 });

// Virtual for formatted amount
paymentSchema.virtual("formattedAmount").get(function () {
  return `₹${this.amount.toLocaleString("en-IN")}`;
});

// Method to add status history entry
paymentSchema.methods.addStatusHistory = function (status, description) {
  this.statusHistory.push({
    status,
    description,
    timestamp: new Date(),
  });
  return this;
};

// Method to check if payment is completed
paymentSchema.methods.isCompleted = function () {
  return this.status === "completed";
};

// Method to check if payment is pending
paymentSchema.methods.isPending = function () {
  return this.status === "pending";
};

// Method to check if payment is failed
paymentSchema.methods.isFailed = function () {
  return this.status === "failed";
};

// Pre-save middleware to add status history
paymentSchema.pre("save", function (next) {
  // Add to status history if status is modified
  if (this.isModified("status") && !this.isNew) {
    this.addStatusHistory(this.status, `Status changed to ${this.status}`);
  }

  // Set initial status history for new payments
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [
      {
        status: this.status,
        description: `Payment ${this.type} initiated`,
        timestamp: new Date(),
      },
    ];
  }

  next();
});

export default mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);

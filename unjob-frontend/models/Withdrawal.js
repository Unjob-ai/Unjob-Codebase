// models/Withdrawal.js - Enhanced withdrawal model with earnings synchronization

import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    withdrawalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    }, // e.g., WD12345678

    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Link to payment system withdrawal record
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },

    // Link to wallet transaction
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [1, "Withdrawal amount must be positive"],
    },

    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    bankDetails: {
      accountHolderName: { type: String, required: true },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      bankName: { type: String, default: "" },
      upiId: { type: String, default: "" },
    },

    // Enhanced tracking for both systems
    systemTracking: {
      earningsSystemDeducted: {
        type: Boolean,
        default: false,
      },
      walletSystemDeducted: {
        type: Boolean,
        default: false,
      },
      freelancerStatsUpdated: {
        type: Boolean,
        default: false,
      },
      deductedAt: {
        type: Date,
      },
      deductionAmount: {
        type: Number,
      },
    },

    // Balance information at time of withdrawal
    balanceSnapshot: {
      earningsBalance: { type: Number, required: true },
      walletBalance: { type: Number, required: true },
      totalEarnings: { type: Number, required: true },
      previousWithdrawals: { type: Number, required: true },
      availableBalance: { type: Number, required: true },
      capturedAt: { type: Date, default: Date.now },
    },

    // Processing information
    processingInfo: {
      adminNotes: { type: String }, // For finance team to add notes
      transactionReference: { type: String }, // Bank transaction ID
      processingStartedAt: { type: Date },
      processingCompletedAt: { type: Date },
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      failureReason: { type: String },
      retryCount: { type: Number, default: 0 },
      maxRetries: { type: Number, default: 3 },
    },

    // Refund tracking (if withdrawal fails)
    refundInfo: {
      isRefunded: { type: Boolean, default: false },
      refundedAt: { type: Date },
      refundTransactionId: { type: mongoose.Schema.Types.ObjectId },
      refundAmount: { type: Number },
      refundNotes: { type: String },
    },

    // Status history for audit trail
    statusHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "processing", "completed", "failed", "cancelled"],
          required: true,
        },
        timestamp: { type: Date, default: Date.now },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        notes: { type: String },
        systemGenerated: { type: Boolean, default: false },
      },
    ],

    // Metadata for integration tracking
    integrationMetadata: {
      googleSheetsRowId: { type: String },
      googleSheetsUpdated: { type: Boolean, default: false },
      notificationsId: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Notification",
        },
      ],
      webhooksSent: [
        {
          endpoint: String,
          sentAt: Date,
          status: String,
          response: String,
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for formatted amount
withdrawalSchema.virtual("formattedAmount").get(function () {
  return `₹${this.amount.toLocaleString()}`;
});

// Virtual for processing duration
withdrawalSchema.virtual("processingDuration").get(function () {
  if (this.status === "completed" && this.processingInfo.processingStartedAt) {
    const completedAt =
      this.processingInfo.processingCompletedAt || this.updatedAt;
    const duration = completedAt - this.processingInfo.processingStartedAt;
    return Math.round(duration / (1000 * 60 * 60)); // hours
  }
  return null;
});

// Virtual for time since request
withdrawalSchema.virtual("timeSinceRequest").get(function () {
  const now = new Date();
  const diffInHours = Math.round((now - this.createdAt) / (1000 * 60 * 60));

  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  }
});

// Pre-save middleware to update status history
withdrawalSchema.pre("save", function (next) {
  if (this.isModified("status") && !this.isNew) {
    // Add to status history if status changed
    const newStatusEntry = {
      status: this.status,
      timestamp: new Date(),
      systemGenerated: true,
    };

    // Add specific notes based on status
    switch (this.status) {
      case "processing":
        newStatusEntry.notes = "Withdrawal moved to processing by system";
        this.processingInfo.processingStartedAt = new Date();
        break;
      case "completed":
        newStatusEntry.notes = "Withdrawal completed successfully";
        this.processingInfo.processingCompletedAt = new Date();
        break;
      case "failed":
        newStatusEntry.notes = "Withdrawal failed - amount will be refunded";
        break;
      case "cancelled":
        newStatusEntry.notes = "Withdrawal cancelled - amount will be refunded";
        break;
    }

    this.statusHistory.push(newStatusEntry);
  }
  next();
});

// Post-save middleware to handle status changes
withdrawalSchema.post("save", async function (doc, next) {
  if (doc.isModified("status")) {
    try {
      const Wallet = mongoose.model("Wallet");
      const User = mongoose.model("User");
      const Payment = mongoose.model("Payment");
      const Notification = mongoose.model("Notification");

      // Handle refund for failed/cancelled withdrawals
      if (
        (doc.status === "failed" || doc.status === "cancelled") &&
        !doc.refundInfo.isRefunded
      ) {
        await doc.processRefund();
      }

      // Send notification to freelancer
      await doc.sendStatusNotification();
    } catch (error) {
      console.error("Post-save withdrawal error:", error);
    }
  }
  next();
});

// Method to process refund when withdrawal fails
withdrawalSchema.methods.processRefund = async function () {
  try {
    const Wallet = mongoose.model("Wallet");
    const Payment = mongoose.model("Payment");

    // 1. Refund to wallet
    const wallet = await Wallet.findOne({ user: this.freelancer });
    if (wallet) {
      await wallet.refundWithdrawal(
        this.amount,
        this.withdrawalId,
        `Refund for ${this.status} withdrawal ${this.withdrawalId}`
      );
    }

    // 2. Update payment record status
    await Payment.findByIdAndUpdate(this.paymentId, {
      status: this.status,
      "metadata.refunded": true,
      "metadata.refundedAt": new Date(),
    });

    // 3. Update freelancer stats (add back the amount)
    const User = mongoose.model("User");
    const freelancer = await User.findById(this.freelancer);
    if (freelancer && freelancer.stats) {
      freelancer.stats.totalEarnings =
        (freelancer.stats.totalEarnings || 0) + this.amount;
      await freelancer.save();
    }

    // 4. Update refund info
    this.refundInfo = {
      isRefunded: true,
      refundedAt: new Date(),
      refundAmount: this.amount,
      refundNotes: `Automatic refund for ${this.status} withdrawal`,
    };

    // 5. Update system tracking
    this.systemTracking.earningsSystemDeducted = false;
    this.systemTracking.walletSystemDeducted = false;
    this.systemTracking.freelancerStatsUpdated = true;

    await this.save();
    
    return true;
  } catch (error) {
    console.error(
      `❌ Failed to process refund for withdrawal ${this.withdrawalId}:`,
      error
    );
    return false;
  }
};

// Method to send status notification
withdrawalSchema.methods.sendStatusNotification = async function () {
  try {
    const Notification = mongoose.model("Notification");

    let title, message, actionUrl;

    switch (this.status) {
      case "processing":
        title = "Withdrawal Being Processed";
        message = `Your withdrawal of ${this.formattedAmount} is now being processed by our finance team.`;
        break;
      case "completed":
        title = "Withdrawal Completed";
        message = `Your withdrawal of ${this.formattedAmount} has been completed successfully. Funds should be available in your account within 1-2 business days.`;
        break;
      case "failed":
        title = "Withdrawal Failed";
        message = `Your withdrawal of ${this.formattedAmount} has failed. The amount has been refunded to your wallet balance.`;
        break;
      case "cancelled":
        title = "Withdrawal Cancelled";
        message = `Your withdrawal of ${this.formattedAmount} has been cancelled. The amount has been refunded to your wallet balance.`;
        break;
      default:
        return; // No notification for other statuses
    }

    actionUrl = "/freelancer/earnings";

    const notification = await Notification.create({
      user: this.freelancer,
      type: `withdrawal_${this.status}`,
      title: title,
      message: message,
      relatedId: this._id,
      actionUrl: actionUrl,
      metadata: {
        withdrawalId: this.withdrawalId,
        amount: this.amount,
        status: this.status,
      },
    });

    // Track notification in metadata
    this.integrationMetadata.notificationsId.push(notification._id);
    await this.save();
  } catch (error) {
    console.error(
      `Failed to send notification for withdrawal ${this.withdrawalId}:`,
      error
    );
  }
};

// Method to update Google Sheets
withdrawalSchema.methods.updateGoogleSheets = async function (sheetData) {
  try {
    // This would integrate with your Google Sheets API
    // const { updateWithdrawalInSheet } = require('@/lib/googleSheets');
    // const result = await updateWithdrawalInSheet(this.withdrawalId, sheetData);

    this.integrationMetadata.googleSheetsUpdated = true;
    // this.integrationMetadata.googleSheetsRowId = result.rowId;

    await this.save();
    return true;
  } catch (error) {
    console.error(
      `Failed to update Google Sheets for withdrawal ${this.withdrawalId}:`,
      error
    );
    return false;
  }
};

// Static method to get withdrawal statistics
withdrawalSchema.statics.getStatistics = async function (
  freelancerId = null,
  dateRange = null
) {
  let matchCondition = {};

  if (freelancerId) {
    matchCondition.freelancer = mongoose.Types.ObjectId(freelancerId);
  }

  if (dateRange) {
    matchCondition.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end,
    };
  }

  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalWithdrawals: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        pendingCount: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        processingCount: {
          $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] },
        },
        completedCount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        cancelledCount: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        completedAmount: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] },
        },
        avgAmount: { $avg: "$amount" },
      },
    },
  ]);

  return (
    stats[0] || {
      totalWithdrawals: 0,
      totalAmount: 0,
      pendingCount: 0,
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      completedAmount: 0,
      avgAmount: 0,
    }
  );
};

// Indexes for better performance
withdrawalSchema.index({ withdrawalId: 1 });
withdrawalSchema.index({ freelancer: 1, status: 1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });
withdrawalSchema.index({ createdAt: -1 });
withdrawalSchema.index({ "processingInfo.processingStartedAt": 1 });

export default mongoose.models.Withdrawal ||
  mongoose.model("Withdrawal", withdrawalSchema);

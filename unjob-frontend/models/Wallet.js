// models/Wallet.js - Enhanced with earnings synchronization

import mongoose from "mongoose";

const WalletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "debit", "transfer", "withdrawal", "refund", "sync"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "completed",
    },
    relatedModel: {
      type: String,
      enum: ["Project", "Gig", "Payment", "Withdrawal", "User"],
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    metadata: {
      projectTitle: String,
      gigTitle: String,
      companyName: String,
      autoCreated: Boolean,
      platformCommission: Number,
      originalAmount: Number,
      withdrawalId: String,
      paymentId: mongoose.Schema.Types.ObjectId,
      syncTransaction: Boolean,
      oldBalance: Number,
      newBalance: Number,
      earningsTotal: Number,
      withdrawalsTotal: Number,
      bankDetails: {
        accountHolderName: String,
        accountNumber: String,
        upiId: String,
      },
    },
  },
  { timestamps: true }
);

const WalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactions: [WalletTransactionSchema],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    lastSyncWithEarnings: {
      type: Date,
      default: null,
    },
    syncMetadata: {
      lastEarningsTotal: {
        type: Number,
        default: 0,
      },
      lastWithdrawalsTotal: {
        type: Number,
        default: 0,
      },
      syncIssuesDetected: {
        type: Number,
        default: 0,
      },
      lastSyncStatus: {
        type: String,
        enum: ["success", "failed", "partial"],
        default: "success",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Method to add funds to wallet with earnings correlation
WalletSchema.methods.addFunds = function (amount, description, metadata = {}) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  this.balance += amount;
  this.totalEarned += amount;
  this.lastUpdated = new Date();

  const transaction = {
    type: "credit",
    amount: amount,
    description: description,
    status: "completed",
    metadata: {
      ...metadata,
      autoCreated: true,
      timestamp: new Date(),
    },
  };

  this.transactions.push(transaction);
  return this.save();
};

// Method to add pending funds (when gig is accepted)
WalletSchema.methods.addPendingFunds = function (amount, description, metadata = {}) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  this.pendingAmount += amount;
  this.lastUpdated = new Date();

  const transaction = {
    type: "credit",
    amount: amount,
    description: description,
    status: "pending",
    metadata: {
      ...metadata,
      pendingFunds: true,
      autoCreated: true,
      timestamp: new Date(),
    },
  };

  this.transactions.push(transaction);
  return this.save();
};

// Method to move funds from pending to available (when project is approved)
WalletSchema.methods.movePendingToAvailable = function (amount, description, metadata = {}) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  if (amount > this.pendingAmount) {
    throw new Error(
      `Insufficient pending balance. Available: ₹${this.pendingAmount}, Requested: ₹${amount}`
    );
  }

  // Move from pending to available
  this.pendingAmount -= amount;
  this.balance += amount;
  this.totalEarned += amount;
  this.lastUpdated = new Date();

  const transaction = {
    type: "transfer",
    amount: amount,
    description: description,
    status: "completed",
    metadata: {
      ...metadata,
      transferType: "pending_to_available",
      autoCreated: true,
      timestamp: new Date(),
    },
  };

  this.transactions.push(transaction);
  return this.save();
};

// Enhanced method to withdraw funds with better tracking
WalletSchema.methods.withdrawFunds = function (
  amount,
  description,
  metadata = {}
) {
  if (amount <= 0) {
    throw new Error("Amount must be positive");
  }

  if (amount > this.balance) {
    throw new Error(
      `Insufficient balance. Available: ₹${this.balance}, Requested: ₹${amount}`
    );
  }

  const oldBalance = this.balance;
  this.balance -= amount;
  this.totalWithdrawn += amount;
  this.lastUpdated = new Date();

  const transaction = {
    type: "withdrawal",
    amount: amount,
    description: description,
    status: metadata.status || "completed",
    metadata: {
      ...metadata,
      oldBalance: oldBalance,
      newBalance: this.balance,
      timestamp: new Date(),
    },
  };

  this.transactions.push(transaction);
  return this.save();
};

// Method to refund a withdrawal (when withdrawal fails)
WalletSchema.methods.refundWithdrawal = function (
  amount,
  withdrawalId,
  description
) {
  if (amount <= 0) {
    throw new Error("Refund amount must be positive");
  }

  this.balance += amount;
  this.totalWithdrawn = Math.max(0, this.totalWithdrawn - amount);
  this.lastUpdated = new Date();

  const transaction = {
    type: "refund",
    amount: amount,
    description: description || `Refund for failed withdrawal ${withdrawalId}`,
    status: "completed",
    metadata: {
      withdrawalId: withdrawalId,
      refundReason: "withdrawal_failed",
      autoCreated: true,
      timestamp: new Date(),
    },
  };

  this.transactions.push(transaction);
  return this.save();
};

// Method to sync wallet with earnings system
WalletSchema.methods.syncWithEarnings = async function (earningsData) {
  const {
    totalEarnings,
    totalWithdrawals,
    completedPayments = [],
  } = earningsData;

  if (
    typeof totalEarnings !== "number" ||
    typeof totalWithdrawals !== "number"
  ) {
    throw new Error("Invalid earnings data provided");
  }

  const oldBalance = this.balance;
  const oldTotalEarned = this.totalEarned;
  const oldTotalWithdrawn = this.totalWithdrawn;

  // Calculate expected balance
  const expectedBalance = Math.max(0, totalEarnings - totalWithdrawals);

  // Update wallet values
  this.balance = expectedBalance;
  this.totalEarned = totalEarnings;
  this.totalWithdrawn = totalWithdrawals;
  this.lastUpdated = new Date();
  this.lastSyncWithEarnings = new Date();

  // Update sync metadata
  this.syncMetadata.lastEarningsTotal = totalEarnings;
  this.syncMetadata.lastWithdrawalsTotal = totalWithdrawals;
  this.syncMetadata.lastSyncStatus = "success";

  // Record sync transaction if there were significant changes
  const balanceChange = expectedBalance - oldBalance;
  const earningsChange = totalEarnings - oldTotalEarned;
  const withdrawalsChange = totalWithdrawals - oldTotalWithdrawn;

  if (
    Math.abs(balanceChange) > 1 ||
    Math.abs(earningsChange) > 1 ||
    Math.abs(withdrawalsChange) > 1
  ) {
    const syncTransaction = {
      type: "sync",
      amount: Math.abs(balanceChange),
      description: `Wallet synchronized with earnings system`,
      status: "completed",
      metadata: {
        syncTransaction: true,
        oldBalance: oldBalance,
        newBalance: expectedBalance,
        earningsChange: earningsChange,
        withdrawalsChange: withdrawalsChange,
        earningsTotal: totalEarnings,
        withdrawalsTotal: totalWithdrawals,
        autoCreated: true,
        syncTimestamp: new Date(),
      },
    };
    this.transactions.push(syncTransaction);
  }

  return this.save();
};

// Method to get recent transactions with better formatting
WalletSchema.methods.getRecentTransactions = function (limit = 10) {
  return this.transactions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

// Method to get transaction history by type
WalletSchema.methods.getTransactionsByType = function (type, limit = 50) {
  return this.transactions
    .filter((tx) => tx.type === type)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

// Method to get pending withdrawals
WalletSchema.methods.getPendingWithdrawals = function () {
  return this.transactions.filter(
    (tx) => tx.type === "withdrawal" && tx.status === "pending"
  );
};

// Method to check wallet health and sync status
WalletSchema.methods.checkHealth = function () {
  const now = new Date();
  const daysSinceLastSync = this.lastSyncWithEarnings
    ? Math.floor((now - this.lastSyncWithEarnings) / (1000 * 60 * 60 * 24))
    : null;

  const pendingTransactions = this.transactions.filter(
    (tx) => tx.status === "pending"
  );
  const failedTransactions = this.transactions.filter(
    (tx) => tx.status === "failed"
  );

  return {
    isHealthy: this.balance >= 0 && this.isActive,
    needsSync: !this.lastSyncWithEarnings || daysSinceLastSync > 7,
    daysSinceLastSync: daysSinceLastSync,
    pendingTransactionsCount: pendingTransactions.length,
    failedTransactionsCount: failedTransactions.length,
    lastSyncStatus: this.syncMetadata?.lastSyncStatus || "unknown",
    recommendations: this.generateHealthRecommendations(
      daysSinceLastSync,
      pendingTransactions,
      failedTransactions
    ),
  };
};

// Helper method to generate health recommendations
WalletSchema.methods.generateHealthRecommendations = function (
  daysSinceLastSync,
  pendingTransactions,
  failedTransactions
) {
  const recommendations = [];

  if (!this.lastSyncWithEarnings || daysSinceLastSync > 7) {
    recommendations.push({
      type: "sync",
      priority: "high",
      message: "Sync wallet with earnings system",
      action: "sync_with_earnings",
    });
  }

  if (pendingTransactions.length > 0) {
    recommendations.push({
      type: "pending",
      priority: "medium",
      message: `${pendingTransactions.length} pending transactions need attention`,
      action: "review_pending_transactions",
    });
  }

  if (failedTransactions.length > 5) {
    recommendations.push({
      type: "failed",
      priority: "low",
      message: "Multiple failed transactions detected",
      action: "review_failed_transactions",
    });
  }

  if (this.balance < 0) {
    recommendations.push({
      type: "negative_balance",
      priority: "critical",
      message: "Negative balance detected",
      action: "immediate_sync_required",
    });
  }

  return recommendations;
};

// Static method to create wallet for user with initial sync
WalletSchema.statics.createUserWallet = async function (
  userId,
  initialEarningsData = null
) {
  const existingWallet = await this.findOne({ user: userId });
  if (existingWallet) {
    return existingWallet;
  }

  const walletData = {
    user: userId,
    balance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    transactions: [],
    lastSyncWithEarnings: initialEarningsData ? new Date() : null,
    syncMetadata: {
      lastEarningsTotal: initialEarningsData?.totalEarnings || 0,
      lastWithdrawalsTotal: initialEarningsData?.totalWithdrawals || 0,
      syncIssuesDetected: 0,
      lastSyncStatus: "success",
    },
  };

  // If initial earnings data is provided, set up wallet accordingly
  if (initialEarningsData) {
    const { totalEarnings, totalWithdrawals } = initialEarningsData;
    walletData.balance = Math.max(0, totalEarnings - totalWithdrawals);
    walletData.totalEarned = totalEarnings;
    walletData.totalWithdrawn = totalWithdrawals;

    // Add initial sync transaction
    if (totalEarnings > 0) {
      walletData.transactions.push({
        type: "credit",
        amount: totalEarnings,
        description: "Initial earnings sync during wallet creation",
        status: "completed",
        metadata: {
          initialSync: true,
          autoCreated: true,
          totalEarnings: totalEarnings,
          totalWithdrawals: totalWithdrawals,
        },
      });
    }
  }

  const wallet = new this(walletData);
  return await wallet.save();
};

// Static method to sync all wallets with earnings data
WalletSchema.statics.syncAllWallets = async function (progressCallback = null) {
  const User = mongoose.model("User");
  const Payment = mongoose.model("Payment");

  const freelancers = await User.find({ role: "freelancer" });
  const results = [];

  for (let i = 0; i < freelancers.length; i++) {
    const freelancer = freelancers[i];

    try {
      // Get earnings data
      const completedPayments = await Payment.find({
        payee: freelancer._id,
        status: "completed",
        type: { $ne: "subscription" },
      });

      const withdrawals = await Payment.find({
        payer: freelancer._id,
        type: "withdrawal",
        status: { $in: ["completed", "processing", "pending"] },
      });

      const totalEarnings = completedPayments.reduce(
        (sum, p) => sum + p.amount,
        0
      );
      const totalWithdrawals = withdrawals.reduce(
        (sum, w) => sum + w.amount,
        0
      );

      // Get or create wallet
      let wallet = await this.findOne({ user: freelancer._id });
      if (!wallet) {
        wallet = await this.createUserWallet(freelancer._id, {
          totalEarnings,
          totalWithdrawals,
          completedPayments,
        });
      } else {
        await wallet.syncWithEarnings({
          totalEarnings,
          totalWithdrawals,
          completedPayments,
        });
      }

      results.push({
        userId: freelancer._id,
        userName: freelancer.name,
        success: true,
        balance: wallet.balance,
        totalEarned: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn,
      });

      if (progressCallback) {
        progressCallback({
          completed: i + 1,
          total: freelancers.length,
          current: freelancer.name,
          success: true,
        });
      }
    } catch (error) {
      console.error(`Failed to sync wallet for ${freelancer.name}:`, error);
      results.push({
        userId: freelancer._id,
        userName: freelancer.name,
        success: false,
        error: error.message,
      });

      if (progressCallback) {
        progressCallback({
          completed: i + 1,
          total: freelancers.length,
          current: freelancer.name,
          success: false,
          error: error.message,
        });
      }
    }
  }

  return results;
};

// Indexes for better performance
WalletSchema.index({ user: 1 }, { unique: true });
WalletSchema.index({ "transactions.createdAt": -1 });
WalletSchema.index({ "transactions.type": 1 });
WalletSchema.index({ "transactions.status": 1 });
WalletSchema.index({ lastSyncWithEarnings: 1 });

export default mongoose.models.Wallet || mongoose.model("Wallet", WalletSchema);

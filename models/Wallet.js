// models/Wallet.js
const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: {
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
    currency: {
      type: String,
      default: "INR",
    },

    transactions: [
      {
        type: {
          type: String,
          enum: [
            "credit",
            "debit",
            "refund",
            "withdrawal",
            "penalty",
            "bonus",
            "commission_earned",
            "commission_deducted",
          ],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        description: String,
        reference: {
          type: String, // Payment ID, Gig ID, etc.
        },
        referenceModel: {
          type: String,
          enum: ["Payment", "Gig", "Project", "Withdrawal"],
        },
        balanceAfter: {
          type: Number,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    pendingWithdrawals: {
      type: Number,
      default: 0,
    },

    totalEarned: {
      type: Number,
      default: 0,
    },

    totalWithdrawn: {
      type: Number,
      default: 0,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    blockedReason: String,
    blockedAt: Date,

    lastTransactionAt: Date,

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Wallet methods
walletSchema.methods.addTransaction = function (transactionData) {
  const { type, amount, description, reference, referenceModel } =
    transactionData;

  if (type === "debit" && this.balance < amount) {
    throw new Error("Insufficient balance");
  }

  const balanceChange = type === "credit" ? amount : -amount;
  this.balance += balanceChange;

  this.transactions.push({
    type,
    amount,
    description,
    reference,
    referenceModel,
    balanceAfter: this.balance,
  });

  this.lastTransactionAt = new Date();

  if (type === "credit") {
    this.totalEarned += amount;
  }

  return this.save();
};

walletSchema.methods.getTransactionHistory = function (options = {}) {
  const { limit = 50, skip = 0, type = null } = options;

  let transactions = this.transactions;

  if (type) {
    transactions = transactions.filter((t) => t.type === type);
  }

  return transactions
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(skip, skip + limit);
};

walletSchema.index({ userId: 1 });
walletSchema.index({ balance: 1 });
walletSchema.index({ isBlocked: 1 });

module.exports =
  mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);

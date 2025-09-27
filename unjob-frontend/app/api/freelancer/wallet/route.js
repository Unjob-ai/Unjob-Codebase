// api/freelancer/wallet/route.js - Enhanced wallet system with earnings synchronization

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Wallet from "@/models/Wallet";
import Payment from "@/models/Payment";
import { processAllPendingEarnings } from "@/lib/walletUtils";

function getRelativeTime(date) {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0)
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  if (diffInHours > 0)
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  if (diffInMinutes > 0)
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    let freelancer = null;
    const userId = session.user.userId || session.user.id || session.user._id;

    if (userId) {
      freelancer = await User.findById(userId);
    } else if (session.user.email) {
      freelancer = await User.findOne({ email: session.user.email });
    }

    if (!freelancer || freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can access wallet" },
        { status: 403 }
      );
    }

    let wallet = await Wallet.findOne({ user: freelancer._id });
    if (!wallet) {
      wallet = await Wallet.createUserWallet(freelancer._id);
    }

    // Get earnings data for comparison and synchronization
    const completedPayments = await Payment.find({
      payee: freelancer._id,
      status: "completed",
      type: { $ne: "subscription" },
    });

    const totalEarningsFromPayments = completedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    // Get all withdrawals from both systems
    const allWithdrawals = await Payment.find({
      payer: freelancer._id,
      type: "withdrawal",
      status: { $in: ["completed", "processing", "pending"] },
    });

    const totalWithdrawals = allWithdrawals.reduce(
      (sum, withdrawal) => sum + withdrawal.amount,
      0
    );

    // Calculate expected balances
    const expectedBalance = totalEarningsFromPayments - totalWithdrawals;
    const walletBalance = wallet.balance;
    const balanceDifference = Math.abs(expectedBalance - walletBalance);

    // Check for synchronization issues
    const needsSync = balanceDifference > 1; // Allow for minor rounding differences
    let syncIssues = [];

    if (needsSync) {
      syncIssues.push({
        type: "balance_mismatch",
        description: `Wallet balance (₹${walletBalance}) doesn't match expected balance (₹${expectedBalance})`,
        difference: balanceDifference,
        suggestedAction: "Sync wallet with earnings data",
      });
    }

    // Check wallet total earned vs actual earnings
    if (Math.abs(wallet.totalEarned - totalEarningsFromPayments) > 1) {
      syncIssues.push({
        type: "earnings_mismatch",
        description: `Wallet total earned (₹${wallet.totalEarned}) doesn't match payment records (₹${totalEarningsFromPayments})`,
        difference: Math.abs(wallet.totalEarned - totalEarningsFromPayments),
        suggestedAction: "Update wallet earnings record",
      });
    }

    // Check wallet total withdrawn vs actual withdrawals
    if (Math.abs(wallet.totalWithdrawn - totalWithdrawals) > 1) {
      syncIssues.push({
        type: "withdrawal_mismatch",
        description: `Wallet total withdrawn (₹${wallet.totalWithdrawn}) doesn't match withdrawal records (₹${totalWithdrawals})`,
        difference: Math.abs(wallet.totalWithdrawn - totalWithdrawals),
        suggestedAction: "Update wallet withdrawal record",
      });
    }

    const { searchParams } = new URL(req.url);
    const transactionLimit =
      parseInt(searchParams.get("transactionLimit")) || 20;
    const recentTransactions = wallet.getRecentTransactions(transactionLimit);

    // Enhanced transaction formatting with earnings correlation
    const formattedTransactions = recentTransactions.map((tx) => {
      const isWithdrawal = tx.type === "withdrawal" || tx.type === "debit";
      const relatedPayment = tx.metadata?.paymentId || tx.relatedId;

      return {
        _id: tx._id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt,
        metadata: {
          ...tx.metadata,
          correlatedWithEarnings: !!relatedPayment,
          transactionSource: tx.metadata?.autoCreated ? "automatic" : "manual",
        },
        formattedAmount: `${
          isWithdrawal ? "-" : "+"
        }₹${tx.amount.toLocaleString()}`,
        relativeTime: getRelativeTime(tx.createdAt),
        isWithdrawal: isWithdrawal,
        isEarning: tx.type === "credit" && !isWithdrawal,
        statusColor: getTransactionStatusColor(tx.type, tx.status),
      };
    });

    // Calculate comprehensive statistics
    const walletStats = {
      // Current state
      balance: wallet.balance,
      pendingAmount: wallet.pendingAmount,
      totalEarned: wallet.totalEarned,
      totalWithdrawn: wallet.totalWithdrawn,
      lastUpdated: wallet.lastUpdated,

      // Synchronization data
      earningsSystemData: {
        totalEarnings: totalEarningsFromPayments,
        totalWithdrawals: totalWithdrawals,
        expectedBalance: expectedBalance,
      },

      // System health
      systemHealth: {
        inSync: !needsSync,
        balanceDifference: balanceDifference,
        syncIssues: syncIssues,
        lastSyncCheck: new Date(),
      },

      // Transaction breakdown
      transactionSummary: {
        totalTransactions: wallet.transactions.length,
        creditTransactions: wallet.transactions.filter(
          (tx) => tx.type === "credit"
        ).length,
        debitTransactions: wallet.transactions.filter(
          (tx) => tx.type === "debit" || tx.type === "withdrawal"
        ).length,
        pendingTransactions: wallet.transactions.filter(
          (tx) => tx.status === "pending"
        ).length,
      },

      // Withdrawal capabilities
      withdrawalInfo: {
        availableForWithdrawal: Math.max(0, wallet.balance),
        canWithdraw:
          wallet.balance >= (process.env.WALLET_MIN_WITHDRAWAL || 100),
        minWithdrawal: parseInt(process.env.WALLET_MIN_WITHDRAWAL) || 100,
        maxWithdrawal: wallet.balance,
        pendingWithdrawals: allWithdrawals.filter((w) =>
          ["pending", "processing"].includes(w.status)
        ).length,
      },
    };

    // Recent activity analysis (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentWalletTransactions = wallet.transactions.filter(
      (tx) => new Date(tx.createdAt) >= thirtyDaysAgo
    );
    const recentPayments = completedPayments.filter(
      (p) => new Date(p.createdAt) >= thirtyDaysAgo
    );
    const recentWithdrawals = allWithdrawals.filter(
      (w) => new Date(w.createdAt) >= thirtyDaysAgo
    );

    const recentActivity = {
      last30Days: {
        walletTransactions: recentWalletTransactions.length,
        earnings: recentPayments.reduce((sum, p) => sum + p.amount, 0),
        withdrawals: recentWithdrawals.reduce((sum, w) => sum + w.amount, 0),
        netChange:
          recentPayments.reduce((sum, p) => sum + p.amount, 0) -
          recentWithdrawals.reduce((sum, w) => sum + w.amount, 0),
      },
    };

    return NextResponse.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        pendingAmount: wallet.pendingAmount,
        totalEarned: wallet.totalEarned,
        totalWithdrawn: wallet.totalWithdrawn,
        lastUpdated: wallet.lastUpdated,
        isActive: wallet.isActive,

        // Formatted amounts for display
        formattedBalance: `₹${wallet.balance.toLocaleString()}`,
        formattedTotalEarned: `₹${wallet.totalEarned.toLocaleString()}`,
        formattedTotalWithdrawn: `₹${wallet.totalWithdrawn.toLocaleString()}`,
        formattedPending: `₹${wallet.pendingAmount.toLocaleString()}`,
      },

      transactions: formattedTransactions,
      stats: walletStats,
      recentActivity: recentActivity,

      // System synchronization info
      synchronization: {
        needsSync: needsSync,
        syncIssues: syncIssues,
        autoSyncAvailable: true,
        lastSyncAttempt: wallet.lastUpdated,
        earningsSystemBalance: expectedBalance,
        walletSystemBalance: walletBalance,
        difference: balanceDifference,
      },

      // Quick actions available
      availableActions: {
        canWithdraw: walletStats.withdrawalInfo.canWithdraw,
        canSync: needsSync,
        canRefresh: true,
        canViewHistory: wallet.transactions.length > 0,
      },
    });
  } catch (error) {
    console.error("Wallet fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet data" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    let freelancer = null;
    const userId = session.user.userId || session.user.id || session.user._id;

    if (userId) {
      freelancer = await User.findById(userId);
    } else if (session.user.email) {
      freelancer = await User.findOne({ email: session.user.email });
    }

    if (!freelancer || freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can perform wallet actions" },
        { status: 403 }
      );
    }

    const { action } = await req.json();

    // Handle different wallet actions
    switch (action) {
      case "process_pending":
        const results = await processAllPendingEarnings();
        return NextResponse.json({
          success: true,
          message: "Processed all pending earnings",
          results: results,
          processed: results.length,
          successful: results.filter((r) => r.success).length,
        });

      case "sync_with_earnings":
        try {
          // Get wallet
          let wallet = await Wallet.findOne({ user: freelancer._id });
          if (!wallet) {
            wallet = await Wallet.createUserWallet(freelancer._id);
          }

          // Get current earnings data
          const completedPayments = await Payment.find({
            payee: freelancer._id,
            status: "completed",
            type: { $ne: "subscription" },
          });

          const totalEarningsFromPayments = completedPayments.reduce(
            (sum, payment) => sum + payment.amount,
            0
          );

          // Get withdrawal data
          const allWithdrawals = await Payment.find({
            payer: freelancer._id,
            type: "withdrawal",
            status: { $in: ["completed", "processing", "pending"] },
          });

          const totalWithdrawals = allWithdrawals.reduce(
            (sum, withdrawal) => sum + withdrawal.amount,
            0
          );

          // Calculate correct balances
          const expectedBalance = totalEarningsFromPayments - totalWithdrawals;

          // Update wallet to match earnings system
          const oldBalance = wallet.balance;
          const oldTotalEarned = wallet.totalEarned;
          const oldTotalWithdrawn = wallet.totalWithdrawn;

          wallet.balance = Math.max(0, expectedBalance);
          wallet.totalEarned = totalEarningsFromPayments;
          wallet.totalWithdrawn = totalWithdrawals;
          wallet.lastUpdated = new Date();

          // Add sync transaction if balance changed
          if (Math.abs(oldBalance - wallet.balance) > 1) {
            const difference = wallet.balance - oldBalance;
            const syncTransaction = {
              type: difference > 0 ? "credit" : "debit",
              amount: Math.abs(difference),
              description: `Wallet synchronization with earnings system`,
              status: "completed",
              metadata: {
                syncTransaction: true,
                oldBalance: oldBalance,
                newBalance: wallet.balance,
                earningsTotal: totalEarningsFromPayments,
                withdrawalsTotal: totalWithdrawals,
                autoCreated: true,
              },
            };
            wallet.transactions.push(syncTransaction);
          }

          await wallet.save();

          // Update freelancer stats
          if (freelancer.stats) {
            freelancer.stats.totalEarnings = wallet.balance;
            await freelancer.save();
          }

          return NextResponse.json({
            success: true,
            message: "Wallet synchronized with earnings system successfully",
            syncResults: {
              balanceChange: wallet.balance - oldBalance,
              earningsChange: wallet.totalEarned - oldTotalEarned,
              withdrawalsChange: wallet.totalWithdrawn - oldTotalWithdrawn,
              newBalance: wallet.balance,
              syncedAt: wallet.lastUpdated,
            },
            formattedResults: {
              oldBalance: `₹${oldBalance.toLocaleString()}`,
              newBalance: `₹${wallet.balance.toLocaleString()}`,
              balanceChange: `₹${Math.abs(
                wallet.balance - oldBalance
              ).toLocaleString()}`,
              changeDirection:
                wallet.balance > oldBalance ? "increased" : "decreased",
            },
          });
        } catch (syncError) {
          console.error("Wallet sync error:", syncError);
          return NextResponse.json(
            { error: "Failed to sync wallet with earnings" },
            { status: 500 }
          );
        }

      case "refresh_balance":
        try {
          let wallet = await Wallet.findOne({ user: freelancer._id });
          if (!wallet) {
            wallet = await Wallet.createUserWallet(freelancer._id);
          }

          wallet.lastUpdated = new Date();
          await wallet.save();

          return NextResponse.json({
            success: true,
            message: "Wallet balance refreshed",
            wallet: {
              balance: wallet.balance,
              totalEarned: wallet.totalEarned,
              totalWithdrawn: wallet.totalWithdrawn,
              lastUpdated: wallet.lastUpdated,
              formattedBalance: `₹${wallet.balance.toLocaleString()}`,
            },
          });
        } catch (refreshError) {
          console.error("Wallet refresh error:", refreshError);
          return NextResponse.json(
            { error: "Failed to refresh wallet" },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { error: "Invalid action specified" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Wallet action error:", error);
    return NextResponse.json(
      { error: "Failed to process wallet action" },
      { status: 500 }
    );
  }
}

// Helper function to determine transaction status color
function getTransactionStatusColor(type, status) {
  if (status === "pending") return "yellow";
  if (status === "failed") return "red";

  switch (type) {
    case "credit":
      return "green";
    case "debit":
    case "withdrawal":
      return "red";
    case "refund":
      return "blue";
    default:
      return "gray";
  }
}

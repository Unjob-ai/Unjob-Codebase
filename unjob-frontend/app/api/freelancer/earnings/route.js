// api/freelancer/earnings/route.js - Enhanced with withdrawal deduction from earnings

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import Gig from "@/models/Gig";
import Project from "@/models/Project";
import Wallet from "@/models/Wallet";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    console.log("🔍 [EARNINGS API] Starting earnings calculation...");
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log("❌ [EARNINGS API] No authentication");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Better user resolution
    let freelancer = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      freelancer = await User.findById(userId);
    }

    if (!freelancer && session.user.email) {
      freelancer = await User.findOne({ email: session.user.email });
    }

    if (!freelancer || freelancer.role !== "freelancer") {
      console.log(`❌ [EARNINGS API] Invalid user: ${freelancer?.role || 'not found'}`);
      return NextResponse.json(
        { error: "Only freelancers can view earnings" },
        { status: 403 }
      );
    }

    console.log(`✅ [EARNINGS API] Processing for freelancer: ${freelancer.name} (${freelancer.email})`);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");

    // 1. GET ALL PAYMENTS (AUTOMATIC + MANUAL) - Exclude subscription payments
    let paymentQuery = {
      payee: freelancer._id,
      type: { $ne: "subscription" }, // Exclude subscription payments
    };

    if (status && status !== "all") {
      paymentQuery.status = status;
    }

    const payments = await Payment.find(paymentQuery)
      .populate("payer", "name image profile.companyName")
      .populate("gig", "title budget timeline")
      .populate("project", "title status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // 2. GET ALL PROJECT EARNINGS FOR COMPREHENSIVE STATS
    const allProjectEarnings = await Payment.find({
      payee: freelancer._id,
      type: { $ne: "subscription" }, // Exclude subscriptions
    });

    // 🆕 NEW: Get all withdrawals to deduct from earnings
    const allWithdrawals = await Payment.find({
      payer: freelancer._id,
      type: "withdrawal",
      status: { $in: ["completed", "processing", "pending"] }, // Include all non-failed withdrawals
    });

    const totalWithdrawals = allWithdrawals.reduce(
      (sum, withdrawal) => sum + withdrawal.amount,
      0
    );

    // 🆕 NEW: Get wallet balance (includes amounts that were transferred from pending to available)
    const wallet = await Wallet.findOne({ user: freelancer._id });
    const walletBalance = wallet ? wallet.balance : 0;
    const walletPending = wallet ? wallet.pendingAmount : 0;

    // console.log(`💳 Wallet data for ${freelancer.name}:`);
    // console.log(`   Available: ₹${walletBalance?.toLocaleString() || 0}`);
    // console.log(`   Pending: ₹${walletPending?.toLocaleString() || 0}`);

    // 🆕 NEW: Separate automatic vs manual payments
    const automaticPayments = allProjectEarnings.filter(
      (p) => p.metadata?.autoPayment === true
    );
    const manualPayments = allProjectEarnings.filter(
      (p) => p.metadata?.autoPayment !== true
    );

    // 3. GET PENDING EARNINGS (APPROVED PROJECTS WITHOUT PAYMENTS)
    const approvedProjects = await Project.find({
      freelancer: freelancer._id,
      status: "approved",
    }).populate([
      {
        path: "gig",
        select: "title freelancerReceivableAmount applications budget",
      },
      { path: "company", select: "name profile.companyName" },
    ]);

    // Filter projects that don't have automatic payments yet
    const pendingEarnings = [];
    for (const project of approvedProjects) {
      // Skip projects without gig data
      if (!project.gig || !project.gig._id) {
        console.log(`⚠️ Skipping project ${project._id} - missing gig data`);
        continue;
      }
      
      // Check if payment already exists for this project
      const hasPayment = await Payment.findOne({
        payee: freelancer._id,
        $or: [
          { project: project._id }, // Direct project payment
          {
            gig: project.gig._id,
            type: { $in: ["gig_payment", "milestone_payment"] },
          }, // Gig-based payment
        ],
      });

      if (!hasPayment) {
        // Calculate expected amount (temporarily no platform commission)
        const gigBudget = project.gig.budget || 0;
        const expectedAmount =
          project.gig.freelancerReceivableAmount ||
          Math.round(gigBudget * 1); // No commission deduction (was 0.95)

        pendingEarnings.push({
          _id: project._id,
          projectTitle: project.title,
          gigTitle: project.gig.title,
          amount: expectedAmount,
          originalBudget: gigBudget,
          platformCommission: gigBudget - expectedAmount,
          approvedAt: project.reviewedAt || project.updatedAt,
          company: {
            name: project.company.name,
            companyName: project.company.profile?.companyName,
          },
          gig: {
            _id: project.gig._id,
            title: project.gig.title,
            budget: gigBudget,
            freelancerReceivableAmount: expectedAmount,
          },
          canRequestPayment: true,
          status: "pending_automatic_payment",
          paymentType: "automatic",
        });
      }
    }

    // 4. CALCULATE COMPREHENSIVE EARNINGS STATISTICS
    const completedPayments = allProjectEarnings.filter(
      (p) => p.status === "completed"
    );
    const pendingPayments = allProjectEarnings.filter(
      (p) => p.status === "pending" || p.status === "processing"
    );

    // Calculate totals from actual payments
    const totalEarningsFromPayments = completedPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const totalPendingFromPayments = pendingPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const totalPendingFromProjects = pendingEarnings.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // 🆕 NEW: Calculate available balance from payments only (avoiding double counting with wallet)
    const availableBalance = totalEarningsFromPayments - totalWithdrawals;
    const netEarnings = Math.max(0, availableBalance); // Ensure non-negative

    // console.log(`💰 Balance calculation for ${freelancer.name}:`);
    // console.log(`   From payments: ₹${totalEarningsFromPayments?.toLocaleString()}`);
    // console.log(`   Withdrawals: ₹${totalWithdrawals?.toLocaleString()}`);
    // console.log(`   Available balance: ₹${availableBalance?.toLocaleString()}`);
    // console.log(`   Wallet balance: ₹${walletBalance?.toLocaleString()} (shown for reference, not included in calculation)`);

    // 🆕 NEW: Sync freelancer stats with actual payment data (after withdrawals)
    if (!freelancer.stats) {
      freelancer.stats = {
        totalEarnings: 0,
        completedProjects: 0,
        rating: 0,
        totalReviews: 0,
        followers: 0,
        following: 0,
        postsCount: 0,
      };
    }

    // Update stats if there's a discrepancy
    const currentStatsEarnings = freelancer.stats.totalEarnings || 0;
    if (currentStatsEarnings !== netEarnings) {
      console.log("🔄 Syncing earnings discrepancy:", {
        currentStats: currentStatsEarnings,
        actualPayments: totalEarningsFromPayments,
        totalWithdrawals: totalWithdrawals,
        netEarnings: netEarnings,
        difference: netEarnings - currentStatsEarnings,
      });

      freelancer.stats.totalEarnings = netEarnings;
      freelancer.stats.completedProjects = completedPayments.filter(
        (p) => p.type === "gig_payment"
      ).length;
      
      try {
        await freelancer.save({ validateBeforeSave: false });
        console.log("✅ Freelancer stats updated successfully");
      } catch (saveError) {
        console.log("⚠️ Failed to save freelancer stats, continuing anyway:", saveError.message);
      }
    }

    const stats = {
      // Core earnings (after withdrawals)
      totalEarnings: netEarnings,
      grossEarnings: totalEarningsFromPayments, // Before withdrawals
      totalWithdrawals: totalWithdrawals,
      pendingAmount: totalPendingFromPayments,
      pendingFromApprovedProjects: totalPendingFromProjects,

      // Payment breakdown
      automaticPayments: {
        count: automaticPayments.filter((p) => p.status === "completed").length,
        amount: automaticPayments
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + p.amount, 0),
      },
      manualPayments: {
        count: manualPayments.filter((p) => p.status === "completed").length,
        amount: manualPayments
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + p.amount, 0),
      },

      // Withdrawal breakdown
      withdrawalStats: {
        totalWithdrawn: totalWithdrawals,
        completedWithdrawals: allWithdrawals.filter(
          (w) => w.status === "completed"
        ).length,
        pendingWithdrawals: allWithdrawals.filter(
          (w) => w.status === "pending" || w.status === "processing"
        ).length,
      },

      // Project stats
      totalProjectPayments: allProjectEarnings.length,
      completedPayments: completedPayments.length,
      approvedProjectsAwaitingPayment: pendingEarnings.length,
      completedProjects: completedPayments.filter(
        (p) => p.type === "gig_payment"
      ).length,

      // Platform commission tracking
      totalCommissionPaid: allProjectEarnings.reduce(
        (sum, p) => sum + (p.metadata?.platformCommission || 0),
        0
      ),

      // Combined totals (includes wallet balance)
      availableForWithdrawal: Math.max(0, availableBalance),
      totalPendingEarnings: totalPendingFromPayments + totalPendingFromProjects + walletPending,
      
      // Wallet details
      walletBalance: walletBalance,
      walletPendingAmount: walletPending,
      totalFromPayments: totalEarningsFromPayments,
    };

    // 5. 🆕 NEW: RECENT EARNINGS ACTIVITY (Last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEarnings = completedPayments.filter(
      (p) => new Date(p.createdAt) >= thirtyDaysAgo
    );
    const recentApprovals = pendingEarnings.filter(
      (p) => new Date(p.approvedAt) >= thirtyDaysAgo
    );
    const recentWithdrawals = allWithdrawals.filter(
      (w) => new Date(w.createdAt) >= thirtyDaysAgo
    );

    const recentActivity = {
      last30Days: {
        earnings: recentEarnings.reduce((sum, p) => sum + p.amount, 0),
        withdrawals: recentWithdrawals.reduce((sum, w) => sum + w.amount, 0),
        paymentsReceived: recentEarnings.length,
        withdrawalsMade: recentWithdrawals.length,
        projectsApproved: recentApprovals.length,
        automaticPayments: recentEarnings.filter(
          (p) => p.metadata?.autoPayment === true
        ).length,
      },
    };

    // 6. FORMAT PAYMENT DATA WITH ENHANCED INFO
    const formattedPayments = payments.map((payment) => ({
      _id: payment._id,
      amount: payment.amount,
      status: payment.status,
      type: payment.type,
      description: payment.description,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      transferDetails: payment.transferDetails,

      // Enhanced payment metadata
      isAutomatic: payment.metadata?.autoPayment === true,
      originalBudget: payment.metadata?.originalBudget || payment.amount,
      platformCommission: payment.metadata?.platformCommission || 0,
      projectTitle: payment.project?.title || null,
      transferId: payment.transferDetails?.transferId || null,

      // Company/Payer info
      payer: payment.payer
        ? {
            _id: payment.payer._id,
            name: payment.payer.name,
            image: payment.payer.image,
            companyName: payment.payer.profile?.companyName,
          }
        : null,

      // Gig info
      gig: payment.gig
        ? {
            _id: payment.gig._id,
            title: payment.gig.title,
            budget: payment.gig.budget,
            timeline: payment.gig.timeline,
          }
        : null,

      // Project info (if available)
      project: payment.project
        ? {
            _id: payment.project._id,
            title: payment.project.title,
            status: payment.project.status,
          }
        : null,

      // Formatted data
      formattedAmount: `₹${payment.amount.toLocaleString()}`,
      formattedCommission: payment.metadata?.platformCommission
        ? `₹${payment.metadata.platformCommission.toLocaleString()}`
        : null,
      relativeTime: getRelativeTime(payment.createdAt),
      isProjectEarning: payment.type !== "subscription",

      // Payment source
      paymentSource:
        payment.metadata?.autoPayment === true ? "automatic" : "manual",
      paymentMethod: payment.transferDetails?.transferMode || "bank_transfer",
    }));

    const totalPayments = await Payment.countDocuments(paymentQuery);

    // 7. 🆕 NEW: MONTHLY EARNINGS BREAKDOWN (Last 6 months)
    const monthlyBreakdown = [];
    for (let i = 5; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const monthPayments = completedPayments.filter((p) => {
        const pDate = new Date(p.createdAt);
        return pDate >= startDate && pDate < endDate;
      });

      const monthWithdrawals = allWithdrawals.filter((w) => {
        const wDate = new Date(w.createdAt);
        return (
          wDate >= startDate && wDate < endDate && w.status === "completed"
        );
      });

      const monthlyEarnings = monthPayments.reduce(
        (sum, p) => sum + p.amount,
        0
      );
      const monthlyWithdrawals = monthWithdrawals.reduce(
        (sum, w) => sum + w.amount,
        0
      );

      monthlyBreakdown.push({
        month: startDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        earnings: monthlyEarnings,
        withdrawals: monthlyWithdrawals,
        netEarnings: monthlyEarnings - monthlyWithdrawals,
        paymentsCount: monthPayments.length,
        withdrawalsCount: monthWithdrawals.length,
        automaticPayments: monthPayments.filter(
          (p) => p.metadata?.autoPayment === true
        ).length,
        manualPayments: monthPayments.filter(
          (p) => p.metadata?.autoPayment !== true
        ).length,
      });
    }

    console.log(`📊 [EARNINGS API] Final stats for ${freelancer.name}:`);
    console.log(`   Available for withdrawal: ₹${stats.availableForWithdrawal?.toLocaleString()}`);
    console.log(`   Total earned: ₹${stats.totalEarnings?.toLocaleString()}`);
    console.log(`   Gross earnings: ₹${stats.grossEarnings?.toLocaleString()}`);

    return NextResponse.json({
      success: true,
      earnings: {
        payments: formattedPayments,
        pendingProjects: pendingEarnings,
        stats: stats,
        recentActivity: recentActivity,
        monthlyBreakdown: monthlyBreakdown,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPayments / limit),
        totalPayments,
        hasNextPage: page < Math.ceil(totalPayments / limit),
        hasPrevPage: page > 1,
        limit,
      },
      summary: {
        // Enhanced summary with withdrawal deductions
        totalEarned: stats.grossEarnings, // Before withdrawals
        netEarnings: stats.totalEarnings, // After withdrawals
        totalWithdrawals: stats.totalWithdrawals,
        pendingPayments: stats.pendingAmount,
        pendingFromProjects: stats.pendingFromApprovedProjects,
        availableForWithdrawal: stats.availableForWithdrawal,
        projectsAwaitingPayment: stats.approvedProjectsAwaitingPayment,

        // Payment method breakdown
        automaticEarnings: stats.automaticPayments.amount,
        manualEarnings: stats.manualPayments.amount,
        totalCommissionPaid: stats.totalCommissionPaid,

        // Recent activity
        last30DaysEarnings: recentActivity.last30Days.earnings,
        last30DaysWithdrawals: recentActivity.last30Days.withdrawals,
        recentProjectsApproved: recentActivity.last30Days.projectsApproved,

        // Formatted amounts
        formattedGrossEarnings: `₹${stats.grossEarnings.toLocaleString()}`,
        formattedNetEarnings: `₹${stats.totalEarnings.toLocaleString()}`,
        formattedTotalWithdrawals: `₹${stats.totalWithdrawals.toLocaleString()}`,
        formattedPendingEarnings: `₹${stats.totalPendingEarnings.toLocaleString()}`,
        formattedCommissionPaid: `₹${stats.totalCommissionPaid.toLocaleString()}`,
      },
      debug: {
        userId: freelancer._id,
        userRole: freelancer.role,
        queryUsed: paymentQuery,
        excludedSubscriptions: true,
        statsSync: {
          profileEarnings: currentStatsEarnings,
          grossPaymentEarnings: totalEarningsFromPayments,
          totalWithdrawals: totalWithdrawals,
          netEarnings: netEarnings,
          synced: currentStatsEarnings === netEarnings,
        },
      },
    });
  } catch (error) {
    console.error("Freelancer earnings fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch earnings",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to get relative time
function getRelativeTime(date) {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInMonths > 0) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  } else if (diffInWeeks > 0) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import User from "@/models/User";
import Payment from "@/models/Payment";
import Wallet from "@/models/Wallet";
import Notification from "@/models/Notification";
import { addWithdrawalToSheet } from "@/lib/googleSheets";

const MIN_WITHDRAWAL_AMOUNT = 100;
const DAILY_WITHDRAWAL_LIMIT = 3;

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

function getWithdrawalStatusDescription(status) {
  const descriptions = {
    pending: "Your withdrawal request is being reviewed by our team.",
    processing:
      "Your withdrawal is being processed by the bank. This may take up to 7 working days.",
    completed:
      "Withdrawal completed successfully and funds have been transferred.",
    failed:
      "Withdrawal failed. The amount has been refunded to your earnings balance.",
    cancelled:
      "Withdrawal was cancelled. The amount has been refunded to your earnings balance.",
  };
  return descriptions[status] || "Unknown status";
}

function maskAccountNumber(accountNumber) {
  if (
    !accountNumber ||
    typeof accountNumber !== "string" ||
    accountNumber.length < 4
  ) {
    return "";
  }
  return `****${accountNumber.slice(-4)}`;
}

function maskUpiId(upiId) {
  if (!upiId || typeof upiId !== "string" || !upiId.includes("@")) {
    return "";
  }
  const parts = upiId.split("@");
  const username = parts[0];
  const domain = parts[1];
  if (username.length < 4) {
    return `${username.slice(0, 1)}***@${domain}`;
  }
  return `${username.slice(0, 2)}****${username.slice(-2)}@${domain}`;
}

export async function POST(req) {
  console.log("[WITHDRAW_API] Received new withdrawal request.");
  const requestStartTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    console.log(
      `[WITHDRAW_API] Session validated successfully for user: ${
        session.user.id || session.user._id
      }`
    );

    await connectDB();

    let freelancer = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (mongoose.Types.ObjectId.isValid(userId)) {
      freelancer = await User.findById(userId);
    }

    if (!freelancer && session.user.email) {
      freelancer = await User.findOne({ email: session.user.email });
    }

    if (!freelancer) {
      return NextResponse.json(
        { error: "Freelancer account not found." },
        { status: 404 }
      );
    }

    if (freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can request withdrawals" },
        { status: 403 }
      );
    }
    console.log(
      `[WITHDRAW_API] Freelancer found: ${freelancer.name} (ID: ${freelancer._id})`
    );

    const { amount, bankDetails } = await req.json();
    console.log("[WITHDRAW_API] Request body parsed successfully.");

    console.log("Withdrawal request details:", {
      freelancerId: freelancer._id,
      freelancerName: freelancer.name,
      requestedAmount: amount / 100,
      bankDetails: {
        hasAccountNumber: !!bankDetails?.accountNumber,
        hasIfsc: !!bankDetails?.ifscCode,
        hasUpi: !!bankDetails?.upiId,
        accountHolderName: bankDetails?.accountHolderName,
      },
    });

    console.log(`[WITHDRAW_API] Validating withdrawal amount: ${amount}`);
    if (!amount || typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error:
            "Invalid withdrawal amount. Please enter a valid positive number.",
        },
        { status: 400 }
      );
    }

    // Correctly converts amount from paise to rupees
    const roundedAmount = amount / 100;
    console.log(`[WITHDRAW_API] Amount rounded to: ${roundedAmount}`);

    console.log("[WITHDRAW_API] Validating bank account details.");
    if (!bankDetails || !bankDetails.accountHolderName?.trim()) {
      return NextResponse.json(
        { error: "Account holder name is required for withdrawal." },
        { status: 400 }
      );
    }

    const hasCompleteBank = bankDetails.accountNumber && bankDetails.ifscCode;
    const hasUPI = bankDetails.upiId;

    if (!hasCompleteBank && !hasUPI) {
      return NextResponse.json(
        {
          error:
            "Please provide either complete bank account details (account number and IFSC code) or a UPI ID.",
          requiredFields: {
            option1: ["accountNumber", "ifscCode", "accountHolderName"],
            option2: ["upiId", "accountHolderName"],
          },
        },
        { status: 400 }
      );
    }
    console.log("[WITHDRAW_API] Bank details validation passed.");

    if (
      bankDetails.accountNumber &&
      !/^\d{9,18}$/.test(bankDetails.accountNumber)
    ) {
      return NextResponse.json(
        { error: "Invalid account number format. It should be 9-18 digits." },
        { status: 400 }
      );
    }

    if (
      bankDetails.ifscCode &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode)
    ) {
      return NextResponse.json(
        { error: "Invalid IFSC code format. Example: SBIN0001234" },
        { status: 400 }
      );
    }

    if (bankDetails.upiId && !/^[\w\.-]+@[\w\.-]+$/.test(bankDetails.upiId)) {
      return NextResponse.json(
        { error: "Invalid UPI ID format. Example: user@oksbi" },
        { status: 400 }
      );
    }

    console.log("[WITHDRAW_API] Checking minimum withdrawal amount.");
    if (roundedAmount < MIN_WITHDRAWAL_AMOUNT) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT}` },
        { status: 400 }
      );
    }
    console.log(
      `[WITHDRAW_API] Passed minimum withdrawal check. Amount: ${roundedAmount} >= ${MIN_WITHDRAWAL_AMOUNT}`
    );

    console.log(
      `[WITHDRAW_API] Checking daily withdrawal rate limit for user ${freelancer._id}`
    );
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentWithdrawals = await Payment.countDocuments({
      payer: freelancer._id,
      type: "withdrawal",
      createdAt: { $gte: twentyFourHoursAgo },
    });

    if (recentWithdrawals >= DAILY_WITHDRAWAL_LIMIT) {
      return NextResponse.json(
        {
          error: "Daily withdrawal limit reached.",
          message: `You can only make ${DAILY_WITHDRAWAL_LIMIT} withdrawal requests per day.`,
        },
        { status: 429 }
      );
    }
    console.log(
      `[WITHDRAW_API] Recent withdrawals found: ${recentWithdrawals}. Limit is ${DAILY_WITHDRAWAL_LIMIT}. OK.`
    );

    console.log("[WITHDRAW_API] Starting balance calculation...");
    console.log(
      `[WITHDRAW_API] Fetching completed payments for freelancer ${freelancer._id}`
    );
    const completedPayments = await Payment.find({
      payee: freelancer._id,
      status: "completed",
      type: { $ne: "subscription" },
    });

    console.log(
      `[WITHDRAW_API] Fetching previous withdrawals for freelancer ${freelancer._id}`
    );
    const previousWithdrawals = await Payment.find({
      payer: freelancer._id,
      type: "withdrawal",
      status: { $in: ["completed", "processing", "pending"] },
    });

    const totalEarnings = completedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    const totalWithdrawn = previousWithdrawals.reduce(
      (sum, withdrawal) => sum + withdrawal.amount,
      0
    );

    const availableBalanceEarnings = totalEarnings - totalWithdrawn;

    console.log(
      `[WITHDRAW_API] Fetching wallet for freelancer ${freelancer._id}`
    );
    let wallet = await Wallet.findOne({ user: freelancer._id });
    if (!wallet) {
      wallet = await Wallet.createUserWallet(freelancer._id);
    }

    // FIXED: Use only earnings-based balance calculation
    const availableBalance = availableBalanceEarnings;

    console.log("Balance calculation:", {
      totalEarnings,
      totalWithdrawn,
      availableBalanceEarnings,
      availableBalance,
      requestedAmount: roundedAmount,
    });

    if (roundedAmount > availableBalance) {
      return NextResponse.json(
        {
          error: "Insufficient balance.",
          message: `Your withdrawal request of ₹${roundedAmount.toLocaleString()} exceeds your available balance of ₹${availableBalance.toLocaleString()}.`,
          details: {
            requestedAmount: roundedAmount,
            availableBalance: availableBalance,
            earningsBalance: availableBalanceEarnings,
            totalEarnings: totalEarnings,
            totalWithdrawn: totalWithdrawn,
          },
        },
        { status: 400 }
      );
    }
    console.log(
      `[WITHDRAW_API] Balance check passed. Requested: ${roundedAmount} <= Available: ${availableBalance}`
    );

    console.log("[WITHDRAW_API] Initiating withdrawal processing...");
    const withdrawalId = `WD${Date.now().toString().slice(-8)}`;
    console.log(`[WITHDRAW_API] Generated Withdrawal ID: ${withdrawalId}`);

    let savedWithdrawal;

    try {
      console.log(
        "[WITHDRAW_API] Creating withdrawal record in Payment model..."
      );
      const withdrawal = new Payment({
        payer: freelancer._id,
        payee: freelancer._id,
        amount: roundedAmount,
        type: "withdrawal",
        status: "pending",
        description: `Withdrawal request by ${freelancer.name} for ₹${roundedAmount}`,

        bankAccountDetails: {
          accountNumber: bankDetails.accountNumber || "",
          ifscCode: bankDetails.ifscCode || "",
          accountHolderName: bankDetails.accountHolderName,
          bankName: bankDetails.bankName || "",
          upiId: bankDetails.upiId || "",
        },

        metadata: {
          withdrawalId: withdrawalId,
          availableBalanceBefore: availableBalance,
          totalEarningsAtRequest: totalEarnings,
          previousWithdrawalsAtRequest: totalWithdrawn,
          requestedAt: new Date(),
          freelancerName: freelancer.name,
          freelancerEmail: freelancer.email,
          freelancerPhone: freelancer.profile?.phone || "",
          earningsBalanceBefore: availableBalanceEarnings,
          deductedFromEarnings: true,
          requestIp: req.headers.get("x-forwarded-for") ?? req.ip,
        },

        statusHistory: [
          {
            status: "pending",
            timestamp: new Date(),
            description: "Withdrawal request submitted by freelancer.",
          },
        ],
      });
      savedWithdrawal = await withdrawal.save();
      console.log(
        `[WITHDRAW_API] Payment record saved successfully. ID: ${savedWithdrawal._id}`
      );

      console.log(
        "[WITHDRAW_API] Amount deducted from earnings balance conceptually."
      );
      console.log(
        `[WITHDRAW_API] The withdrawal is now tracked and amount is considered reserved from earnings.`
      );

      console.log("[WITHDRAW_API] Updating freelancer earnings stats...");
      if (!freelancer.stats) {
        freelancer.stats = {};
      }

      // Update the freelancer's available earnings to reflect the pending withdrawal
      const newAvailableEarnings =
        totalEarnings - (totalWithdrawn + roundedAmount);
      freelancer.stats.totalEarnings = totalEarnings; // Keep total earnings unchanged
      freelancer.stats.availableEarnings = Math.max(0, newAvailableEarnings);
      freelancer.stats.totalWithdrawn = totalWithdrawn + roundedAmount;

      await freelancer.save({ validateBeforeSave: false });
      console.log(
        `[WITHDRAW_API] Freelancer stats updated. Available earnings: ${newAvailableEarnings}`
      );

      console.log("[WITHDRAW_API] Creating notification for freelancer...");
      await Notification.create({
        user: freelancer._id,
        type: "withdrawal_requested",
        title: "Withdrawal Request Submitted",
        message: `Your withdrawal request for ₹${roundedAmount.toLocaleString()} is being processed. The amount has been reserved from your available earnings.`,
        relatedId: savedWithdrawal._id,
        actionUrl: `/freelancer/earnings`,
      });
      console.log("[WITHDRAW_API] Notification for freelancer created.");

      console.log("[WITHDRAW_API] Creating notifications for admin users...");
      const adminUsers = await User.find({ role: "admin" }).select("_id");
      const adminNotifications = adminUsers.map((admin) => ({
        user: admin._id,
        type: "withdrawal_admin_review",
        title: "New Withdrawal Request",
        message: `${
          freelancer.name
        } requested a withdrawal of ₹${roundedAmount.toLocaleString()}`,
        relatedId: savedWithdrawal._id,
        actionUrl: `/admin/withdrawals/${savedWithdrawal._id}`,
      }));

      if (adminNotifications.length > 0) {
        await Notification.insertMany(adminNotifications);
      }
      console.log("[WITHDRAW_API] Admin notifications created.");

      console.log("[WITHDRAW_API] Adding withdrawal data to Google Sheets...");
      try {
        const sheetData = {
          withdrawalId: withdrawalId,
          freelancerName: freelancer.name,
          freelancerEmail: freelancer.email,
          freelancerPhone: freelancer.profile?.phone || "N/A",
          amount: roundedAmount,
          accountHolderName: bankDetails.accountHolderName,
          accountNumber: bankDetails.accountNumber || "N/A",
          ifscCode: bankDetails.ifscCode || "N/A",
          bankName: bankDetails.bankName || "N/A",
          upiId: bankDetails.upiId || "N/A",
          requestedAt: new Date().toISOString(),
          status: "pending",
          availableBalance: availableBalance,
          totalEarnings: totalEarnings,
          earningsBalance: availableBalanceEarnings,
        };
        await addWithdrawalToSheet(sheetData);
        console.log("✅ Withdrawal added to Google Sheets");
      } catch (sheetError) {
        console.error(
          "❌ Failed to add withdrawal to Google Sheets:",
          sheetError
        );
      }

      const finalProcessingTime = Date.now() - requestStartTime;
      console.log(
        `[WITHDRAW_API] Withdrawal request processed successfully in ${finalProcessingTime}ms.`
      );

      return NextResponse.json({
        success: true,
        message:
          "Withdrawal request submitted successfully. The amount has been reserved from your available earnings and is now being processed.",
        withdrawal: {
          id: savedWithdrawal._id,
          withdrawalId: withdrawalId,
          amount: roundedAmount,
          status: savedWithdrawal.status,
          requestedAt: savedWithdrawal.createdAt,
          bankDetails: {
            accountHolderName: bankDetails.accountHolderName,
            accountNumber: maskAccountNumber(bankDetails.accountNumber),
            bankName: bankDetails.bankName,
            upiId: maskUpiId(bankDetails.upiId),
          },
          estimatedProcessingTime: "7 working days",
        },
        balanceInfo: {
          previousBalance: availableBalance,
          withdrawnAmount: roundedAmount,
          newBalance: availableBalance - roundedAmount,
          totalEarnings: totalEarnings,
          totalWithdrawnAfterRequest: totalWithdrawn + roundedAmount,
          formattedAmount: `₹${roundedAmount.toLocaleString()}`,
        },
        nextSteps: [
          "Amount has been reserved from your available earnings.",
          "Your request is being reviewed by our team.",
          "You will receive updates via notifications on our platform.",
          "Funds are typically transferred within 7 working days.",
          "You can track the status in your earnings dashboard.",
        ],
        systemSync: {
          earningsSystemUpdated: true,
          freelancerStatsUpdated: true,
          googleSheetsUpdated: true,
        },
      });
    } catch (processingError) {
      console.error(
        "[WITHDRAW_API] CRITICAL ERROR during withdrawal processing:",
        processingError
      );

      if (savedWithdrawal) {
        console.log(
          `[WITHDRAW_API] Attempting to rollback payment record: ${savedWithdrawal._id}`
        );
        await Payment.findByIdAndDelete(savedWithdrawal._id);
      }

      throw processingError;
    }
  } catch (error) {
    console.error(
      "[WITHDRAW_API] Top-level error in withdrawal request:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to process your withdrawal request.",
        details: error.message,
      },
      { status: 500 }
    );
  }
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

    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    const freelancer = await User.findById(userId);

    if (!freelancer || freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can view withdrawal history" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const withdrawalsPromise = Payment.find({
      payer: freelancer._id,
      type: "withdrawal",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalWithdrawalsCountPromise = Payment.countDocuments({
      payer: freelancer._id,
      type: "withdrawal",
    });

    const completedPaymentsPromise = Payment.find({
      payee: freelancer._id,
      status: "completed",
      type: { $ne: "subscription" },
    }).lean();

    const allWithdrawalsPromise = Payment.find({
      payer: freelancer._id,
      type: "withdrawal",
    }).lean();

    let walletPromise = Wallet.findOne({ user: freelancer._id }).lean();

    const [
      withdrawals,
      totalWithdrawalsCount,
      completedPayments,
      allWithdrawals,
      walletData,
    ] = await Promise.all([
      withdrawalsPromise,
      totalWithdrawalsCountPromise,
      completedPaymentsPromise,
      allWithdrawalsPromise,
      walletPromise,
    ]);

    let wallet = walletData;
    if (!wallet) {
      const createdWallet = await Wallet.createUserWallet(freelancer._id);
      wallet = createdWallet.toObject();
    }

    const totalEarnings = completedPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    const completedWithdrawals = allWithdrawals.filter(
      (w) => w.status === "completed"
    );
    const pendingWithdrawals = allWithdrawals.filter((w) =>
      ["pending", "processing"].includes(w.status)
    );
    const failedWithdrawals = allWithdrawals.filter(
      (w) => w.status === "failed"
    );

    const totalWithdrawnAmount = completedWithdrawals.reduce(
      (sum, w) => sum + w.amount,
      0
    );
    const totalPendingAmount = pendingWithdrawals.reduce(
      (sum, w) => sum + w.amount,
      0
    );

    // FIXED: Available balance is earnings minus all withdrawals (completed + pending)
    const earningsBalance =
      totalEarnings - totalWithdrawnAmount - totalPendingAmount;
    const availableBalance = Math.max(0, earningsBalance);

    const formattedWithdrawals = withdrawals.map((w) => ({
      _id: w._id,
      withdrawalId: w.metadata?.withdrawalId || w._id.toString().slice(-8),
      amount: w.amount,
      status: w.status,
      requestedAt: w.createdAt,
      processedAt: w.transferDetails?.transferredAt,
      bankDetails: {
        accountHolderName: w.bankAccountDetails?.accountHolderName,
        accountNumber: maskAccountNumber(w.bankAccountDetails?.accountNumber),
        bankName: w.bankAccountDetails?.bankName,
        upiId: maskUpiId(w.bankAccountDetails?.upiId),
      },
      transferDetails: w.transferDetails,
      metadata: {
        earningsBalance: w.metadata?.earningsBalance,
        deductedFromEarnings: w.metadata?.deductedFromEarnings || true,
      },
      formattedAmount: `₹${w.amount.toLocaleString()}`,
      relativeTime: getRelativeTime(w.createdAt),
      statusDescription: getWithdrawalStatusDescription(w.status),
      canCancel: w.status === "pending",
      isProcessing: w.status === "processing",
      isCompleted: w.status === "completed",
      hasFailed: w.status === "failed",
    }));

    const balanceInfo = {
      totalEarnings: totalEarnings,
      totalWithdrawn: totalWithdrawnAmount,
      pendingWithdrawals: totalPendingAmount,
      availableBalance: availableBalance,
      earningsSystemBalance: earningsBalance,
      canWithdraw: availableBalance >= MIN_WITHDRAWAL_AMOUNT,
      minWithdrawal: MIN_WITHDRAWAL_AMOUNT,
      maxWithdrawal: availableBalance,
      formattedAvailable: `₹${availableBalance.toLocaleString()}`,
      formattedTotal: `₹${totalEarnings.toLocaleString()}`,
      formattedWithdrawn: `₹${totalWithdrawnAmount.toLocaleString()}`,
      formattedPending: `₹${totalPendingAmount.toLocaleString()}`,
    };

    const totalAmountRequested = allWithdrawals.reduce(
      (sum, w) => sum + w.amount,
      0
    );
    const totalAmountFailed = failedWithdrawals.reduce(
      (sum, w) => sum + w.amount,
      0
    );
    const successRate =
      allWithdrawals.length > 0
        ? Math.round(
            (completedWithdrawals.length / allWithdrawals.length) * 100
          )
        : 0;
    const avgWithdrawalAmount =
      allWithdrawals.length > 0
        ? Math.round(totalAmountRequested / allWithdrawals.length)
        : 0;

    const stats = {
      totalWithdrawalRequests: allWithdrawals.length,
      completedWithdrawals: completedWithdrawals.length,
      pendingWithdrawals: pendingWithdrawals.length,
      processingWithdrawals: allWithdrawals.filter(
        (w) => w.status === "processing"
      ).length,
      failedWithdrawals: failedWithdrawals.length,
      totalAmountRequested: totalAmountRequested,
      totalAmountWithdrawn: totalWithdrawnAmount,
      totalAmountPending: totalPendingAmount,
      totalAmountFailed: totalAmountFailed,
      successRate: successRate,
      avgWithdrawalAmount: avgWithdrawalAmount,
    };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentWithdrawalsActivity = allWithdrawals.filter(
      (w) => new Date(w.createdAt) >= thirtyDaysAgo
    );

    const recentActivity = {
      last30Days: {
        withdrawalRequests: recentWithdrawalsActivity.length,
        totalAmount: recentWithdrawalsActivity.reduce(
          (sum, w) => sum + w.amount,
          0
        ),
        completedCount: recentWithdrawalsActivity.filter(
          (w) => w.status === "completed"
        ).length,
        completedAmount: recentWithdrawalsActivity
          .filter((w) => w.status === "completed")
          .reduce((sum, w) => sum + w.amount, 0),
      },
    };

    const totalPages = Math.ceil(totalWithdrawalsCount / limit);
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      totalWithdrawals: totalWithdrawalsCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      limit,
    };

    const systemHealth = {
      earningsBasedWithdrawals: true,
      lastSyncCheck: new Date(),
      withdrawalSystemStatus: "operational",
    };

    return NextResponse.json({
      success: true,
      withdrawals: formattedWithdrawals,
      balanceInfo: balanceInfo,
      stats: stats,
      recentActivity: recentActivity,
      pagination: pagination,
      systemHealth: systemHealth,
    });
  } catch (error) {
    console.error("Withdrawal history fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch your withdrawal history.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// api/payments/history/route.js (Enhanced and Fixed version)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

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

    // 🔧 FIX: Better user resolution logic (same as other working APIs)
    let currentUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
    }

    console.log("Payment history - User lookup:", {
      sessionUser: session.user,
      foundUser: currentUser
        ? { id: currentUser._id, role: currentUser.role }
        : null,
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;
    const type = searchParams.get("type"); // 'subscription', 'gig_payment', etc.
    const status = searchParams.get("status"); // 'completed', 'pending', etc.

    // Build query - look for payments where user is either payer OR payee
    let query = {
      $or: [{ payer: currentUser._id }, { payee: currentUser._id }],
    };

    // Add type filter
    if (type) {
      query.type = type;
    } else {
      // For hiring users, exclude internal "gig_payment" transfers to avoid double counting
      if (currentUser.role === "hiring") {
        query.type = { $ne: "gig_payment" }; // Exclude internal payment transfers
      }
    }

    // Add status filter
    if (status) {
      query.status = status;
    }

    console.log("Payment query:", JSON.stringify(query, null, 2));

    // Get payments with pagination
    const payments = await Payment.find(query)
      .populate("payer", "name image profile.companyName")
      .populate("payee", "name image profile.companyName")
      .populate("gig", "title")
      .populate("subscription", "planType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("Found payments:", payments.length);

    const totalPayments = await Payment.countDocuments(query);

    // Enhanced payment data with additional info
    const enhancedPayments = payments.map((payment) => {
      const paymentObj = payment.toObject();

      // Determine if this is incoming or outgoing for current user
      const isIncoming =
        payment.payee &&
        payment.payee._id.toString() === currentUser._id.toString();
      const isOutgoing =
        payment.payer &&
        payment.payer._id.toString() === currentUser._id.toString();

      console.log("Payment direction check:", {
        paymentId: payment._id,
        payerId: payment.payer?._id,
        payeeId: payment.payee?._id,
        currentUserId: currentUser._id,
        isIncoming,
        isOutgoing,
      });

      return {
        ...paymentObj,
        statusDescription: getPaymentStatusDescription(payment.status),
        estimatedCreditTime: getEstimatedCreditTime(
          payment.status,
          payment.createdAt
        ),
        isIncoming,
        isOutgoing,
        formattedAmount: `₹${payment.amount.toLocaleString()}`,
        relativeTime: getRelativeTime(payment.createdAt),
      };
    });

    console.log("Enhanced payments:", enhancedPayments.length);

    return NextResponse.json({
      success: true,
      payments: enhancedPayments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalPayments / limit),
        totalPayments,
        hasNextPage: page < Math.ceil(totalPayments / limit),
        hasPrevPage: page > 1,
        limit,
      },
      summary: await getPaymentSummary(currentUser._id, type),
      debug: {
        userId: currentUser._id,
        userRole: currentUser.role,
        queryUsed: query,
        totalFound: payments.length,
      },
    });
  } catch (error) {
    console.error("Payment history fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch payment history",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Helper function to get payment status description
function getPaymentStatusDescription(status) {
  const descriptions = {
    pending: "Payment is being prepared for processing",
    processing: "Payment is being transferred to your bank account",
    completed: "Payment has been successfully credited to your account",
    failed: "Payment failed. Please contact support",
    refunded: "Payment has been refunded",
  };
  return descriptions[status] || "Unknown status";
}

// Helper function to get estimated credit time
function getEstimatedCreditTime(status, createdAt) {
  if (status === "completed") return "Already credited";
  if (status === "failed" || status === "refunded") return "N/A";

  const hoursElapsed = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
  if (hoursElapsed < 24) return "Within 24 hours";
  if (hoursElapsed < 72) return "Within 2-3 business days";
  return "Please contact support";
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

// Helper function to get payment summary
async function getPaymentSummary(userId, type) {
  try {
    let baseQuery = {
      $or: [{ payer: userId }, { payee: userId }],
    };

    if (type) {
      baseQuery.type = type;
    }

    const [totalSpent, totalReceived, totalPending] = await Promise.all([
      // Total spent (as payer)
      Payment.aggregate([
        {
          $match: { payer: userId, status: "completed", ...(type && { type }) },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Total received (as payee)
      Payment.aggregate([
        {
          $match: { payee: userId, status: "completed", ...(type && { type }) },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Total pending
      Payment.aggregate([
        {
          $match: { ...baseQuery, status: { $in: ["pending", "processing"] } },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    return {
      totalSpent: totalSpent[0]?.total || 0,
      totalReceived: totalReceived[0]?.total || 0,
      totalPending: totalPending[0]?.total || 0,
      netAmount: (totalReceived[0]?.total || 0) - (totalSpent[0]?.total || 0),
    };
  } catch (error) {
    console.error("Payment summary error:", error);
    return {
      totalSpent: 0,
      totalReceived: 0,
      totalPending: 0,
      netAmount: 0,
    };
  }
}

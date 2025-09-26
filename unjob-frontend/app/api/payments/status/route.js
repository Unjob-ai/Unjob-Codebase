import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project"; // Need to create this model
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import Notification from "@/models/Notification";
import { uploadToCloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;

    let query = {
      $or: [{ payer: session.user.id }, { payee: session.user.id }],
    };

    if (paymentId) {
      query._id = paymentId;
    }

    const payments = await Payment.find(query)
      .populate("payer", "name image profile.companyName")
      .populate("payee", "name image")
      .populate("gig", "title")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      success: true,
      payments: payments.map((payment) => ({
        ...payment.toObject(),
        statusDescription: getPaymentStatusDescription(payment.status),
        estimatedCreditTime: getEstimatedCreditTime(
          payment.status,
          payment.createdAt
        ),
      })),
    });
  } catch (error) {
    console.error("Payment status fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment status" },
      { status: 500 }
    );
  }
}

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

function getEstimatedCreditTime(status, createdAt) {
  if (status === "completed") return "Already credited";
  if (status === "failed" || status === "refunded") return "N/A";

  const hoursElapsed = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
  if (hoursElapsed < 24) return "Within 24 hours";
  if (hoursElapsed < 72) return "Within 2-3 business days";
  return "Please contact support";
}

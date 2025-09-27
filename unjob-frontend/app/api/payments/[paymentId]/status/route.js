// api/admin/payments/[paymentId]/status/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Notification from "@/models/Notification";
import Conversation from "@/models/Conversation";
import { authOptions } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || (user.role !== "admin" && user.role !== "hiring")) {
      return NextResponse.json(
        { error: "Access denied. Admin or hiring role required." },
        { status: 403 }
      );
    }

    const { paymentId } = params;

    const payment = await Payment.findById(paymentId)
      .populate("payer", "name image profile.companyName")
      .populate("payee", "name image")
      .populate("gig", "title");

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // If user is hiring manager, verify they own this payment
    if (
      user.role === "hiring" &&
      payment.payer.toString() !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Unauthorized to view this payment" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Payment fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment details" },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user || (user.role !== "admin" && user.role !== "hiring")) {
      return NextResponse.json(
        { error: "Access denied. Admin or hiring role required." },
        { status: 403 }
      );
    }

    const { paymentId } = params;
    const { status, transferDetails, notes } = await req.json();

    if (!status) {
      return NextResponse.json(
        { error: "Payment status is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "processing", "completed", "failed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 }
      );
    }

    const payment = await Payment.findById(paymentId)
      .populate("payer", "name")
      .populate("payee", "name")
      .populate("gig", "title");

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // If user is hiring manager, verify they own this payment
    if (
      user.role === "hiring" &&
      payment.payer._id.toString() !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Unauthorized to update this payment" },
        { status: 403 }
      );
    }

    const previousStatus = payment.status;

    // Update payment status
    payment.status = status;
    payment.updatedAt = new Date();

    if (transferDetails) {
      payment.transferDetails = {
        ...payment.transferDetails,
        ...transferDetails,
        updatedAt: new Date(),
      };
    }

    if (notes) {
      if (!payment.adminNotes) {
        payment.adminNotes = [];
      }
      payment.adminNotes.push({
        note: notes,
        addedBy: user.name,
        addedAt: new Date(),
      });
    }

    // If payment is completed for the first time, update freelancer earnings
    if (status === "completed" && previousStatus !== "completed") {
      await User.findByIdAndUpdate(payment.payee._id, {
        $inc: { "stats.totalEarnings": payment.amount },
      });

      // Generate transfer ID if not exists
      if (!payment.transferDetails?.transferId) {
        payment.transferDetails = {
          ...payment.transferDetails,
          transferId: `TXN_${Date.now()}_${payment._id.toString().slice(-6)}`,
          transferredAt: new Date(),
          transferStatus: "completed",
          transferMode: payment.transferDetails?.transferMode || "bank",
        };
      }
    }

    await payment.save();

    // Create notifications based on status
    let notificationMessage = "";
    let notificationType = "payment_update";

    switch (status) {
      case "completed":
        notificationMessage = `Payment of ₹${payment.amount} has been completed for "${payment.gig?.title}"`;
        notificationType = "payment_completed";
        break;
      case "processing":
        notificationMessage = `Payment of ₹${payment.amount} is being processed for "${payment.gig?.title}"`;
        notificationType = "payment_processing";
        break;
      case "failed":
        notificationMessage = `Payment of ₹${payment.amount} has failed for "${payment.gig?.title}"`;
        notificationType = "payment_failed";
        break;
      default:
        notificationMessage = `Payment status updated to ${status} for "${payment.gig?.title}"`;
    }

    // Notify freelancer (payee)
    await Notification.create({
      user: payment.payee._id,
      type: notificationType,
      title: "Payment Status Update",
      message: notificationMessage,
      relatedId: payment._id,
      actionUrl: `/freelancer/earnings`,
    });

    // Notify client (payer) if different from updater
    if (payment.payer._id.toString() !== session.user.id) {
      await Notification.create({
        user: payment.payer._id,
        type: notificationType,
        title: "Payment Status Update",
        message: notificationMessage,
        relatedId: payment._id,
        actionUrl: `/dashboard/payments`,
      });
    }

    // If payment is completed, enable full chat functionality
    if (status === "completed") {
      const conversation = await Conversation.findOne({
        participants: { $all: [payment.payer._id, payment.payee._id] },
        gigId: payment.gig._id,
      });

      if (conversation) {
        conversation.status = "active";
        conversation.paymentCompleted = true;
        conversation.metadata = {
          ...conversation.metadata,
          paymentCompletedAt: new Date(),
        };
        await conversation.save();
      }
    }

    // Log the status change for audit
    console.log(
      `Payment ${paymentId} status changed from ${previousStatus} to ${status} by ${user.name} (${user.role})`
    );

    return NextResponse.json({
      success: true,
      payment: {
        ...payment.toObject(),
        previousStatus,
      },
      message: `Payment status updated to ${status} successfully`,
    });
  } catch (error) {
    console.error("Payment status update error:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}

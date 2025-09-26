// api/admin/payments/[paymentId]/status/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import mongoose from "mongoose"; // ✅ Add mongoose import
import Payment from "@/models/Payment";
import User from "@/models/User";
import Notification from "@/models/Notification";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Admin payment status GET - Session:", session);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Better user resolution logic
    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    console.log("Admin payment status GET - User ID from session:", userId);

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    console.log(
      "Admin payment status GET - Found user:",
      user ? { id: user._id, role: user.role } : null
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "admin" && user.role !== "hiring") {
      return NextResponse.json(
        {
          error: "Access denied. Admin or hiring role required.",
          userRole: user.role,
        },
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
      payment.payer.toString() !== user._id.toString()
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
    console.log("Admin payment status PATCH - Session:", session);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Better user resolution logic
    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    console.log("Admin payment status PATCH - User ID from session:", userId);

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    console.log(
      "Admin payment status PATCH - Found user:",
      user ? { id: user._id, role: user.role } : null
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "admin" && user.role !== "hiring") {
      return NextResponse.json(
        {
          error: "Access denied. Admin or hiring role required.",
          userRole: user.role,
        },
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
      payment.payer._id.toString() !== user._id.toString()
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

    // ✅ ENHANCED PAYMENT COMPLETION LOGIC WITH AUTOMATIC CHAT CREATION
    if (status === "completed" && previousStatus !== "completed") {
      // Update freelancer earnings
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

      // ✅ CREATE OR ACTIVATE CONVERSATION
      let conversation = await Conversation.findOne({
        participants: { $all: [payment.payer._id, payment.payee._id] },
        gigId: payment.gig._id,
      });

      if (!conversation) {
        // Find the applicationId from the gig
        let applicationId = null;
        try {
          const Gig = mongoose.model("Gig");
          const gigWithApplications = await Gig.findById(payment.gig._id);

          if (gigWithApplications && gigWithApplications.applications) {
            const application = gigWithApplications.applications.find(
              (app) =>
                app.freelancer.toString() === payment.payee._id.toString()
            );
            applicationId = application?._id;
          }
        } catch (gigError) {
          console.log("Could not find application ID:", gigError.message);
        }

        // If we couldn't find applicationId, create a placeholder one
        if (!applicationId) {
          applicationId = new mongoose.Types.ObjectId();
          console.log("Using generated applicationId:", applicationId);
        }

        // Create new conversation with applicationId
        conversation = await Conversation.create({
          participants: [payment.payer._id, payment.payee._id],
          gigId: payment.gig._id,
          applicationId: applicationId, // ✅ Now required field is provided
          status: "active",
          metadata: {
            projectTitle: payment.gig?.title || "Project",
            contractValue: payment.amount,
            paymentCompletedAt: new Date(),
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          },
        });

        console.log(
          `✅ New conversation created: ${conversation._id} with applicationId: ${applicationId}`
        );
      } else {
        // Update existing conversation to active
        conversation.status = "active";
        conversation.metadata = {
          ...conversation.metadata,
          contractValue: payment.amount,
          paymentCompletedAt: new Date(),
        };
        await conversation.save();

        console.log(`✅ Existing conversation activated: ${conversation._id}`);
      }

      // ✅ SEND AUTOMATIC WELCOME MESSAGES
      try {
        // Welcome message from company
        const welcomeMessage = await Message.create({
          conversationId: conversation._id,
          sender: payment.payer._id,
          content: `🎉 Payment of ₹${payment.amount} has been completed for "${payment.gig?.title}"! You can now communicate directly about the project. Looking forward to working with you!`,
          type: "text",
          readBy: [
            {
              user: payment.payer._id,
              readAt: new Date(),
            },
          ],
        });

        // Update conversation's last message
        conversation.lastMessage = welcomeMessage._id;
        conversation.lastActivity = new Date();
        await conversation.save();

        console.log(`✅ Welcome message sent: ${welcomeMessage._id}`);

        // Auto-response from freelancer (after 3 seconds)
        setTimeout(async () => {
          try {
            const responseMessage = await Message.create({
              conversationId: conversation._id,
              sender: payment.payee._id,
              content: `Thank you for the payment! I'm excited to start working on "${payment.gig?.title}". I'll keep you updated on the progress and reach out if I have any questions. Let's create something amazing together! 🚀`,
              type: "text",
              readBy: [
                {
                  user: payment.payee._id,
                  readAt: new Date(),
                },
              ],
            });

            // Update conversation's last message again
            await Conversation.findByIdAndUpdate(conversation._id, {
              lastMessage: responseMessage._id,
              lastActivity: new Date(),
            });

            console.log(
              `✅ Freelancer response message sent: ${responseMessage._id}`
            );
          } catch (responseError) {
            console.error("Failed to send freelancer response:", responseError);
          }
        }, 3000);
      } catch (messageError) {
        console.error("Failed to send welcome message:", messageError);
      }
    }

    await payment.save();

    // Create notifications based on status
    let notificationMessage = "";
    const notificationType = "payment"; // Use existing enum value

    switch (status) {
      case "completed":
        notificationMessage = `Payment of ₹${payment.amount} has been completed for "${payment.gig?.title}". You can now chat directly!`;
        break;
      case "processing":
        notificationMessage = `Payment of ₹${payment.amount} is being processed for "${payment.gig?.title}"`;
        break;
      case "failed":
        notificationMessage = `Payment of ₹${payment.amount} has failed for "${payment.gig?.title}"`;
        break;
      default:
        notificationMessage = `Payment status updated to ${status} for "${payment.gig?.title}"`;
    }

    // Create notifications with chat links for completed payments
    try {
      let actionUrl = `/freelancer/earnings`;
      let companyActionUrl = `/dashboard/payments`;

      // If payment is completed, link to the chat
      if (status === "completed") {
        const conversation = await Conversation.findOne({
          participants: { $all: [payment.payer._id, payment.payee._id] },
          gigId: payment.gig._id,
        });

        if (conversation) {
          actionUrl = `/chat/${conversation._id}`;
          companyActionUrl = `/chat/${conversation._id}`;
        }
      }

      // Notify freelancer (payee)
      await Notification.create({
        user: payment.payee._id,
        type: notificationType,
        title:
          status === "completed"
            ? "Payment Completed - Chat Active!"
            : "Payment Status Update",
        message: notificationMessage,
        relatedId: payment._id,
        actionUrl: actionUrl,
      });

      // Notify client (payer) if different from updater
      if (payment.payer._id.toString() !== user._id.toString()) {
        await Notification.create({
          user: payment.payer._id,
          type: notificationType,
          title:
            status === "completed"
              ? "Payment Completed - Project Started!"
              : "Payment Status Update",
          message: notificationMessage,
          relatedId: payment._id,
          actionUrl: companyActionUrl,
        });
      }

      console.log(
        `✅ Notifications sent with${
          status === "completed" ? " chat" : ""
        } links`
      );
    } catch (notificationError) {
      console.error("Failed to create notifications:", notificationError);
      // Don't fail the whole request if notification creation fails
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
      message: `Payment status updated to ${status} successfully${
        status === "completed" ? ". Chat has been activated!" : ""
      }`,
    });
  } catch (error) {
    console.error("Payment status update error:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}

// api/conversations/[conversationId]/verify-payment/route.js - NEW FILE
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Payment from "@/models/Payment";
import Message from "@/models/Message";
import User from "@/models/User";
import Gig from "@/models/Gig";
import crypto from "crypto";
import { addPendingEarnings } from "@/lib/walletUtils";
import NotificationService from "@/lib/notificationService";

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { conversationId } = params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment verification data" },
        { status: 400 }
      );
    }

    // Verify payment signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update((razorpay_order_id + "|" + razorpay_payment_id).toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Find conversation
    const conversation = await Conversation.findById(conversationId)
      .populate("participants")
      .populate("gigId");

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Get user details
    const userId = session.user.id || session.user.userId || session.user._id;
    const company = await User.findById(userId);
    const freelancer = conversation.participants.find(
      (p) => p._id.toString() !== userId.toString()
    );

    if (!company || !freelancer) {
      return NextResponse.json(
        { error: "User details not found" },
        { status: 404 }
      );
    }

    // Create payment record
    const projectAmount = conversation.metadata?.agreedAmount;
    const platformFee = conversation.metadata?.platformFee;
    const totalPaid = conversation.metadata?.totalPayable;

    const payment = new Payment({
      payer: company._id,
      payee: freelancer._id,
      gig: conversation.gigId._id,
      amount: projectAmount,
      totalAmount: totalPaid,
      platformFee: platformFee,
      type: "negotiated_gig_payment",
      status: "completed",
      description: `Negotiated payment for: ${conversation.metadata?.projectTitle}`,
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      razorpaySignature: razorpay_signature,
      metadata: {
        conversationId: conversationId,
        negotiationId: conversation.metadata?.currentNegotiation?._id,
        agreedTerms: conversation.metadata?.currentNegotiation?.additionalTerms,
        timeline: conversation.metadata?.currentNegotiation?.timeline,
      },
      statusHistory: [
        {
          status: "completed",
          timestamp: new Date(),
          description: "Negotiated payment completed successfully",
        },
      ],
    });

    await payment.save();

    // Add pending earnings for freelancer
    try {
      await addPendingEarnings(
        freelancer._id,
        projectAmount,
        payment._id,
        "gig_payment"
      );
    } catch (earningsError) {
      console.error("Failed to add pending earnings:", earningsError);
    }

    // Update conversation status
    conversation.status = "active";
    conversation.metadata = {
      ...conversation.metadata,
      paymentCompleted: new Date(),
      paymentId: payment._id,
      projectStarted: new Date(),
    };
    await conversation.save();

    // Update gig status
    await Gig.findByIdAndUpdate(conversation.gigId._id, {
      status: "in_progress",
      paymentCompleted: new Date(),
      projectStarted: new Date(),
    });

    // Send project start message
    const projectStartMessage = await Message.create({
      conversationId: conversation._id,
      sender: company._id,
      content: `🎉 Payment of ₹${projectAmount.toLocaleString()} has been completed! 

The project officially starts now. Looking forward to working with you on "${
        conversation.metadata?.projectTitle
      }". 

You can now submit your project deliverables when ready.`,
      type: "system",
      readBy: [{ user: company._id, readAt: new Date() }],
    });

    // Update conversation's last message
    conversation.lastMessage = projectStartMessage._id;
    conversation.lastActivity = new Date();
    await conversation.save();

    // Send notifications
    try {
      // Notify freelancer
      await NotificationService.create({
        userId: freelancer._id,
        type: "payment_completed",
        title: "Payment Received!",
        message: `Payment of ₹${projectAmount.toLocaleString()} has been completed for "${
          conversation.metadata?.projectTitle
        }". The project has officially started!`,
        actionUrl: `/dashboard/messages`,
        relatedId: conversation._id,
      });

      // Notify company
      await NotificationService.create({
        userId: company._id,
        type: "payment_completed",
        title: "Payment Successful",
        message: `Payment of ₹${totalPaid.toLocaleString()} has been processed successfully. The project "${
          conversation.metadata?.projectTitle
        }" has started.`,
        actionUrl: `/dashboard/messages`,
        relatedId: conversation._id,
      });
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    // Auto-response from freelancer after 3 seconds
    setTimeout(async () => {
      try {
        const responseMessage = await Message.create({
          conversationId: conversation._id,
          sender: freelancer._id,
          content: `Thank you for the payment! I'm excited to start working on "${conversation.metadata?.projectTitle}". I'll keep you updated on the progress and reach out if I have any questions. Let's create something amazing together!`,
          type: "text",
          readBy: [{ user: freelancer._id, readAt: new Date() }],
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: responseMessage._id,
          lastActivity: new Date(),
        });
      } catch (responseError) {
        console.error("Failed to send freelancer response:", responseError);
      }
    }, 3000);

    return NextResponse.json({
      success: true,
      message: "Payment verified and project started successfully!",
      paymentId: payment._id,
      projectAmount: projectAmount,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment", details: error.message },
      { status: 500 }
    );
  }
}

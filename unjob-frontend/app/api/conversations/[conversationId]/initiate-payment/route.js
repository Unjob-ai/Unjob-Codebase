// api/conversations/[conversationId]/initiate-payment/route.js - NEW FILE
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import Gig from "@/models/Gig";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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
    const { finalAmount, agreementTerms } = await req.json();

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

    // Verify user is hiring manager and participant
    const userId = session.user.id || session.user.userId || session.user._id;
    const user = await User.findById(userId);

    if (!user || user.role !== "hiring") {
      return NextResponse.json(
        { error: "Only hiring managers can initiate payments" },
        { status: 403 }
      );
    }

    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - You are not a participant in this conversation",
        },
        { status: 403 }
      );
    }

    // Get negotiated amount or use provided amount
    const projectAmount =
      finalAmount || conversation.metadata?.currentNegotiation?.proposedPrice;

    if (!projectAmount || projectAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid project amount" },
        { status: 400 }
      );
    }

    // Calculate fees
    const platformFee = Math.round(projectAmount * 0.05); // 5% platform fee
    const totalPayable = projectAmount + platformFee;

    // Get freelancer details
    const freelancer = conversation.participants.find(
      (p) => p._id.toString() !== userId.toString()
    );

    if (!freelancer) {
      return NextResponse.json(
        { error: "Freelancer not found" },
        { status: 404 }
      );
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalPayable * 100, // Amount in paise
      currency: "INR",
      receipt: `negotiate_${conversationId}_${Date.now()}`,
      notes: {
        conversationId: conversationId,
        gigId: conversation.gigId._id.toString(),
        companyId: userId.toString(),
        freelancerId: freelancer._id.toString(),
        projectAmount: projectAmount,
        platformFee: platformFee,
        totalPayable: totalPayable,
        type: "negotiated_payment",
        agreementTerms: agreementTerms || "",
      },
    });

    // Update conversation status
    conversation.status = "payment_processing";
    conversation.metadata = {
      ...conversation.metadata,
      paymentInitiated: new Date(),
      paymentOrderId: razorpayOrder.id,
      agreedAmount: projectAmount,
      platformFee: platformFee,
      totalPayable: totalPayable,
    };

    await conversation.save();

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      orderId: razorpayOrder.id,
      amount: totalPayable,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      projectDetails: {
        title: conversation.metadata?.projectTitle || conversation.gigId?.title,
        amount: projectAmount,
        platformFee: platformFee,
        totalPayable: totalPayable,
        timeline: conversation.metadata?.currentNegotiation?.timeline,
        terms: agreementTerms,
      },
      freelancerDetails: {
        name: freelancer.name,
        image: freelancer.image,
        username: freelancer.username,
      },
      message: "Payment order created successfully",
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment", details: error.message },
      { status: 500 }
    );
  }
}

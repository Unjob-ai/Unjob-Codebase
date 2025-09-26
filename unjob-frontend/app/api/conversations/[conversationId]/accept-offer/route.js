// api/conversations/[conversationId]/accept-offer/route.js - NEW FILE
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";

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
    const { negotiationId } = await req.json();

    // Find conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify user is participant
    const userId = session.user.id || session.user.userId || session.user._id;
    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
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

    // Check if there's a current negotiation
    if (!conversation.metadata?.currentNegotiation) {
      return NextResponse.json(
        { error: "No active negotiation found" },
        { status: 404 }
      );
    }

    // Update negotiation status to accepted
    conversation.metadata.currentNegotiation.status = "accepted";
    conversation.metadata.currentNegotiation.acceptedAt = new Date();
    conversation.metadata.currentNegotiation.acceptedBy = session.user.role;

    // Update conversation status
    conversation.status = "payment_pending";

    await conversation.save();

    return NextResponse.json({
      success: true,
      message: "Offer accepted successfully",
      negotiation: conversation.metadata.currentNegotiation,
    });
  } catch (error) {
    console.error("Accept offer error:", error);
    return NextResponse.json(
      { error: "Failed to accept offer", details: error.message },
      { status: 500 }
    );
  }
}

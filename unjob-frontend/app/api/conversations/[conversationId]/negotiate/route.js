// api/conversations/[conversationId]/negotiate/route.js - NEW FILE
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import mongoose from "mongoose";

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
    const { proposedPrice, timeline, additionalTerms, proposedBy } = await req.json();

    if (!proposedPrice || proposedPrice <= 0) {
      return NextResponse.json(
        { error: "Valid proposed price is required" },
        { status: 400 }
      );
    }

    // Find conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Verify user is participant
    const userId = session.user.id || session.user.userId || session.user._id;
    const isParticipant = conversation.participants.some(p => 
      p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Unauthorized - You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Create negotiation data
    const negotiationData = {
      _id: new mongoose.Types.ObjectId(),
      proposedPrice: parseInt(proposedPrice),
      timeline: timeline || null,
      additionalTerms: additionalTerms || null,
      proposedBy: proposedBy,
      proposedAt: new Date(),
      status: "pending",
    };

    // Update conversation with new negotiation
    conversation.metadata = {
      ...conversation.metadata,
      currentNegotiation: negotiationData,
      negotiationHistory: [
        ...(conversation.metadata?.negotiationHistory || []),
        negotiationData
      ]
    };

    await conversation.save();

    return NextResponse.json({
      success: true,
      negotiation: negotiationData,
      message: "Negotiation sent successfully"
    });

  } catch (error) {
    console.error("Negotiation error:", error);
    return NextResponse.json(
      { error: "Failed to process negotiation", details: error.message },
      { status: 500 }
    );
  }
}
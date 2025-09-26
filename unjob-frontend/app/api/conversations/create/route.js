// Create api/conversations/create/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Better user resolution
    let currentUser = null;
    const userId = session.user.userId || session.user.id || session.user._id || session.user.sub;

    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
    }

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { participantId, gigId, initialMessage } = await req.json();

    if (!participantId) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    // Verify the other participant exists
    const otherParticipant = await User.findById(participantId);
    if (!otherParticipant) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUser._id, participantId] },
      ...(gigId && { gigId }),
    });

    if (conversation) {
      return NextResponse.json({
        success: true,
        conversation,
        message: "Conversation already exists",
        existed: true,
      });
    }

    // Create new conversation
    conversation = await Conversation.create({
      participants: [currentUser._id, participantId],
      gigId: gigId || null,
      status: "active",
      lastActivity: new Date(),
      metadata: {
        initiatedBy: currentUser._id,
        ...(gigId && { relatedToGig: true }),
      },
    });

    // Send initial message if provided
    if (initialMessage && initialMessage.trim()) {
      const message = await Message.create({
        conversationId: conversation._id,
        sender: currentUser._id,
        content: initialMessage.trim(),
        type: "text",
        status: "sent",
        readBy: [{ user: currentUser._id, readAt: new Date() }],
      });

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: message._id,
        lastActivity: new Date(),
      });
    }

    // Populate conversation data
    await conversation.populate("participants", "name image profile.companyName role");
    if (gigId) {
      await conversation.populate("gigId", "title budget");
    }

    return NextResponse.json({
      success: true,
      conversation,
      message: "Conversation created successfully",
    });
  } catch (error) {
    console.error("Conversation creation error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

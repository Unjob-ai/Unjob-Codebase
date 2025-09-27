
// api/admin/chat/[conversationId]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { conversationId } = params;

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "name image role profile.companyName")
      .populate("gigId", "title budget")
      .populate("lastMessage");

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const messages = await Message.find({ conversationId })
      .populate("sender", "name image role")
      .sort({ createdAt: 1 });

    return NextResponse.json({
      success: true,
      conversation,
      messages,
    });
  } catch (error) {
    console.error("Admin conversation fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}


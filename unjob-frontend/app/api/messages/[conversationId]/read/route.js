// api/messages/[conversationId]/read/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import User from "@/models/User";

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;

    await connectDB();

    // Better user resolution
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

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(currentUser._id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Mark all unread messages as read
    const result = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: currentUser._id },
        "readBy.user": { $ne: currentUser._id },
      },
      {
        $push: {
          readBy: {
            user: currentUser._id,
            readAt: new Date(),
          },
        },
        $set: {
          status: "read",
        },
      }
    );

    return NextResponse.json({
      success: true,
      messagesMarkedRead: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      {
        error: "Failed to mark messages as read",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

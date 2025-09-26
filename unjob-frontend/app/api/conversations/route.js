import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
// ===================================================================
// ✅ FIX: Import the 'Gig' model to prevent MissingSchemaError
// This is required for any .populate('gigId', ...) to work.
// ===================================================================
import Gig from "@/models/Gig";
// ===================================================================

export async function GET() {
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

    console.log("Conversations API - User lookup:", {
      sessionUser: session.user,
      foundUser: currentUser
        ? { id: currentUser._id, role: currentUser.role }
        : null,
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const conversations = await Conversation.find({
      participants: currentUser._id,
      status: "active",
    })
      .populate("participants", "name image role profile.companyName")
      // This populate will now work correctly
      .populate("gigId", "title budget")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "name image",
        },
      })
      .sort({ lastActivity: -1 });

    console.log("Found conversations:", conversations.length);

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: currentUser._id },
          "readBy.user": { $ne: currentUser._id },
        });

        return {
          ...conv.toObject(),
          unreadCount,
        };
      })
    );

    console.log("Conversations with unread counts prepared");

    return NextResponse.json({
      success: true,
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    console.error("Conversations fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch conversations",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Create new conversation
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

    console.log("Create conversation - User lookup:", {
      sessionUser: session.user,
      foundUser: currentUser
        ? { id: currentUser._id, role: currentUser.role }
        : null,
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { participantId, gigId, message } = await req.json();

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
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    console.log("Creating conversation between:", {
      currentUser: currentUser._id,
      otherParticipant: otherParticipant._id,
      gigId,
    });

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUser._id, participantId] },
      ...(gigId && { gigId }),
    });

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [currentUser._id, participantId],
        // Use gigId if provided, otherwise it will be null which is fine for the schema
        gigId: gigId || null,
        status: "active",
        lastActivity: new Date(),
        metadata: gigId
          ? {
              projectTitle: "New Project", // You might want to get this from the Gig model
              initiatedBy: currentUser._id,
            }
          : {},
      });

      console.log("New conversation created:", conversation._id);
    } else {
      console.log("Existing conversation found:", conversation._id);
    }

    // Send initial message if provided
    if (message && message.trim()) {
      const newMessage = await Message.create({
        conversationId: conversation._id,
        sender: currentUser._id,
        content: message.trim(),
        type: "text",
        status: "sent",
        readBy: [
          {
            user: currentUser._id,
            readAt: new Date(),
          },
        ],
      });

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: newMessage._id,
        lastActivity: new Date(),
      });

      console.log("Initial message sent:", newMessage._id);
    }

    // Populate conversation data
    await conversation.populate(
      "participants",
      "name image profile.companyName role"
    );
    if (gigId) {
      // This populate will now work correctly
      await conversation.populate("gigId", "title budget");
    }

    return NextResponse.json({
      success: true,
      conversation: conversation.toObject(),
      message: "Conversation created successfully",
    });
  } catch (error) {
    console.error("Conversation creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create conversation",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Update conversation (e.g., mark as archived, update status)
export async function PUT(req) {
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

    const { conversationId, status, action } = await req.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    console.log("Updating conversation:", {
      conversationId,
      status,
      action,
      userId: currentUser._id,
    });

    // Verify user is part of conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUser._id,
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    let updateData = {};

    if (action === "archive") {
      updateData.status = "archived";
    } else if (action === "unarchive") {
      updateData.status = "active";
    } else if (action === "block") {
      updateData.status = "blocked";
    } else if (status) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length > 0) {
      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        updateData,
        { new: true }
      ).populate("participants", "name image profile.companyName role");

      console.log("Conversation updated successfully");

      return NextResponse.json({
        success: true,
        conversation: updatedConversation,
        message: "Conversation updated successfully",
      });
    } else {
      return NextResponse.json(
        { error: "No valid update data provided" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Conversation update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update conversation",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Delete conversation (soft delete - mark as deleted)
export async function DELETE(req) {
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

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    console.log("Deleting conversation:", {
      conversationId,
      userId: currentUser._id,
    });

    // Verify user is part of conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUser._id,
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Soft delete - mark as deleted instead of actually deleting
    // Note: To use deletedAt/deletedBy, you must add them to your Conversation schema
    await Conversation.findByIdAndUpdate(conversationId, {
      status: "deleted",
      // deletedAt: new Date(),
      // deletedBy: currentUser._id,
    });

    console.log("Conversation soft deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully",
      conversationId,
    });
  } catch (error) {
    console.error("Conversation deletion error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete conversation",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

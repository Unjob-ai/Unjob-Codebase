// api/messages/[conversationId]/route.js (Enhanced)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import User from "@/models/User";

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

    console.log("Messages API - User lookup:", {
      sessionUser: session.user,
      foundUser: currentUser
        ? { id: currentUser._id, role: currentUser.role }
        : null,
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { conversationId } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;

    console.log("Fetching messages for conversation:", conversationId);

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

    const messages = await Message.find({ conversationId })
      .populate("sender", "name image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("Found messages:", messages.length);

    return NextResponse.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      hasMore: messages.length === limit,
      conversation: {
        _id: conversation._id,
        participants: conversation.participants,
        gigId: conversation.gigId,
      },
    });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
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

    console.log("Message creation - User lookup:", {
      sessionUser: session.user,
      foundUser: currentUser
        ? { id: currentUser._id, role: currentUser.role }
        : null,
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { conversationId } = params;
    const {
      content,
      type = "text",
      fileUrl,
      fileName,
      fileSize,
      projectId,
    } = await req.json();

    console.log("Creating message:", {
      conversationId,
      content: content?.substring(0, 50) + "...",
      type,
      sender: currentUser._id,
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

    // Validate message content
    if (type === "text" && (!content || !content.trim())) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    const message = await Message.create({
      conversationId,
      sender: currentUser._id,
      content: content?.trim(),
      type,
      fileUrl,
      fileName,
      fileSize,
      projectId,
      status: "sent",
      readBy: [
        {
          user: currentUser._id,
          readAt: new Date(),
        },
      ],
    });

    console.log("Message created:", message._id);

    // Update conversation with last message and activity
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastActivity: new Date(),
    });

    // Populate sender info for response
    await message.populate("sender", "name image");

    // Return the message with sender info
    const messageResponse = {
      _id: message._id,
      conversationId: message.conversationId,
      sender: {
        _id: message.sender._id,
        name: message.sender.name,
        image: message.sender.image,
      },
      content: message.content,
      type: message.type,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
      projectId: message.projectId,
      status: message.status,
      readBy: message.readBy,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };

    console.log("Message response prepared");

    return NextResponse.json({
      success: true,
      message: messageResponse,
    });
  } catch (error) {
    console.error("Message creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// PUT method for updating message status
export async function PUT(req, { params }) {
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

    const { conversationId } = params;
    const { messageId, status, action } = await req.json();

    console.log("Updating message status:", {
      conversationId,
      messageId,
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

    let updateResult;

    if (action === "markAsRead" && messageId) {
      // Mark specific message as read
      updateResult = await Message.findOneAndUpdate(
        {
          _id: messageId,
          conversationId,
          sender: { $ne: currentUser._id },
        },
        {
          $addToSet: {
            readBy: {
              user: currentUser._id,
              readAt: new Date(),
            },
          },
          $set: { status: "read" },
        },
        { new: true }
      );
    } else if (action === "markAllAsRead") {
      // Mark all unread messages as read
      updateResult = await Message.updateMany(
        {
          conversationId,
          sender: { $ne: currentUser._id },
          "readBy.user": { $ne: currentUser._id },
        },
        {
          $addToSet: {
            readBy: {
              user: currentUser._id,
              readAt: new Date(),
            },
          },
          $set: { status: "read" },
        }
      );
    } else if (messageId && status) {
      // Update specific message status
      updateResult = await Message.findOneAndUpdate(
        {
          _id: messageId,
          conversationId,
        },
        { $set: { status } },
        { new: true }
      );
    }

    return NextResponse.json({
      success: true,
      updated: updateResult ? true : false,
      messageId,
      status,
      action,
    });
  } catch (error) {
    console.error("Message status update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update message status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE method for deleting messages (optional)
export async function DELETE(req, { params }) {
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

    const { conversationId } = params;
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    console.log("Deleting message:", {
      conversationId,
      messageId,
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

    // Find and delete the message (only if user is the sender)
    const message = await Message.findOneAndDelete({
      _id: messageId,
      conversationId,
      sender: currentUser._id,
    });

    if (!message) {
      return NextResponse.json(
        {
          error: "Message not found or you don't have permission to delete it",
        },
        { status: 404 }
      );
    }

    console.log("Message deleted successfully");

    // Update conversation's last message if this was the last message
    const lastMessage = await Message.findOne({ conversationId })
      .sort({ createdAt: -1 })
      .select("_id");

    if (lastMessage) {
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: lastMessage._id,
        lastActivity: new Date(),
      });
    } else {
      // No messages left, clear last message
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: null,
        lastActivity: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Message deleted successfully",
      deletedMessageId: messageId,
    });
  } catch (error) {
    console.error("Message deletion error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete message",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

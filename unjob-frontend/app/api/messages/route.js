import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectDB from "@/lib/mongodb"
import Message from "@/models/Message"
import Conversation from "@/models/Conversation"

// GET /api/messages - Get messages for a conversation
export async function GET(req) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const conversationId = searchParams.get("conversationId")
    const page = Number.parseInt(searchParams.get("page")) || 1
    const limit = Number.parseInt(searchParams.get("limit")) || 50
    const skip = (page - 1) * limit

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    await connectDB()

    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId)
    if (!conversation || !conversation.participants.includes(session.user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "name image")
      .lean()

    // Reverse to show oldest first
    messages.reverse()

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit,
      },
    })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// POST /api/messages - Send a new message
export async function POST(req) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { conversationId, content, type = "text" } = await req.json()

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 })
    }

    if (type === "text" && !content?.trim()) {
      return NextResponse.json({ error: "Message content required" }, { status: 400 })
    }

    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId)
    if (!conversation || !conversation.participants.includes(session.user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Create new message
    const newMessage = new Message({
      conversationId,
      sender: session.user.id,
      content: content?.trim(),
      type,
      readBy: [
        {
          user: session.user.id,
          readAt: new Date(),
        },
      ],
    })

    await newMessage.save()

    // Update conversation's last message and activity
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
      lastActivity: new Date(),
    })

    // Populate sender info
    await newMessage.populate("sender", "name image")

    return NextResponse.json(newMessage, { status: 201 })
  } catch (error) {
    console.error("Message send error:", error)
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

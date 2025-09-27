import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectDB from "@/lib/mongodb"
import Conversation from "@/models/Conversation"
import Message from "@/models/Message"
import Gig from "@/models/Gig"

// GET /api/messages/conversations - Get user's conversations
export async function GET(req) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const userId = session.user.id

    // Find conversations where user is a participant
    const conversations = await Conversation.find({
      participants: userId,
      status: "active",
    })
      .sort({ lastActivity: -1 })
      .populate("participants", "name image role")
      .populate("lastMessage", "content type createdAt")
      .populate("gigId", "title")
      .lean()

    // Get unread message counts for each conversation
    const unreadCounts = {}

    for (const conversation of conversations) {
      const unreadCount = await Message.countDocuments({
        conversationId: conversation._id,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
      })

      unreadCounts[conversation._id] = unreadCount
    }

    return NextResponse.json({
      conversations,
      unreadCounts,
    })
  } catch (error) {
    console.error("Conversations fetch error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch conversations",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

// POST /api/messages/conversations - Create a new conversation (when gig application is accepted)
export async function POST(req) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { gigId, applicationId, freelancerId } = await req.json()

    if (!gigId || !applicationId || !freelancerId) {
      return NextResponse.json(
        {
          error: "Gig ID, Application ID, and Freelancer ID required",
        },
        { status: 400 },
      )
    }

    // Verify the gig exists and user is the owner
    const gig = await Gig.findById(gigId)
    if (!gig || gig.company.toString() !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Verify the application exists and is accepted
    const application = gig.applications.find(
      (app) => app._id.toString() === applicationId && app.status === "accepted",
    )

    if (!application) {
      return NextResponse.json(
        {
          error: "Application not found or not accepted",
        },
        { status: 404 },
      )
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { $all: [session.user.id, freelancerId] },
      gigId,
      applicationId,
    })

    if (existingConversation) {
      return NextResponse.json(
        {
          conversation: existingConversation,
        },
        { status: 200 },
      )
    }

    // Create new conversation
    const newConversation = new Conversation({
      participants: [session.user.id, freelancerId],
      gigId,
      applicationId,
      metadata: {
        projectTitle: gig.title,
        contractValue: application.proposedRate,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    })

    await newConversation.save()

    // Populate the conversation
    await newConversation.populate("participants", "name image role")
    await newConversation.populate("gigId", "title")

    return NextResponse.json(
      {
        conversation: newConversation,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Conversation creation error:", error)
    return NextResponse.json(
      {
        error: "Failed to create conversation",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

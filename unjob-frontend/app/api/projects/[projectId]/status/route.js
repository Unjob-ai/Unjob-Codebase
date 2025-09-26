// api/projects/[projectId]/status/route.js - Project status update with enhanced notifications
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import NotificationService from "@/lib/notificationService";

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find the current user (company)
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

    const { projectId } = params;
    const { status, feedback } = await req.json();

    const validStatuses = [
      "submitted",
      "under_review",
      "revision_requested",
      "approved",
      "rejected",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Find and populate project
    const project = await Project.findById(projectId)
      .populate("freelancer", "name email image")
      .populate("company", "name email image");

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only company can update status
    if (project.company._id.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        { error: "Only company can update project status" },
        { status: 403 }
      );
    }

    // Store old status for notifications
    const oldStatus = project.status;

    // Update project
    project.status = status;
    project.companyFeedback = feedback;
    project.reviewedAt = new Date();
    project.reviewedBy = currentUser._id;

    // Add to status history if it doesn't exist
    if (!project.statusHistory) {
      project.statusHistory = [];
    }

    project.statusHistory.push({
      status: status,
      timestamp: new Date(),
      updatedBy: currentUser._id,
      feedback: feedback || "",
    });

    await project.save();

    // Create status update message in conversation if exists
    if (project.conversation) {
      try {
        let messageContent = "";
        const statusEmojis = {
          submitted: "📋",
          under_review: "👀",
          revision_requested: "🔄",
          approved: "✅",
          rejected: "❌",
        };

        messageContent = `${
          statusEmojis[status]
        } Project status updated to: ${status.replace("_", " ").toUpperCase()}`;

        if (feedback) {
          messageContent += `\n\nFeedback: ${feedback}`;
        }

        const statusMessage = new Message({
          conversationId: project.conversation,
          sender: currentUser._id,
          content: messageContent,
          type: "project_status_update",
          projectId: project._id,
          status: "sent",
          metadata: {
            newStatus: status,
            oldStatus: oldStatus,
            projectTitle: project.title,
            feedback: feedback || "",
          },
          readBy: [
            {
              user: currentUser._id,
              readAt: new Date(),
            },
          ],
        });

        await statusMessage.save();

        // Update conversation
        await Conversation.findByIdAndUpdate(project.conversation, {
          lastMessage: statusMessage._id,
          lastActivity: new Date(),
        });
      } catch (messageError) {
        console.error("⚠️ Failed to create status message:", messageError);
      }
    }

    // 🔥 CREATE ENHANCED NOTIFICATION FOR PROJECT STATUS UPDATE
    try {
      await NotificationService.notifyProjectStatusUpdate(
        project.freelancer._id,
        currentUser,
        project._id,
        project.title || "Project", // Use project title or fallback
        oldStatus,
        status
      );
      console.log("✅ Project status update notification sent to freelancer");
    } catch (notificationError) {
      console.error(
        "⚠️ Failed to create status update notification:",
        notificationError
      );

      // Fallback to old notification system
      const statusMessages = {
        submitted: "Your project has been submitted for review",
        under_review: "Your project is now under review",
        revision_requested: "Revisions have been requested for your project",
        approved: "🎉 Your project has been approved!",
        rejected: "Your project submission needs more work",
      };

      await Notification.create({
        user: project.freelancer._id,
        type: "project_status_update",
        title: "📋 Project Status Updated",
        message:
          statusMessages[status] || `Your project status changed to: ${status}`,
        relatedId: project._id,
        actionUrl: project.conversation
          ? `/chat/${project.conversation}`
          : `/dashboard/projects/${project._id}`,
        metadata: {
          projectTitle: project.title,
          newStatus: status,
          oldStatus: oldStatus,
          feedback: feedback || "",
          companyName: currentUser.name,
        },
      });
    }

    return NextResponse.json({
      success: true,
      project: {
        _id: project._id,
        title: project.title,
        status: project.status,
        companyFeedback: project.companyFeedback,
        reviewedAt: project.reviewedAt,
        statusHistory: project.statusHistory,
      },
      message: "Project status updated successfully!",
      notifications: {
        statusUpdateNotificationSent: true,
      },
    });
  } catch (error) {
    console.error("❌ Project status update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update project status",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Please try again later",
      },
      { status: 500 }
    );
  }
}

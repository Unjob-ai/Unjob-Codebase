// api/projects/[projectId]/request-revision/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import Gig from "@/models/Gig";
import User from "@/models/User";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import Notification from "@/models/Notification";
import NotificationService from "@/lib/notificationService";

export async function POST(req, { params }) {
  try {
    const { projectId } = params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Parse request data
    const body = await req.json();
    const { feedback = "", additionalRequirements = [] } = body;

    // Add debugging logs
    console.log("🔍 Request revision data:", {
      feedback,
      feedbackLength: feedback?.length,
      trimmedFeedback: feedback?.trim(),
    });

    if (!feedback.trim()) {
      console.log("❌ Feedback validation failed: empty or whitespace-only");
      return NextResponse.json(
        {
          error: "Feedback is required for revision requests",
        },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await User.findById(
      session.user.userId || session.user.id || session.user._id
    );

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find and validate project
    const project = await Project.findById(projectId)
      .populate("freelancer", "name email image")
      .populate("company", "name email image")
      .populate("gig");

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    console.log("🔍 Current project status:", project.status);

    // Authorization check - only company can request revisions
    if (project.company._id.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        {
          error: "Only the company can request project revisions",
        },
        { status: 403 }
      );
    }

    // FIXED: Allow projects in revision_requested status to be revised again
    if (
      !["submitted", "under_review", "revision_requested", "approved"].includes(
        project.status
      )
    ) {
      return NextResponse.json(
        {
          error: `Project cannot be revised in its current status: ${project.status}. Only projects with status 'submitted', 'under_review', or 'revision_requested' can be revised.`,
        },
        { status: 400 }
      );
    }

    // Get application for iteration tracking
    const gig = await Gig.findById(project.gig._id);
    const application = gig.applications.find(
      (app) => app.freelancer.toString() === project.freelancer._id.toString()
    );

    if (!application) {
      return NextResponse.json(
        {
          error: "Application not found",
        },
        { status: 404 }
      );
    }

    const remainingIterations = application.remainingIterations || 0;

    console.log("🔍 Remaining iterations:", remainingIterations);

    if (remainingIterations <= 0) {
      return NextResponse.json(
        {
          error: "No iterations remaining. Cannot request revision.",
          remainingIterations: 0,
        },
        { status: 400 }
      );
    }

    // Update project status
    project.status = "revision_requested";
    project.companyFeedback = feedback;
    project.reviewedAt = new Date();
    project.revisionRequestedAt = new Date();

    // Add to revision notes if not exists
    if (!project.revisionNotes) {
      project.revisionNotes = [];
    }

    project.revisionNotes.push({
      note: feedback,
      addedAt: new Date(),
      addedBy: currentUser._id,
      requirements: additionalRequirements,
    });

    // Update application status and decrease remaining iterations
    application.projectStatus = "revision_requested";
    application.remainingIterations = remainingIterations - 1;
    application.usedIterations = (application.usedIterations || 0) + 1;

    await Promise.all([project.save(), gig.save()]);

    console.log("✅ Project and gig saved successfully");

    // Create chat message
    const chatMessage =
      `🔄 **REVISION REQUESTED**\n\n` +
      `Project "${project.title}" needs revision.\n\n` +
      `**Feedback:** ${feedback}\n\n` +
      `📊 You have ${application.remainingIterations} revision(s) remaining. Please submit an updated version.\n\n` +
      `**Revision Request #${application.usedIterations}** - Please address the feedback and resubmit your work.`;

    // Send system message in chat
    let systemMessage = null;
    if (project.conversation) {
      systemMessage = new Message({
        conversationId: project.conversation,
        sender: currentUser._id,
        content: chatMessage,
        type: "system",
        metadata: {
          projectId: project._id,
          action: "revision_requested",
          remainingIterations: application.remainingIterations,
          usedIterations: application.usedIterations,
          feedback: feedback,
          revisionNumber: application.usedIterations,
        },
        readBy: [{ user: currentUser._id, readAt: new Date() }],
      });

      await systemMessage.save();
      await Conversation.findByIdAndUpdate(project.conversation, {
        lastMessage: systemMessage._id,
        lastActivity: new Date(),
      });

      await systemMessage.populate("sender", "name image");
    }

    // Create notifications
    try {
      await NotificationService.notifyProjectStatusUpdate(
        project.freelancer._id,
        currentUser,
        project._id,
        project.title || "Project",
        "submitted",
        "revision_requested"
      );
    } catch (notificationError) {
      console.error("Failed to create notification:", notificationError);

      // Fallback notification
      await Notification.create({
        user: project.freelancer._id,
        type: "revision_requested",
        title: "Project Needs Revision 📝",
        message: `Your project "${project.title}" needs revision. You have ${application.remainingIterations} iteration(s) remaining.`,
        relatedId: project._id,
        actionUrl: project.conversation
          ? `/chat/${project.conversation}`
          : `/freelancer/projects`,
        metadata: {
          remainingIterations: application.remainingIterations,
          usedIterations: application.usedIterations,
          feedback: feedback,
          revisionNumber: application.usedIterations,
        },
      });
    }

    // Response data
    const responseData = {
      success: true,
      action: "revision_requested",
      project: {
        _id: project._id,
        status: project.status,
        companyFeedback: project.companyFeedback,
        revisionRequestedAt: project.revisionRequestedAt,
        revisionNotes: project.revisionNotes,
      },
      iterations: {
        remaining: application.remainingIterations,
        used: application.usedIterations,
        total: application.totalIterations || 3,
        revisionNumber: application.usedIterations,
      },
      message: systemMessage
        ? {
            _id: systemMessage._id,
            content: systemMessage.content,
            createdAt: systemMessage.createdAt,
            type: systemMessage.type,
            metadata: systemMessage.metadata,
          }
        : null,
      notifications: {
        sent: true,
        message: `Revision request sent to ${project.freelancer.name}`,
      },
    };

    console.log("✅ Revision request processed successfully");
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ Project revision request error:", error);
    return NextResponse.json(
      {
        error: "Failed to process revision request",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

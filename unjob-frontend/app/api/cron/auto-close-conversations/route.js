// api/cron/auto-close-conversations/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import Notification from "@/models/Notification";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    // Verify this is a cron job request (add your verification logic)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const now = new Date();

    // Find projects that need conversation closure
    const projectsToClose = await Project.find({
      status: "approved",
      "metadata.conversationClosureScheduled": true,
      "metadata.scheduledClosureAt": { $lte: now },
      conversation: { $exists: true, $ne: null },
    })
      .populate("conversation")
      .populate("freelancer", "name email")
      .populate("company", "name");

    console.log(`🔍 Found ${projectsToClose.length} conversations to close`);

    const results = [];

    for (const project of projectsToClose) {
      try {
        // Close the conversation
        await Conversation.findByIdAndUpdate(project.conversation._id, {
          status: "completed",
          lastActivity: new Date(),
          settings: {
            ...project.conversation.settings,
            isReadOnly: true,
            readOnlyReason: "project_completed_14_days",
            completedAt: new Date(),
            autoClosedAt: new Date(),
          },
        });

        // Add system message
        const systemMessage = new Message({
          conversationId: project.conversation._id,
          sender: null, // System message
          content: `🔒 **Conversation Archived**\n\nThis conversation has been automatically archived after 14 days since project approval. The project "${
            project.title
          }" is successfully completed.\n\n**Project Status:** Completed\n**Completed On:** ${project.approvedAt.toLocaleDateString()}\n\nThank you for using our platform! 🎉`,
          type: "system",
          metadata: {
            projectId: project._id,
            autoClose: true,
            closedAfterDays: 14,
          },
          readBy: [
            { user: project.freelancer._id, readAt: new Date() },
            { user: project.company._id, readAt: new Date() },
          ],
        });
        await systemMessage.save();

        // Update conversation with last message
        await Conversation.findByIdAndUpdate(project.conversation._id, {
          lastMessage: systemMessage._id,
        });

        // Update project metadata
        project.metadata = {
          ...project.metadata,
          conversationClosedAt: new Date(),
          conversationClosureScheduled: false,
        };
        await project.save();

        // Send notifications to both parties
        await Notification.create({
          user: project.freelancer._id,
          type: "conversation_archived",
          title: "📚 Conversation Archived",
          message: `Your conversation for project "${project.title}" has been automatically archived after 14 days.`,
          relatedId: project._id,
          actionUrl: `/chat/${project.conversation._id}`,
        });

        await Notification.create({
          user: project.company._id,
          type: "conversation_archived",
          title: "📚 Conversation Archived",
          message: `Your conversation for project "${project.title}" has been automatically archived after 14 days.`,
          relatedId: project._id,
          actionUrl: `/chat/${project.conversation._id}`,
        });

        results.push({
          projectId: project._id,
          conversationId: project.conversation._id,
          projectTitle: project.title,
          success: true,
          closedAt: new Date().toISOString(),
        });

        console.log(`✅ Closed conversation for project: ${project.title}`);
      } catch (error) {
        console.error(
          `❌ Failed to close conversation for project ${project._id}:`,
          error
        );
        results.push({
          projectId: project._id,
          projectTitle: project.title || "Unknown",
          success: false,
          error: error.message,
        });
      }
    }

    // Process auto-close for expired conversations (if you have a method on Conversation model)
    let conversationResults = [];
    try {
      if (typeof Conversation.processAutoClose === "function") {
        conversationResults = await Conversation.processAutoClose();
      }
    } catch (error) {
      console.error("❌ Error processing conversation auto-close:", error);
    }

    console.log("Auto-close cron job completed:", {
      projectConversations: {
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
      conversationAutoClose: {
        processed: conversationResults.length,
        successful: conversationResults.filter((r) => r.success).length,
        failed: conversationResults.filter((r) => !r.success).length,
      },
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      projectConversations: {
        processed: results.length,
        results: results,
      },
      conversationAutoClose: {
        processed: conversationResults.length,
        results: conversationResults,
      },
      summary: {
        totalProcessed: results.length + conversationResults.length,
        totalSuccessful:
          results.filter((r) => r.success).length +
          conversationResults.filter((r) => r.success).length,
        totalFailed:
          results.filter((r) => !r.success).length +
          conversationResults.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error("Auto-close cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process auto-close",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

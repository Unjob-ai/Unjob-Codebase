// api/conversations/[conversationId]/status/route.js - Check if conversation is read-only
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
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

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { conversationId } = params;

    // Find conversation and verify user access
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUser._id,
    }).populate("participants", "name image role profile.companyName");

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Check read-only status based on conversation settings and status
    const isReadOnly =
      conversation.status === "completed" ||
      conversation.status === "closed" ||
      conversation.status === "archived" ||
      conversation.status === "blocked" ||
      conversation.settings?.isReadOnly ||
      !conversation.settings?.allowFileUploads ||
      !conversation.settings?.allowProjectSubmissions;

    // Check auto-close status
    const autoCloseStatus = conversation.shouldAutoClose()
      ? "expired"
      : conversation.autoCloseEnabled
      ? "scheduled"
      : "disabled";

    // Get time remaining for auto-close
    const autoCloseTime = conversation.getAutoCloseTimeRemaining();

    // Get other participant info
    const otherParticipant = conversation.participants.find(
      (p) => p._id.toString() !== currentUser._id.toString()
    );

    const statusInfo = {
      success: true,
      conversation: {
        _id: conversation._id,
        status: conversation.status,
        isReadOnly: isReadOnly,
        lastActivity: conversation.lastActivity,
        paymentCompleted: conversation.paymentCompleted,
        hasProjectSubmission: conversation.hasProjectSubmission,
        isBusinessRelated: conversation.isBusinessRelated,
      },
      permissions: {
        canSendMessages: !isReadOnly && conversation.status === "active",
        canUploadFiles: conversation.settings?.allowFileUploads && !isReadOnly,
        canSubmitProjects:
          conversation.settings?.allowProjectSubmissions && !isReadOnly,
        canUpdateStatus:
          currentUser.role === "hiring" || currentUser.role === "admin",
        canViewMessages: true, // Always allow viewing
      },
      autoClose: {
        enabled: conversation.autoCloseEnabled,
        status: autoCloseStatus,
        scheduledAt: conversation.autoCloseAt,
        reason: conversation.autoCloseReason,
        timeRemaining: autoCloseTime,
        warningsSent: conversation.metadata?.autoCloseWarningsSent || 0,
        delayHours: conversation.settings?.autoCloseDelayHours || 7,
      },
      participants: {
        current: {
          _id: currentUser._id,
          name: currentUser.name,
          role: currentUser.role,
          image: currentUser.image,
        },
        other: otherParticipant
          ? {
              _id: otherParticipant._id,
              name: otherParticipant.name,
              role: otherParticipant.role,
              image: otherParticipant.image,
              companyName: otherParticipant.profile?.companyName,
            }
          : null,
      },
      metadata: {
        projectTitle: conversation.metadata?.projectTitle,
        contractValue: conversation.metadata?.contractValue,
        deadline: conversation.metadata?.deadline,
        projectStatus: conversation.metadata?.projectStatus,
        paymentCompletedAt: conversation.metadata?.paymentCompletedAt,
        projectStartedAt: conversation.metadata?.projectStartedAt,
        projectSubmittedAt: conversation.projectSubmittedAt,
        paymentProcessed: conversation.metadata?.paymentProcessed,
        paymentAmount: conversation.metadata?.paymentAmount,
        finalStatus: conversation.metadata?.finalStatus,
      },
      settings: {
        allowFileUploads: conversation.settings?.allowFileUploads,
        allowProjectSubmissions: conversation.settings?.allowProjectSubmissions,
        notificationsEnabled: conversation.settings?.notificationsEnabled,
        autoCloseAfterSubmission:
          conversation.settings?.autoCloseAfterSubmission,
        autoCloseDelayHours: conversation.settings?.autoCloseDelayHours,
        isReadOnly: conversation.settings?.isReadOnly,
        readOnlyReason: conversation.settings?.readOnlyReason,
      },
    };

    // Add warning if conversation is about to be auto-closed
    if (
      autoCloseTime &&
      !autoCloseTime.expired &&
      autoCloseTime.totalMinutes < 60
    ) {
      statusInfo.warnings = [
        {
          type: "auto_close_warning",
          message: `This conversation will be automatically closed in ${autoCloseTime.formattedTime}`,
          severity: "warning",
        },
      ];
    }

    // Add info if conversation is read-only or closed
    if (isReadOnly || conversation.status === "completed") {
      statusInfo.readOnlyInfo = {
        reason:
          conversation.settings?.readOnlyReason ||
          conversation.metadata?.finalStatus ||
          "project_completed",
        readOnlyAt:
          conversation.settings?.completedAt || conversation.updatedAt,
        message: getReadOnlyMessage(
          conversation.settings?.readOnlyReason ||
            conversation.metadata?.finalStatus
        ),
        canViewHistory: true,
        canDownloadFiles: true,
        canRaiseDispute:
          conversation.metadata?.finalStatus === "iterations_exhausted",
      };
    }

    return NextResponse.json(statusInfo);
  } catch (error) {
    console.error("Conversation status fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch conversation status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper function to get appropriate read-only message
function getReadOnlyMessage(reason) {
  const messages = {
    project_completed:
      "🎉 Project completed successfully! This conversation is now read-only for record keeping.",
    iterations_exhausted:
      "⚠️ All iterations have been used. This conversation is now read-only.",
    project_submitted: "📋 Project submitted and conversation archived",
    timeout: "⏰ Conversation closed due to inactivity",
    manual: "🔒 Conversation manually closed by admin",
    payment_completed: "💰 Payment processed and project completed",
    default: "📚 This conversation is now read-only",
  };

  return messages[reason] || messages.default;
}

// PATCH - Update conversation status (for admins/hiring managers)
export async function PATCH(req, { params }) {
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
    const { action, settings } = await req.json();

    // Find conversation and verify access
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

    // Check permissions - only hiring managers and admins can update status
    if (currentUser.role !== "hiring" && currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions to update conversation status" },
        { status: 403 }
      );
    }

    let updateResult = {};

    switch (action) {
      case "close":
        conversation.status = "closed";
        conversation.settings.allowFileUploads = false;
        conversation.settings.allowProjectSubmissions = false;
        conversation.settings.isReadOnly = true;
        conversation.settings.readOnlyReason = "manual";
        updateResult.message = "Conversation closed successfully";
        break;

      case "reopen":
        conversation.status = "active";
        conversation.settings.allowFileUploads = true;
        conversation.settings.allowProjectSubmissions = true;
        conversation.settings.isReadOnly = false;
        conversation.settings.readOnlyReason = null;
        updateResult.message = "Conversation reopened successfully";
        break;

      case "archive":
        conversation.status = "archived";
        conversation.settings.isReadOnly = true;
        conversation.settings.readOnlyReason = "archived";
        updateResult.message = "Conversation archived successfully";
        break;

      case "make_readonly":
        conversation.settings.isReadOnly = true;
        conversation.settings.readOnlyReason = "manual";
        conversation.settings.allowFileUploads = false;
        conversation.settings.allowProjectSubmissions = false;
        updateResult.message = "Conversation made read-only successfully";
        break;

      case "cancel_auto_close":
        await conversation.cancelAutoClose("manual");
        updateResult.message = "Auto-close cancelled successfully";
        break;

      case "update_settings":
        if (settings) {
          conversation.settings = {
            ...conversation.settings,
            ...settings,
          };
          updateResult.message = "Conversation settings updated successfully";
        }
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await conversation.save();

    // Return updated status
    const updatedStatusInfo = {
      success: true,
      message: updateResult.message,
      conversation: {
        _id: conversation._id,
        status: conversation.status,
        isReadOnly:
          conversation.settings?.isReadOnly ||
          conversation.status === "closed" ||
          conversation.status === "archived",
        autoCloseEnabled: conversation.autoCloseEnabled,
        settings: conversation.settings,
      },
    };

    return NextResponse.json(updatedStatusInfo);
  } catch (error) {
    console.error("Conversation status update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update conversation status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

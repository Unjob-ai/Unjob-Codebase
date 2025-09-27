import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import Notification from "@/models/Notification";
import User from "@/models/User";
import Gig from "@/models/Gig";
import Payment from "@/models/Payment";
import {
  autoAddProjectEarnings,
  scheduleConversationClosure,
} from "@/lib/walletUtils";

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

    // Resolve current user from session
    const userId = session.user.userId || session.user.id || session.user._id;
    const currentUser = await User.findById(userId);

    if (!currentUser || currentUser.role !== "hiring") {
      return NextResponse.json(
        { error: "Only companies can review projects" },
        { status: 403 }
      );
    }

    const { projectId } = params;
    const { decision, feedback } = await req.json();

    if (!decision || !["approve", "reject"].includes(decision)) {
      return NextResponse.json(
        { error: "Invalid decision. Must be 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    // Find project and related data
    const project = await Project.findById(projectId)
      .populate("freelancer", "name image email")
      .populate("company", "name image")
      .populate("gig", "title budget");

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify ownership and project state
    if (project.company._id.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        { error: "You can only review your own company's projects" },
        { status: 403 }
      );
    }

    if (project.status !== "submitted") {
      return NextResponse.json(
        { error: "Project is not in a reviewable state" },
        { status: 400 }
      );
    }

    // Get the gig and the specific application
    const gig = await Gig.findById(project.gig._id);
    if (!gig) {
      return NextResponse.json(
        { error: "Associated gig not found" },
        { status: 404 }
      );
    }

    // FIXED: Find application using both user and freelancer fields
    const application = gig.applications.find((app) => {
      const appUserId = app.user ? app.user.toString() : null;
      const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
      const projectFreelancerId = project.freelancer._id.toString();

      return (
        appUserId === projectFreelancerId ||
        appFreelancerId === projectFreelancerId
      );
    });

    if (!application) {
      return NextResponse.json(
        { error: "Associated application not found" },
        { status: 404 }
      );
    }

    let conversationUpdate = {};
    let notificationMessage = "";
    let chatMessage = "";
    let shouldMakeReadOnly = false;
    let paymentInfo = null;
    let walletUpdateInfo = null;

    if (decision === "approve") {
      // --- APPROVE PROJECT ---
      project.status = "approved";
      project.approvedAt = new Date();
      project.reviewedAt = new Date();
      project.companyFeedback = feedback || "Great work!";

      // FIXED: Update application status using valid enum values
      application.projectStatus = "completed"; // Use "completed" instead of "approved"
      application.projectCompletedAt = new Date();
      // CRITICAL FIX: Update applicationStatus to reflect project completion
      application.applicationStatus = "completed"; // Mark as completed instead of keeping as accepted
      application.status = "completed"; // Update primary status as well
      application.completedAt = new Date();

      // FIXED: Mark the entire gig as completed
      gig.status = "completed";
      gig.closedAt = new Date();
      gig.selectedFreelancer = project.freelancer._id;

      // 1. AUTOMATIC PAYMENT PROCESSING
      // NOTE: This creates an internal record for tracking purposes only.
      // The actual payment was already charged during gig acceptance (gig_escrow).
      // This is just for freelancer earnings tracking and wallet crediting.
      try {
        const gigBudget = gig.budget || 0;
        const platformCommissionRate = 0; // Temporarily disabled commission (was 0.05)
        const platformCommission = Math.round(
          gigBudget * platformCommissionRate
        );
        const freelancerAmount = gigBudget - platformCommission;

        // Check if payment already exists for this project to prevent duplicates
        const existingPayment = await Payment.findOne({
          project: project._id,
          type: "gig_payment",
          payer: currentUser._id,
          payee: project.freelancer._id

        });

        if (!existingPayment) {
          const automaticPayment = new Payment({
            payer: currentUser._id,
            payee: project.freelancer._id,
            gig: gig._id,
            project: project._id,
            amount: freelancerAmount,
            type: "gig_payment", // Internal transfer, not a new charge
            status: "completed",
            description: `Internal payment record for approved project: ${project.title}`,
            metadata: {
              originalBudget: gigBudget,
              platformCommission,
              freelancerReceivableAmount: freelancerAmount,
              autoPayment: true,
              approvedAt: new Date(),
              isInternalTransfer: true, // Mark as internal to avoid double counting
            },
            transferDetails: {
              transferId: `AUTO_${Date.now()}_${project._id
                .toString()
                .slice(-6)}`,
              transferredAt: new Date(),
              transferStatus: "completed",
              transferMode: "bank",
            },
          });
          await automaticPayment.save();
        }

        // Update freelancer's total earnings stats
        const freelancer = await User.findById(project.freelancer._id);
        if (freelancer) {
          freelancer.stats.totalEarnings =
            (freelancer.stats.totalEarnings || 0) + freelancerAmount;
          freelancer.stats.completedProjects =
            (freelancer.stats.completedProjects || 0) + 1;
          await freelancer.save();
        }

        paymentInfo = {
          paymentId: existingPayment?._id || automaticPayment?._id,
          amount: freelancerAmount,
          platformCommission,
          originalBudget: gigBudget,
          transferId: existingPayment?.transferDetails?.transferId || automaticPayment?.transferDetails?.transferId,
          paidAt: new Date(),
          formattedAmount: `₹${freelancerAmount.toLocaleString()}`,
          alreadyProcessed: !!existingPayment,
        };
        console.log(
          "✅ Payment processing completed:",
          paymentInfo
        );
      } catch (paymentError) {
        console.error("❌ Automatic payment failed:", paymentError);
        paymentInfo = { error: true, message: paymentError.message };
      }

      // SAVE PROJECT AND GIG FIRST (Critical: Save project status before wallet operations)
      await project.save();
      await gig.save();

      // 2. AUTO-ADD EARNINGS TO FREELANCER WALLET
      try {
        console.log("🔄 Auto-adding earnings to wallet...");
        // console.log(`📋 Project ID: ${project._id}`);
        // console.log(`👤 Freelancer ID: ${project.freelancer._id}`);
        // console.log(`💰 Gig Budget: ₹${project.gig.budget?.toLocaleString()}`);
        
        const walletResult = await autoAddProjectEarnings(project._id, true);
        
        // console.log("📊 Wallet result:", walletResult);

        if (walletResult.success && !walletResult.alreadyCredited) {
          console.log(`✅ Added ₹${walletResult.amount} to freelancer wallet.`);
          walletUpdateInfo = {
            credited: true,
            amount: walletResult.amount,
            newBalance: walletResult.newBalance,
            message: "Earnings automatically added to wallet.",
          };
        } else if (walletResult.alreadyCredited) {
          // console.log("ℹ️ Earnings were already credited.");
          walletUpdateInfo = {
            credited: false,
            message: "Earnings were already credited.",
          };
        }
      } catch (walletError) {
        console.error("❌ Wallet auto-credit failed:", walletError);
        console.error("❌ Wallet error stack:", walletError.stack);
        walletUpdateInfo = { credited: false, error: walletError.message };
      }

      // 3. SCHEDULE CONVERSATION CLOSURE (14 day delay)
      try {
        await scheduleConversationClosure(project._id, 14);

        conversationUpdate = {
          lastActivity: new Date(),
          settings: {
            projectApproved: true,
            gigCompleted: true, // Add flag that gig is completed
            approvedAt: new Date(),
            scheduledClosureIn: 14, // days
          },
        };

        shouldMakeReadOnly = false; // Don't make read-only immediately

        console.log("📅 Conversation will remain active for 14 days");
      } catch (scheduleError) {
        console.error(
          "❌ Failed to schedule conversation closure:",
          scheduleError
        );
      }

      // 4. COMPOSE MESSAGES
      if (paymentInfo && !paymentInfo.error) {
        notificationMessage = `🎉 Your project "${project.title}" is approved! The gig is now complete. Payment of ${paymentInfo.formattedAmount} has been processed.`;
        chatMessage = `✅ **Project Approved & Gig Completed!** ✅\n\nProject "${
          project.title
        }" has been approved and the gig is now officially complete.\n\n**Feedback:** ${
          feedback || "Great work!"
        }\n\n**💰 Payment Summary:**\n• Amount Credited: ${
          paymentInfo.formattedAmount
        }\n• Platform Fee: ₹${paymentInfo.platformCommission.toLocaleString()}\n• Gig Status: ✅ Completed`;

        if (walletUpdateInfo?.credited) {
          chatMessage += `\n• Wallet Status: Added to your balance. New balance: ₹${walletUpdateInfo.newBalance.toLocaleString()}`;
        }

        chatMessage += `\n\n📞 **This conversation will remain active for 14 days** for any follow-up discussions. After that, it will be automatically archived.\n\n🎉 Congratulations on completing this gig successfully!`;
      } else {
        notificationMessage = `🎉 Great news! Your project "${project.title}" has been approved and the gig is complete. Payment will be processed shortly.`;
        chatMessage = `✅ Project "${
          project.title
        }" has been APPROVED and the gig is now COMPLETE!\n\n**Feedback:** ${
          feedback || "No additional feedback provided."
        }\n\n💰 Payment processing is underway.\n\n📞 **This conversation will remain active for 14 days** for any follow-up discussions.\n\n🎉 Congratulations on completing this gig!`;
      }
    } else if (decision === "reject") {
      // --- REJECT PROJECT ---
      project.status = "rejected";
      project.reviewedAt = new Date();
      project.companyFeedback = feedback || "Project needs revision.";

      // FIXED: Use valid enum value for projectStatus
      application.projectStatus = "revision_requested"; // Use "revision_requested" instead of "rejected"

      const remainingIterations = application.remainingIterations || 0;
      if (remainingIterations > 0) {
        // Has iterations left - keep chat active
        notificationMessage = `📝 Your project "${project.title}" needs revision. You have ${remainingIterations} iteration(s) remaining.`;
        chatMessage = `❌ **Revision Required**\n\nProject "${
          project.title
        }" needs revision.\n\n**Feedback:** ${
          feedback || "Please review the requirements."
        }\n\n📊 You have ${remainingIterations} revision(s) left. Please submit an updated version.`;
      } else {
        // No iterations left - make chat read-only
        shouldMakeReadOnly = true;
        conversationUpdate = {
          status: "completed",
          lastActivity: new Date(),
          settings: {
            isReadOnly: true,
            readOnlyReason: "iterations_exhausted",
            completedAt: new Date(),
          },
        };
        notificationMessage = `❌ Your project "${project.title}" was not approved, and you have no revisions remaining.`;
        chatMessage = `❌ **Project Not Approved**\n\nProject "${
          project.title
        }" was not approved after the final revision.\n\n**Final Feedback:** ${
          feedback || "No further feedback."
        }\n\n📊 All revisions have been used. This conversation is now read-only.`;
      }

      // Save changes for rejection
      await project.save();
      await gig.save();
    }

    // --- UPDATE CONVERSATION ---
    if (Object.keys(conversationUpdate).length > 0 && project.conversation) {
      await Conversation.findByIdAndUpdate(
        project.conversation,
        conversationUpdate
      );
    }

    // --- CREATE SYSTEM MESSAGE & NOTIFICATIONS ---
    let systemMessage = null;
    if (project.conversation) {
      systemMessage = new Message({
        conversationId: project.conversation,
        sender: currentUser._id,
        content: chatMessage,
        type: "system",
        metadata: {
          projectId: project._id,
          decision,
          gigCompleted: decision === "approve", // Add flag for gig completion
        },
        readBy: [{ user: currentUser._id, readAt: new Date() }],
      });
      await systemMessage.save();
      await Conversation.findByIdAndUpdate(project.conversation, {
        lastMessage: systemMessage._id,
      });
      await systemMessage.populate("sender", "name image");
    }

    // Create notifications
    await Notification.create({
      user: project.freelancer._id,
      type: "project_status_update",
      title:
        decision === "approve"
          ? "Project Approved & Gig Completed! 🎉"
          : "Project Needs Revision 📝",
      message: notificationMessage,
      relatedId: project._id,
      actionUrl: project.conversation
        ? `/chat/${project.conversation}`
        : `/freelancer/projects`,
      metadata: {
        gigCompleted: decision === "approve",
        projectStatus: project.status,
      },
    });

    if (decision === "approve" && paymentInfo && !paymentInfo.error) {
      await Notification.create({
        user: project.freelancer._id,
        type: "payment_completed",
        title: "Payment Received! 💰",
        message: `Payment of ${paymentInfo.formattedAmount} for "${project.title}" has been processed. Gig completed successfully!`,
        relatedId: paymentInfo.paymentId,
        actionUrl: `/freelancer/earnings`,
        metadata: {
          gigCompleted: true,
          amount: paymentInfo.amount,
        },
      });
    }

    // --- FINAL API RESPONSE ---
    const responseData = {
      success: true,
      decision: decision,
      gigCompleted: decision === "approve", // Include gig completion status
      project: {
        _id: project._id,
        status: project.status,
        companyFeedback: project.companyFeedback,
      },
      gig:
        decision === "approve"
          ? {
              _id: gig._id,
              status: gig.status,
              closedAt: gig.closedAt,
              selectedFreelancer: gig.selectedFreelancer,
            }
          : null,
      payment: paymentInfo,
      wallet: walletUpdateInfo,
      message: systemMessage
        ? {
            _id: systemMessage._id,
            content: systemMessage.content,
            sender: systemMessage.sender,
            createdAt: systemMessage.createdAt,
          }
        : null,
      conversationStatus: {
        isReadOnly: shouldMakeReadOnly,
        status: shouldMakeReadOnly ? "read_only" : "active",
      },
      messageText:
        decision === "approve"
          ? `Project successfully approved and gig completed.`
          : `Project ${decision}ed.`,
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("Project review error:", error);
    return NextResponse.json(
      { error: "Failed to review project", details: error.message },
      { status: 500 }
    );
  }
}

// api/projects/submit/route.js - FIXED: Replace method calls with direct property access
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import Gig from "@/models/Gig";
import { uploadToCloudinary } from "@/lib/cloudinary";
import NotificationService from "@/lib/notificationService";

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

    if (!currentUser || currentUser.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can submit projects" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const conversationId = formData.get("conversationId");
    const title = formData.get("title");
    const description = formData.get("description");
    const files = formData.getAll("files");

    // Verify conversation and get gig details
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUser._id,
    }).populate("gigId");

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Get the gig and find the application
    const gig = await Gig.findById(conversation.gigId._id);
    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // FIXED: Find application using both user and freelancer fields
    const application = gig.applications.find((app) => {
      const appUserId = app.user ? app.user.toString() : null;
      const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
      const currentUserId = currentUser._id.toString();
      const isAccepted =
        app.status === "accepted" || app.applicationStatus === "accepted";

      return (
        (appUserId === currentUserId || appFreelancerId === currentUserId) &&
        isAccepted
      );
    });

    if (!application) {
      return NextResponse.json(
        { error: "No accepted application found" },
        { status: 404 }
      );
    }

    // FIXED: Check iterations using direct property access instead of methods
    const totalIterations = application.totalIterations || 1;
    const usedIterations = application.usedIterations || 0;
    const remainingIterations = totalIterations - usedIterations;
    const hasIterationsLeft = remainingIterations > 0;
    const canRaiseDispute = usedIterations >= Math.floor(totalIterations * 0.5);

    // Check if iterations are available
    if (!hasIterationsLeft && application.projectStatus !== "rejected") {
      return NextResponse.json(
        {
          error: "No iterations remaining",
          message: "You have used all your iterations for this project",
          canRaiseDispute: canRaiseDispute,
          totalIterations: totalIterations,
          usedIterations: usedIterations,
        },
        { status: 400 }
      );
    }

    // Upload files
    const uploadedFiles = [];
    for (const file of files) {
      if (file && file.size > 0) {
        if (file.size > 25 * 1024 * 1024) {
          return NextResponse.json(
            { error: `File ${file.name} is too large. Maximum size is 25MB.` },
            { status: 400 }
          );
        }

        let folder = "unjob/projects/documents";
        let resourceType = "raw";

        if (file.type.startsWith("image/")) {
          folder = "unjob/projects/images";
          resourceType = "image";
        } else if (file.type.startsWith("video/")) {
          folder = "unjob/projects/videos";
          resourceType = "video";
        }

        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const fileUrl = await uploadToCloudinary(
            buffer,
            folder,
            resourceType
          );

          uploadedFiles.push({
            name: file.name,
            url: fileUrl,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(),
          });
        } catch (uploadError) {
          return NextResponse.json(
            { error: `Failed to upload file: ${file.name}` },
            { status: 500 }
          );
        }
      }
    }

    // Determine iteration number
    const iterationNumber = usedIterations + 1;

    // Get the other participant (company)
    const companyId = conversation.participants.find(
      (p) => p.toString() !== currentUser._id.toString()
    );

    // Get company user for notifications
    const companyUser = await User.findById(companyId);

    // Create project submission
    const project = new Project({
      conversation: conversationId,
      gig: conversation.gigId._id,
      freelancer: currentUser._id,
      company: companyId,
      title: title.trim(),
      description: description.trim(),
      files: uploadedFiles,
      status: "submitted",
      submittedAt: new Date(),
      version: iterationNumber,
      isLatestVersion: true,
      iterationNumber: iterationNumber,

      // Iterations tracking
      totalIterations: totalIterations,
      currentIteration: iterationNumber,
    });

    await project.save();

    // FIXED: Update iterations using direct property manipulation
    application.usedIterations = usedIterations + 1;
    application.remainingIterations =
      totalIterations - application.usedIterations;

    // FIXED: Add project submission to array
    if (!application.projectSubmissions) {
      application.projectSubmissions = [];
    }
    application.projectSubmissions.push({
      projectId: project._id,
      iterationNumber: iterationNumber,
      submittedAt: new Date(),
    });

    // Update application status
    application.projectStatus = "submitted";
    application.currentProjectId = project._id;

    await gig.save();

    // Calculate remaining iterations after update
    const newRemainingIterations = totalIterations - application.usedIterations;
    const stillHasIterationsLeft = newRemainingIterations > 0;

    // Create iteration-aware chat message
    const iterationMessage = stillHasIterationsLeft
      ? `Iteration ${iterationNumber}/${totalIterations} - ${newRemainingIterations} iteration${
          newRemainingIterations !== 1 ? "s" : ""
        } remaining`
      : `Final iteration ${iterationNumber}/${totalIterations} - No iterations remaining`;

    const message = new Message({
      conversationId,
      sender: currentUser._id,
      content: `📋 Project submitted: ${title}\n\n${iterationMessage}`,
      type: "project_submission",
      projectId: project._id,
      status: "sent",
      metadata: {
        iterationNumber: iterationNumber,
        totalIterations: totalIterations,
        remainingIterations: newRemainingIterations,
        isLastIteration: !stillHasIterationsLeft,
      },
      readBy: [
        {
          user: currentUser._id,
          readAt: new Date(),
        },
      ],
    });

    await message.save();

    // Update conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastActivity: new Date(),
    });

    // Populate sender info for the message
    await message.populate("sender", "name image");

    // Create enhanced notification for project submission
    try {
      await NotificationService.notifyProjectSubmission(
        companyId,
        currentUser,
        project._id,
        gig.title,
        {
          iterationNumber: iterationNumber,
          totalIterations: totalIterations,
          remainingIterations: newRemainingIterations,
          description: description.trim(),
          filesCount: uploadedFiles.length,
          submittedAt: project.submittedAt,
          conversationId: conversationId,
          projectTitle: title.trim(),
          isLastIteration: !stillHasIterationsLeft,
        }
      );
      console.log("✅ Project submission notification sent to company");
    } catch (notificationError) {
      console.error(
        "⚠️ Failed to create submission notification:",
        notificationError
      );

      // Fallback notification creation
      try {
        const { default: Notification } = await import("@/models/Notification");

        const notificationMessage = stillHasIterationsLeft
          ? `${currentUser.name} submitted iteration ${iterationNumber}/${totalIterations} for "${title}" (${newRemainingIterations} iterations remaining)`
          : `${currentUser.name} submitted final iteration ${iterationNumber}/${totalIterations} for "${title}"`;

        await Notification.create({
          user: companyId,
          type: "project_submission",
          title: "📤 Project Submitted",
          message: notificationMessage,
          relatedId: project._id,
          actionUrl: `/chat/${conversationId}`,
          metadata: {
            projectTitle: title,
            freelancerName: currentUser.name,
            iterationNumber: iterationNumber,
            totalIterations: totalIterations,
            remainingIterations: newRemainingIterations,
            filesCount: uploadedFiles.length,
            conversationId: conversationId,
          },
        });
      } catch (fallbackError) {
        console.error("⚠️ Fallback notification also failed:", fallbackError);
      }
    }

    // Populate project with related data for response
    await project.populate([
      { path: "freelancer", select: "name image" },
      { path: "company", select: "name image" },
      { path: "gig", select: "title" },
    ]);

    const responseData = {
      success: true,
      project: {
        _id: project._id,
        title: project.title,
        description: project.description,
        status: project.status,
        submittedAt: project.submittedAt,
        fileCount: uploadedFiles.length,
        totalFileSize: uploadedFiles.reduce(
          (total, file) => total + file.size,
          0
        ),
        version: project.version,
        files: project.files,
        iterationNumber: iterationNumber,
        totalIterations: totalIterations,
      },
      message: {
        _id: message._id,
        conversationId: message.conversationId,
        sender: {
          _id: message.sender._id,
          name: message.sender.name,
          image: message.sender.image,
        },
        content: message.content,
        type: message.type,
        projectId: message.projectId,
        status: message.status,
        createdAt: message.createdAt,
        metadata: message.metadata,
      },
      iterationsInfo: {
        currentIteration: iterationNumber,
        totalIterations: totalIterations,
        remainingIterations: newRemainingIterations,
        usedIterations: application.usedIterations,
        hasIterationsLeft: stillHasIterationsLeft,
        canRaiseDispute:
          application.usedIterations >= Math.floor(totalIterations * 0.5),
        isLastIteration: !stillHasIterationsLeft,
      },
      messageText: stillHasIterationsLeft
        ? `Project submitted successfully! You have ${newRemainingIterations} iteration${
            newRemainingIterations !== 1 ? "s" : ""
          } remaining.`
        : "Final project submitted! No more iterations available.",
      notifications: {
        submissionNotificationSent: true,
      },
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("❌ Project submission error:", error);
    return NextResponse.json(
      {
        error: "Failed to submit project",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

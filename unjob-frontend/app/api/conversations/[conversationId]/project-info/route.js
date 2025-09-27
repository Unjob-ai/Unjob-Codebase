import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import Conversation from "@/models/Conversation";
import Gig from "@/models/Gig";

export async function GET(req, { params }) {
  try {
    const { conversationId } = params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // First, let's find ANY project for this conversation (not just submitted ones)
    const project = await Project.findOne({
      conversation: conversationId,
    })
      .sort({ submittedAt: -1 }) // Get the most recent one
      .populate("freelancer", "name email image")
      .populate("company", "name email image");

    console.log(
      "🔍 Found project:",
      project
        ? {
            id: project._id,
            status: project.status,
            conversation: project.conversation,
            title: project.title,
          }
        : "No project found"
    );

    if (!project) {
      // Let's also check if there's a gig associated with this conversation
      const conversation = await Conversation.findById(conversationId).populate(
        "gigId"
      );

      console.log(
        "🔍 Conversation details:",
        conversation
          ? {
              id: conversation._id,
              hasGig: !!conversation.gigId,
              gigId: conversation.gigId?._id,
            }
          : "No conversation found"
      );

      return NextResponse.json({
        success: true,
        project: null,
        conversation: conversation,
        debug: {
          conversationId,
          message: "No project found for this conversation",
          hasConversation: !!conversation,
          hasGig: !!conversation?.gigId,
        },
      });
    }

    // Get the gig to find remaining iterations
    const gig = await Gig.findById(project.gig);
    const application = gig?.applications?.find(
      (app) => app.freelancer.toString() === project.freelancer._id.toString()
    );

    console.log(
      "🔍 Application info:",
      application
        ? {
            remainingIterations: application.remainingIterations,
            totalIterations: application.totalIterations,
            projectStatus: application.projectStatus,
          }
        : "No application found"
    );

    const projectData = {
      _id: project._id,
      title: project.title,
      description: project.description,
      status: project.status,
      submittedAt: project.submittedAt,
      files: project.files,
      remainingIterations: application?.remainingIterations || 0,
      totalIterations: application?.totalIterations || 3,
      version: project.version,
      freelancer: project.freelancer,
      // Add debug info
      debug: {
        projectStatus: project.status,
        applicationStatus: application?.projectStatus,
        shouldShowReview: project.status === "submitted",
      },
    };

    // Get conversation details
    const conversation = await Conversation.findById(conversationId);

    return NextResponse.json({
      success: true,
      project: projectData,
      conversation: conversation,
      debug: {
        foundProject: true,
        projectStatus: project.status,
        conversationId,
      },
    });
  } catch (error) {
    console.error("Project info fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project information", details: error.message },
      { status: 500 }
    );
  }
}

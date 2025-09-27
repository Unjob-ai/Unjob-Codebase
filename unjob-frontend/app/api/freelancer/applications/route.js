import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Gig from "@/models/Gig";
import Payment from "@/models/Payment";
import Conversation from "@/models/Conversation";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session in API:", session);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Try multiple ways to get the user ID
    let userId = session.user.id || session.user._id || session.user.userId;
    console.log("User ID from session:", userId);

    let freelancer = null;

    if (userId) {
      freelancer = await User.findById(userId);
    }

    // If not found by ID, try by email
    if (!freelancer && session.user.email) {
      freelancer = await User.findOne({ email: session.user.email });
    }

    console.log("Found freelancer:", freelancer ? freelancer._id : "none");

    if (!freelancer) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (freelancer.role !== "freelancer") {
      return NextResponse.json(
        {
          error:
            "Only freelancers can view applications. Your role: " +
            freelancer.role,
        },
        { status: 403 }
      );
    }

    // Find all gigs where this freelancer has applied
    const gigs = await Gig.find({
      "applications.freelancer": freelancer._id,
    })
      .populate("company", "name image profile.companyName")
      .sort({ createdAt: -1 });

    console.log("Found gigs with applications:", gigs.length);

    const applications = [];

    for (const gig of gigs) {
      // FIX: Check if the company associated with the gig still exists.
      // If not, skip this iteration to prevent a crash.
      if (!gig.company) {
        console.warn(
          `Skipping gig "${gig.title}" (ID: ${gig._id}) because its associated company is missing or deleted.`
        );
        continue; // Go to the next gig in the loop
      }

      // Safely find the freelancer's application in this gig
      const application = gig.applications.find(
        (app) =>
          app &&
          app.freelancer &&
          app.freelancer.toString() === freelancer._id.toString()
      );

      if (!application) {
        // No matching application found, skip this gig
        continue;
      }

      console.log("Found application for gig:", gig.title);

      // Find payment information for this application
      let payment = null;
      if (application.applicationStatus === "accepted") {
        payment = await Payment.findOne({
          payer: gig.company._id, // This is now safe
          payee: freelancer._id,
          gig: gig._id,
        }).sort({ createdAt: -1 });
      }

      // Find conversation for this application
      let conversation = null;
      if (application.applicationStatus === "accepted") {
        conversation = await Conversation.findOne({
          participants: { $all: [gig.company._id, freelancer._id] }, // This is now safe
          gigId: gig._id,
        });
      }

      applications.push({
        _id: application._id,
        gigId: gig._id,
        gig: {
          title: gig.title,
          budget: gig.budget,
          timeline: gig.timeline,
          company: gig.company, // This is now safe
        },
        coverLetter: application.coverLetter,
        proposedRate: application.proposedRate,
        estimatedDuration: application.estimatedDuration,
        applicationStatus: application.applicationStatus || "pending",
        appliedAt: application.appliedAt || gig.createdAt,
        payment: payment
          ? {
              _id: payment._id,
              amount: payment.amount,
              status: payment.status,
              type: payment.type,
              description: payment.description,
              createdAt: payment.createdAt,
              transferDetails: payment.transferDetails,
            }
          : null,
        conversationId: conversation?._id || null,
      });
    }

    console.log("Total applications found:", applications.length);

    return NextResponse.json({
      success: true,
      applications,
      debug: {
        userId: freelancer._id,
        userRole: freelancer.role,
        gigsFound: gigs.length,
        applicationsFound: applications.length,
      },
    });
  } catch (error) {
    console.error("Freelancer applications fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch applications",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

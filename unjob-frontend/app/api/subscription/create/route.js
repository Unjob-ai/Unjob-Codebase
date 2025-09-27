// api/applications/create/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Gig from "@/models/Gig";
import Notification from "@/models/Notification";

export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const freelancer = await User.findById(session.user.id);
    if (!freelancer || freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can apply to gigs" },
        { status: 403 }
      );
    }

    if (!freelancer.profile?.isCompleted) {
      return NextResponse.json(
        {
          error: "PROFILE_INCOMPLETE",
          message: "Please complete your profile before applying to gigs",
        },
        { status: 400 }
      );
    }

    const { gigId, coverLetter, proposedRate, estimatedDuration } =
      await req.json();

    if (!gigId || !coverLetter) {
      return NextResponse.json(
        { error: "Gig ID and cover letter are required" },
        { status: 400 }
      );
    }

    const gig = await Gig.findById(gigId).populate("company");
    if (!gig || gig.status !== "active") {
      return NextResponse.json(
        { error: "Gig not found or not active" },
        { status: 404 }
      );
    }

    // Check if already applied
    const existingApplication = gig.applications.find(
      (app) => app.freelancer.toString() === freelancer._id.toString()
    );

    if (existingApplication) {
      return NextResponse.json(
        { error: "You have already applied to this gig" },
        { status: 400 }
      );
    }

    // Create application
    const application = {
      freelancer: freelancer._id,
      name: freelancer.name,
      image: freelancer.image,
      location: freelancer.profile?.location,
      skills: freelancer.profile?.skills || [],
      hourlyRate: freelancer.profile?.hourlyRate,
      portfolio: freelancer.profile?.portfolio || [],
      coverLetter,
      proposedRate: proposedRate || freelancer.profile?.hourlyRate,
      estimatedDuration,
    };

    gig.applications.push(application);
    await gig.save();

    // Create notification for company
    await Notification.create({
      user: gig.company._id,
      type: "gig_application",
      title: "New Application Received",
      message: `${freelancer.name} applied to your gig "${gig.title}"`,
      relatedId: gig._id,
      actionUrl: `/gigs/${gig._id}/applications`,
    });

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully!",
    });
  } catch (error) {
    console.error("Application creation error:", error);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 }
    );
  }
}

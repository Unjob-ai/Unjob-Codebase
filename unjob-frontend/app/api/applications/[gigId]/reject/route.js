// api/applications/[gigId]/reject/route.js - Enhanced version
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Gig from "@/models/Gig";
import Notification from "@/models/Notification";

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

    // Better user resolution logic (same as accept route)
    let company = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      company = await User.findById(userId);
    }

    if (!company && session.user.email) {
      company = await User.findOne({ email: session.user.email });
    }

    console.log("Application rejection attempt - User:", {
      sessionId: session.user.id,
      sessionEmail: session.user.email,
      foundUser: company ? { id: company._id, role: company.role } : null,
    });

    if (!company) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    if (company.role !== "hiring") {
      return NextResponse.json(
        { error: "Only hiring users can reject applications" },
        { status: 403 }
      );
    }

    const { gigId } = params;
    let { freelancerId, reason } = await req.json();

    // Handle case where freelancerId might be an object with _id property
    if (typeof freelancerId === "object" && freelancerId._id) {
      freelancerId = freelancerId._id.toString();
    } else if (freelancerId) {
      freelancerId = freelancerId.toString();
    }

    console.log("Reject application params:", {
      gigId,
      freelancerId,
      reason: reason ? "provided" : "not provided",
    });

    if (!freelancerId) {
      return NextResponse.json(
        { error: "Freelancer ID is required" },
        { status: 400 }
      );
    }

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    console.log("Gig found:", {
      gigId: gig._id,
      gigCompany: gig.company,
      sessionCompany: company._id,
      match: gig.company.toString() === company._id.toString(),
    });

    if (gig.company.toString() !== company._id.toString()) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - You can only reject applications for your own gigs",
        },
        { status: 403 }
      );
    }

    // Find the application
    const application = gig.applications.find(
      (app) => app.freelancer.toString() === freelancerId
    );

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    if (application.applicationStatus === "rejected") {
      return NextResponse.json(
        { error: "Application already rejected" },
        { status: 400 }
      );
    }

    if (application.applicationStatus === "accepted") {
      return NextResponse.json(
        { error: "Cannot reject an accepted application" },
        { status: 400 }
      );
    }

    // Update application status
    application.applicationStatus = "rejected";
    application.rejectedAt = new Date();
    if (reason && reason.trim()) {
      application.rejectionReason = reason.trim();
    }

    await gig.save();

    console.log(
      "Application rejected for gig:",
      gigId,
      "freelancer:",
      freelancerId
    );

    // Create notification for freelancer
    try {
      const notificationMessage = reason
        ? `Your application for "${gig.title}" has been rejected. Reason: ${reason}`
        : `Your application for "${gig.title}" has been rejected`;

      await Notification.create({
        user: freelancerId,
        type: "gig_rejected",
        title: "Application Rejected",
        message: notificationMessage,
        relatedId: gig._id,
        actionUrl: `/freelancer/applications`,
      });
    } catch (notificationError) {
      console.error("Notification creation failed:", notificationError);
      // Don't fail the whole request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: "Application rejected successfully!",
      data: {
        gigTitle: gig.title,
        freelancerName: application.name,
        rejectionReason: reason || null,
      },
    });
  } catch (error) {
    console.error("Application rejection error:", error);
    return NextResponse.json(
      {
        error: "Failed to reject application",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

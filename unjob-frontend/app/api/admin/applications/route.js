// api/admin/applications/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ✅ Import authOptions
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
import User from "@/models/User";
import Payment from "@/models/Payment";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions); // ✅ Pass authOptions
    //console.log("Admin applications - Session:", session); // ✅ Debug log

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // ✅ Better user resolution logic (same as other working APIs)
    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
   // console.log("Admin applications - User ID from session:", userId); // ✅ Debug log

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    // console.log(
    //   "Admin applications - Found user:",
    //   user ? { id: user._id, role: user.role } : null
    // ); // ✅ Debug log

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          error: "Admin access required",
          userRole: user.role,
          userId: user._id,
        },
        { status: 403 }
      );
    }

    // Get all gigs with applications
    const gigs = await Gig.find({ "applications.0": { $exists: true } })
      .populate("company", "name email profile.companyName")
      .populate("applications.freelancer", "name email profile")
      .sort({ createdAt: -1 });

    // console.log(
    //   "Admin applications - Found gigs with applications:",
    //   gigs.length
    // ); // ✅ Debug log

    // Flatten applications with gig info
    const applications = [];

    for (const gig of gigs) {
      for (const application of gig.applications) {
        try {
          // Check if payment exists for this application
          const payment = await Payment.findOne({
            gig: gig._id,
            payee: application.freelancer._id,
          });

          applications.push({
            _id: application._id,
            gigId: gig._id,
            gig: {
              _id: gig._id,
              title: gig.title,
              budget: gig.budget,
              timeline: gig.timeline,
              company: gig.company,
            },
            freelancer: application.freelancer,
            company: gig.company, // ✅ Add company info at root level
            applicationStatus: application.applicationStatus,
            proposedRate: application.proposedRate,
            estimatedDuration: application.estimatedDuration,
            coverLetter: application.coverLetter,
            appliedAt: application.appliedAt,
            acceptedAt: application.acceptedAt,
            rejectedAt: application.rejectedAt,
            conversationId: application.conversationId,
            payment: payment,
            // ✅ Add status field for consistency
            status: application.applicationStatus || "pending",
          });
        } catch (appError) {
          console.error("Error processing application:", appError);
          // Continue processing other applications
        }
      }
    }

    console.log(
      "Admin applications - Total applications found:",
      applications.length
    ); // ✅ Debug log

    return NextResponse.json({
      success: true,
      applications,
      debug: {
        userId: user._id,
        userRole: user.role,
        gigsFound: gigs.length,
        applicationsFound: applications.length,
      },
    });
  } catch (error) {
    console.error("Admin applications fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch applications",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

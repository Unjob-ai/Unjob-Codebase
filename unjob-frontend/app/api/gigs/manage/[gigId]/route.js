// api/gigs/manage/[gigId]/route.js - FIXED: Proper user data display and schema consistency
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
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

    // Better user resolution logic
    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    if (user.role !== "hiring") {
      return NextResponse.json(
        { error: "Only hiring users can manage gigs" },
        { status: 403 }
      );
    }

    const { gigId } = params;

    if (!gigId) {
      return NextResponse.json(
        { error: "Gig ID is required" },
        { status: 400 }
      );
    }

    // FIXED: Populate user data properly for display in manage interface
    let gig = await Gig.findById(gigId)
      .populate(
        "company",
        "name image profile.companyName isVerified profile.bio profile.location profile.website username"
      )
      .populate(
        "applications.user", // Primary field for user data
        "name image profile.skills profile.hourlyRate profile.location username profile.bio stats.rating stats.totalReviews isVerified"
      );

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Verify ownership
    if (gig.company._id.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Unauthorized - You can only manage your own gigs" },
        { status: 403 }
      );
    }

    // FIXED: Transform applications with FULL user data for hiring manager view
    const transformedApplications = gig.applications.map((app) => {
      const appObj = app.toObject();

      console.log("Processing application:", {
        appId: appObj._id,
        hasUser: !!appObj.user,
        userName: appObj.user?.name,
        status: appObj.status || appObj.applicationStatus,
      });

      const userInfo = appObj.user; // This should be populated

      return {
        _id: appObj._id,

        // FIXED: Include full user information for hiring managers
        user: userInfo, // Full populated user object
        freelancer: userInfo, // Keep both for compatibility

        // Map user data to application level for easier access
        name: userInfo?.name || appObj.name || "Unknown User",
        email: userInfo?.email || appObj.email || "",
        image: userInfo?.image || appObj.image || null,
        username: userInfo?.username || "user",
        location:
          userInfo?.profile?.location || appObj.location || "Not specified",
        skills: userInfo?.profile?.skills || appObj.skills || [],
        hourlyRate: userInfo?.profile?.hourlyRate || appObj.hourlyRate || 0,
        bio: userInfo?.profile?.bio || "",
        rating: userInfo?.stats?.rating || 0,
        totalReviews: userInfo?.stats?.totalReviews || 0,
        isVerified: userInfo?.isVerified || false,

        // Application-specific data
        coverLetter: appObj.coverLetter || "",
        proposedRate: appObj.proposedRate || 0,
        estimatedDuration: appObj.estimatedDuration || "",
        totalIterations: appObj.totalIterations || 1,
        remainingIterations: appObj.remainingIterations || 1,

        // Status fields - use primary 'status' field
        status: appObj.status || appObj.applicationStatus || "pending",
        applicationStatus:
          appObj.status || appObj.applicationStatus || "pending",

        // Dates
        appliedAt: appObj.appliedAt || appObj.createdAt,
        acceptedAt: appObj.acceptedAt,
        rejectedAt: appObj.rejectedAt,
        rejectionReason: appObj.rejectionReason,

        // Premium features
        isPriorityApplication: appObj.isPriorityApplication || false,
        hasVerifiedSkills: appObj.hasVerifiedSkills || false,
        hasPremiumBadge: appObj.hasPremiumBadge || false,

        // Project tracking
        projectSubmissions: appObj.projectSubmissions || [],
        currentProjectId: appObj.currentProjectId,
        projectStatus: appObj.projectStatus || "not_started",

        // Payment details
        paymentDetails: appObj.paymentDetails || {},

        // Computed fields
        timeAgo: getTimeAgo(appObj.appliedAt || appObj.createdAt),

        // Keep IDs for actions
        userId: userInfo?._id || appObj.user,
        freelancerId: userInfo?._id || appObj.user, // Same as userId for consistency
      };
    });

    console.log(
      "Final transformed applications with user data:",
      transformedApplications.length,
      transformedApplications[0]
        ? {
            name: transformedApplications[0].name,
            username: transformedApplications[0].username,
            hasUserObject: !!transformedApplications[0].user,
          }
        : "No applications"
    );

    // Add extra fields for frontend
    const gigWithExtras = {
      ...gig.toObject(),
      applicationsCount: gig.applications?.length || 0,
      timeAgo: getTimeAgo(gig.createdAt),
      companyName:
        gig.company?.profile?.companyName ||
        gig.company?.name ||
        "Unknown Company",
      companyBio: gig.company?.profile?.bio || "",
      companyLocation: gig.company?.profile?.location || "",
      companyWebsite: gig.company?.profile?.website || "",
      isExpired: gig.EndDate ? new Date(gig.EndDate) < new Date() : false,
      daysLeft: gig.EndDate
        ? Math.max(
            0,
            Math.ceil(
              (new Date(gig.EndDate) - new Date()) / (1000 * 60 * 60 * 24)
            )
          )
        : null,
      // Use applications with full user data
      applications: transformedApplications,
    };

    return NextResponse.json({
      success: true,
      gig: gigWithExtras,
    });
  } catch (error) {
    console.error("Get gig applications error:", error);

    // Handle invalid ObjectId
    if (error.name === "CastError") {
      return NextResponse.json(
        { error: "Invalid gig ID format" },
        { status: 400 }
      );
    }

    // Handle populate errors gracefully
    if (error.message && error.message.includes("Cannot populate")) {
      console.error("Population error - schema mismatch:", error.message);

      // Try fallback without population
      try {
        const gigFallback = await Gig.findById(params.gigId);
        if (gigFallback) {
          return NextResponse.json({
            success: true,
            gig: {
              ...gigFallback.toObject(),
              applications: gigFallback.applications.map((app) => ({
                ...app.toObject(),
                name: app.name || "Unknown User",
                timeAgo: getTimeAgo(app.appliedAt || app.createdAt),
              })),
            },
            warning: "Some user data could not be loaded due to schema issues",
          });
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch gig applications" },
      { status: 500 }
    );
  }
}

// Helper function to calculate time ago
function getTimeAgo(date) {
  if (!date) return "Unknown";

  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInMonths > 0) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  } else if (diffInWeeks > 0) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

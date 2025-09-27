// api/gigs/[id]/route.js - FIXED: Complete schema consistency
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
import User from "@/models/User";

export async function GET(req, { params }) {
  try {
    // Session is optional for public viewing; presence enhances response
    const session = await getServerSession();

    await connectDB();

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Gig ID is required" },
        { status: 400 }
      );
    }

    // FIXED: Use 'applications.user' consistently
    const gig = await Gig.findById(id)
      .populate(
        "company",
        "name image profile.companyName isVerified profile.bio profile.location profile.website username"
      )
      .populate(
        "applications.user", // Use 'user' field consistently
        "name image profile.skills profile.hourlyRate profile.location username profile.bio"
      );

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Increment view count
    await Gig.findByIdAndUpdate(id, { $inc: { views: 1 } });

    // Get current user info when session exists
    let currentUser = null;
    if (session && session.user) {
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
    }

    // FIXED: Enhanced null checks and safety guards with proper field mapping
    let hasApplied = false;
    let userApplication = null;

    if (currentUser && gig.applications && Array.isArray(gig.applications)) {
      try {
        userApplication = gig.applications.find((app) => {
          // Safety checks to prevent "Cannot read properties of undefined"
          if (!app || !currentUser || !currentUser._id) {
            return false;
          }

          // Check both user and freelancer fields (with proper null checks)
          const appUserId = app.user?._id
            ? app.user._id.toString()
            : app.user
            ? app.user.toString()
            : null;
          const appFreelancerId = app.freelancer?._id
            ? app.freelancer._id.toString()
            : app.freelancer
            ? app.freelancer.toString()
            : null;
          const currentUserId = currentUser._id.toString();

          return (
            appUserId === currentUserId || appFreelancerId === currentUserId
          );
        });
        hasApplied = !!userApplication;
      } catch (findError) {
        console.error("Error checking user application:", findError);
        // Continue without throwing - just assume user hasn't applied
        hasApplied = false;
        userApplication = null;
      }
    }

    // Enhanced application mapping with proper field handling
    const enhancedApplications = gig.applications.map((app) => {
      const appObj = app.toObject();

      // Ensure both user and freelancer fields are properly set
      const userInfo = appObj.user || appObj.freelancer;

      return {
        ...appObj,
        user: userInfo,
        freelancer: userInfo, // Keep both for compatibility
        // Add computed fields
        timeAgo: getTimeAgo(appObj.appliedAt || appObj.createdAt),
        statusDisplay: (
          appObj.status ||
          appObj.applicationStatus ||
          "pending"
        ).toLowerCase(),
      };
    });

    // Add extra fields for frontend
    const gigWithExtras = {
      ...gig.toObject(),
      applications: enhancedApplications, // Use enhanced applications
      applicationsCount: gig.applications?.length || 0,
      timeAgo: getTimeAgo(gig.createdAt),
      companyName:
        gig.company?.profile?.companyName ||
        gig.company?.name ||
        "Unknown Company",
      companyBio: gig.company?.profile?.bio || "",
      companyLocation: gig.company?.profile?.location || "",
      companyWebsite: gig.company?.profile?.website || "",
      companyUsername: gig.company?.username || "",
      isExpired: gig.EndDate ? new Date(gig.EndDate) < new Date() : false,
      daysLeft: gig.EndDate
        ? Math.max(
            0,
            Math.ceil(
              (new Date(gig.EndDate) - new Date()) / (1000 * 60 * 60 * 24)
            )
          )
        : null,
      hasApplied,
      userApplication,
      canApply:
        currentUser?.role === "freelancer" &&
        !hasApplied &&
        gig.status === "active",
      isOwner:
        currentUser &&
        gig.company &&
        gig.company._id &&
        gig.company._id.toString() === currentUser._id.toString(),
    };

    return NextResponse.json({
      success: true,
      gig: gigWithExtras,
    });
  } catch (error) {
    console.error("Get gig by ID error:", error);

    // Handle invalid ObjectId
    if (error.name === "CastError") {
      return NextResponse.json(
        { error: "Invalid gig ID format" },
        { status: 400 }
      );
    }

    // Handle populate errors
    if (error.message && error.message.includes("Cannot populate")) {
      return NextResponse.json(
        { error: "Database schema mismatch. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Failed to fetch gig" }, { status: 500 });
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

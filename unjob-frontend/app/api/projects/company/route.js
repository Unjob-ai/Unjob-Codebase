// api/projects/company/route.js - API to fetch projects for hiring companies
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Project from "@/models/Project";
import User from "@/models/User";
import Gig from "@/models/Gig";
import Conversation from "@/models/Conversation";
import Subscription from "@/models/Subscription"; // ✅ Added subscription import

export const dynamic = "force-dynamic";

export async function GET(req) {
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

    if (!currentUser || currentUser.role !== "hiring") {
      return NextResponse.json(
        { error: "Only hiring companies can access this endpoint" },
        { status: 403 }
      );
    }

    // ✅ NEW: Check subscription before allowing access to projects
    const subscription = await Subscription.findOne({
      userId: currentUser._id,
    }).sort({ createdAt: -1 });

    // Validate subscription exists
    if (!subscription) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_REQUIRED",
          message: "Active subscription required to view projects",
          redirectTo: "/dashboard/settings/hiring?reason=required",
        },
        { status: 402 }
      );
    }

    // Manual subscription validation (avoid method calls)
    const isActiveSubscription = subscription.status === "active";
    const isNotExpired =
      !subscription.endDate || subscription.endDate > new Date();
    const isLifetime = subscription.duration === "lifetime";

    const subscriptionValid =
      isActiveSubscription && (isNotExpired || isLifetime);

    if (!subscriptionValid) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_EXPIRED",
          message: "Your subscription has expired. Renew to view projects.",
          redirectTo: "/dashboard/settings/hiring?reason=expired",
          subscriptionStatus: {
            status: subscription.status,
            endDate: subscription.endDate,
            duration: subscription.duration,
            planType: subscription.planType,
          },
        },
        { status: 402 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const gigId = searchParams.get("gigId");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    // Build query to get projects for company's gigs
    let projectQuery = {
      company: currentUser._id,
    };

    if (status) {
      projectQuery.status = status;
    }

    if (gigId) {
      projectQuery.gig = gigId;
    }

    console.log("Fetching projects for company:", currentUser._id);
    console.log("Project query:", projectQuery);
    console.log("Subscription valid:", {
      planType: subscription.planType,
      status: subscription.status,
      endDate: subscription.endDate,
      duration: subscription.duration,
    });

    // Fetch projects with related data - more defensive approach
    let projects;
    try {
      projects = await Project.find(projectQuery)
        .populate("freelancer", "name image email profile.phone")
        .populate("company", "name image profile.companyName")
        .populate("gig", "title budget timeline category")
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);
    } catch (populateError) {
      console.warn(
        "Population error, trying basic query:",
        populateError.message
      );
      // Fallback to basic query without population if there are schema issues
      projects = await Project.find(projectQuery)
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    console.log("Found projects:", projects.length);

    // Get total count for pagination
    const totalProjects = await Project.countDocuments(projectQuery);

    // Enhanced project data with additional computed fields
    const enhancedProjects = projects.map((project) => {
      const projectObj = project.toObject();

      // Add computed fields
      return {
        ...projectObj,
        // Age of submission
        submissionAge: getRelativeTime(
          project.submittedAt || project.createdAt
        ),
        // File summary
        filesSummary: {
          totalFiles: project.files?.length || 0,
          totalSize:
            project.files?.reduce((sum, file) => sum + (file.size || 0), 0) ||
            0,
          hasImages:
            project.files?.some((file) => file.type?.startsWith("image/")) ||
            false,
          hasDocuments:
            project.files?.some(
              (file) =>
                file.type?.includes("pdf") ||
                file.type?.includes("document") ||
                file.type?.includes("text")
            ) || false,
        },
        // Status info
        canReview: project.status === "submitted",
        needsAttention:
          project.status === "submitted" &&
          Date.now() - new Date(project.submittedAt || project.createdAt) >
            24 * 60 * 60 * 1000, // Older than 24 hours
        // Iteration info (if using iterations system)
        iterationInfo: {
          current: project.iterationNumber || project.version || 1,
          total: project.totalIterations || 1,
          isLastIteration: project.iterationNumber === project.totalIterations,
          remaining:
            (project.totalIterations || 1) -
            (project.iterationNumber || project.version || 1),
        },
        // Safe freelancer info
        freelancer: project.freelancer || {
          name: "Unknown Freelancer",
          image: null,
          email: "unknown@email.com",
        },
        // Safe gig info
        gig: project.gig || {
          title: "Unknown Gig",
          budget: 0,
          timeline: "Not specified",
        },
      };
    });

    // Get summary statistics - with error handling
    let statusSummary = {};
    try {
      const stats = await Project.aggregate([
        { $match: { company: currentUser._id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgFileSize: { $avg: "$metadata.totalUploadSize" },
          },
        },
      ]);

      statusSummary = stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          avgFileSize: Math.round(stat.avgFileSize || 0),
        };
        return acc;
      }, {});
    } catch (aggregateError) {
      console.warn(
        "Aggregate query failed, using basic counts:",
        aggregateError.message
      );
      // Fallback to basic counting
      const allProjects = await Project.find(
        { company: currentUser._id },
        "status"
      );
      statusSummary = allProjects.reduce((acc, project) => {
        const status = project.status || "unknown";
        acc[status] = acc[status] || { count: 0, avgFileSize: 0 };
        acc[status].count++;
        return acc;
      }, {});
    }

    // Get recent activity (projects from last 7 days)
    let recentProjects = 0;
    try {
      recentProjects = await Project.countDocuments({
        company: currentUser._id,
        $or: [
          {
            submittedAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        ],
      });
    } catch (recentError) {
      console.warn("Recent projects query failed:", recentError.message);
    }

    return NextResponse.json({
      success: true,
      projects: enhancedProjects,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProjects / limit),
        totalProjects,
        hasNext: page < Math.ceil(totalProjects / limit),
        hasPrev: page > 1,
        limit,
      },
      summary: {
        total: totalProjects,
        statusBreakdown: statusSummary,
        recentActivity: recentProjects,
        pendingReview: statusSummary.submitted?.count || 0,
        approved: statusSummary.approved?.count || 0,
        rejected: statusSummary.rejected?.count || 0,
      },
      // ✅ NEW: Include subscription info in response
      subscription: {
        planType: subscription.planType,
        status: subscription.status,
        endDate: subscription.endDate,
        duration: subscription.duration,
        isValid: subscriptionValid,
      },
      debug: {
        userId: currentUser._id,
        userRole: currentUser.role,
        companyName: currentUser.profile?.companyName || currentUser.name,
        queryUsed: projectQuery,
        subscriptionChecked: true,
      },
    });
  } catch (error) {
    console.error("Company projects fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch projects",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// Helper function to get relative time
function getRelativeTime(date) {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);

  if (diffInWeeks > 0) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

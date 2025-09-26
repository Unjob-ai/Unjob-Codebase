// /app/api/invitations/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GigInvitation from "@/models/GigInvitation";
import User from "@/models/User";
import Gig from "@/models/Gig"; // ✅ ADD THIS IMPORT - This was missing!

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Get current user
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only freelancers can view invitations list
    if (currentUser.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can view invitations" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all"; // all, pending, accepted, declined
    const sortBy = searchParams.get("sortBy") || "newest";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;

    // Build query
    const query = { freelancer: currentUser._id };

    // Apply status filter
    if (filter !== "all") {
      query.status = filter;
    }

    // Apply search filter
    if (search) {
      query.$or = [
        { gigTitle: { $regex: search, $options: "i" } },
        { gigDescription: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case "oldest":
        sortOptions = { createdAt: 1 };
        break;
      case "budget_high":
        sortOptions = { budget: -1, createdAt: -1 };
        break;
      case "budget_low":
        sortOptions = { budget: 1, createdAt: -1 };
        break;
      case "newest":
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch invitations with pagination
    const invitations = await GigInvitation.find(query)
      .populate("hiringUser", "name email image profile")
      .populate("gig", "title description budget timeline category status")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await GigInvitation.countDocuments(query);

    // Auto-expire old pending invitations (optional)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    await GigInvitation.updateMany(
      {
        freelancer: currentUser._id,
        status: "pending",
        createdAt: { $lt: thirtyDaysAgo },
      },
      { status: "expired" }
    );

    // Get status counts for filter badges
    const statusCounts = await GigInvitation.aggregate([
      { $match: { freelancer: currentUser._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const counts = {
      all: totalCount,
      pending: 0,
      accepted: 0,
      declined: 0,
      expired: 0,
    };

    statusCounts.forEach(({ _id, count }) => {
      if (counts.hasOwnProperty(_id)) {
        counts[_id] = count;
      }
    });

    return NextResponse.json({
      success: true,
      invitations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: totalCount > skip + invitations.length,
      },
      statusCounts: counts,
      filters: {
        filter,
        sortBy,
        search,
      },
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

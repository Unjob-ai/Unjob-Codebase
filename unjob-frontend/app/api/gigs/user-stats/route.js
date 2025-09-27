// api/gigs/user-stats/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
import User from "@/models/User";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get current user
    const userId = session.user.userId || session.user.id || session.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only allow hiring users to check their gig stats
    if (user.role !== "hiring") {
      return NextResponse.json(
        {
          error: "Only hiring users can access gig statistics",
        },
        { status: 403 }
      );
    }

    // Get gig statistics for the user
    const totalGigs = await Gig.countDocuments({ company: user._id });
    const activeGigs = await Gig.countDocuments({
      company: user._id,
      status: "active",
    });
    const completedGigs = await Gig.countDocuments({
      company: user._id,
      status: "completed",
    });
    const closedGigs = await Gig.countDocuments({
      company: user._id,
      status: "closed",
    });

    // Get recent gigs (last 5)
    const recentGigs = await Gig.find({ company: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title status budget createdAt applications")
      .lean();

    // Calculate additional stats
    const gigsWithApplications = await Gig.countDocuments({
      company: user._id,
      "applications.0": { $exists: true },
    });

    const totalApplicationsReceived = await Gig.aggregate([
      { $match: { company: user._id } },
      {
        $project: {
          applicationCount: { $size: { $ifNull: ["$applications", []] } },
        },
      },
      { $group: { _id: null, total: { $sum: "$applicationCount" } } },
    ]);

    const stats = {
      totalGigs,
      activeGigs,
      completedGigs,
      closedGigs,
      gigsWithApplications,
      totalApplicationsReceived: totalApplicationsReceived[0]?.total || 0,
      isFirstTime: totalGigs === 0,
      hasPostedFirstGig: user.hasPostedFirstGig || false,
      recentGigs: recentGigs.map((gig) => ({
        _id: gig._id,
        title: gig.title,
        status: gig.status,
        budget: gig.budget,
        createdAt: gig.createdAt,
        applicationCount: gig.applications?.length || 0,
      })),
    };

    return NextResponse.json({
      success: true,
      stats,
      totalGigs,
      message:
        totalGigs === 0
          ? "No gigs posted yet - first gig is free!"
          : `Found ${totalGigs} gig(s)`,
    });
  } catch (error) {
    console.error("User stats fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user statistics", details: error.message },
      { status: 500 }
    );
  }
}

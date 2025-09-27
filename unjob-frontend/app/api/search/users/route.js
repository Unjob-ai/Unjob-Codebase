import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const role = searchParams.get("role"); // "freelancer" or "hiring"
    const skills = searchParams.get("skills"); // comma-separated
    const location = searchParams.get("location");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    let searchFilter = {};

    // Text search
    if (query) {
      searchFilter.$or = [
        { name: { $regex: query, $options: "i" } },
        { "profile.bio": { $regex: query, $options: "i" } },
        { "profile.companyName": { $regex: query, $options: "i" } }
      ];
    }

    // Role filter
    if (role) {
      searchFilter.role = role;
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(",").map(s => s.trim());
      searchFilter["profile.skills"] = { $in: skillsArray };
    }

    // Location filter
    if (location) {
      searchFilter["profile.location"] = { $regex: location, $options: "i" };
    }

    const users = await User.find(searchFilter)
      .select("name image role profile.bio profile.companyName profile.location profile.skills profile.hourlyRate stats followers following")
      .sort({ "stats.rating": -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Check if current user is following each user
    const currentUser = await User.findById(session.user.id).select("following");
    const usersWithFollowStatus = users.map(user => ({
      ...user.toObject(),
      isFollowing: currentUser.following?.includes(user._id.toString()) || false,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0
    }));

    const totalUsers = await User.countDocuments(searchFilter);

    return NextResponse.json({
      success: true,
      users: usersWithFollowStatus,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: page < Math.ceil(totalUsers / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("User search error:", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}

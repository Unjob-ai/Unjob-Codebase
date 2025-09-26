// api/profile/[userId]/following/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Following API - Session:", session);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { userId } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    console.log("Following API - Fetching following for user:", userId);

    const user = await User.findById(userId).populate({
      path: "following",
      select:
        "name image role profile.bio profile.companyName stats followers following",
      options: {
        skip,
        limit,
        sort: { createdAt: -1 },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get current user's following list to show follow status
    let currentUser = null;
    const currentUserId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (currentUserId) {
      currentUser = await User.findById(currentUserId).select("following");
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email }).select(
        "following"
      );
    }

    const followingWithStatus = user.following.map((followedUser) => ({
      ...followedUser.toObject(),
      isFollowing:
        currentUser?.following?.includes(followedUser._id.toString()) || false,
      followersCount: followedUser.followers?.length || 0,
      followingCount: followedUser.following?.length || 0,
    }));

    const totalFollowing = user.following?.length || 0;

    console.log("Following API - Found following:", followingWithStatus.length);

    return NextResponse.json({
      success: true,
      following: followingWithStatus,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalFollowing / limit),
        totalFollowing,
        hasNext: page < Math.ceil(totalFollowing / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Following fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch following",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

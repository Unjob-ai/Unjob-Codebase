// api/profile/follow/route.js - Fixed version
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Follow API - Session:", session);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();
    const { userId } = await req.json();

    // FIXED: Enhanced user ID resolution with email fallback
    let currentUserId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    // Convert ObjectId to string if needed
    if (currentUserId && typeof currentUserId === "object") {
      currentUserId = currentUserId.toString();
    }

    console.log(
      "Follow API - Current user ID:",
      currentUserId,
      "Target user ID:",
      userId
    );

    if (currentUserId === userId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // FIXED: Try multiple ways to find the current user
    let currentUser = null;

    if (currentUserId) {
      currentUser = await User.findById(currentUserId);
    }

    // Fallback: if not found by ID, try by email
    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
      console.log("Found user by email fallback:", currentUser?._id);
    }

    const targetUser = await User.findById(userId);

    console.log("Follow API - Found users:", {
      currentUser: currentUser
        ? {
            id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
          }
        : null,
      targetUser: targetUser
        ? { id: targetUser._id, name: targetUser.name }
        : null,
    });

    // FIXED: Better error messaging
    if (!currentUser) {
      return NextResponse.json(
        {
          error: "Current user not found in database",
          debug:
            process.env.NODE_ENV === "development"
              ? {
                  sessionUserId: currentUserId,
                  sessionEmail: session.user.email,
                  availableUserFields: Object.keys(session.user),
                }
              : undefined,
        },
        { status: 404 }
      );
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Initialize arrays if they don't exist
    if (!currentUser.following) currentUser.following = [];
    if (!targetUser.followers) targetUser.followers = [];

    // Use the actual current user ID from database
    const actualCurrentUserId = currentUser._id.toString();
    const isFollowing = currentUser.following.some(
      (id) => id.toString() === userId
    );

    console.log("Follow API - Is currently following:", isFollowing);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== userId
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== actualCurrentUserId
      );

      // Update stats
      if (currentUser.stats)
        currentUser.stats.following = Math.max(
          0,
          (currentUser.stats.following || 0) - 1
        );
      if (targetUser.stats)
        targetUser.stats.followers = Math.max(
          0,
          (targetUser.stats.followers || 0) - 1
        );
    } else {
      // Follow
      currentUser.following.push(userId);
      targetUser.followers.push(actualCurrentUserId);

      // Update stats
      if (!currentUser.stats) currentUser.stats = {};
      if (!targetUser.stats) targetUser.stats = {};
      currentUser.stats.following = (currentUser.stats.following || 0) + 1;
      targetUser.stats.followers = (targetUser.stats.followers || 0) + 1;
    }

    // Save with validation handling
    try {
      await currentUser.save();
    } catch (validationError) {
      console.error("Current user validation error:", validationError);
      await currentUser.save({ validateBeforeSave: false });
    }

    try {
      await targetUser.save();
    } catch (validationError) {
      console.error("Target user validation error:", validationError);
      await targetUser.save({ validateBeforeSave: false });
    }

    console.log(
      `✅ Follow API - ${isFollowing ? "Unfollowed" : "Followed"} successfully`
    );

    return NextResponse.json(
      {
        success: true,
        isFollowing: !isFollowing,
        message: !isFollowing
          ? "User followed successfully!"
          : "User unfollowed successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Follow/unfollow error:", error);

    let errorMessage = "Failed to update follow status";
    if (error.name === "ValidationError") {
      errorMessage = "Data validation error - please contact support";
    } else if (error.name === "CastError") {
      errorMessage = "Invalid user ID format";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

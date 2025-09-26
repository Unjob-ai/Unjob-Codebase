// app/api/profile/follow-suggestions/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET - Get follow suggestions for the current user
export async function GET(request) {
  try {
    console.log("🔍 Fetching follow suggestions");

    const session = await getServerSession(authOptions);

    if (!session) {
      console.error("❌ Unauthorized follow suggestions request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const currentUserId = session.user.id;
    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get users that the current user is already following
    const followingIds = currentUser.following || [];

    // Build suggestion criteria based on user type
    let suggestionCriteria = {
      _id: { $ne: currentUserId }, // Exclude current user
      isActive: true, // Only active users
    };

    // Exclude users already being followed
    if (followingIds.length > 0) {
      suggestionCriteria._id.$nin = followingIds;
    }

    // Different suggestions based on user role
    if (currentUser.role === "freelancer") {
      // For freelancers, suggest other freelancers and hiring managers
      suggestionCriteria.$or = [
        { role: "hiring" }, // Hiring managers
        {
          role: "freelancer",
          "profile.skills": {
            $in: currentUser.profile?.skills || [],
          },
        }, // Freelancers with similar skills
      ];
    } else if (currentUser.role === "hiring") {
      // For hiring managers, suggest freelancers and other hiring managers
      suggestionCriteria.$or = [
        { role: "freelancer" }, // All freelancers
        {
          role: "hiring",
          "profile.industry": currentUser.profile?.industry,
        }, // Same industry hiring managers
      ];
    }

    // Find suggested users
    let suggestions = await User.find(suggestionCriteria)
      .select(
        "name username email image role profile stats countryOfOrigin countryName phoneCountryCode createdAt"
      )
      .limit(20)
      .sort({ createdAt: -1 }) // Newer users first
      .lean();

    // If we don't have enough suggestions, get some random users
    if (suggestions.length < 10) {
      const additionalSuggestions = await User.find({
        _id: {
          $ne: currentUserId,
          $nin: [...followingIds, ...suggestions.map((s) => s._id)],
        },
        isActive: true,
      })
        .select(
          "name username email image role profile stats countryOfOrigin countryName phoneCountryCode createdAt"
        )
        .limit(10 - suggestions.length)
        .sort({ "stats.followers": -1 }) // Popular users first
        .lean();

      suggestions = [...suggestions, ...additionalSuggestions];
    }

    // Add country info and calculate suggestion reason
    const suggestionsWithInfo = suggestions.map((user) => {
      let reason = "Suggested for you";

      if (currentUser.role === "freelancer" && user.role === "hiring") {
        reason = "Potential client";
      } else if (currentUser.role === "hiring" && user.role === "freelancer") {
        reason = "Potential freelancer";
      } else if (user.role === currentUser.role) {
        if (user.profile?.industry === currentUser.profile?.industry) {
          reason = "Same industry";
        } else if (
          user.profile?.skills?.some((skill) =>
            currentUser.profile?.skills?.includes(skill)
          )
        ) {
          reason = "Similar skills";
        } else {
          reason = "Similar profile";
        }
      }

      if (user.countryOfOrigin === currentUser.countryOfOrigin) {
        reason = `${reason} • Same country`;
      }

      return {
        ...user,
        country: {
          code: user.countryOfOrigin,
          name: user.countryName,
          dialCode: user.phoneCountryCode,
        },
        suggestionReason: reason,
        mutualConnections: 0, // You can implement this later if needed
      };
    });

    console.log(`✅ Found ${suggestionsWithInfo.length} follow suggestions`);

    return NextResponse.json({
      success: true,
      suggestions: suggestionsWithInfo,
      total: suggestionsWithInfo.length,
    });
  } catch (error) {
    console.error("🔥 Error fetching follow suggestions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

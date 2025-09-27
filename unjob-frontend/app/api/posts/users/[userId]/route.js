// File: app/api/posts/user/[userId]/route.js

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { userId } = params;
    const { searchParams } = new URL(req.url);

    // Query parameters for filtering and pagination
    const postType = searchParams.get("postType"); // "post" or "portfolio"
    const category = searchParams.get("category");
    const subCategory = searchParams.get("subCategory");
    const project = searchParams.get("project"); // for portfolio items
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 12;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const includeStats = searchParams.get("includeStats") === "true";
    const skip = (page - 1) * limit;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build query
    let query = { 
      author: userId,
      status: "published" // Only show published posts on profiles
    };

    if (postType) query.postType = postType;
    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (project) query.project = project;

    // Build sort object
    let sortObj = {};
    if (sortBy === "likes") {
      sortObj = { "stats.likesCount": sortOrder === "asc" ? 1 : -1 };
    } else if (sortBy === "views") {
      sortObj = { "stats.viewsCount": sortOrder === "asc" ? 1 : -1 };
    } else if (sortBy === "comments") {
      sortObj = { "stats.commentsCount": sortOrder === "asc" ? 1 : -1 };
    } else {
      sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;
    }

    // FIXED: Fetch posts with complete data - REMOVED shares.user populate
    const posts = await Post.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate("author", "name image role profile stats")
      .populate({
        path: "comments.user",
        select: "name image role",
      })
      .populate({
        path: "likes.user",
        select: "name image role",
      })
      // REMOVED: .populate({
      //   path: "shares.user",
      //   select: "name image role",
      // })
      .lean();

    // Get total count for pagination
    const totalPosts = await Post.countDocuments(query);

    // Get additional stats if requested
    let userStats = null;
    if (includeStats) {
      const statsAggregation = await Post.aggregate([
        { $match: { author: user._id, status: "published" } },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            totalLikes: { $sum: "$stats.likesCount" },
            totalViews: { $sum: "$stats.viewsCount" },
            totalComments: { $sum: "$stats.commentsCount" },
            totalShares: { $sum: "$stats.sharesCount" },
            portfolioPosts: {
              $sum: { $cond: [{ $eq: ["$postType", "portfolio"] }, 1, 0] },
            },
            regularPosts: {
              $sum: { $cond: [{ $eq: ["$postType", "post"] }, 1, 0] },
            },
          },
        },
      ]);

      userStats = statsAggregation[0] || {
        totalPosts: 0,
        totalLikes: 0,
        totalViews: 0,
        totalComments: 0,
        totalShares: 0,
        portfolioPosts: 0,
        regularPosts: 0,
      };

      // Get category breakdown
      const categoryStats = await Post.aggregate([
        { $match: { author: user._id, status: "published" } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            totalLikes: { $sum: "$stats.likesCount" },
            totalViews: { $sum: "$stats.viewsCount" },
          },
        },
        { $sort: { count: -1 } },
      ]);

      userStats.categoryBreakdown = categoryStats;
    }

    // Get unique projects for portfolio items
    let portfolioProjects = [];
    if (postType === "portfolio" || !postType) {
      portfolioProjects = await Post.distinct("project", {
        author: userId,
        postType: "portfolio",
        project: { $exists: true, $ne: null },
      });
    }

    const response = {
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        image: user.image,
        role: user.role,
        profile: user.profile,
        stats: user.stats,
      },
      posts,
      pagination: {
        total: totalPosts,
        page,
        limit,
        totalPages: Math.ceil(totalPosts / limit),
        hasNextPage: page < Math.ceil(totalPosts / limit),
        hasPrevPage: page > 1,
      },
      filters: {
        postType,
        category,
        subCategory,
        project,
        sortBy,
        sortOrder,
      },
    };

    if (includeStats) {
      response.userStats = userStats;
    }

    if (portfolioProjects.length > 0) {
      response.portfolioProjects = portfolioProjects;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("User posts fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user posts",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

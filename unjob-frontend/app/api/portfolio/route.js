// /api/portfolio/route.js - Portfolio management API
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";
import mongoose from "mongoose";

// GET - Fetch user's portfolio
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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || session.user.id;
    const category = searchParams.get("category");
    const project = searchParams.get("project"); // Filter by project title
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;

    // Base query for finding posts
    let query = {
      author: userId,
      postType: "portfolio",
      status: "published",
    };

    if (category) {
      query.category = category;
    }

    // If a project title is provided, add it to the query
    if (project) {
      query.project = project;
    }

    const portfolioItems = await Post.find(query)
      .populate("author", "name image role profile")
      .sort({ "portfolioData.featured": -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalItems = await Post.countDocuments(query);

    // Group by category for better organization
    const categorizedPortfolio = {};

    // Base query for fetching categories, respecting the project filter
    const categoryQuery = {
      author: userId,
      postType: "portfolio",
      status: "published",
    };
    if (project) {
      categoryQuery.project = project;
    }
    const allCategories = await Post.distinct("category", categoryQuery);

    for (const cat of allCategories) {
      // Find query inside the loop, also respecting the project filter
      const itemsInCategoryQuery = {
        author: userId,
        postType: "portfolio",
        category: cat,
        status: "published",
      };
      if (project) {
        itemsInCategoryQuery.project = project;
      }
      const categoryItems = await Post.find(itemsInCategoryQuery)
        .limit(4) // Show recent 4 items per category
        .sort({ createdAt: -1 });

      categorizedPortfolio[cat] = categoryItems;
    }

    // Base match condition for the aggregation pipeline
    const statsMatchQuery = {
      author: new mongoose.Types.ObjectId(userId),
      postType: "portfolio",
      status: "published",
    };
    if (project) {
      statsMatchQuery.project = project;
    }

    // Get portfolio statistics
    const stats = await Post.aggregate([
      {
        $match: statsMatchQuery,
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          featured: {
            $sum: { $cond: ["$portfolioData.featured", 1, 0] },
          },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: { $size: "$likes" } },
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      portfolio: {
        items: portfolioItems,
        categorized: categorizedPortfolio,
        categories: allCategories,
      },
      stats: {
        totalProjects: totalItems,
        categoriesCount: allCategories.length,
        categoryBreakdown: stats,
        totalViews: stats.reduce((sum, stat) => sum + stat.totalViews, 0),
        totalLikes: stats.reduce((sum, stat) => sum + stat.totalLikes, 0),
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        hasNext: page < Math.ceil(totalItems / limit),
        hasPrev: page > 1,
        limit,
      },
    });
  } catch (error) {
    console.error("Portfolio fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}

// POST - Add new portfolio item
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const {
      title,
      description,
      shortDescription,
      category,
      subCategory,
      projectUrl,
      githubUrl,
      liveUrl,
      technologies = [],
      duration,
      clientName,
      completedDate,
      featured = false,
      images = [],
      videos = [],
      tags = [],
    } = await req.json();

    // Validate required fields
    if (!title || !description || !category) {
      return NextResponse.json(
        { error: "Title, description, and category are required" },
        { status: 400 }
      );
    }

    // Create portfolio item
    const portfolioItem = new Post({
      title: title.trim(),
      description: description.trim(),
      category,
      subCategory: subCategory || "",
      postType: "portfolio",
      author: user._id,
      images,
      videos,
      tags,

      portfolioData: {
        isPortfolioItem: true,
        shortDescription: shortDescription || description.substring(0, 200),
        projectUrl: projectUrl || "",
        githubUrl: githubUrl || "",
        liveUrl: liveUrl || "",
        technologies: Array.isArray(technologies) ? technologies : [],
        duration: duration || "",
        clientName: clientName || "",
        completedDate: completedDate ? new Date(completedDate) : new Date(),
        featured: featured,
      },

      visibility: "public",
      status: "published",
    });

    await portfolioItem.save();

    // Check if user profile portfolio needs updating
    if (!user.profile.portfolio) {
      user.profile.portfolio = [];
    }

    // Add to user's profile portfolio array
    user.profile.portfolio.push({
      title: portfolioItem.title,
      description: portfolioItem.portfolioData.shortDescription,
      url: portfolioItem.portfolioData.projectUrl,
      image: portfolioItem.images[0] || "",
    });

    await user.save();

    // Populate the created item
    await portfolioItem.populate("author", "name image role profile");

    return NextResponse.json(
      {
        success: true,
        message: "Portfolio item added successfully!",
        portfolioItem: portfolioItem,
        autoAddedToProfile: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Portfolio creation error:", error);
    return NextResponse.json(
      { error: "Failed to create portfolio item" },
      { status: 500 }
    );
  }
}

// PUT - Update portfolio item
export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");

    if (!itemId) {
      return NextResponse.json(
        { error: "Portfolio item ID is required" },
        { status: 400 }
      );
    }

    const updates = await req.json();

    // Find and update portfolio item
    const portfolioItem = await Post.findOne({
      _id: itemId,
      author: session.user.id,
      postType: "portfolio",
    });

    if (!portfolioItem) {
      return NextResponse.json(
        { error: "Portfolio item not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update basic fields
    if (updates.title) portfolioItem.title = updates.title.trim();
    if (updates.description)
      portfolioItem.description = updates.description.trim();
    if (updates.category) portfolioItem.category = updates.category;
    if (updates.subCategory) portfolioItem.subCategory = updates.subCategory;
    if (updates.images) portfolioItem.images = updates.images;
    if (updates.videos) portfolioItem.videos = updates.videos;
    if (updates.tags) portfolioItem.tags = updates.tags;

    // Update portfolio-specific data
    if (updates.portfolioData) {
      portfolioItem.portfolioData = {
        ...portfolioItem.portfolioData.toObject(),
        ...updates.portfolioData,
      };
    }

    await portfolioItem.save();
    await portfolioItem.populate("author", "name image role profile");

    return NextResponse.json({
      success: true,
      message: "Portfolio item updated successfully!",
      portfolioItem: portfolioItem,
    });
  } catch (error) {
    console.error("Portfolio update error:", error);
    return NextResponse.json(
      { error: "Failed to update portfolio item" },
      { status: 500 }
    );
  }
}

// DELETE - Remove portfolio item
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");

    if (!itemId) {
      return NextResponse.json(
        { error: "Portfolio item ID is required" },
        { status: 400 }
      );
    }

    const portfolioItem = await Post.findOne({
      _id: itemId,
      author: session.user.id,
      postType: "portfolio",
    });

    if (!portfolioItem) {
      return NextResponse.json(
        { error: "Portfolio item not found or unauthorized" },
        { status: 404 }
      );
    }

    await Post.findByIdAndDelete(itemId);

    return NextResponse.json({
      success: true,
      message: "Portfolio item deleted successfully!",
    });
  } catch (error) {
    console.error("Portfolio deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete portfolio item" },
      { status: 500 }
    );
  }
}

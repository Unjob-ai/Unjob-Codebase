// /api/posts/convert-multiple-to-portfolio/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";

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

    const { projectTitle, postIds } = await req.json();

    if (!projectTitle || !projectTitle.trim()) {
      return NextResponse.json(
        { error: "Project title is required" },
        { status: 400 }
      );
    }

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { error: "At least one post must be selected" },
        { status: 400 }
      );
    }

    // Find all selected posts
    const posts = await Post.find({
      _id: { $in: postIds },
      author: user._id,
    });

    if (posts.length !== postIds.length) {
      return NextResponse.json(
        { error: "Some posts not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if any posts are already portfolio items
    const alreadyPortfolio = posts.filter(
      (post) => post.postType === "portfolio"
    );
    if (alreadyPortfolio.length > 0) {
      return NextResponse.json(
        {
          error: `${alreadyPortfolio.length} post(s) are already portfolio items`,
          alreadyPortfolioIds: alreadyPortfolio.map((p) => p._id),
        },
        { status: 400 }
      );
    }

    const convertedPosts = [];

    // Convert all posts to portfolio items
    for (let post of posts) {
      post.postType = "portfolio";
      post.project = projectTitle.trim();

      // Initialize portfolioData if it doesn't exist
      if (!post.portfolioData) {
        post.portfolioData = {};
      }

      // Safely set shortDescription
      post.portfolioData.shortDescription =
        post.description?.substring(0, 200) || "";
      post.portfolioData.addedToPortfolioAt = new Date();

      await post.save();
      convertedPosts.push(post);
    }

    // Initialize user profile portfolio if it doesn't exist
    if (!user.profile) {
      user.profile = {};
    }
    if (!user.profile.portfolio) {
      user.profile.portfolio = [];
    }

    const existingProjectIndex = user.profile.portfolio.findIndex(
      (item) => item.title === projectTitle.trim()
    );

    if (existingProjectIndex >= 0) {
      // Project exists, increment count
      user.profile.portfolio[existingProjectIndex].postsCount =
        (user.profile.portfolio[existingProjectIndex].postsCount || 0) +
        posts.length;

      // Update with latest image
      const latestPostWithImage = posts.find(
        (post) => post.images && post.images.length > 0
      );
      if (latestPostWithImage) {
        user.profile.portfolio[existingProjectIndex].image =
          latestPostWithImage.images[0];
      }
    } else {
      // New project - find first post with image and create safe description
      const firstPostWithImage = posts.find(
        (post) => post.images && post.images.length > 0
      );
      const firstPost = posts[0];

      // Safely get description - use the actual description or fallback
      const description =
        firstPost.portfolioData?.shortDescription ||
        firstPost.description?.substring(0, 200) ||
        "Portfolio project";

      user.profile.portfolio.push({
        title: projectTitle.trim(),
        description: description,
        image: firstPostWithImage?.images[0] || "",
        postsCount: posts.length,
        createdAt: new Date(),
      });
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: `${posts.length} post(s) converted to portfolio project successfully!`,
      portfolioItems: convertedPosts,
      projectTitle: projectTitle.trim(),
      convertedCount: posts.length,
    });
  } catch (error) {
    console.error("Multiple posts portfolio conversion error:", error);
    return NextResponse.json(
      { error: "Failed to convert posts to portfolio items" },
      { status: 500 }
    );
  }
}

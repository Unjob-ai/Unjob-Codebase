// Debug version of your comment API with enhanced logging and error handling

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import NotificationService from "@/lib/notificationService";

export async function POST(req, { params }) {
  console.log("🚀 Comment API called");
  console.log("📋 Params:", params);
  console.log("🔗 URL:", req.url);

  const session = await getServerSession(authOptions);
  console.log("👤 Session:", session ? "Found" : "Not found");
  console.log("👤 Session user:", session?.user);

  if (!session?.user) {
    console.log("❌ No session or user found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    // Debug: Check if we can parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("📝 Request body:", requestBody);
    } catch (parseError) {
      console.log("❌ Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { content: comment } = requestBody;
    console.log("💬 Comment received:", `"${comment}"`);
    console.log("💬 Comment type:", typeof comment);
    console.log("💬 Comment length:", comment?.length);

    // Enhanced validation with detailed logging
    if (!comment) {
      console.log("❌ No comment provided");
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    if (typeof comment !== "string") {
      console.log("❌ Comment is not a string, type:", typeof comment);
      return NextResponse.json(
        { error: "Comment must be a string" },
        { status: 400 }
      );
    }

    if (comment.trim().length === 0) {
      console.log("❌ Comment is empty after trimming");
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      );
    }

    if (comment.length > 1000) {
      console.log("❌ Comment too long:", comment.length);
      return NextResponse.json(
        { error: "Comment is too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    console.log("✅ Comment validation passed");

    // Debug post lookup
    console.log("🔍 Looking for post with ID:", params.id);
    const post = await Post.findById(params.id).populate(
      "author",
      "name image email"
    );

    if (!post) {
      console.log("❌ Post not found with ID:", params.id);
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    console.log("✅ Post found:", post._id);

    // Enhanced user lookup with debugging
    let currentUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    console.log("🔍 Looking for user with ID:", userId);
    console.log("🔍 Session user email:", session.user.email);

    if (userId) {
      currentUser = await User.findById(userId);
      console.log("👤 User found by ID:", currentUser ? "Yes" : "No");
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
      console.log("👤 User found by email:", currentUser ? "Yes" : "No");
    }

    if (!currentUser) {
      console.log("❌ User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ Current user:", currentUser._id);

    // Create comment object
    const newComment = {
      user: currentUser._id,
      content: comment.trim(),
      createdAt: new Date(),
    };

    console.log("💬 Creating comment:", newComment);

    // Add comment to post
    if (!post.comments) {
      post.comments = [];
      console.log("📝 Initialized empty comments array");
    }

    post.comments.push(newComment);
    console.log(
      "📝 Comment added to post, total comments:",
      post.comments.length
    );

    await post.save();
    console.log("✅ Post saved successfully");

    // Create notification (with error handling)
    try {
      await NotificationService.notifyPostComment(
        post.author._id,
        currentUser,
        post._id,
        post.content || post.title || "their post",
        comment.trim()
      );
      console.log("🔔 Notification created successfully");
    } catch (notificationError) {
      console.error(
        "❌ Failed to create comment notification:",
        notificationError
      );
      // Don't fail the comment action if notification fails
    }

    // Re-populate the post with updated data
    const updatedPost = await Post.findById(post._id)
      .populate("author", "name image role profile")
      .populate("comments.user", "name image")
      .populate("likes.user", "name image")
      .lean();

    console.log("✅ Comment creation completed successfully");

    return NextResponse.json(
      {
        success: true,
        message: "Comment added successfully!",
        post: updatedPost,
        comment: {
          ...newComment,
          user: {
            _id: currentUser._id,
            name: currentUser.name,
            image: currentUser.image,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Comment creation error:", error);
    console.error("❌ Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

// DELETE method remains the same but with added logging
export async function DELETE(req, { params }) {
  console.log("🗑️ DELETE Comment API called");
  console.log("📋 Params:", params);

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    console.log("❌ No session for DELETE");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("commentId");
    console.log("🆔 Comment ID to delete:", commentId);

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID is required" },
        { status: 400 }
      );
    }

    // Find the post
    const post = await Post.findById(params.id);
    if (!post) {
      console.log("❌ Post not found for deletion:", params.id);
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Find the current user
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

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the comment
    const commentIndex = post.comments.findIndex(
      (comment) => comment._id.toString() === commentId
    );

    if (commentIndex === -1) {
      console.log("❌ Comment not found:", commentId);
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const comment = post.comments[commentIndex];

    // Check permissions
    const isCommentOwner =
      comment.user.toString() === currentUser._id.toString();
    const isPostOwner = post.author.toString() === currentUser._id.toString();

    console.log("🔐 Comment owner:", isCommentOwner);
    console.log("🔐 Post owner:", isPostOwner);

    if (!isCommentOwner && !isPostOwner) {
      return NextResponse.json(
        {
          error:
            "You can only delete your own comments or comments on your posts",
        },
        { status: 403 }
      );
    }

    // Remove the comment
    post.comments.splice(commentIndex, 1);
    await post.save();
    console.log("✅ Comment deleted successfully");

    // Re-populate the post with updated data
    const updatedPost = await Post.findById(post._id)
      .populate("author", "name image role profile")
      .populate("comments.user", "name image")
      .populate("likes.user", "name image")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Comment deleted successfully!",
        post: updatedPost,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Comment deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}

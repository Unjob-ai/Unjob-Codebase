import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import NotificationService from "@/lib/notificationService";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    // First populate to check existing likes
    const post = await Post.findById(params.id)
      .populate("likes.user")
      .populate("author", "name image email");

    if (!post) {
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

    const currentUserId = currentUser._id.toString();
    const alreadyLiked = post.likes.some(
      (l) => l.user?._id?.toString() === currentUserId
    );

    if (alreadyLiked) {
      // Unlike the post
      post.likes = post.likes.filter(
        (l) => l.user?._id?.toString() !== currentUserId
      );
    } else {
      // Like the post
      post.likes.push({ user: currentUserId });

      // 🔥 CREATE NOTIFICATION FOR POST LIKE (with debug logging)
      try {
        console.log("🔍 Debug: About to send like notification");
        console.log("📊 Environment check:", {
          hasBrevoKey: !!process.env.BREVO_API_KEY,
          fromEmail: process.env.FROM_EMAIL,
          nextAuthUrl: process.env.NEXTAUTH_URL,
        });
        console.log("👤 Notification data:", {
          postOwnerId: post.author._id.toString(),
          postOwnerEmail: post.author.email,
          likerName: currentUser.name,
          likerEmail: currentUser.email,
          postTitle: post.content || post.title || "their post",
        });

        // Get the post owner for email
        const postOwner = await User.findById(post.author._id);
        console.log("👤 Post owner found:", !!postOwner, postOwner?.email);

        const notificationResult = await NotificationService.notifyPostLike(
          post.author._id,
          currentUser,
          post._id,
          post.content || post.title || "their post",
          postOwner // Pass the post owner for email
        );

        console.log("📧 Notification result:", notificationResult);
      } catch (notificationError) {
        console.error(
          "❌ Failed to create like notification:",
          notificationError
        );
        console.error("📧 Full error details:", {
          message: notificationError.message,
          stack: notificationError.stack,
        });
        // Don't fail the like action if notification fails
      }
    }

    await post.save();

    // Re-populate all necessary fields after saving
    const updatedPost = await Post.findById(post._id)
      .populate("author", "name image role profile")
      .populate("comments.user", "name image")
      .populate("likes.user", "name image")
      .lean();

    return NextResponse.json(
      {
        liked: !alreadyLiked,
        post: updatedPost,
        message: !alreadyLiked ? "Post liked!" : "Post unliked!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Like/unlike error:", error);
    return NextResponse.json(
      { error: "Failed to update like status" },
      { status: 500 }
    );
  }
}

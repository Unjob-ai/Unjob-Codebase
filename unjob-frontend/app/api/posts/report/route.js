import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { postId, reason, description } = await req.json();

    if (!postId || !reason) {
      return NextResponse.json(
        { error: "Post ID and reason are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find the post and add the report
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Add report to the post
    post.reported.push({
      user: req.user?.id || 'anonymous', // In a real app, get from auth
      reason,
      description: description || '',
      status: 'pending'
    });

    await post.save();

    return NextResponse.json({
      success: true,
      message: "Post reported successfully"
    });

  } catch (error) {
    console.error("Report post error:", error);
    return NextResponse.json(
      {
        error: "Failed to report post",
        details: error.message,
      },
      { status: 500 }
    );
  }
}




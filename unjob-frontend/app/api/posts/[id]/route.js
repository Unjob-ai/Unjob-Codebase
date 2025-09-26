import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const post = await Post.findById(params.id)
      .populate("author", "name image role profile")
      .populate("likes.user", "name image")
      .populate("comments.user", "name image");

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ post }, { status: 200 });
  } catch (err) {
    console.error("Fetch single post error:", err);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

// PATCH (Edit)
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();
    const post = await Post.findById(params.id);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Only the author can edit
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = await req.json();
    // You can add specific field validation here
    if (data.title) post.title = data.title;
    if (data.description) post.description = data.description;
    if (data.category) post.category = data.category;
    if (data.subCategory) post.subCategory = data.subCategory;
    // ...add more editable fields as needed

    await post.save();
    return NextResponse.json({ success: true, post }, { status: 200 });
  } catch (err) {
    console.error("Edit post error:", err);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// DELETE
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();
    const post = await Post.findById(params.id);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Only the author can delete
    if (post.author.toString() !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await post.deleteOne();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Delete post error:", err);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}

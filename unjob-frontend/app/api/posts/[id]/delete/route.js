import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectDB from "@/lib/mongodb"
import Post from "@/models/Post"
import User from "@/models/User"
import { authOptions } from "@/lib/auth"

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await connectDB()
  const post = await Post.findById(params.id)
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 })

  if (post.author.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await Post.findByIdAndDelete(params.id)
  await User.findByIdAndUpdate(session.user.id, { $inc: { "stats.postsCount": -1 } })
  return NextResponse.json({ success: true }, { status: 200 })
}

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectDB from "@/lib/mongodb"
import Post from "@/models/Post"
import { authOptions } from "@/lib/auth"

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { description } = await req.json()
  if (!description?.trim()) {
    return NextResponse.json({ error: "Description cannot be empty" }, { status: 400 })
  }

  await connectDB()
  const post = await Post.findById(params.id)
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 })

  if (post.author.toString() !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  post.description = description
  await post.save()
  return NextResponse.json({ success: true, post }, { status: 200 })
}

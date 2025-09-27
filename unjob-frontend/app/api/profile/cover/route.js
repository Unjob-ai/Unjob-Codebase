import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import cloudinary from "@/lib/cloudinary"
import { Readable } from "stream"
import sharp from "sharp"

function bufferToStream(buffer) {
  const readable = new Readable()
  readable.push(buffer)
  readable.push(null)
  return readable
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "unjob/covers",
        transformation: [
          { width: 1200, height: 400, crop: "fit" }, // prevent zoom/cropping
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error)
        return resolve(result.secure_url)
      },
    )
    bufferToStream(buffer).pipe(stream)
  })
}

// POST /api/profile/cover
export async function POST(req) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const formData = await req.formData()
    const coverImage = formData.get("coverImage")

    if (!coverImage) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Check file size (max 10MB)
    if (coverImage.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 })
    }

    // Check file type
    if (!coverImage.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type. Please upload an image." }, { status: 400 })
    }

    const buffer = Buffer.from(await coverImage.arrayBuffer())

    // --- Check dimensions with sharp ---
    const metadata = await sharp(buffer).metadata()
    const aspectRatio = metadata.width / metadata.height

    // enforce ~4:1 ratio (allow small tolerance)
    if (Math.abs(aspectRatio - 4) > 0.05) {
      return NextResponse.json(
        { error: "Invalid aspect ratio. Please upload a 4:1 banner image." },
        { status: 400 }
      )
    }

    const coverImageUrl = await uploadToCloudinary(buffer)

    // Get userId or email
    const userId = session.user.userId || session.user.id || session.user._id || session.user.sub
    let user = null

    if (userId) {
      user = await User.findByIdAndUpdate(
        userId,
        { coverImage: coverImageUrl },
        { new: true, select: "-password" }
      )
    }

    if (!user && session.user.email) {
      user = await User.findOneAndUpdate(
        { email: session.user.email },
        { coverImage: coverImageUrl },
        { new: true, select: "-password" }
      )
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ coverImage: user.coverImage }, { status: 200 })
  } catch (error) {
    console.error("Cover upload error:", error)
    return NextResponse.json({ error: "Failed to upload cover image" }, { status: 500 })
  }
}

// GET /api/profile/cover - Return current user's profile data
export async function GET(req) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const userId = session.user.userId || session.user.id || session.user._id || session.user.sub
    let user = null

    if (userId) {
      user = await User.findById(userId).select("-password")
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email }).select("-password")
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error("Fetch user error:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

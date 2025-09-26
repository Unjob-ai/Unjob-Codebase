import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export const dynamic = 'force-dynamic';

// GET /api/profile/by-email/[email]
export async function GET(req, { params }) {
  try {
    console.log("Profile by email API called with params:", params)

    await connectDB()

    const { email } = params

    if (!email) {
      console.error("No email provided")
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const decodedEmail = decodeURIComponent(email)
    console.log("Looking for user with email:", decodedEmail)

    const user = await User.findOne({ email: decodedEmail }).select(
      "-password -resetPasswordToken -resetPasswordExpiry -verificationToken",
    )

    if (!user) {
      console.error("User not found with email:", decodedEmail)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("User found:", user.name)

    // Ensure profile object exists
    if (!user.profile) {
      user.profile = {}
    }

    // Ensure stats object exists
    if (!user.stats) {
      user.stats = {
        totalEarnings: 0,
        completedProjects: 0,
        rating: 0,
        totalReviews: 0,
        followers: 0,
        following: 0,
        postsCount: 0,
      }
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error("Profile fetch by email error:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch profile",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

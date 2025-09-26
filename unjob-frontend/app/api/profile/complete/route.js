import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

// PUT /api/profile/complete
export async function PUT(req) {
  try {
    await connectDB()

    const { userId, profile } = await req.json()

    const user = await User.findById(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update profile data
    const updatedProfile = {
      ...user.profile,
      ...profile,
      completedAt: new Date(),
      isCompleted: true,
    }

    user.profile = updatedProfile

    // Manual profile completion check (since method might not be available)
    const hasBasicInfo = updatedProfile.bio && updatedProfile.bio.trim().length >= 20
    const hasSkills = updatedProfile.skills && updatedProfile.skills.length >= 3

    let isActuallyComplete = hasBasicInfo && hasSkills

    if (user.role === "freelancer") {
      const hasFreelancerInfo = updatedProfile.hourlyRate && updatedProfile.hourlyRate >= 5
      isActuallyComplete = isActuallyComplete && hasFreelancerInfo
    } else if (user.role === "hiring") {
      const hasCompanyInfo = updatedProfile.companyName && updatedProfile.companyName.trim().length > 0
      isActuallyComplete = isActuallyComplete && hasCompanyInfo
    }

    if (!isActuallyComplete) {
      return NextResponse.json(
        {
          error: "Profile is still incomplete",
          code: "PROFILE_INCOMPLETE",
          message: "Please fill in all required fields to complete your profile",
        },
        { status: 400 },
      )
    }

    await user.save()

    // Remove sensitive fields
    const userResponse = user.toObject()
    delete userResponse.password
    delete userResponse.resetPasswordToken
    delete userResponse.resetPasswordExpiry
    delete userResponse.verificationToken

    return NextResponse.json(
      {
        user: userResponse,
        message: "Profile completed successfully! You can now create posts and apply for gigs.",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Profile completion error:", error)
    return NextResponse.json(
      {
        error: "Failed to complete profile",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    )
  }
}

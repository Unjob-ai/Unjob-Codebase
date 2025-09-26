import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export async function checkProfileCompletion(req) {
  try {
    const session = await getServerSession()

    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      )
    }

    await connectDB()

    const user = await User.findById(session.user.id)

    if (!user) {
      return NextResponse.json(
        {
          error: "User not found",
          code: "USER_NOT_FOUND",
        },
        { status: 404 },
      )
    }

    // Check if profile is completed
    const isProfileComplete = user.isProfileComplete()

    if (!isProfileComplete || !user.profile?.isCompleted) {
      return NextResponse.json(
        {
          error: "Profile completion required",
          code: "PROFILE_INCOMPLETE",
          message: "Please complete your profile to access this feature",
          redirectTo: "/dashboard/profile/complete",
          completionStatus: {
            hasBasicInfo: !!(user.profile?.bio && user.profile.bio.trim().length > 0),
            hasSkills: !!(user.profile?.skills && user.profile.skills.length > 0),
            hasRoleSpecificInfo:
              user.role === "freelancer"
                ? !!(user.profile?.hourlyRate && user.profile.hourlyRate > 0)
                : !!(user.profile?.companyName && user.profile.companyName.trim().length > 0),
          },
        },
        { status: 403 },
      )
    }

    return { user, session }
  } catch (error) {
    console.error("Profile completion check error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    )
  }
}

// api/admin/gigs/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ✅ Import authOptions
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions); // ✅ Pass authOptions
    //console.log("Admin gigs - Session:", session); // ✅ Debug log

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // ✅ Better user resolution logic (same as other working APIs)
    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    //console.log("Admin gigs - User ID from session:", userId); // ✅ Debug log

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    // console.log(
    //   "Admin gigs - Found user:",
    //   user ? { id: user._id, role: user.role } : null
    // ); 

    if (!user) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          error: "Admin access required",
          userRole: user.role,
          userId: user._id,
        },
        { status: 403 }
      );
    }

    const gigs = await Gig.find({})
      .populate("company", "name email profile.companyName")
      .populate("applications.freelancer", "name email")
      .sort({ createdAt: -1 });

    //console.log("Admin gigs - Found gigs:", gigs.length); // ✅ Debug log

    return NextResponse.json({
      success: true,
      gigs,
      debug: {
        userId: user._id,
        userRole: user.role,
        gigsFound: gigs.length,
      },
    });
  } catch (error) {
    console.error("Admin gigs fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch gigs",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

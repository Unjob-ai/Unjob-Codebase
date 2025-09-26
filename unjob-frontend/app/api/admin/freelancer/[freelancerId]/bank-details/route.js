

// api/admin/freelancer/[freelancerId]/bank-details/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Check if user is admin
    const adminUser = await User.findById(session.user.id);
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { freelancerId } = params;

    const freelancer = await User.findById(freelancerId);
    if (!freelancer || freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Freelancer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      bankDetails: freelancer.profile?.bankDetails || null,
    });
  } catch (error) {
    console.error("Admin freelancer bank details fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch freelancer bank details" },
      { status: 500 }
    );
  }
}

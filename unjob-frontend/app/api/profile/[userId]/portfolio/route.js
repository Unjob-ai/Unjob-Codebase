import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import mongoose from "mongoose";

/**
 * GET /api/profile/[userId]/portfolio
 * Fetches the portfolio summary for a specific user.
 * The portfolio data is stored directly on the user's profile.
 */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const { userId } = params;

    // --- Validation ---
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate if the provided userId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid User ID format" },
        { status: 400 }
      );
    }

    // --- Database Query ---
    // Find the user and select only the profile.portfolio field for an efficient query.
    const user = await User.findById(userId).select("profile.portfolio").lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return the portfolio array, or an empty array if it doesn't exist.
    const portfolio = user.profile?.portfolio || [];

    return NextResponse.json({ portfolio }, { status: 200 });
  } catch (error) {
    console.error("Portfolio summary fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user portfolio summary",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

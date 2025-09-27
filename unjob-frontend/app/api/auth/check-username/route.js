// auth/check-username/route.js - API endpoint to check username availability
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Validate username format
    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        {
          available: false,
          error: "Username must be between 3 and 30 characters",
        },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        {
          available: false,
          error: "Username can only contain letters, numbers, and underscores",
        },
        { status: 400 }
      );
    }

    if (/^\d+$/.test(username)) {
      return NextResponse.json(
        {
          available: false,
          error: "Username must contain at least one letter",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if username exists (case-insensitive)
    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    }).select("_id");

    const available = !existingUser;

    return NextResponse.json(
      {
        available,
        username: username.toLowerCase(),
        message: available
          ? "Username is available"
          : "Username is already taken",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Username check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

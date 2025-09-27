import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { available: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ 
      email: email.toLowerCase() 
    });

    return NextResponse.json({
      available: !existingUser,
      message: existingUser ? "Email is already registered" : "Email is available"
    });

  } catch (error) {
    console.error("Email availability check error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
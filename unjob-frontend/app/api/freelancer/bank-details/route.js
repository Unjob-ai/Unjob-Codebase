// api/freelancer/bank-details/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "@/lib/auth"; // Make sure to import your auth options

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("Bank details GET - Session:", session);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Use email as primary identifier since it's more reliable
    let user = await User.findOne({ email: session.user.email });

    if (!user) {
      console.error("User not found with email:", session.user.email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Bank details GET - Found user:", user._id, "Role:", user.role);

    if (user.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can access bank details" },
        { status: 403 }
      );
    }

    const bankDetails = user.profile?.bankDetails || {};
    console.log("Bank details GET - Retrieved bank details:", bankDetails);

    return NextResponse.json({
      success: true,
      bankDetails: bankDetails,
    });
  } catch (error) {
    console.error("Bank details fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank details" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Bank details POST - Session user:", session?.user);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Use email as primary identifier
    let user = await User.findOne({ email: session.user.email });

    if (!user) {
      console.error("User not found with email:", session.user.email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log(
      "Bank details POST - Found user:",
      user._id,
      "Role:",
      user.role
    );

    if (user.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can update bank details" },
        { status: 403 }
      );
    }

    const bankDetailsData = await req.json();
    console.log("Bank details POST - Received data:", bankDetailsData);

    const { accountNumber, ifscCode, accountHolderName, bankName, upiId } =
      bankDetailsData;

    // Validate required fields
    if (!accountHolderName?.trim()) {
      return NextResponse.json(
        { error: "Account holder name is required" },
        { status: 400 }
      );
    }

    if (!accountNumber?.trim() && !upiId?.trim()) {
      return NextResponse.json(
        { error: "Either account number or UPI ID is required" },
        { status: 400 }
      );
    }

    if (accountNumber?.trim() && !ifscCode?.trim()) {
      return NextResponse.json(
        { error: "IFSC code is required when using account number" },
        { status: 400 }
      );
    }

    // Initialize profile if it doesn't exist
    if (!user.profile) {
      user.profile = {};
      console.log("Bank details POST - Initialized empty profile");
    }

    // Create the bank details object
    const newBankDetails = {
      accountNumber: accountNumber?.trim() || "",
      ifscCode: ifscCode?.trim() || "",
      accountHolderName: accountHolderName?.trim() || "",
      bankName: bankName?.trim() || "",
      upiId: upiId?.trim() || "",
      updatedAt: new Date(),
    };

    console.log(
      "Bank details POST - New bank details to save:",
      newBankDetails
    );

    // Update bank details using findByIdAndUpdate for better reliability
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          "profile.bankDetails": newBankDetails,
        },
      },
      {
        new: true,
        runValidators: true,
        upsert: false,
      }
    );

    if (!updatedUser) {
      console.error("Failed to update user");
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    console.log("Bank details POST - User updated successfully");
    console.log(
      "Bank details POST - Saved bank details:",
      updatedUser.profile?.bankDetails
    );

    return NextResponse.json({
      success: true,
      message: "Bank details updated successfully",
      bankDetails: updatedUser.profile.bankDetails,
    });
  } catch (error) {
    console.error("Bank details update error:", error);
    return NextResponse.json(
      { error: "Failed to update bank details" },
      { status: 500 }
    );
  }
}

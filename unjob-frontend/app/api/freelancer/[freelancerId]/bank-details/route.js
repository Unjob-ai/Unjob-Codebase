// api/freelancer/[freelancerId]/bank-details/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { freelancerId } = params;

    // 🔧 FIX: Better user resolution logic (same as other working APIs)
    let requestingUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      requestingUser = await User.findById(userId);
    }

    if (!requestingUser && session.user.email) {
      requestingUser = await User.findOne({ email: session.user.email });
    }

    console.log("Bank details request - User:", {
      sessionId: session.user.id,
      sessionEmail: session.user.email,
      foundUser: requestingUser
        ? { id: requestingUser._id, role: requestingUser.role }
        : null,
      requestedFreelancerId: freelancerId,
    });

    if (!requestingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Allow access if it's the freelancer themselves or a hiring manager
    if (
      requestingUser._id.toString() !== freelancerId &&
      requestingUser.role !== "hiring"
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const freelancer = await User.findById(freelancerId);
    if (!freelancer || freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Freelancer not found" },
        { status: 404 }
      );
    }

    console.log("Freelancer found:", {
      freelancerId: freelancer._id,
      freelancerName: freelancer.name,
      hasBankDetails: !!freelancer.profile?.bankDetails,
    });

    // Return bank details (only if they exist)
    const bankDetails = freelancer.profile?.bankDetails || {};

    // For security, don't return full account number to hiring managers
    if (requestingUser.role === "hiring" && bankDetails.accountNumber) {
      bankDetails.accountNumber = `****${bankDetails.accountNumber.slice(-4)}`;
    }

    console.log("Returning bank details:", {
      hasAccountNumber: !!bankDetails.accountNumber,
      hasUpiId: !!bankDetails.upiId,
      hasAccountHolderName: !!bankDetails.accountHolderName,
    });

    return NextResponse.json({
      success: true,
      bankDetails,
    });
  } catch (error) {
    console.error("Bank details fetch error:", error);

    // Handle specific MongoDB errors
    if (error.name === "CastError") {
      return NextResponse.json(
        { error: "Invalid freelancer ID format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch bank details" },
      { status: 500 }
    );
  }
}

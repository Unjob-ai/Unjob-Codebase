// api/payments/gig/[gigId]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Gig from "@/models/Gig";

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

    const { gigId } = params;

    // Verify user has access to this gig's payments
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is the gig owner (for hiring users) or admin
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    if (gig.company.toString() !== session.user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch all payments for this gig
    const payments = await Payment.find({ gig: gigId })
      .populate("payer", "name image profile.companyName")
      .populate("payee", "name image")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Gig payments fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

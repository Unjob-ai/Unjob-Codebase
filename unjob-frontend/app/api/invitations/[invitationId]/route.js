// /app/api/invitations/[invitationId]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import GigInvitation from "@/models/GigInvitation";
import User from "@/models/User";
import Gig from "@/models/Gig"; // ✅ Important: Import Gig model for population

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { invitationId } = params;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Get current user
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the invitation and populate related data
    const invitation = await GigInvitation.findById(invitationId)
      .populate("freelancer", "name email image profile")
      .populate("hiringUser", "name email image profile")
      .populate(
        "gig",
        "title description budget timeline category status skillsRequired deliverables location workType"
      );

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if current user has permission to view this invitation
    const isFreelancer =
      invitation.freelancer._id.toString() === currentUser._id.toString();
    const isHiringUser =
      invitation.hiringUser._id.toString() === currentUser._id.toString();

    if (!isFreelancer && !isHiringUser) {
      return NextResponse.json(
        { error: "You don't have permission to view this invitation" },
        { status: 403 }
      );
    }

    // Auto-expire old pending invitations
    const now = new Date();
    if (
      invitation.status === "pending" &&
      invitation.expiresAt &&
      now > invitation.expiresAt
    ) {
      invitation.status = "expired";
      await invitation.save();
    }

    // Mark as viewed if freelancer is viewing
    if (isFreelancer && !invitation.metadata.viewedAt) {
      await invitation.markAsViewed();
    }

    return NextResponse.json({
      success: true,
      invitation,
      userRole: isFreelancer ? "freelancer" : "hiring",
    });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}

// PATCH endpoint to respond to invitations
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { invitationId } = params;
    const body = await req.json();
    const { status, freelancerResponse } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    if (!["accepted", "declined"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'accepted' or 'declined'" },
        { status: 400 }
      );
    }

    // Get current user
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    const currentUser = await User.findById(userId);

    if (!currentUser || currentUser.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can respond to invitations" },
        { status: 403 }
      );
    }

    // Find the invitation
    const invitation = await GigInvitation.findById(invitationId)
      .populate("freelancer", "name email")
      .populate("hiringUser", "name email profile");

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if current user is the freelancer for this invitation
    if (invitation.freelancer._id.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        { error: "You don't have permission to respond to this invitation" },
        { status: 403 }
      );
    }

    // Check if invitation can still be responded to
    if (!invitation.canBeAccepted()) {
      return NextResponse.json(
        { error: "This invitation has expired or already been responded to" },
        { status: 400 }
      );
    }

    // Update invitation status
    invitation.status = status;
    invitation.respondedAt = new Date();
    if (freelancerResponse) {
      invitation.freelancerResponse = freelancerResponse;
    }

    await invitation.save();

    // TODO: Send notification to hiring user
    // TODO: If accepted, you might want to create a project or next steps

    return NextResponse.json({
      success: true,
      message: `Invitation ${status} successfully`,
      invitation: {
        _id: invitation._id,
        status: invitation.status,
        respondedAt: invitation.respondedAt,
        freelancerResponse: invitation.freelancerResponse,
      },
    });
  } catch (error) {
    console.error("Error responding to invitation:", error);
    return NextResponse.json(
      { error: "Failed to respond to invitation" },
      { status: 500 }
    );
  }
}

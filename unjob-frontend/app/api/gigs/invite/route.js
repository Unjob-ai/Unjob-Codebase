// /api/gigs/invite/route.js - Handle gig invitations with comprehensive error handling
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
import User from "@/models/User";
import GigInvitation from "@/models/GigInvitation";
import NotificationService from "@/lib/notificationService";

// Error response helper with detailed messages
const createErrorResponse = (error, statusCode = 500, details = null) => {
  const errorMessages = {
    // Authentication errors
    UNAUTHORIZED: {
      error: "Authentication Required",
      message: "You must be logged in to perform this action",
      suggestion: "Please sign in to your account and try again",
    },
    USER_NOT_FOUND: {
      error: "Account Not Found",
      message: "Your account could not be found in our system",
      suggestion: "Please refresh the page or contact support if this persists",
    },
    PERMISSION_DENIED: {
      error: "Access Denied",
      message: "You don't have permission to send gig invitations",
      suggestion: "Only hiring users can invite freelancers to gigs",
    },

    // Freelancer validation errors
    FREELANCER_NOT_FOUND: {
      error: "Freelancer Not Found",
      message: "The freelancer you're trying to invite doesn't exist",
      suggestion:
        "Please refresh the page and try selecting a different freelancer",
    },
    INVALID_FREELANCER: {
      error: "Invalid User Type",
      message: "You can only send invitations to freelancer accounts",
      suggestion: "Make sure you're selecting a freelancer profile",
    },

    // Gig validation errors
    GIG_NOT_FOUND: {
      error: "Gig Not Found",
      message: "The gig you selected no longer exists",
      suggestion: "Please select a different gig from your active listings",
    },
    GIG_NOT_YOURS: {
      error: "Unauthorized Gig Access",
      message: "You can only send invitations for your own gigs",
      suggestion: "Please select one of your own active gigs",
    },
    GIG_INACTIVE: {
      error: "Gig No Longer Active",
      message: "This gig is no longer accepting applications",
      suggestion: "Please select an active gig or create a custom invitation",
    },

    // Invitation validation errors
    ALREADY_INVITED: {
      error: "Already Invited",
      message: "You've already sent an invitation to this freelancer",
      suggestion: "Check your sent invitations or wait for their response",
    },
    MISSING_REQUIRED_FIELDS: {
      error: "Missing Required Information",
      message: "Please fill in all required fields",
      suggestion: "Title, description, and budget are required for custom gigs",
    },
    INVALID_BUDGET: {
      error: "Invalid Budget",
      message: "Please enter a valid budget amount",
      suggestion: "Budget must be a positive number",
    },

    // Database/server errors
    DATABASE_ERROR: {
      error: "Database Connection Error",
      message: "Unable to connect to the database",
      suggestion: "Please try again in a few moments",
    },
    SERVER_ERROR: {
      error: "Server Error",
      message: "Something went wrong on our end",
      suggestion: "Please try again or contact support if this persists",
    },
  };

  const errorInfo = errorMessages[error] || errorMessages.SERVER_ERROR;

  return NextResponse.json(
    {
      success: false,
      ...errorInfo,
      code: error,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
      ...(process.env.NODE_ENV === "development" &&
        details && { debugInfo: details }),
    },
    { status: statusCode }
  );
};

// GET - Fetch all active gigs for hiring user to choose from
export async function GET(req) {
  try {
    console.log("🎯 GET /api/gigs/invite - Fetching user gigs");

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return createErrorResponse("UNAUTHORIZED", 401);
    }

    await connectDB();

    // Find current user with enhanced error handling
    let currentUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    try {
      if (userId) {
        currentUser = await User.findById(userId);
      }

      if (!currentUser && session.user.email) {
        currentUser = await User.findOne({ email: session.user.email });
      }

      if (!currentUser) {
        return createErrorResponse("USER_NOT_FOUND", 404);
      }
    } catch (dbError) {
      console.error("Database error finding user:", dbError);
      return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
    }

    // Check user permissions
    if (currentUser.role !== "hiring") {
      return createErrorResponse("PERMISSION_DENIED", 403);
    }

    // Fetch active gigs with error handling
    try {
      const userGigs = await Gig.find({
        company: currentUser._id,
        status: "active",
      })
        .select(
          "title category subCategory budget timeline description createdAt status"
        )
        .sort({ createdAt: -1 })
        .lean();

      console.log(
        `✅ Found ${userGigs.length} active gigs for user ${currentUser._id}`
      );

      return NextResponse.json({
        success: true,
        gigs: userGigs,
        count: userGigs.length,
        message:
          userGigs.length > 0
            ? `Found ${userGigs.length} active gig${
                userGigs.length === 1 ? "" : "s"
              }`
            : "No active gigs found. Create a custom invitation instead.",
      });
    } catch (dbError) {
      console.error("Database error fetching gigs:", dbError);
      return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
    }
  } catch (error) {
    console.error("❌ Unexpected error in GET /api/gigs/invite:", error);
    return createErrorResponse("SERVER_ERROR", 500, error.message);
  }
}

// POST - Send gig invitation to freelancer
export async function POST(req) {
  try {
    console.log("🎯 POST /api/gigs/invite - Creating gig invitation");

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return createErrorResponse("UNAUTHORIZED", 401);
    }

    await connectDB();

    // Parse request data with validation
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        "MISSING_REQUIRED_FIELDS",
        400,
        "Invalid JSON format"
      );
    }

    const { freelancerId, gigId, personalMessage, customGigData, postData } =
      requestData;

    console.log("🎯 Gig invitation request:", {
      freelancerId,
      gigId,
      hasPersonalMessage: !!personalMessage,
      hasCustomGigData: !!customGigData,
      hasPostData: !!postData,
    });

    // Validate required fields
    if (!freelancerId) {
      return createErrorResponse(
        "MISSING_REQUIRED_FIELDS",
        400,
        "Freelancer ID is required"
      );
    }

    if (!gigId && !customGigData) {
      return createErrorResponse(
        "MISSING_REQUIRED_FIELDS",
        400,
        "Either select an existing gig or provide custom gig details"
      );
    }

    // Find hiring user with enhanced error handling
    let hiringUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    try {
      if (userId) {
        hiringUser = await User.findById(userId);
      }

      if (!hiringUser && session.user.email) {
        hiringUser = await User.findOne({ email: session.user.email });
      }

      if (!hiringUser) {
        return createErrorResponse("USER_NOT_FOUND", 404);
      }
    } catch (dbError) {
      console.error("Database error finding hiring user:", dbError);
      return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
    }

    // Validate hiring user permissions
    if (hiringUser.role !== "hiring") {
      return createErrorResponse("PERMISSION_DENIED", 403);
    }

    // Validate freelancer exists and is valid
    let freelancer;
    try {
      freelancer = await User.findById(freelancerId);

      if (!freelancer) {
        return createErrorResponse("FREELANCER_NOT_FOUND", 404);
      }

      if (freelancer.role !== "freelancer") {
        return createErrorResponse("INVALID_FREELANCER", 400);
      }
    } catch (dbError) {
      console.error("Database error finding freelancer:", dbError);
      return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
    }

    let gig = null;
    let invitationType = "existing_gig";

    // Handle existing gig invitation
    if (gigId) {
      try {
        gig = await Gig.findById(gigId);

        if (!gig) {
          return createErrorResponse("GIG_NOT_FOUND", 404);
        }

        // Check if gig is still active
        if (gig.status !== "active") {
          return createErrorResponse("GIG_INACTIVE", 400);
        }

        // Verify gig belongs to hiring user
        if (gig.company.toString() !== hiringUser._id.toString()) {
          return createErrorResponse("GIG_NOT_YOURS", 403);
        }
      } catch (dbError) {
        console.error("Database error finding gig:", dbError);
        return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
      }
    }

    // Handle custom gig invitation
    if (customGigData) {
      invitationType = "custom_gig";

      // Validate custom gig data with detailed feedback
      const validationErrors = [];

      if (!customGigData.title?.trim()) {
        validationErrors.push("Gig title is required");
      }

      if (!customGigData.description?.trim()) {
        validationErrors.push("Gig description is required");
      }

      if (!customGigData.budget || customGigData.budget <= 0) {
        validationErrors.push("Valid budget amount is required");
      }

      if (customGigData.title?.length > 100) {
        validationErrors.push("Gig title must be less than 100 characters");
      }

      if (customGigData.description?.length > 2000) {
        validationErrors.push(
          "Gig description must be less than 2000 characters"
        );
      }

      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Validation Failed",
            message: "Please fix the following issues:",
            validationErrors,
            suggestion: "Review your custom gig details and try again",
          },
          { status: 400 }
        );
      }
    }

    // Check for existing invitations with detailed status checking
    try {
      const existingInvitation = await GigInvitation.findOne({
        freelancer: freelancerId,
        hiringUser: hiringUser._id,
        ...(gigId ? { gig: gigId } : {}),
        status: { $in: ["pending", "accepted"] },
      }).populate("gig", "title");

      if (existingInvitation) {
        const gigTitle =
          existingInvitation.gig?.title ||
          existingInvitation.gigTitle ||
          "this gig";
        const statusMessage =
          existingInvitation.status === "pending"
            ? "is still waiting for their response"
            : "has already accepted your invitation";

        return NextResponse.json(
          {
            success: false,
            error: "Already Invited",
            message: `You've already invited ${freelancer.name} to "${gigTitle}"`,
            suggestion: `The freelancer ${statusMessage}. Check your invitations dashboard for updates.`,
            existingInvitation: {
              id: existingInvitation._id,
              status: existingInvitation.status,
              sentAt: existingInvitation.sentAt,
              gigTitle,
            },
          },
          { status: 400 }
        );
      }
    } catch (dbError) {
      console.error("Database error checking existing invitations:", dbError);
      return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
    }

    // Create the invitation with comprehensive data
    try {
      const invitationData = {
        freelancer: freelancerId,
        hiringUser: hiringUser._id,
        invitationType,
        personalMessage: personalMessage?.trim() || "",
        status: "pending",
        createdAt: new Date(),
      };

      if (gigId) {
        invitationData.gig = gigId;
        invitationData.gigTitle = gig.title;
        invitationData.gigDescription = gig.description;
        invitationData.budget = gig.budget;
        invitationData.timeline = gig.timeline;
        invitationData.category = gig.category;
      } else {
        // Custom gig data
        invitationData.gigTitle = customGigData.title.trim();
        invitationData.gigDescription = customGigData.description.trim();
        invitationData.budget = parseFloat(customGigData.budget);
        invitationData.timeline = customGigData.timeline?.trim();
        invitationData.category = customGigData.category?.trim();
        invitationData.customGigData = customGigData;
      }

      const invitation = await GigInvitation.create(invitationData);

      // Determine the correct action URL based on gig type
      const actionUrl = gigId
        ? `/dashboard/gigs/${gigId}`
        : `/dashboard/invitations/${invitation._id}`;

      // Create notification for freelancer
      try {
        await NotificationService.createNotification({
          userId: freelancerId,
          type: "gig_invitation",
          title: "🎯 New Gig Invitation!",
          message: `${
            hiringUser.name || hiringUser.email?.split("@")[0]
          } invited you to "${invitationData.gigTitle}"`,
          relatedId: invitation._id,
          relatedModel: "GigInvitation",
          actionUrl: actionUrl,
          senderUser: hiringUser,
          priority: "high",
          metadata: {
            gigTitle: invitationData.gigTitle,
            budget: invitationData.budget,
            companyName: hiringUser.profile?.companyName || hiringUser.name,
            invitationType,
            gigId: gigId || null,
          },
        });
      } catch (notificationError) {
        console.error("Failed to create notification:", notificationError);
        // Don't fail the whole request if notification fails
      }

      // Create notification for post owner (if invitation came from a post)
      if (postData?.postOwnerId) {
        try {
          await NotificationService.notifyPostOwnerOfInvitation(
            postData.postOwnerId,
            hiringUser,
            freelancer,
            postData.postId,
            postData.postTitle,
            invitationData.gigTitle
          );
        } catch (notificationError) {
          console.error(
            "Failed to create post owner notification:",
            notificationError
          );
          // Don't fail the whole request if notification fails
        }
      }

      // Populate the created invitation for response
      const populatedInvitation = await GigInvitation.findById(invitation._id)
        .populate("freelancer", "name email image profile")
        .populate("hiringUser", "name email image profile")
        .populate("gig", "title description budget timeline category");

      console.log("✅ Gig invitation created successfully:", {
        invitationId: invitation._id,
        freelancerName: freelancer.name,
        gigTitle: invitationData.gigTitle,
        invitationType,
        budget: invitationData.budget,
        postOwnerNotified: !!postData?.postOwnerId,
        actionUrl: actionUrl,
      });

      return NextResponse.json(
        {
          success: true,
          message: `Invitation sent successfully to ${freelancer.name}!`,
          invitation: populatedInvitation,
          details: {
            freelancerName: freelancer.name,
            gigTitle: invitationData.gigTitle,
            budget: invitationData.budget,
            invitationType,
            sentAt: invitation.createdAt,
            actionUrl: actionUrl,
          },
        },
        { status: 201 }
      );
    } catch (dbError) {
      console.error("Database error creating invitation:", dbError);
      return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
    }
  } catch (error) {
    console.error("❌ Unexpected error creating gig invitation:", error);
    return createErrorResponse("SERVER_ERROR", 500, error.message);
  }
}

// PUT - Update invitation status (accept/decline) with enhanced error handling
export async function PUT(req) {
  try {
    console.log("🎯 PUT /api/gigs/invite - Updating invitation status");

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return createErrorResponse("UNAUTHORIZED", 401);
    }

    await connectDB();

    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        "MISSING_REQUIRED_FIELDS",
        400,
        "Invalid JSON format"
      );
    }

    const { invitationId, status, response } = requestData;

    // Validate required fields
    if (!invitationId || !status) {
      return createErrorResponse(
        "MISSING_REQUIRED_FIELDS",
        400,
        "Invitation ID and status are required"
      );
    }

    if (!["accepted", "declined"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Status",
          message: "Status must be either 'accepted' or 'declined'",
          validOptions: ["accepted", "declined"],
        },
        { status: 400 }
      );
    }

    // Find current user
    let currentUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    try {
      if (userId) {
        currentUser = await User.findById(userId);
      }

      if (!currentUser && session.user.email) {
        currentUser = await User.findOne({ email: session.user.email });
      }

      if (!currentUser) {
        return createErrorResponse("USER_NOT_FOUND", 404);
      }
    } catch (dbError) {
      console.error("Database error finding user:", dbError);
      return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
    }

    // Find and validate the invitation
    let invitation;
    try {
      invitation = await GigInvitation.findById(invitationId)
        .populate("freelancer", "name email")
        .populate("hiringUser", "name email profile.companyName")
        .populate("gig", "_id title");

      if (!invitation) {
        return NextResponse.json(
          {
            success: false,
            error: "Invitation Not Found",
            message: "This invitation no longer exists",
            suggestion: "The invitation may have been withdrawn or expired",
          },
          { status: 404 }
        );
      }
    } catch (dbError) {
      console.error("Database error finding invitation:", dbError);
      return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
    }

    // Validate permissions
    if (invitation.freelancer._id.toString() !== currentUser._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized Access",
          message: "You can only respond to invitations sent to you",
          suggestion:
            "Make sure you're signed in to the correct freelancer account",
        },
        { status: 403 }
      );
    }

    // Check invitation status
    if (invitation.status !== "pending") {
      const statusMessage = {
        accepted: "You've already accepted this invitation",
        declined: "You've already declined this invitation",
        expired: "This invitation has expired",
        withdrawn: "This invitation has been withdrawn by the company",
      };

      return NextResponse.json(
        {
          success: false,
          error: "Invitation Already Processed",
          message:
            statusMessage[invitation.status] ||
            "This invitation has already been responded to",
          currentStatus: invitation.status,
          respondedAt: invitation.respondedAt,
          suggestion:
            invitation.status === "accepted"
              ? "Check your active projects for next steps"
              : "Browse other available opportunities",
        },
        { status: 400 }
      );
    }

    // Update invitation status
    try {
      invitation.status = status;
      invitation.freelancerResponse = response?.trim() || "";
      invitation.respondedAt = new Date();

      await invitation.save();

      // Determine the correct action URL for hiring user notification
      const hiringUserActionUrl = invitation.gig
        ? `/dashboard/gigs/${invitation.gig._id}`
        : `/dashboard/invitations/${invitation._id}`;

      // Create notification for hiring user
      try {
        const notificationTitle =
          status === "accepted"
            ? "🎉 Invitation Accepted!"
            : "😔 Invitation Declined";
        const notificationMessage =
          status === "accepted"
            ? `${currentUser.name} accepted your invitation for "${invitation.gigTitle}"`
            : `${currentUser.name} declined your invitation for "${invitation.gigTitle}"`;

        await NotificationService.createNotification({
          userId: invitation.hiringUser._id,
          type: `gig_invitation_${status}`,
          title: notificationTitle,
          message: notificationMessage,
          relatedId: invitation._id,
          relatedModel: "GigInvitation",
          actionUrl: hiringUserActionUrl,
          senderUser: currentUser,
          priority: "medium",
          metadata: {
            gigTitle: invitation.gigTitle,
            freelancerName: currentUser.name,
            freelancerResponse: response,
            gigId: invitation.gig?._id || null,
          },
        });
      } catch (notificationError) {
        console.error("Failed to create notification:", notificationError);
        // Don't fail the whole request if notification fails
      }

      console.log("✅ Invitation status updated successfully:", {
        invitationId,
        status,
        freelancerName: currentUser.name,
        gigTitle: invitation.gigTitle,
        hasResponse: !!response,
        hiringUserActionUrl: hiringUserActionUrl,
      });

      const successMessage =
        status === "accepted"
          ? `Great! You've accepted the invitation for "${invitation.gigTitle}". The company will be notified.`
          : `You've declined the invitation for "${invitation.gigTitle}". Thank you for your response.`;

      return NextResponse.json({
        success: true,
        message: successMessage,
        invitation: {
          ...invitation.toObject(),
          status,
          respondedAt: invitation.respondedAt,
        },
        nextSteps:
          status === "accepted"
            ? "The hiring company will contact you with project details and next steps."
            : "You can continue browsing other opportunities on the platform.",
      });
    } catch (dbError) {
      console.error("Database error updating invitation:", dbError);
      return createErrorResponse("DATABASE_ERROR", 500, dbError.message);
    }
  } catch (error) {
    console.error("❌ Unexpected error updating invitation:", error);
    return createErrorResponse("SERVER_ERROR", 500, error.message);
  }
}

// Handle unsupported methods
export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: "Method Not Allowed",
      message: "DELETE method is not supported for this endpoint",
      supportedMethods: ["GET", "POST", "PUT"],
    },
    { status: 405 }
  );
}

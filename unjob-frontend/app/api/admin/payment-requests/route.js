// api/freelancer/payment-request/route.js - Debug version with better error handling
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Gig from "@/models/Gig";
import PaymentRequest from "@/models/PaymentRequest";
import Notification from "@/models/Notification";
import { exportToExcel } from "@/lib/excelExport";
import { authOptions } from "@/lib/auth";

export async function POST(req) {
  try {
    console.log("=== Payment Request API - START ===");

    const session = await getServerSession(authOptions);
    console.log("Session check:", session ? "Valid" : "Invalid");

    if (!session || !session.user) {
      console.log("Authentication failed");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();
    console.log("Database connected");

    // Find freelancer
    let freelancer = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    console.log("Looking for user with ID:", userId);

    if (userId) {
      freelancer = await User.findById(userId);
    }

    if (!freelancer && session.user.email) {
      console.log("Trying to find user by email:", session.user.email);
      freelancer = await User.findOne({ email: session.user.email });
    }

    console.log(
      "Found freelancer:",
      freelancer ? { id: freelancer._id, role: freelancer.role } : "Not found"
    );

    if (!freelancer || freelancer.role !== "freelancer") {
      console.log("Role check failed. User role:", freelancer?.role);
      return NextResponse.json(
        { error: "Only freelancers can submit payment requests" },
        { status: 403 }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body parsed successfully");
      console.log("Request body keys:", Object.keys(requestBody));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const {
      gigId,
      applicationId,
      bankDetails,
      workDetails,
      additionalNotes,
      urgencyLevel = "normal",
      freelancerPhone,
    } = requestBody;

    console.log("Extracted data:", {
      gigId: gigId ? "Present" : "Missing",
      applicationId: applicationId ? "Present" : "Missing",
      bankDetails: bankDetails ? "Present" : "Missing",
      workDetails: workDetails ? "Present" : "Missing",
      freelancerPhone: freelancerPhone ? "Present" : "Missing",
    });

    // Validate required fields
    const missingFields = [];
    if (!gigId) missingFields.push("gigId");
    if (!applicationId) missingFields.push("applicationId");
    if (!bankDetails) missingFields.push("bankDetails");
    if (!workDetails) missingFields.push("workDetails");
    if (!freelancerPhone) missingFields.push("freelancerPhone");

    if (missingFields.length > 0) {
      console.log("Missing required fields:", missingFields);
      return NextResponse.json(
        {
          error: "Missing required fields",
          missingFields,
          received: Object.keys(requestBody),
        },
        { status: 400 }
      );
    }

    // Validate bank details
    if (!bankDetails.accountHolderName || !bankDetails.panNumber) {
      console.log("Missing bank details:", {
        accountHolderName: bankDetails.accountHolderName
          ? "Present"
          : "Missing",
        panNumber: bankDetails.panNumber ? "Present" : "Missing",
      });
      return NextResponse.json(
        { error: "Account holder name and PAN number are required" },
        { status: 400 }
      );
    }

    if (!bankDetails.accountNumber && !bankDetails.upiId) {
      console.log("Both account number and UPI ID are missing");
      return NextResponse.json(
        { error: "Either account number or UPI ID is required" },
        { status: 400 }
      );
    }

    if (bankDetails.accountNumber && !bankDetails.ifscCode) {
      console.log("Account number provided but IFSC code missing");
      return NextResponse.json(
        { error: "IFSC code is required when providing account number" },
        { status: 400 }
      );
    }

    // Validate PAN format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(bankDetails.panNumber.toUpperCase())) {
      console.log("Invalid PAN format:", bankDetails.panNumber);
      return NextResponse.json(
        { error: "Invalid PAN number format. Expected format: ABCDE1234F" },
        { status: 400 }
      );
    }

    // Validate work details
    if (
      !workDetails.projectDescription ||
      !workDetails.completedDate ||
      !workDetails.workDuration
    ) {
      console.log("Missing work details:", {
        projectDescription: workDetails.projectDescription
          ? "Present"
          : "Missing",
        completedDate: workDetails.completedDate ? "Present" : "Missing",
        workDuration: workDetails.workDuration ? "Present" : "Missing",
      });
      return NextResponse.json(
        {
          error:
            "Work details are incomplete. Project description, completion date, and work duration are required.",
        },
        { status: 400 }
      );
    }

    console.log("All validations passed, looking for gig...");

    // Find gig and validate
    const gig = await Gig.findById(gigId).populate(
      "company",
      "name email profile.companyName"
    );
    if (!gig) {
      console.log("Gig not found with ID:", gigId);
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    console.log("Gig found:", gig.title);

    // Find the application and validate it's accepted
    const application = gig.applications.find(
      (app) =>
        app._id.toString() === applicationId &&
        app.freelancer.toString() === freelancer._id.toString() &&
        app.applicationStatus === "accepted"
    );

    if (!application) {
      console.log("Application validation failed:", {
        applicationId,
        freelancerId: freelancer._id.toString(),
        applicationsCount: gig.applications.length,
        acceptedApplications: gig.applications.filter(
          (app) => app.applicationStatus === "accepted"
        ).length,
      });
      return NextResponse.json(
        { error: "No accepted application found for this gig" },
        { status: 404 }
      );
    }

    console.log("Application found and validated");

    // Check if payment request already exists
    const existingRequest = await PaymentRequest.findOne({
      gig: gigId,
      applicationId: applicationId,
      freelancer: freelancer._id,
    });

    if (existingRequest) {
      console.log("Payment request already exists:", existingRequest.requestId);
      return NextResponse.json(
        {
          error: "Payment request already submitted",
          requestId: existingRequest.requestId,
          status: existingRequest.status,
        },
        { status: 400 }
      );
    }

    // Calculate amounts
    const platformCommissionRate = 0.1;
    const gigBudget = application.proposedRate || gig.budget;
    const platformCommission = gigBudget * platformCommissionRate;
    const freelancerReceivableAmount = gigBudget - platformCommission;

    console.log("Amount calculations:", {
      gigBudget,
      platformCommission,
      freelancerReceivableAmount,
    });

    // Create payment request
    console.log("Creating payment request...");

    const paymentRequest = new PaymentRequest({
      gig: gig._id,
      gigTitle: gig.title,
      gigBudget: gigBudget,
      freelancerReceivableAmount: freelancerReceivableAmount,
      platformCommission: platformCommission,
      applicationId: applicationId,
      applicationDate: application.appliedAt,
      approvedDate: application.acceptedAt,

      freelancer: freelancer._id,
      freelancerName: freelancer.name,
      freelancerEmail: freelancer.email,
      freelancerPhone: freelancerPhone,
      freelancerLocation: freelancer.profile?.location,

      company: gig.company._id,
      companyName: gig.company.profile?.companyName || gig.company.name,
      companyEmail: gig.company.email,

      bankDetails: {
        accountHolderName: bankDetails.accountHolderName.trim(),
        accountNumber: bankDetails.accountNumber?.trim(),
        ifscCode: bankDetails.ifscCode?.trim().toUpperCase(),
        bankName: bankDetails.bankName?.trim(),
        branchName: bankDetails.branchName?.trim(),
        upiId: bankDetails.upiId?.trim().toLowerCase(),
        panNumber: bankDetails.panNumber.trim().toUpperCase(),
      },

      workDetails: {
        projectDescription: workDetails.projectDescription.trim(),
        deliverables: Array.isArray(workDetails.deliverables)
          ? workDetails.deliverables
          : (workDetails.deliverables || "")
              .split("\n")
              .filter((d) => d.trim()),
        completedDate: new Date(workDetails.completedDate),
        workDuration: workDetails.workDuration.trim(),
        clientSatisfactionRating: workDetails.clientSatisfactionRating || 5,
      },

      additionalNotes: additionalNotes?.trim(),
      urgencyLevel: urgencyLevel,
      status: "pending",
    });

    await paymentRequest.save();
    console.log("Payment request saved:", paymentRequest.requestId);

    // Export to Excel
    try {
      await exportToExcel(paymentRequest);
      console.log("Excel export successful");
    } catch (excelError) {
      console.error("Excel export failed:", excelError);
      // Continue anyway
    }

    // Create notifications
    try {
      await Promise.all([
        Notification.create({
          user: gig.company._id,
          type: "payment_request_submitted",
          title: "New Payment Request",
          message: `${freelancer.name} submitted a payment request for "${gig.title}" - Amount: ₹${freelancerReceivableAmount}`,
          relatedId: paymentRequest._id,
          actionUrl: `/admin/payment-requests/${paymentRequest._id}`,
        }),
        Notification.create({
          user: freelancer._id,
          type: "payment_request_confirmation",
          title: "Payment Request Submitted",
          message: `Your payment request (${paymentRequest.requestId}) has been submitted and exported to Excel for processing`,
          relatedId: paymentRequest._id,
          actionUrl: `/freelancer/earnings`,
        }),
      ]);
      console.log("Notifications created");
    } catch (notificationError) {
      console.error("Notification creation failed:", notificationError);
    }

    console.log("=== Payment Request API - SUCCESS ===");

    return NextResponse.json(
      {
        success: true,
        message:
          "Payment request submitted successfully and exported to Excel!",
        paymentRequest: {
          requestId: paymentRequest.requestId,
          status: paymentRequest.status,
          amount: paymentRequest.freelancerReceivableAmount,
          submittedAt: paymentRequest.submittedAt,
          gigTitle: paymentRequest.gigTitle,
          expectedProcessingTime: "7 business days",
          exportedToExcel: true,
        },
        nextSteps: {
          message:
            "Your request has been exported to Excel and will be processed within 7 business days.",
          processingTime: "7 business days",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("=== Payment Request API - ERROR ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (e) => e.message
      );
      console.log("Validation errors:", validationErrors);
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    if (error.name === "CastError") {
      console.log("Cast error (probably invalid ObjectId):", error.message);
      return NextResponse.json(
        { error: "Invalid ID format provided" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to submit payment request",
        details: error.message,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}

// GET method remains the same
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    let freelancer = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      freelancer = await User.findById(userId);
    }

    if (!freelancer && session.user.email) {
      freelancer = await User.findOne({ email: session.user.email });
    }

    if (!freelancer || freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can view payment requests" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status");
    const skip = (page - 1) * limit;

    let query = { freelancer: freelancer._id };
    if (status) {
      query.status = status;
    }

    const paymentRequests = await PaymentRequest.find(query)
      .populate("gig", "title category")
      .populate("company", "name profile.companyName")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalRequests = await PaymentRequest.countDocuments(query);

    return NextResponse.json({
      success: true,
      paymentRequests: paymentRequests.map((req) => ({
        _id: req._id,
        requestId: req.requestId,
        gigTitle: req.gigTitle,
        companyName: req.companyName,
        amount: req.freelancerReceivableAmount,
        status: req.status,
        submittedAt: req.submittedAt,
        urgencyLevel: req.urgencyLevel,
        workDuration: req.workDetails.workDuration,
        exportedToExcel: req.exportedToExcel,
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
        hasNext: page < Math.ceil(totalRequests / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Payment requests fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment requests" },
      { status: 500 }
    );
  }
}

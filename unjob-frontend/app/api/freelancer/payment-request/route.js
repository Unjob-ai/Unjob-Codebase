// app/api/freelancer/payment-request/route.js - Complete Version with Google Sheets Integration
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Gig from "@/models/Gig";
import PaymentRequest from "@/models/PaymentRequest";
import Notification from "@/models/Notification";
import { authOptions } from "@/lib/auth";
import { addPaymentRequestToSheet } from "@/lib/googleSheets";

// POST - Submit payment request
export async function POST(req) {
  try {
    console.log("=== Payment Request API - POST START ===");

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.log("❌ Authentication failed");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();
    console.log("✅ Database connected");

    // Find freelancer with better error handling
    let freelancer = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    console.log("🔍 Looking for user with ID:", userId);

    if (userId) {
      freelancer = await User.findById(userId);
    }

    if (!freelancer && session.user.email) {
      freelancer = await User.findOne({ email: session.user.email });
    }

    if (!freelancer || freelancer.role !== "freelancer") {
      console.log("❌ User validation failed:", {
        found: !!freelancer,
        role: freelancer?.role,
      });
      return NextResponse.json(
        { error: "Only freelancers can submit payment requests" },
        { status: 403 }
      );
    }

    console.log("✅ Freelancer found:", freelancer.name);

    // Parse and validate request body
    const requestBody = await req.json();
    console.log("📝 Request body keys:", Object.keys(requestBody));

    const {
      gigId,
      applicationId,
      bankDetails,
      workDetails,
      additionalNotes,
      urgencyLevel = "normal",
      freelancerPhone,
    } = requestBody;

    // Comprehensive validation
    const validationErrors = [];

    if (!gigId) validationErrors.push("gigId is required");
    if (!applicationId) validationErrors.push("applicationId is required");
    if (!bankDetails) validationErrors.push("bankDetails is required");
    if (!workDetails) validationErrors.push("workDetails is required");
    if (!freelancerPhone) validationErrors.push("freelancerPhone is required");

    if (bankDetails) {
      if (!bankDetails.accountHolderName)
        validationErrors.push("Account holder name is required");
      if (!bankDetails.panNumber)
        validationErrors.push("PAN number is required");
      if (!bankDetails.accountNumber && !bankDetails.upiId) {
        validationErrors.push("Either account number or UPI ID is required");
      }
      if (bankDetails.accountNumber && !bankDetails.ifscCode) {
        validationErrors.push(
          "IFSC code is required when account number is provided"
        );
      }
    }

    if (workDetails) {
      if (!workDetails.projectDescription)
        validationErrors.push("Project description is required");
      if (!workDetails.completedDate)
        validationErrors.push("Completion date is required");
      if (!workDetails.workDuration)
        validationErrors.push("Work duration is required");
    }

    if (validationErrors.length > 0) {
      console.log("❌ Validation errors:", validationErrors);
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    console.log("✅ All validations passed");

    // Find gig
    const gig = await Gig.findById(gigId).populate(
      "company",
      "name email profile.companyName"
    );
    if (!gig) {
      console.log("❌ Gig not found:", gigId);
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    console.log("✅ Gig found:", gig.title);

    // Find and validate application - FIXED VERSION
    console.log("🔍 Looking for application...");
    console.log("📋 Total applications in gig:", gig.applications.length);
    console.log("🎯 Target applicationId:", applicationId);
    console.log("👤 Target freelancerId:", freelancer._id.toString());

    // Debug log all applications
    gig.applications.forEach((app, index) => {
      console.log(`📄 Application ${index + 1}:`, {
        id: app._id.toString(),
        freelancer: app.freelancer.toString(),
        status: app.applicationStatus,
        idMatch: app._id.toString() === applicationId,
        freelancerMatch:
          app.freelancer.toString() === freelancer._id.toString(),
        statusAccepted: app.applicationStatus === "accepted",
      });
    });

    const application = gig.applications.find(
      (app) =>
        app._id.toString() === applicationId &&
        app.freelancer.toString() === freelancer._id.toString() &&
        app.applicationStatus === "accepted"
    );

    if (!application) {
      console.log("❌ Application validation failed");

      // Detailed debugging
      const appById = gig.applications.find(
        (app) => app._id.toString() === applicationId
      );
      const appByFreelancer = gig.applications.find(
        (app) => app.freelancer.toString() === freelancer._id.toString()
      );
      const acceptedApps = gig.applications.filter(
        (app) => app.applicationStatus === "accepted"
      );

      console.log("🔍 Debug info:", {
        applicationFound: !!appById,
        freelancerHasApplication: !!appByFreelancer,
        acceptedApplicationsCount: acceptedApps.length,
        targetApplicationStatus: appById?.applicationStatus,
      });

      return NextResponse.json(
        {
          error: "No valid accepted application found",
          details: {
            message:
              "Either the application doesn't exist, it's not yours, or it's not accepted",
            applicationExists: !!appById,
            isYourApplication: !!appByFreelancer,
            applicationStatus: appById?.applicationStatus,
            requiredStatus: "accepted",
          },
        },
        { status: 404 }
      );
    }

    console.log("✅ Application validated");

    // Check for existing request
    const existingRequest = await PaymentRequest.findOne({
      gig: gigId,
      applicationId: applicationId,
      freelancer: freelancer._id,
    });

    if (existingRequest) {
      console.log("❌ Duplicate request:", existingRequest.requestId);
      return NextResponse.json(
        {
          error: "Payment request already submitted",
          requestId: existingRequest.requestId,
          status: existingRequest.status,
          submittedAt: existingRequest.submittedAt,
        },
        { status: 400 }
      );
    }

    // Calculate amounts
    const platformCommissionRate = 0.1; // 10% platform fee
    const gigBudget = application.proposedRate || gig.budget || 0;
    const platformCommission = Math.round(gigBudget * platformCommissionRate);
    const freelancerReceivableAmount = gigBudget - platformCommission;

    console.log("💰 Amount calculations:", {
      gigBudget,
      platformCommission,
      freelancerReceivableAmount,
    });

    if (gigBudget <= 0) {
      return NextResponse.json(
        { error: "Invalid gig budget amount" },
        { status: 400 }
      );
    }

    // Create payment request
    const paymentRequestData = {
      gig: gig._id,
      gigTitle: gig.title,
      gigBudget: gigBudget,
      freelancerReceivableAmount: freelancerReceivableAmount,
      platformCommission: platformCommission,
      applicationId: applicationId,
      applicationDate: application.appliedAt,
      approvedDate: application.acceptedAt || new Date(),

      freelancer: freelancer._id,
      freelancerName: freelancer.name,
      freelancerEmail: freelancer.email,
      freelancerPhone: freelancerPhone,
      freelancerLocation: freelancer.profile?.location || "",

      company: gig.company._id,
      companyName: gig.company.profile?.companyName || gig.company.name,
      companyEmail: gig.company.email,

      bankDetails: {
        accountHolderName: bankDetails.accountHolderName.trim(),
        accountNumber: bankDetails.accountNumber?.trim() || "",
        ifscCode: bankDetails.ifscCode?.trim().toUpperCase() || "",
        bankName: bankDetails.bankName?.trim() || "",
        branchName: bankDetails.branchName?.trim() || "",
        upiId: bankDetails.upiId?.trim().toLowerCase() || "",
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

      additionalNotes: additionalNotes?.trim() || "",
      urgencyLevel: urgencyLevel,
      status: "pending",
      submittedAt: new Date(),
    };

    const paymentRequest = new PaymentRequest(paymentRequestData);
    await paymentRequest.save();

    console.log(
      "✅ Payment request saved to database:",
      paymentRequest.requestId
    );

    // 📊 ADD TO GOOGLE SHEET - New functionality
    let sheetResult = null;
    try {
      console.log("📊 Adding payment request to Google Sheet...");
      sheetResult = await addPaymentRequestToSheet(paymentRequestData);

      if (sheetResult.success) {
        console.log("✅ Successfully added to Google Sheet");
      } else {
        console.warn("⚠️ Google Sheet update failed:", sheetResult.error);
      }
    } catch (sheetError) {
      console.error("❌ Google Sheet integration error:", sheetError);
      // Don't fail the entire request if Google Sheets fails
      sheetResult = {
        success: false,
        error: sheetError.message,
        message: "Google Sheet update failed but payment request was saved",
      };
    }

    // Create notifications (non-critical)
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
          message: `Your payment request (${paymentRequest.requestId}) has been submitted successfully`,
          relatedId: paymentRequest._id,
          actionUrl: `/freelancer/payment-requests`,
        }),
      ]);
      console.log("✅ Notifications created");
    } catch (notificationError) {
      console.error("⚠️ Notification creation failed:", notificationError);
    }

    console.log("🎉 Payment Request API - SUCCESS");

    // Prepare response with Google Sheets info
    const response = {
      success: true,
      message: "Payment request submitted successfully!",
      paymentRequest: {
        requestId: paymentRequest.requestId,
        status: paymentRequest.status,
        amount: paymentRequest.freelancerReceivableAmount,
        platformCommission: paymentRequest.platformCommission,
        gigBudget: paymentRequest.gigBudget,
        submittedAt: paymentRequest.submittedAt,
        gigTitle: paymentRequest.gigTitle,
        expectedProcessingTime: "7 business days",
      },
      googleSheets: {
        status: sheetResult?.success ? "success" : "failed",
        message: sheetResult?.message || "No Google Sheets update attempted",
        sheetUrl: sheetResult?.success ? sheetResult.sheetUrl : null,
      },
      nextSteps: {
        message:
          "Your request will be processed within 7 business days. You'll be notified once processed.",
        processingTime: "7 business days",
        trackingUrl: `/freelancer/payment-requests/${paymentRequest.requestId}`,
      },
    };

    // Add warning if Google Sheets failed
    if (!sheetResult?.success) {
      response.warnings = [
        "Payment request saved successfully but Google Sheets update failed. Manual entry may be required.",
      ];
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("💥 Payment Request API - ERROR:", error);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (e) => e.message
      );
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Duplicate payment request detected" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to submit payment request",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// GET - Fetch freelancer's payment requests
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

    // Find freelancer
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

    // Build query
    let query = { freelancer: freelancer._id };
    if (status && status !== "all") {
      query.status = status;
    }

    const paymentRequests = await PaymentRequest.find(query)
      .populate("gig", "title category")
      .populate("company", "name profile.companyName")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalRequests = await PaymentRequest.countDocuments(query);

    // Calculate summary stats
    const statusCounts = await PaymentRequest.aggregate([
      { $match: { freelancer: freelancer._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const totalEarningsResult = await PaymentRequest.aggregate([
      { $match: { freelancer: freelancer._id, status: "completed" } },
      { $group: { _id: null, total: { $sum: "$freelancerReceivableAmount" } } },
    ]);

    const summary = {
      totalRequests: totalRequests,
      pending: statusCounts.find((s) => s._id === "pending")?.count || 0,
      processing: statusCounts.find((s) => s._id === "processing")?.count || 0,
      completed: statusCounts.find((s) => s._id === "completed")?.count || 0,
      rejected: statusCounts.find((s) => s._id === "rejected")?.count || 0,
      totalEarnings: totalEarningsResult[0]?.total || 0,
    };

    return NextResponse.json({
      success: true,
      paymentRequests: paymentRequests.map((req) => ({
        _id: req._id,
        requestId: req.requestId,
        gigTitle: req.gigTitle,
        companyName: req.companyName,
        amount: req.freelancerReceivableAmount,
        platformCommission: req.platformCommission,
        status: req.status,
        submittedAt: req.submittedAt,
        processedAt: req.processedAt,
        urgencyLevel: req.urgencyLevel,
        workDuration: req.workDetails?.workDuration,
        gig: req.gig,
        company: req.company,
      })),
      summary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
        hasNext: page < Math.ceil(totalRequests / limit),
        hasPrev: page > 1,
        limit,
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

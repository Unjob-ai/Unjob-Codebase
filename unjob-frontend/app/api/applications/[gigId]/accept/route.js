// api/applications/[gigId]/accept/route.js - FIXED: Complete schema consistency
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Gig from "@/models/Gig";
import Conversation from "@/models/Conversation";
import Payment from "@/models/Payment";
import Razorpay from "razorpay";
import { addPendingEarnings } from "@/lib/walletUtils";
import crypto from "crypto";
import NotificationService from "@/lib/notificationService";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // resolve company
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    let company = userId ? await User.findById(userId) : null;
    if (!company && session.user.email)
      company = await User.findOne({ email: session.user.email });
    if (!company)
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    if (company.role !== "hiring") {
      return NextResponse.json(
        { error: "Only hiring users can accept applications" },
        { status: 403 }
      );
    }

    const { gigId } = params;
    let {
      freelancerId,
      userId: requestUserId, // Support both freelancerId and userId
      action,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    // FIXED: Handle both freelancerId and userId parameters
    const targetUserId = freelancerId || requestUserId;

    if (targetUserId && typeof targetUserId === "object" && targetUserId._id) {
      freelancerId = targetUserId._id.toString();
    } else if (targetUserId) {
      freelancerId = targetUserId.toString();
    }

    if (!freelancerId) {
      return NextResponse.json(
        { error: "User ID is required (freelancerId or userId)" },
        { status: 400 }
      );
    }

    // FIXED: Get gig WITHOUT population to avoid schema errors
    const gig = await Gig.findById(gigId);

    if (!gig)
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    if (gig.company.toString() !== company._id.toString()) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - You can only accept applications for your own gigs",
        },
        { status: 403 }
      );
    }

    // FIXED: Find application by checking both user and freelancer fields
    const application = gig.applications.find((app) => {
      const appUserId = app.user ? app.user.toString() : null;
      const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;

      return appUserId === freelancerId || appFreelancerId === freelancerId;
    });

    if (!application)
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );

    if (
      application.status === "accepted" ||
      application.applicationStatus === "accepted"
    ) {
      return NextResponse.json(
        { error: "Application already accepted" },
        { status: 400 }
      );
    }

    // Get the freelancer user for notifications
    const freelancerUser = await User.findById(freelancerId);
    if (!freelancerUser) {
      return NextResponse.json(
        { error: "Freelancer not found" },
        { status: 404 }
      );
    }

    // pricing
    const gigBudget = gig.budget || 0;
    const platformFee = Math.round(gigBudget * 0); // Temporarily disabled commission
    const totalPayableByCompany = gigBudget + platformFee;

    // verify payment branch
    if (action === "verify_payment") {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json(
          { error: "Missing required payment verification data" },
          { status: 400 }
        );
      }
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update((razorpay_order_id + "|" + razorpay_payment_id).toString())
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return NextResponse.json(
          { error: "Invalid payment signature" },
          { status: 400 }
        );
      }

      // FIXED: Update application status using both fields for consistency
      application.status = "accepted";
      application.applicationStatus = "accepted";
      application.acceptedAt = new Date();
      application.paymentDetails = {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
        amountPaid: totalPayableByCompany,
      };

      // Collect rejected applications for notifications
      const rejectedApplications = [];
      gig.applications.forEach((app) => {
        const appUserId = app.user ? app.user.toString() : null;
        const appFreelancerId = app.freelancer
          ? app.freelancer.toString()
          : null;
        const appCurrentStatus = app.status || app.applicationStatus;

        if (
          appUserId !== freelancerId &&
          appFreelancerId !== freelancerId &&
          appCurrentStatus === "pending"
        ) {
          app.status = "rejected";
          app.applicationStatus = "rejected";
          app.rejectedAt = new Date();
          rejectedApplications.push(app);
        }
      });

      // Update gig status and save
      gig.selectedFreelancer = freelancerId;
      await gig.save();

      // record payment
      const acceptancePayment = new Payment({
        payer: company._id,
        payee: company._id,
        gig: gig._id,
        amount: totalPayableByCompany,
        type: "gig_escrow",
        status: "completed",
        description: `Acceptance payment for gig: ${gig.title}`,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
        metadata: {
          originalBudget: gigBudget,
          platformCommission: platformFee,
          freelancerId,
          applicationId: application._id,
        },
        statusHistory: [
          {
            status: "completed",
            timestamp: new Date(),
            description: "Acceptance payment completed successfully",
          },
        ],
      });
      await acceptancePayment.save();

      // start conversation
      let conversation = await Conversation.findOne({
        gigId: gig._id,
        participants: { $all: [company._id, freelancerId] },
      });
      if (!conversation) {
        conversation = await Conversation.create({
          participants: [company._id, freelancerId],
          gigId: gig._id,
          applicationId: application._id,
          status: "active",
          metadata: {
            projectTitle: gig.title,
            contractValue: gig.budget,
            deadline: gig.EndDate,
          },
        });
      }

      // ENHANCED NOTIFICATIONS WITH NOTIFICATION SERVICE
      let notificationResults = {
        acceptanceNotificationSent: false,
        rejectionNotificationsSent: 0,
        paymentNotificationSent: false,
      };

      // 1. Notify the accepted freelancer
      try {
        await NotificationService.notifyApplicationAccepted(
          freelancerId,
          company,
          gig._id,
          gig.title,
          {
            budget: gigBudget,
            timeline: gig.timeline,
            conversationId: conversation._id,
            acceptedAt: application.acceptedAt,
          }
        );
        notificationResults.acceptanceNotificationSent = true;
        console.log(
          "✅ Application acceptance notification sent to freelancer"
        );
      } catch (notificationError) {
        console.error(
          "⚠️ Failed to create acceptance notification:",
          notificationError
        );
      }

      // 2. Notify rejected freelancers
      try {
        for (const rejectedApp of rejectedApplications) {
          if (rejectedApp.user || rejectedApp.freelancer) {
            const rejectedUserId = (
              rejectedApp.user || rejectedApp.freelancer
            ).toString();
            await NotificationService.notifyApplicationRejected(
              rejectedUserId,
              company,
              gig._id,
              gig.title,
              "Another candidate was selected for this position"
            );
            notificationResults.rejectionNotificationsSent++;
          }
        }
        console.log(
          `✅ Rejection notifications sent to ${notificationResults.rejectionNotificationsSent} freelancers`
        );
      } catch (rejectionNotificationError) {
        console.error(
          "⚠️ Failed to create rejection notifications:",
          rejectionNotificationError
        );
      }

      // 3. Notify about payment completion
      try {
        await NotificationService.notifyPaymentCompleted(company._id, {
          _id: acceptancePayment._id,
          amount: totalPayableByCompany,
          type: "gig_acceptance",
          gigTitle: gig.title,
          freelancerName: freelancerUser.name,
        });
        notificationResults.paymentNotificationSent = true;
        console.log("✅ Payment completion notification sent to company");
      } catch (paymentNotificationError) {
        console.error(
          "⚠️ Failed to create payment notification:",
          paymentNotificationError
        );
      }

      return NextResponse.json({
        success: true,
        conversationId: conversation._id,
        message: "Payment verified and application accepted successfully!",
        notifications: notificationResults,
      });
    }

    // create Razorpay order (pre-payment)
    const razorpayOrder = await razorpay.orders.create({
      amount: totalPayableByCompany * 100,
      currency: "INR",
      receipt: `accept_${gig._id.toString().slice(-8)}_${freelancerId.slice(
        -4
      )}`,
      notes: {
        gigId: gig._id.toString(),
        companyId: company._id.toString(),
        freelancerId,
        applicationId: application._id.toString(),
        originalBudget: gigBudget,
        platformFee,
        totalPayable: totalPayableByCompany,
        type: "gig_acceptance_payment",
      },
    });

    // FIXED: Use freelancer user data for payment interface
    return NextResponse.json({
      success: true,
      requiresPayment: true,
      orderId: razorpayOrder.id,
      amount: totalPayableByCompany,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      gigDetails: {
        title: gig.title,
        timeline: gig.timeline,
        bannerImage: gig.bannerImage,
      },
      freelancerDetails: {
        name: freelancerUser.name,
        image: freelancerUser.image,
        username: freelancerUser.username,
      },
      message: "Please complete payment to accept this application",
    });
  } catch (error) {
    console.error("Application acceptance error:", error);
    return NextResponse.json(
      {
        error: "Failed to process application acceptance",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return await POST(req, { params });
  } catch (error) {
    console.error("Payment verification patch error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment", details: error.message },
      { status: 500 }
    );
  }
}

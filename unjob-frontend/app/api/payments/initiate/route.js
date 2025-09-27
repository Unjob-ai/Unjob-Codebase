// api/payments/initiate/route.js (Fixed version)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Gig from "@/models/Gig";
import Payment from "@/models/Payment";
import Notification from "@/models/Notification";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // 🔧 FIX: Better user resolution logic (same as other working APIs)
    let company = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      company = await User.findById(userId);
    }

    if (!company && session.user.email) {
      company = await User.findOne({ email: session.user.email });
    }

    console.log("Payment initiation - User lookup:", {
      sessionUser: session.user,
      foundUser: company ? { id: company._id, role: company.role } : null,
    });

    if (!company) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    if (company.role !== "hiring") {
      return NextResponse.json(
        { error: "Only hiring users can initiate payments" },
        { status: 403 }
      );
    }

    const {
      freelancerId,
      gigId,
      amount,
      description,
      freelancerBankDetails,
      paymentType = "gig_payment",
      milestoneDetails,
      adminInitiated = false,
    } = await req.json();

    // Validate required fields
    if (!freelancerId || !gigId || !amount || !freelancerBankDetails) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate bank details
    const { accountNumber, ifscCode, accountHolderName, bankName, upiId } =
      freelancerBankDetails;

    if (!accountHolderName || (!accountNumber && !upiId)) {
      return NextResponse.json(
        { error: "Invalid bank account details" },
        { status: 400 }
      );
    }

    if (accountNumber && !ifscCode) {
      return NextResponse.json(
        { error: "IFSC code is required when using account number" },
        { status: 400 }
      );
    }

    // Fetch and validate gig and freelancer
    const gig = await Gig.findById(gigId);
    const freelancer = await User.findById(freelancerId);

    if (!gig || !freelancer) {
      return NextResponse.json(
        { error: "Gig or freelancer not found" },
        { status: 404 }
      );
    }

    // Verify the company owns this gig
    if (gig.company.toString() !== company._id.toString()) {
      return NextResponse.json(
        { error: "You can only initiate payments for your own gigs" },
        { status: 403 }
      );
    }

    // Verify the freelancer has an accepted application for this gig
    const application = gig.applications.find(
      (app) =>
        app.freelancer.toString() === freelancerId &&
        app.applicationStatus === "accepted"
    );

    if (!application) {
      return NextResponse.json(
        { error: "No accepted application found for this freelancer" },
        { status: 400 }
      );
    }

    console.log("Creating payment record:", {
      payer: company._id,
      payee: freelancer._id,
      gigId: gig._id,
      amount,
      paymentType,
    });

    // Create payment record
    const payment = new Payment({
      payer: company._id,
      payee: freelancer._id,
      gig: gig._id,
      amount: parseFloat(amount),
      type: paymentType,
      description: description || `Payment for "${gig.title}"`,
      status: "pending",
      bankAccountDetails: {
        accountNumber: accountNumber || "",
        ifscCode: ifscCode || "",
        accountHolderName: accountHolderName || "",
        bankName: bankName || "",
        upiId: upiId || "",
      },
      milestoneDetails:
        paymentType === "milestone_payment" ? milestoneDetails : undefined,
      adminInitiated: adminInitiated,
      initiatedBy: company._id,
      statusHistory: [
        {
          status: "pending",
          timestamp: new Date(),
          description: "Payment initiated by company",
        },
      ],
    });

    await payment.save();
    console.log("Payment created with ID:", payment._id);

    // Simulate bank transfer process with realistic status updates
    setTimeout(async () => {
      try {
        // Update to processing
        payment.status = "processing";
        payment.statusHistory.push({
          status: "processing",
          timestamp: new Date(),
          description: "Payment is being processed by bank",
        });
        await payment.save();

        console.log("Payment status updated to processing:", payment._id);

        // Notify freelancer about processing
        await Notification.create({
          user: freelancer._id,
          type: "payment_processing",
          title: "Payment Processing",
          message: `Payment of ₹${amount} is being processed for "${gig.title}"`,
          relatedId: payment._id,
          actionUrl: `/freelancer/earnings`,
        });

        // Complete payment after another delay (simulating bank processing time)
        setTimeout(async () => {
          try {
            payment.status = "completed";
            payment.statusHistory.push({
              status: "completed",
              timestamp: new Date(),
              description: "Payment successfully credited to bank account",
            });
            payment.transferDetails = {
              transferId: `TXN_${Date.now()}_${payment._id
                .toString()
                .slice(-6)}`,
              transferredAt: new Date(),
              transferStatus: "completed",
              transferMode: upiId ? "upi" : "bank",
            };
            await payment.save();

            console.log("Payment completed:", payment._id);

            // Update freelancer earnings
            await User.findByIdAndUpdate(freelancer._id, {
              $inc: { "stats.totalEarnings": parseFloat(amount) },
            });

            // Notify freelancer about completion
            await Notification.create({
              user: freelancer._id,
              type: "payment_completed",
              title: "Payment Received",
              message: `₹${amount} has been credited to your account for "${gig.title}"`,
              relatedId: payment._id,
              actionUrl: `/freelancer/earnings`,
            });

            // Notify company about completion
            await Notification.create({
              user: company._id,
              type: "payment_completed",
              title: "Payment Completed",
              message: `Payment of ₹${amount} to ${freelancer.name} has been completed`,
              relatedId: payment._id,
              actionUrl: `/dashboard/payments`,
            });

            console.log("Payment notifications sent for:", payment._id);
          } catch (completionError) {
            console.error("Payment completion error:", completionError);

            // Mark payment as failed if completion process fails
            payment.status = "failed";
            payment.statusHistory.push({
              status: "failed",
              timestamp: new Date(),
              description: "Payment failed during final processing",
            });
            await payment.save();

            // Notify about failure
            await Notification.create({
              user: company._id,
              type: "payment_failed",
              title: "Payment Failed",
              message: `Payment of ₹${amount} to ${freelancer.name} has failed`,
              relatedId: payment._id,
            });
          }
        }, 3000); // 3 seconds for demo - in production this would be longer
      } catch (processingError) {
        console.error("Payment processing error:", processingError);

        payment.status = "failed";
        payment.statusHistory.push({
          status: "failed",
          timestamp: new Date(),
          description: "Payment failed during processing",
        });
        await payment.save();
      }
    }, 1000); // 1 second initial delay

    return NextResponse.json({
      success: true,
      paymentId: payment._id,
      message: "Payment initiated successfully!",
      trackingUrl: `/payments/track/${payment._id}`,
      data: {
        amount: parseFloat(amount),
        freelancerName: freelancer.name,
        gigTitle: gig.title,
        estimatedCompletion: "2-3 business days",
      },
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    return NextResponse.json(
      {
        error: "Failed to initiate payment",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import crypto from "crypto";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      razorpay_subscription_id,
      subscriptionId,
      paymentType,
    } = body;

    console.log("Payment verification request:", {
      paymentType,
      subscriptionId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_subscription_id,
    });

    await connectDB();

    // Find the subscription record
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      console.error("Subscription not found:", subscriptionId);
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Verify the payment based on payment type
    let isVerified = false;
    let verificationError = null;

    try {
      if (paymentType === "recurring" && razorpay_subscription_id) {
        // For recurring subscriptions, verify the subscription
        const subscriptionData = await razorpay.subscriptions.fetch(
          razorpay_subscription_id
        );
        console.log("Razorpay subscription data:", subscriptionData);

        if (
          subscriptionData.status === "active" ||
          subscriptionData.status === "authenticated"
        ) {
          isVerified = true;
        }

        // Update subscription with Razorpay subscription details
        subscription.paymentDetails.razorpaySubscriptionId =
          razorpay_subscription_id;
        subscription.paymentDetails.paymentType = "recurring";

        if (razorpay_payment_id) {
          subscription.paymentDetails.razorpayPaymentId = razorpay_payment_id;
        }
      } else {
        // For one-time payments, verify using signature
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
          throw new Error("Missing payment verification parameters");
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(body.toString())
          .digest("hex");

        isVerified = expectedSignature === razorpay_signature;

        if (isVerified) {
          // Update subscription with payment details
          subscription.paymentDetails.razorpayOrderId = razorpay_order_id;
          subscription.paymentDetails.razorpayPaymentId = razorpay_payment_id;
          subscription.paymentDetails.razorpaySignature = razorpay_signature;
          subscription.paymentDetails.paymentType = "one-time";
        }
      }
    } catch (error) {
      console.error("Payment verification error:", error);
      verificationError = error.message;
      isVerified = false;
    }

    if (!isVerified) {
      console.error("Payment verification failed:", verificationError);

      // Update subscription status to failed
      subscription.status = "cancelled";
      await subscription.save();

      return NextResponse.json(
        {
          error: "Payment verification failed",
          details: verificationError,
        },
        { status: 400 }
      );
    }

    // Payment verified successfully - activate subscription
    subscription.status = "active";
    subscription.paymentDetails.lastPaymentDate = new Date();

    // Record the payment in history
    subscription.paymentDetails.paymentHistory.push({
      paymentId: razorpay_payment_id || razorpay_subscription_id,
      amount: subscription.price,
      status: "success",
      paidAt: new Date(),
    });

    // Set next payment date for recurring subscriptions
    if (paymentType === "recurring" && subscription.autoRenewal) {
      const nextPaymentDate = new Date();
      if (subscription.duration === "monthly") {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      } else if (subscription.duration === "yearly") {
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
      }
      subscription.paymentDetails.nextPaymentDate = nextPaymentDate;
    }

    await subscription.save();
    console.log("Subscription activated:", subscription._id);

    // Create payment record for history tracking
    try {
      const Payment = (await import("@/models/Payment")).default;

      const paymentRecord = new Payment({
        payer: subscription.user,
        amount: subscription.price,
        currency: "INR",
        status: "completed",
        type: "subscription",
        paymentMethod: "razorpay",
        transactionId: razorpay_payment_id || razorpay_subscription_id,
        metadata: {
          subscriptionId: subscription._id,
          planType: subscription.planType,
          duration: subscription.duration,
          paymentType: paymentType,
        },
        razorpayDetails: {
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          subscriptionId: razorpay_subscription_id,
          signature: razorpay_signature,
        },
      });

      await paymentRecord.save();
      console.log("Payment record created:", paymentRecord._id);
    } catch (paymentRecordError) {
      console.error("Failed to create payment record:", paymentRecordError);
      // Don't fail the entire process if payment record creation fails
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription activated",
      subscription: {
        id: subscription._id,
        status: subscription.status,
        planType: subscription.planType,
        duration: subscription.duration,
        endDate: subscription.endDate,
        autoRenewal: subscription.autoRenewal,
      },
    });
  } catch (error) {
    console.error("Payment verification process error:", error);
    return NextResponse.json(
      {
        error: "Payment verification failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

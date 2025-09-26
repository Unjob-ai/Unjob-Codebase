//api/webhooks/razorpay/route.js

import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import User from "@/models/User";

// Webhook endpoint: /api/webhooks/razorpay
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log("Received webhook event:", event.event, event.payload);

    // Handle different event types
    switch (event.event) {
      case "subscription.charged":
        await handleSubscriptionCharged(
          event.payload.subscription.entity,
          event.payload.payment.entity
        );
        break;

      case "subscription.completed":
        await handleSubscriptionCompleted(event.payload.subscription.entity);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.payload.subscription.entity);
        break;

      case "subscription.paused":
        await handleSubscriptionPaused(event.payload.subscription.entity);
        break;

      case "subscription.resumed":
        await handleSubscriptionResumed(event.payload.subscription.entity);
        break;

      case "subscription.pending":
        await handleSubscriptionPending(event.payload.subscription.entity);
        break;

      case "subscription.halted":
        await handleSubscriptionHalted(event.payload.subscription.entity);
        break;

      case "payment.failed":
        // Handle individual payment failures
        if (event.payload.payment.entity.subscription_id) {
          await handlePaymentFailed(event.payload.payment.entity);
        }
        break;

      default:
        console.log("Unhandled webhook event:", event.event);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

function verifyWebhookSignature(body, signature) {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return signature === expectedSignature;
}

async function handleSubscriptionCharged(subscriptionData, paymentData) {
  try {
    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": subscriptionData.id,
    });

    if (!subscription) {
      console.error("Subscription not found:", subscriptionData.id);
      return;
    }

    // Record successful payment
    await subscription.recordPayment({
      paymentId: paymentData.id,
      amount: paymentData.amount / 100, // Convert from paise to rupees
      status: "success",
    });

    console.log("Subscription charged successfully:", subscription._id);

    // Send confirmation email to user (implement as needed)
    await sendPaymentConfirmationEmail(subscription);
  } catch (error) {
    console.error("Error handling subscription charged:", error);
  }
}

async function handleSubscriptionCompleted(subscriptionData) {
  try {
    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": subscriptionData.id,
    });

    if (!subscription) {
      console.error("Subscription not found:", subscriptionData.id);
      return;
    }

    // Mark subscription as completed (for limited billing cycles)
    subscription.status = "expired";
    subscription.autoRenewal = false;
    await subscription.save();

    console.log("Subscription completed:", subscription._id);

    // Send subscription completion email
    await sendSubscriptionCompletedEmail(subscription);
  } catch (error) {
    console.error("Error handling subscription completed:", error);
  }
}

async function handleSubscriptionCancelled(subscriptionData) {
  try {
    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": subscriptionData.id,
    });

    if (!subscription) {
      console.error("Subscription not found:", subscriptionData.id);
      return;
    }

    await subscription.cancelSubscription("Cancelled via Razorpay");

    console.log("Subscription cancelled:", subscription._id);

    // Send cancellation confirmation email
    await sendCancellationEmail(subscription);
  } catch (error) {
    console.error("Error handling subscription cancelled:", error);
  }
}

async function handleSubscriptionPaused(subscriptionData) {
  try {
    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": subscriptionData.id,
    });

    if (!subscription) {
      console.error("Subscription not found:", subscriptionData.id);
      return;
    }

    await subscription.pauseSubscription("Paused via Razorpay");

    console.log("Subscription paused:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription paused:", error);
  }
}

async function handleSubscriptionResumed(subscriptionData) {
  try {
    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": subscriptionData.id,
    });

    if (!subscription) {
      console.error("Subscription not found:", subscriptionData.id);
      return;
    }

    await subscription.resumeSubscription();

    console.log("Subscription resumed:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription resumed:", error);
  }
}

async function handleSubscriptionPending(subscriptionData) {
  try {
    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": subscriptionData.id,
    });

    if (!subscription) {
      console.error("Subscription not found:", subscriptionData.id);
      return;
    }

    subscription.status = "pending";
    await subscription.save();

    console.log("Subscription pending:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription pending:", error);
  }
}

async function handleSubscriptionHalted(subscriptionData) {
  try {
    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": subscriptionData.id,
    });

    if (!subscription) {
      console.error("Subscription not found:", subscriptionData.id);
      return;
    }

    // Subscription halted due to payment failures
    await subscription.cancelSubscription("Halted due to payment failures");

    console.log("Subscription halted:", subscription._id);

    // Send payment failure notification
    await sendPaymentFailureEmail(subscription);
  } catch (error) {
    console.error("Error handling subscription halted:", error);
  }
}

async function handlePaymentFailed(paymentData) {
  try {
    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": paymentData.subscription_id,
    });

    if (!subscription) {
      console.error(
        "Subscription not found for failed payment:",
        paymentData.subscription_id
      );
      return;
    }

    // Record failed payment
    await subscription.recordPayment({
      paymentId: paymentData.id,
      amount: paymentData.amount / 100,
      status: "failed",
      failureReason: paymentData.error_reason || "Payment failed",
    });

    console.log("Payment failed for subscription:", subscription._id);

    // Send payment failure notification
    await sendPaymentRetryEmail(subscription);
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}

// Email notification functions (implement these based on your email service)
async function sendPaymentConfirmationEmail(subscription) {
  try {
    const user = await User.findById(subscription.user);
    if (!user) return;

    // Implement email sending logic here
    console.log(`Sending payment confirmation to ${user.email}`);

    // Example using your email service:
    // await emailService.send({
    //   to: user.email,
    //   subject: "Payment Successful - Subscription Renewed",
    //   template: "payment-confirmation",
    //   data: {
    //     userName: user.name,
    //     planType: subscription.planType,
    //     amount: subscription.price,
    //     nextPaymentDate: subscription.paymentDetails.nextPaymentDate
    //   }
    // });
  } catch (error) {
    console.error("Error sending payment confirmation email:", error);
  }
}

async function sendSubscriptionCompletedEmail(subscription) {
  try {
    const user = await User.findById(subscription.user);
    if (!user) return;

    console.log(
      `Sending subscription completion notification to ${user.email}`
    );

    // Implement email logic for subscription completion
  } catch (error) {
    console.error("Error sending subscription completed email:", error);
  }
}

async function sendCancellationEmail(subscription) {
  try {
    const user = await User.findById(subscription.user);
    if (!user) return;

    console.log(`Sending cancellation confirmation to ${user.email}`);

    // Implement email logic for cancellation confirmation
  } catch (error) {
    console.error("Error sending cancellation email:", error);
  }
}

async function sendPaymentFailureEmail(subscription) {
  try {
    const user = await User.findById(subscription.user);
    if (!user) return;

    console.log(`Sending payment failure notification to ${user.email}`);

    // Implement email logic for payment failures
  } catch (error) {
    console.error("Error sending payment failure email:", error);
  }
}

async function sendPaymentRetryEmail(subscription) {
  try {
    const user = await User.findById(subscription.user);
    if (!user) return;

    console.log(`Sending payment retry notification to ${user.email}`);

    // Implement email logic for payment retry notifications
    // Include information about remaining grace period and retry attempts
  } catch (error) {
    console.error("Error sending payment retry email:", error);
  }
}

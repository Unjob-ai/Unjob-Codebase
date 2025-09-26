import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Subscription from "@/models/Subscription";
import User from "@/models/User";

export async function POST(req) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      console.error("Missing Razorpay signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log("Razorpay webhook event:", event.event, event.payload);

    await connectDB();

    switch (event.event) {
      case "subscription.charged":
        await handleSubscriptionCharged(event.payload);
        break;

      case "subscription.completed":
        await handleSubscriptionCompleted(event.payload);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(event.payload);
        break;

      case "subscription.paused":
        await handleSubscriptionPaused(event.payload);
        break;

      case "subscription.resumed":
        await handleSubscriptionResumed(event.payload);
        break;

      case "payment.failed":
        await handlePaymentFailed(event.payload);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.payload);
        break;

      case "subscription.activated":
        await handleSubscriptionActivated(event.payload);
        break;

      case "subscription.halted":
        await handleSubscriptionHalted(event.payload);
        break;

      default:
        console.log("Unhandled webhook event:", event.event);
    }

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCharged(payload) {
  try {
    const { subscription: razorpaySubscription, payment } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    // Record successful payment
    await subscription.recordPayment({
      paymentId: payment.id,
      amount: payment.amount / 100, // Convert from paise to rupees
      status: "success",
    });

    // Create payment record for history
    try {
      const Payment = (await import("@/models/Payment")).default;

      const paymentRecord = new Payment({
        payer: subscription.user,
        amount: payment.amount / 100,
        currency: "INR",
        status: "completed",
        type: "subscription",
        paymentMethod: "razorpay",
        transactionId: payment.id,
        metadata: {
          subscriptionId: subscription._id,
          planType: subscription.planType,
          duration: subscription.duration,
          razorpaySubscriptionId: razorpaySubscription.id,
        },
        razorpayDetails: {
          paymentId: payment.id,
          subscriptionId: razorpaySubscription.id,
        },
      });

      await paymentRecord.save();
      console.log("Payment record created from webhook:", paymentRecord._id);
    } catch (paymentError) {
      console.error(
        "Failed to create payment record in webhook:",
        paymentError
      );
    }

    console.log("Subscription charged successfully:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription charged:", error);
  }
}

async function handleSubscriptionCompleted(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    // Mark subscription as completed (non-renewing)
    subscription.status = "expired";
    subscription.autoRenewal = false;
    await subscription.save();

    console.log("Subscription completed:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription completed:", error);
  }
}

async function handleSubscriptionCancelled(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    // Cancel the subscription
    await subscription.cancelSubscription("Cancelled via Razorpay");

    console.log("Subscription cancelled:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription cancelled:", error);
  }
}

async function handleSubscriptionPaused(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    // Pause the subscription
    await subscription.pauseSubscription("Paused via Razorpay");

    console.log("Subscription paused:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription paused:", error);
  }
}

async function handleSubscriptionResumed(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    // Resume the subscription
    await subscription.resumeSubscription();

    console.log("Subscription resumed:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription resumed:", error);
  }
}

async function handleSubscriptionActivated(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    // Activate the subscription
    subscription.status = "active";
    await subscription.save();

    console.log("Subscription activated:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription activated:", error);
  }
}

async function handleSubscriptionHalted(payload) {
  try {
    const { subscription: razorpaySubscription } = payload;

    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": razorpaySubscription.id,
    });

    if (!subscription) {
      console.error("Subscription not found for ID:", razorpaySubscription.id);
      return;
    }

    // Halt the subscription (usually due to payment failures)
    subscription.status = "paused";
    await subscription.save();

    console.log("Subscription halted:", subscription._id);
  } catch (error) {
    console.error("Error handling subscription halted:", error);
  }
}

async function handlePaymentFailed(payload) {
  try {
    const { payment } = payload;

    // Find subscription by payment order ID or subscription ID
    let subscription = null;

    if (payment.order_id) {
      subscription = await Subscription.findOne({
        "paymentDetails.razorpayOrderId": payment.order_id,
      });
    }

    // If not found by order ID, try to find by subscription ID in payment notes
    if (!subscription && payment.notes && payment.notes.subscription_id) {
      subscription = await Subscription.findOne({
        "paymentDetails.razorpaySubscriptionId": payment.notes.subscription_id,
      });
    }

    if (!subscription) {
      console.error("Subscription not found for failed payment:", payment.id);
      return;
    }

    // Record failed payment
    await subscription.recordPayment({
      paymentId: payment.id,
      amount: payment.amount / 100,
      status: "failed",
      failureReason: payment.error_description || "Payment failed",
    });

    // Create failed payment record
    try {
      const Payment = (await import("@/models/Payment")).default;

      const paymentRecord = new Payment({
        payer: subscription.user,
        amount: payment.amount / 100,
        currency: "INR",
        status: "failed",
        type: "subscription",
        paymentMethod: "razorpay",
        transactionId: payment.id,
        metadata: {
          subscriptionId: subscription._id,
          planType: subscription.planType,
          duration: subscription.duration,
          failureReason: payment.error_description,
        },
        razorpayDetails: {
          paymentId: payment.id,
          orderId: payment.order_id,
        },
      });

      await paymentRecord.save();
      console.log("Failed payment record created:", paymentRecord._id);
    } catch (paymentError) {
      console.error("Failed to create failed payment record:", paymentError);
    }

    console.log("Payment failed handled for subscription:", subscription._id);
  } catch (error) {
    console.error("Error handling payment failed:", error);
  }
}

async function handleInvoicePaid(payload) {
  try {
    const { invoice, payment } = payload;

    // Find subscription by invoice subscription ID
    const subscription = await Subscription.findOne({
      "paymentDetails.razorpaySubscriptionId": invoice.subscription_id,
    });

    if (!subscription) {
      console.error("Subscription not found for invoice:", invoice.id);
      return;
    }

    // Record successful payment from invoice
    await subscription.recordPayment({
      paymentId: payment.id,
      amount: invoice.amount / 100,
      status: "success",
    });

    console.log("Invoice paid handled for subscription:", subscription._id);
  } catch (error) {
    console.error("Error handling invoice paid:", error);
  }
}

// Handle GET requests (for webhook verification)
export async function GET(req) {
  return NextResponse.json({
    message: "Razorpay webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}

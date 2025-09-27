import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
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

    await connectDB();
    const user = await User.findById(session.user.userId || session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { planType, duration } = await req.json();

    if (!planType || !duration) {
      return NextResponse.json(
        { error: "Plan type and duration are required" },
        { status: 400 }
      );
    }

    // Handle free plan - CREATE AND ACTIVATE the subscription immediately
    if (planType === "free") {
      console.log("=== FREE PLAN ACTIVATION START ===");
      console.log("User Role:", user.role);
      console.log("Plan Type:", planType);
      console.log("Duration:", duration);

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findOne({
        user: user._id,
        status: "active",
        endDate: { $gt: new Date() },
      });

      if (existingSubscription) {
        return NextResponse.json({
          success: true,
          paymentType: "free",
          subscriptionId: existingSubscription._id,
          planDetails: {
            type: existingSubscription.planType,
            duration: existingSubscription.duration,
            price: 0,
          },
          subscription: {
            id: existingSubscription._id,
            status: "active",
            planType: existingSubscription.planType,
            duration: existingSubscription.duration,
            startDate: existingSubscription.startDate,
            endDate: existingSubscription.endDate,
          },
          info: "You already have an active subscription.",
        });
      }

      // Calculate subscription dates for free plan
      const startDate = new Date();
      let endDate = new Date(startDate);

      // Free plans typically have ongoing access
      if (duration === "monthly") {
        endDate.setMonth(startDate.getMonth() + 1);
      } else if (duration === "yearly") {
        endDate.setFullYear(startDate.getFullYear() + 1);
      } else if (duration === "lifetime") {
        endDate.setFullYear(endDate.getFullYear() + 100);
      }

      // Create and immediately activate the free subscription
      const freeSubscription = new Subscription({
        user: user._id,
        userRole: user.role,
        planType: "free",
        duration,
        price: 0,
        originalPrice: 0,
        discount: 0,
        status: "active", // ✅ IMMEDIATELY SET TO ACTIVE
        startDate,
        endDate,
        autoRenewal: false, // Free plans don't auto-renew
        paymentDetails: {
          paymentType: "free",
          lastPaymentDate: new Date(), // Mark as "paid" (free)
          paymentHistory: [
            {
              paymentId: `free_${Date.now()}`,
              amount: 0,
              status: "success",
              paidAt: new Date(),
            },
          ],
        },
      });

      await freeSubscription.save();
      console.log(
        "✅ Free subscription activated in DB:",
        freeSubscription._id
      );

      // Return success response - NO Razorpay modal needed
      return NextResponse.json({
        success: true,
        paymentType: "free",
        subscriptionId: freeSubscription._id, // ✅ Include subscription ID
        planDetails: {
          type: planType,
          duration,
          price: 0,
        },
        subscription: {
          id: freeSubscription._id,
          status: "active",
          planType: "free",
          duration,
          startDate: freeSubscription.startDate,
          endDate: freeSubscription.endDate,
        },
        info: "Free plan activated successfully.",
      });
    }

    // Handle paid plans (basic, pro)
    const pricing = getPlanPricing(user.role, planType, duration);

    if (!pricing) {
      return NextResponse.json(
        { error: "Invalid plan configuration" },
        { status: 400 }
      );
    }

    console.log("=== PAID SUBSCRIPTION CREATION START ===");
    console.log("User Role:", user.role);
    console.log("Plan Type:", planType);
    console.log("Duration:", duration);
    console.log("Pricing:", pricing);

    // Create Razorpay order for paid plans
    const shortUserId = user._id.toString().slice(-6);
    const orderOptions = {
      amount: pricing.price * 100, // in paise
      currency: "INR",
      receipt: `ord_${shortUserId}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: user._id.toString(),
        userRole: user.role,
        planType,
        duration,
        email: user.email,
        paymentType: "one-time",
      },
    };

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create(orderOptions);
      console.log("✅ Razorpay order created:", razorpayOrder.id);
    } catch (error) {
      console.error("❌ Failed to create Razorpay order:", error);
      return NextResponse.json(
        { error: "Failed to create payment order", details: error.message },
        { status: 500 }
      );
    }

    // Calculate subscription dates
    const startDate = new Date();
    let endDate = new Date(startDate);
    if (duration === "monthly") {
      endDate.setMonth(startDate.getMonth() + 1);
    } else if (duration === "yearly") {
      endDate.setFullYear(startDate.getFullYear() + 1);
    } else if (duration === "lifetime") {
      endDate.setFullYear(endDate.getFullYear() + 100);
    }

    // Save subscription in DB (pending until payment success)
    const subscription = new Subscription({
      user: user._id,
      userRole: user.role,
      planType,
      duration,
      price: pricing.price,
      originalPrice: pricing.originalPrice,
      discount: pricing.discount,
      status: "pending",
      startDate,
      endDate,
      autoRenewal: false,
      paymentDetails: {
        paymentType: "one-time",
        razorpayOrderId: razorpayOrder.id,
      },
    });

    await subscription.save();
    console.log("✅ Subscription record saved in DB:", subscription._id);

    return NextResponse.json({
      success: true,
      paymentType: "one-time",
      orderId: razorpayOrder.id,
      amount: pricing.price,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      dbSubscriptionId: subscription._id,
      planDetails: {
        type: planType,
        duration,
        originalPrice: pricing.originalPrice,
        discountedPrice: pricing.price,
      },
      info: `Payment of ₹${pricing.price} created successfully.`,
    });
  } catch (error) {
    console.error("❌ Subscription creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}

// Updated pricing helper for only 3 plans
function getPlanPricing(userRole, planType, duration) {
  if (!["basic", "pro"].includes(planType)) return null;

  const pricing = {
    freelancer: {
      basic: {
        monthly: { price: 199, originalPrice: 499, discount: 60 },
        yearly: { price: 1990, originalPrice: 4990, discount: 60 },
      },
      pro: {
        monthly: { price: 799, originalPrice: 1499, discount: 47 },
        yearly: { price: 7990, originalPrice: 14990, discount: 47 },
      },
    },
    hiring: {
      basic: {
        monthly: { price: 499, originalPrice: 1999, discount: 75 },
        yearly: { price: 4990, originalPrice: 19990, discount: 75 },
      },
      pro: {
        monthly: { price: 2499, originalPrice: 4999, discount: 50 },
        yearly: { price: 24990, originalPrice: 49990, discount: 50 },
      },
    },
  };

  return pricing[userRole]?.[planType]?.[duration];
}

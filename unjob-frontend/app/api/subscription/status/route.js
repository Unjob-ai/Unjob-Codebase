import connectDB from "@/lib/mongodb";
import Subscription from "@/models/Subscription"; // CHANGE THIS PATH
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  await connectDB();

  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const subscription = await Subscription.findOne({
    userId,
    status: "active",
  }).sort({ startDate: -1 });

  if (!subscription) {
    return new Response(
      JSON.stringify({
        success: true,
        hasActiveSubscription: false,
        canPostGig: false,
        subscription: null,
      }),
      { status: 200 }
    );
  }

  // Check if subscription is actually active
  const now = new Date();
  const isExpired =
    !subscription.isLifetime && new Date(subscription.endDate) < now;

  if (isExpired) {
    // Update subscription status to expired
    await Subscription.findByIdAndUpdate(subscription._id, {
      status: "expired",
    });

    return new Response(
      JSON.stringify({
        success: true,
        hasActiveSubscription: false,
        canPostGig: false,
        subscription: null,
      }),
      { status: 200 }
    );
  }

  const daysLeft = subscription.isLifetime
    ? null
    : Math.max(
        0,
        Math.ceil(
          (new Date(subscription.endDate) - now) / (1000 * 60 * 60 * 24)
        )
      );

  return new Response(
    JSON.stringify({
      success: true,
      hasActiveSubscription: true,
      canPostGig: true,
      subscription: {
        planId: subscription.planId,
        planType: subscription.planType,
        duration: subscription.duration,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        isLifetime: subscription.isLifetime,
        daysLeft,
        active: true, // Explicitly set active to true
      },
    }),
    { status: 200 }
  );
}

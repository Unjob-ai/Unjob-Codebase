// api/subscription/manage/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Payment from "@/models/Payment";

// GET - Get current subscription details
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user
    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get current active subscription
    const currentSubscription = await Subscription.findOne({
      user: user._id,
      status: "active",
      $or: [{ duration: "lifetime" }, { endDate: { $gt: new Date() } }],
    });

    // Get subscription history
    const subscriptionHistory = await Subscription.find({
      user: user._id,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get payment history for subscriptions
    const paymentHistory = await Payment.find({
      payer: user._id,
      type: "subscription",
    })
      .sort({ createdAt: -1 })
      .limit(5);

    const responseData = {
      success: true,
      userRole: user.role,
      hasActiveSubscription: !!currentSubscription,
      currentSubscription: currentSubscription
        ? {
            id: currentSubscription._id,
            planType: currentSubscription.planType,
            duration: currentSubscription.duration,
            status: currentSubscription.status,
            startDate: currentSubscription.startDate,
            endDate:
              currentSubscription.duration === "lifetime"
                ? null
                : currentSubscription.endDate,
            isLifetime: currentSubscription.duration === "lifetime",
            remainingDays: currentSubscription.getRemainingDays(),
            autoRenewal: currentSubscription.autoRenewal,
            renewalDate: currentSubscription.renewalDate,
            features: currentSubscription.features,
            usage: {
              type: user.role === "hiring" ? "gigs" : "applications",
              used:
                user.role === "hiring"
                  ? currentSubscription.gigsPosted
                  : currentSubscription.applicationsSubmitted,
              limit:
                user.role === "hiring"
                  ? currentSubscription.maxGigs
                  : currentSubscription.maxApplications,
              remaining:
                user.role === "hiring"
                  ? currentSubscription.maxGigs === -1
                    ? "unlimited"
                    : Math.max(
                        0,
                        currentSubscription.maxGigs -
                          currentSubscription.gigsPosted
                      )
                  : currentSubscription.maxApplications === -1
                  ? "unlimited"
                  : Math.max(
                      0,
                      currentSubscription.maxApplications -
                        currentSubscription.applicationsSubmitted
                    ),
              percentage:
                user.role === "hiring"
                  ? currentSubscription.maxGigs === -1
                    ? 0
                    : Math.round(
                        (currentSubscription.gigsPosted /
                          currentSubscription.maxGigs) *
                          100
                      )
                  : currentSubscription.maxApplications === -1
                  ? 0
                  : Math.round(
                      (currentSubscription.applicationsSubmitted /
                        currentSubscription.maxApplications) *
                        100
                    ),
            },
            billing: {
              price: currentSubscription.price,
              originalPrice: currentSubscription.originalPrice,
              discount: currentSubscription.discount,
              nextBillingDate:
                currentSubscription.duration === "lifetime"
                  ? null
                  : currentSubscription.renewalDate,
            },
          }
        : null,
      subscriptionHistory: subscriptionHistory.map((sub) => ({
        id: sub._id,
        planType: sub.planType,
        duration: sub.duration,
        status: sub.status,
        startDate: sub.startDate,
        endDate: sub.endDate,
        price: sub.price,
        createdAt: sub.createdAt,
        cancelledAt: sub.cancelledAt,
        cancellationReason: sub.cancellationReason,
      })),
      paymentHistory: paymentHistory.map((payment) => ({
        id: payment._id,
        amount: payment.amount,
        status: payment.status,
        description: payment.description,
        createdAt: payment.createdAt,
        razorpayPaymentId: payment.razorpayPaymentId,
      })),
      upgradeOptions: currentSubscription
        ? getUpgradeOptions(currentSubscription.planType, user.role)
        : null,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Subscription management fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    );
  }
}

// PATCH - Update subscription settings (auto-renewal, etc.)
export async function PATCH(req) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { autoRenewal, action, subscriptionId } = await req.json();

    // Find user
    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find subscription
    const subscription = await Subscription.findOne({
      _id: subscriptionId || undefined,
      user: user._id,
      status: "active",
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Active subscription not found" },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === "cancel") {
      // Cancel subscription
      subscription.status = "cancelled";
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = "User requested cancellation";
      subscription.autoRenewal = false;

      await subscription.save();

      return NextResponse.json({
        success: true,
        message: "Subscription cancelled successfully",
        subscription: {
          id: subscription._id,
          status: subscription.status,
          cancelledAt: subscription.cancelledAt,
          accessUntil: subscription.endDate,
        },
      });
    } else if (action === "toggle_renewal") {
      // Toggle auto-renewal
      if (subscription.duration === "lifetime") {
        return NextResponse.json(
          { error: "Lifetime subscriptions don't have auto-renewal" },
          { status: 400 }
        );
      }

      subscription.autoRenewal = !subscription.autoRenewal;
      await subscription.save();

      return NextResponse.json({
        success: true,
        message: `Auto-renewal ${
          subscription.autoRenewal ? "enabled" : "disabled"
        }`,
        autoRenewal: subscription.autoRenewal,
      });
    } else if (typeof autoRenewal === "boolean") {
      // Update auto-renewal setting
      if (subscription.duration === "lifetime") {
        return NextResponse.json(
          { error: "Lifetime subscriptions don't have auto-renewal" },
          { status: 400 }
        );
      }

      subscription.autoRenewal = autoRenewal;
      await subscription.save();

      return NextResponse.json({
        success: true,
        message: `Auto-renewal ${autoRenewal ? "enabled" : "disabled"}`,
        autoRenewal: subscription.autoRenewal,
      });
    }

    return NextResponse.json(
      { error: "Invalid action or parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Subscription management update error:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

// Helper function to get upgrade options
function getUpgradeOptions(currentPlan, userRole) {
  const allPlans = ["basic", "premium", "enterprise"];
  const currentIndex = allPlans.indexOf(currentPlan);

  if (currentIndex === -1 || currentIndex === allPlans.length - 1) {
    return null; // Already on highest plan
  }

  const upgradePlans = allPlans.slice(currentIndex + 1);

  const planBenefits = {
    freelancer: {
      premium: [
        "Increase applications to 100/month (yearly: 1200)",
        "Profile boost & featured placement",
        "Premium badge",
        "Skill verification",
        "Priority support",
      ],
      enterprise: [
        "Unlimited applications",
        "Premium profile placement",
        "Dedicated account manager",
        "Custom branding options",
        "API access",
        "24/7 priority support",
      ],
    },
    hiring: {
      premium: [
        "Increase gigs to 50/month (yearly: 600)",
        "Featured gig placement",
        "Advanced candidate search",
        "Bulk messaging",
        "Priority support",
      ],
      enterprise: [
        "Unlimited gig postings",
        "Premium gig placement",
        "Dedicated account manager",
        "Team collaboration tools",
        "Custom branding & white-label",
        "API access & integrations",
      ],
    },
  };

  return upgradePlans.map((plan) => ({
    planType: plan,
    benefits: planBenefits[userRole][plan] || [],
    recommended: plan === "premium",
  }));
}

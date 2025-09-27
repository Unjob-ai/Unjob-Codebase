import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Gig from "@/models/Gig";

export async function POST(req) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get freelancer user
    const freelancer = await User.findById(
      session.user.userId || session.user.id
    );

    if (!freelancer || freelancer.role !== "freelancer") {
      return NextResponse.json(
        { error: "Only freelancers can apply to gigs" },
        { status: 403 }
      );
    }

    console.log("Checking subscription for freelancer:", freelancer._id);

    // Check subscription - simplified approach
    const subscription = await Subscription.findOne({
      user: freelancer._id,
      userRole: "freelancer",
      status: "active",
    }).exec();

    console.log("Subscription found:", {
      exists: !!subscription,
      planType: subscription?.planType,
      status: subscription?.status,
      applicationsSubmitted: subscription?.applicationsSubmitted,
      maxApplications: subscription?.maxApplications,
      isLegacyPricing: subscription?.isLegacyPricing,
      createdAt: subscription?.createdAt,
    });

    // ✅ FIX FOR OLD USERS - Auto-fix missing fields
    if (subscription && !subscription.maxApplications) {
      console.log("🔧 Fixing subscription limits for old user");

      let maxApplications;
      let givenIterations;

      // Set limits based on plan and duration
      if (subscription.planType === "free") {
        maxApplications = 20; // Free plan limit
        givenIterations = 20;
      } else if (subscription.planType === "basic") {
        if (subscription.duration === "lifetime") {
          maxApplications = -1; // Unlimited
          givenIterations = -1;
        } else if (subscription.duration === "yearly") {
          maxApplications = 2400; // 200 per month * 12
          givenIterations = 2400;
        } else {
          maxApplications = 200; // Monthly limit
          givenIterations = 200;
        }
      } else if (subscription.planType === "pro") {
        maxApplications = -1; // Pro gets unlimited
        givenIterations = -1;
      }

      // Update the subscription with missing fields
      await Subscription.findByIdAndUpdate(subscription._id, {
        maxApplications: maxApplications,
        givenIterations: givenIterations,
        applicationsSubmitted: subscription.applicationsSubmitted || 0,
      });

      subscription.maxApplications = maxApplications;
      console.log(`✅ Fixed subscription limits: ${maxApplications}`);
    }

    // Check if subscription exists
    if (!subscription) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_REQUIRED",
          message: "You need an active subscription to apply to gigs",
          redirectTo: "/dashboard/settings/freelancer?reason=required",
        },
        { status: 402 }
      );
    }

    // ✅ ENHANCED SUBSCRIPTION VALIDATION
    const isActiveSubscription = subscription.status === "active";
    const isNotExpired =
      !subscription.endDate || subscription.endDate > new Date();
    const isLifetime = subscription.duration === "lifetime";

    // ✅ GRACE PERIOD for recently expired subscriptions (7 days)
    const isWithinGracePeriod =
      subscription.endDate &&
      new Date() - subscription.endDate < 7 * 24 * 60 * 60 * 1000;

    const subscriptionValid =
      isActiveSubscription &&
      (isNotExpired || isLifetime || isWithinGracePeriod);

    if (!subscriptionValid) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_EXPIRED",
          message: "Your subscription has expired",
          redirectTo: "/dashboard/settings/freelancer?reason=expired",
        },
        { status: 402 }
      );
    }

    // ✅ ENHANCED APPLICATION LIMIT CHECK
    const maxApps = subscription.maxApplications || 20; // Default to 20 if missing
    const usedApps = subscription.applicationsSubmitted || 0;

    console.log("📊 Application limits:", {
      maxApps,
      usedApps,
      canApply: maxApps === -1 || usedApps < maxApps,
      isLegacy: subscription.isLegacyPricing,
    });

    // ✅ SPECIAL HANDLING FOR LEGACY USERS
    const LEGACY_CUTOFF_DATE = new Date("2024-12-01");
    const isLegacyUser = subscription.createdAt < LEGACY_CUTOFF_DATE;

    let canApply;
    if (isLegacyUser && subscription.planType === "basic") {
      // ✅ LEGACY BASIC USERS get more generous limits
      canApply = maxApps === -1 || usedApps < Math.max(maxApps, 100);
      console.log("🎯 Legacy user - enhanced limits applied");
    } else {
      // Normal limit check
      canApply = maxApps === -1 || usedApps < maxApps;
    }

    if (!canApply) {
      return NextResponse.json(
        {
          error: "APPLICATION_LIMIT_REACHED",
          message: `Application limit reached (${usedApps}/${
            maxApps === -1 ? "unlimited" : maxApps
          })`,
          redirectTo: "/dashboard/settings/freelancer?reason=limit_reached",
          debug: {
            planType: subscription.planType,
            duration: subscription.duration,
            isLegacy: isLegacyUser,
            maxApps,
            usedApps,
          },
        },
        { status: 402 }
      );
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { gigId, iterations, coverLetter } = requestBody;

    // Validation
    if (!gigId) {
      return NextResponse.json({ error: "gigId is required" }, { status: 400 });
    }

    if (!iterations && !coverLetter) {
      return NextResponse.json(
        { error: "Either iterations count or coverLetter is required" },
        { status: 400 }
      );
    }

    // Validate iterations
    let iterationsNum = iterations ? parseInt(iterations) : 3;
    if (iterationsNum < 1 || iterationsNum > 20) {
      return NextResponse.json(
        { error: "Invalid number of iterations (1-20)" },
        { status: 400 }
      );
    }

    // Find and validate gig
    const gig = await Gig.findById(gigId).populate("company", "name email _id");
    if (!gig || gig.status !== "active") {
      return NextResponse.json(
        { error: "Gig not found or not available" },
        { status: 404 }
      );
    }

    // Check for existing application
    const existingApplication = gig.applications?.find((app) => {
      const appUserId = app.user ? app.user.toString() : null;
      const appFreelancerId = app.freelancer ? app.freelancer.toString() : null;
      const currentUserId = freelancer._id.toString();
      return appUserId === currentUserId || appFreelancerId === currentUserId;
    });

    if (existingApplication) {
      return NextResponse.json(
        {
          error: "Already applied",
          message: "You have already applied to this gig",
        },
        { status: 400 }
      );
    }

    // ✅ ENHANCED FEATURES BASED ON PLAN TYPE
    const subscriptionFeatures = {
      profileBoost: subscription.planType !== "free",
      skillVerification: subscription.planType !== "free",
      premiumBadge: subscription.planType !== "free",
      prioritySupport: subscription.planType === "pro",
      isLegacy: isLegacyUser,
    };

    // Create application object
    const application = {
      user: freelancer._id,
      freelancer: freelancer._id,
      name: freelancer.name?.trim() || freelancer.email.split("@")[0],
      email: freelancer.email,
      image: freelancer.image || null,
      location: freelancer.profile?.location || "Not specified",
      skills: freelancer.profile?.skills || [],
      hourlyRate: freelancer.profile?.hourlyRate || 0,
      portfolio: freelancer.profile?.portfolio || [],
      totalIterations: iterationsNum,
      remainingIterations: iterationsNum,
      usedIterations: 0,
      coverLetter:
        coverLetter || `Application with ${iterationsNum} iterations`,
      appliedAt: new Date(),
      status: "pending",
      applicationStatus: "pending",
      isPriorityApplication: subscriptionFeatures.profileBoost,
      hasVerifiedSkills: subscriptionFeatures.skillVerification,
      hasPremiumBadge: subscriptionFeatures.premiumBadge,
      isLegacyUser: subscriptionFeatures.isLegacy,
      projectSubmissions: [],
      currentProjectId: null,
      projectStatus: "not_started",
    };

    // Add application to gig
    if (!gig.applications) {
      gig.applications = [];
    }
    gig.applications.push(application);
    gig.applicationsCount = gig.applications.length;

    await gig.save();

    // ✅ UPDATE SUBSCRIPTION USAGE WITH ERROR HANDLING
    try {
      await Subscription.findByIdAndUpdate(subscription._id, {
        $inc: { applicationsSubmitted: 1 },
      });
      console.log("✅ Subscription usage updated successfully");
    } catch (subscriptionError) {
      console.error(
        "❌ Failed to update subscription usage:",
        subscriptionError
      );
      // Don't fail the whole request if usage update fails
    }

    // Get the newly created application
    const newApplication = gig.applications[gig.applications.length - 1];

    // ✅ ENHANCED SUCCESS RESPONSE
    const remainingApps =
      maxApps === -1 ? "unlimited" : Math.max(0, maxApps - (usedApps + 1));

    const responseData = {
      success: true,
      message: subscriptionFeatures.profileBoost
        ? "Priority application submitted successfully!"
        : "Application submitted successfully!",
      application: {
        id: newApplication._id,
        gigId: gig._id,
        gigTitle: gig.title,
        companyName: gig.company?.name || "Company",
        appliedAt: newApplication.appliedAt,
        status: newApplication.status,
        applicationStatus: newApplication.applicationStatus,
        totalIterations: newApplication.totalIterations,
        remainingIterations: newApplication.remainingIterations,
        usedIterations: newApplication.usedIterations,
        isPriority: newApplication.isPriorityApplication,
        hasVerifiedSkills: newApplication.hasVerifiedSkills,
        hasPremiumBadge: newApplication.hasPremiumBadge,
        isLegacyUser: newApplication.isLegacyUser,
      },
      subscriptionInfo: {
        planType: subscription.planType,
        duration: subscription.duration,
        isLegacy: isLegacyUser,
        used: (subscription.applicationsSubmitted || 0) + 1,
        remaining: remainingApps,
        maxApplications: maxApps === -1 ? "unlimited" : maxApps,
      },
      nextSteps: [
        "Track your application status in the dashboard",
        "You'll be notified when the company responds",
        `You have ${iterationsNum} iteration${
          iterationsNum > 1 ? "s" : ""
        } for this project`,
        "Start working on the project once accepted",
        ...(isLegacyUser
          ? ["Thanks for being a loyal user! Legacy pricing honored."]
          : []),
      ],
    };

    console.log("✅ Application created successfully");
    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("❌ Application creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to submit application",
        message:
          "An unexpected error occurred while submitting your application",
        details:
          process.env.NODE_ENV === "development"
            ? error.message
            : "Please try again later",
      },
      { status: 500 }
    );
  }
}

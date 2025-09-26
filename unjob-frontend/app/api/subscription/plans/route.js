import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get("role"); // "freelancer" or "hiring"

    if (!userRole || !["freelancer", "hiring"].includes(userRole)) {
      return NextResponse.json(
        { error: "Valid user role is required (freelancer or hiring)" },
        { status: 400 }
      );
    }

    const plans = getPlansForRole(userRole);
    const comparisonData = getComparisonData();

    return NextResponse.json({
      success: true,
      plans,
      comparisonData,
      userRole,
    });
  } catch (error) {
    console.error("Plans fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

function getPlansForRole(userRole) {
  if (userRole === "hiring") {
    return [
      {
        id: "free",
        name: "Free Plan",
        description: "Get started with basic features",
        planType: "free",
        duration: "monthly",
        originalPrice: 0,
        price: 0,
        recommended: false,
        features: [
          "Create Profile",
          "First gig creation free",
          "Explore gigs",
          "Explore content",
        ],
      },
      {
        id: "basic",
        name: "Basic Plan",
        description: "Essential features for hiring managers",
        planType: "basic",
        duration: "monthly",
        originalPrice: 1999,
        price: 499,
        recommended: true,
        bestDeal: true,
        features: [
          "All Free Plan Features",
          "Unlimited gig creation",
          "Access to verified freelancers",
          "Verified brand badge",
          "Direct messaging & smart inbox",
          "Secure & transparent payment",
          "Priority brand support",
          "5% platform fee",
          "AI proposal evaluator (coming soon)",
        ],
      },
      {
        id: "pro",
        name: "Pro Plan",
        description: "Advanced features for growing businesses",
        planType: "pro",
        duration: "monthly",
        originalPrice: 4999,
        price: 2499,
        recommended: false,
        features: [
          "All Basic Plan Features",
          "3% Platform Fees",
          "Unlimited Projects",
          "24/7 Call Support",
          "Free Access to Offline Events and Meetups",
        ],
      },
    ];
  } else {
    // Freelancer plans
    return [
      {
        id: "free",
        name: "Free Plan",
        description: "Get started with basic features",
        planType: "free",
        duration: "monthly",
        originalPrice: 0,
        price: 0,
        recommended: false,
        features: [
          "Create Profile",
          "Upload Posts",
          "Upload Projects",
          "Explore Content",
          "Share Portfolio",
        ],
      },
      {
        id: "basic",
        name: "Basic Plan",
        description: "Essential features to boost your freelance career",
        planType: "basic",
        duration: "monthly",
        originalPrice: 499,
        price: 199,
        recommended: true,
        bestDeal: true,
        features: [
          "All Free Plan Features",
          "Access to client / brands",
          "Verified badge",
          "Smart Inbox",
          "Priority Visibility",
          "Secure Payments",
          "Complete Max 5 project/month",
          "Dedicated Support",
          "5% Platform Fee",
        ],
      },
      {
        id: "pro",
        name: "Pro Plan",
        description: "Advanced features for professional freelancers",
        planType: "pro",
        duration: "monthly",
        originalPrice: 1499,
        price: 799,
        recommended: false,
        features: [
          "All Basic Plan Features",
          "3% Platform Fees",
          "Unlimited Projects",
          "24/7 Call Support",
          "Free Access to Offline Events and Meetups",
        ],
      },
    ];
  }
}

function getComparisonData() {
  return {
    hiring: [
      {
        feature: "Can join for free",
        unJob: "✓",
        upwork: "✓",
        fiverr: "✓",
        freelancer: "✓",
        unstop: "✓",
      },
      {
        feature: "Commission",
        unJob: "0% (Temporarily Free)",
        upwork: "5% - 10%",
        fiverr: "5.5% + (₹250)",
        freelancer: "3%",
        unstop: "20%",

      },
      {
        feature: "Other Hidden Fees",
        unJob: "None",
        upwork: "Withdrawal",
        fiverr: "Platform fee",
        freelancer: "Contests, Disputes",
        unstop: "-",
      },
      {
        feature: "Can Create Content (Portfolio/Post)",
        unJob: "Portfolio + Post+ Reel",
        upwork: "Portfolio",
        fiverr: "Portfolio",
        freelancer: "Portfolio",
        unstop: "Events/Posts",
      },
    ],
    freelancer: [
      {
        feature: "Can join for free",
        unJob: "✓",
        upwork: "✓",
        fiverr: "✓",
        freelancer: "✓",
        unstop: "✓",
      },
      {
        feature: "Monthly Subscription Available",
        unJob: "₹199 (Early Access)",
        upwork: "✗",
        fiverr: "✗",
        freelancer: "₹430",
        unstop: "₹999",
      },
      {
        feature: "Commission on Earning",
        unJob: "5%",
        upwork: "10%-20%",
        fiverr: "20%",
        freelancer: "10% +",
        unstop: "-",
      },
      {
        feature: "Other Hidden Fees",
        unJob: "None",
        upwork: "Withdrawal",
        fiverr: "Platform fee",
        freelancer: "Contests, Disputes",
        unstop: "-",
      },
      {
        feature: "Can Create Content (Portfolio/Post)",
        unJob: "Portfolio + Post+ Reel",
        upwork: "Portfolio",
        fiverr: "Portfolio",
        freelancer: "Portfolio",
        unstop: "Events/Posts",
      },
    ],
  };
}

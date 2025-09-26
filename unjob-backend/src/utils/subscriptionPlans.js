// utils/subscriptionPlans.js

// Plan pricing configuration
export function getPlanPricing(userRole, planType, duration) {
  if (!["basic", "pro"].includes(planType)) return null;

  const pricing = {
    freelancer: {
      basic: {
        monthly: { price: 199, originalPrice: 499, discount: 60 },
        yearly: { price: 1990, originalPrice: 4990, discount: 60 },
        lifetime: { price: 9990, originalPrice: 19990, discount: 50 },
      },
      pro: {
        monthly: { price: 799, originalPrice: 1499, discount: 47 },
        yearly: { price: 7990, originalPrice: 14990, discount: 47 },
        lifetime: { price: 19990, originalPrice: 39990, discount: 50 },
      },
    },
    hiring: {
      basic: {
        monthly: { price: 499, originalPrice: 1999, discount: 75 },
        yearly: { price: 4990, originalPrice: 19990, discount: 75 },
        lifetime: { price: 19990, originalPrice: 49990, discount: 60 },
      },
      pro: {
        monthly: { price: 2499, originalPrice: 4999, discount: 50 },
        yearly: { price: 24990, originalPrice: 49990, discount: 50 },
        lifetime: { price: 49990, originalPrice: 99990, discount: 50 },
      },
    },
  };

  return pricing[userRole]?.[planType]?.[duration];
}

// Plans configuration for different user roles
export function getPlansForRole(userRole) {
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
        id: "basic-monthly",
        name: "Basic Plan (Monthly)",
        description: "Essential features for hiring managers",
        planType: "basic",
        duration: "monthly",
        originalPrice: 1999,
        price: 499,
        recommended: true,
        bestDeal: false,
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
        id: "basic-yearly",
        name: "Basic Plan (Yearly)",
        description: "Essential features for hiring managers - Save 75%",
        planType: "basic",
        duration: "yearly",
        originalPrice: 19990,
        price: 4990,
        recommended: false,
        bestDeal: true,
        savings: "Save ₹10,998",
        features: [
          "All Basic Monthly Features",
          "2 months free",
          "Priority support",
          "Annual billing discount",
        ],
      },
      {
        id: "basic-lifetime",
        name: "Basic Plan (Lifetime)",
        description: "One-time payment for lifetime access",
        planType: "basic",
        duration: "lifetime",
        originalPrice: 49990,
        price: 19990,
        recommended: false,
        bestDeal: false,
        popular: true,
        features: [
          "All Basic Features Forever",
          "No recurring payments",
          "Lifetime updates",
          "Priority support",
        ],
      },
      {
        id: "pro-monthly",
        name: "Pro Plan (Monthly)",
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
          "Advanced analytics",
          "Custom branding",
        ],
      },
      {
        id: "pro-yearly",
        name: "Pro Plan (Yearly)",
        description: "Advanced features - Annual billing",
        planType: "pro",
        duration: "yearly",
        originalPrice: 49990,
        price: 24990,
        recommended: false,
        savings: "Save ₹5,000",
        features: [
          "All Pro Monthly Features",
          "2 months free",
          "Premium support",
          "Annual billing discount",
        ],
      },
      {
        id: "pro-lifetime",
        name: "Pro Plan (Lifetime)",
        description: "Ultimate plan with lifetime access",
        planType: "pro",
        duration: "lifetime",
        originalPrice: 99990,
        price: 49990,
        recommended: false,
        enterprise: true,
        features: [
          "All Pro Features Forever",
          "No recurring payments",
          "Lifetime updates",
          "Dedicated account manager",
          "Custom integrations",
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
        id: "basic-monthly",
        name: "Basic Plan (Monthly)",
        description: "Essential features to boost your freelance career",
        planType: "basic",
        duration: "monthly",
        originalPrice: 499,
        price: 199,
        recommended: true,
        bestDeal: false,
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
        id: "basic-yearly",
        name: "Basic Plan (Yearly)",
        description: "Essential features - Save with yearly billing",
        planType: "basic",
        duration: "yearly",
        originalPrice: 4990,
        price: 1990,
        recommended: false,
        bestDeal: true,
        savings: "Save ₹1,398",
        features: [
          "All Basic Monthly Features",
          "2 months free",
          "Priority support",
          "Annual billing discount",
        ],
      },
      {
        id: "basic-lifetime",
        name: "Basic Plan (Lifetime)",
        description: "One-time payment for lifetime access",
        planType: "basic",
        duration: "lifetime",
        originalPrice: 19990,
        price: 9990,
        recommended: false,
        popular: true,
        features: [
          "All Basic Features Forever",
          "No recurring payments",
          "Lifetime updates",
          "Priority support",
        ],
      },
      {
        id: "pro-monthly",
        name: "Pro Plan (Monthly)",
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
          "Advanced portfolio features",
          "Priority in search results",
        ],
      },
      {
        id: "pro-yearly",
        name: "Pro Plan (Yearly)",
        description: "Professional features - Annual billing",
        planType: "pro",
        duration: "yearly",
        originalPrice: 14990,
        price: 7990,
        recommended: false,
        savings: "Save ₹1,600",
        features: [
          "All Pro Monthly Features",
          "2 months free",
          "Premium support",
          "Annual billing discount",
        ],
      },
      {
        id: "pro-lifetime",
        name: "Pro Plan (Lifetime)",
        description: "Ultimate freelancer plan with lifetime access",
        planType: "pro",
        duration: "lifetime",
        originalPrice: 39990,
        price: 19990,
        recommended: false,
        enterprise: true,
        features: [
          "All Pro Features Forever",
          "No recurring payments",
          "Lifetime updates",
          "Dedicated support",
          "Early access to new features",
        ],
      },
    ];
  }
}

// Platform comparison data
export function getComparisonData() {
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
        feature: "Monthly Subscription Available",
        unJob: "₹499 (Early Access)",
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

// Upgrade options for existing subscribers
export function getUpgradeOptions(currentPlan, userRole) {
  const allPlans = ["free", "basic", "pro"];
  const currentIndex = allPlans.indexOf(currentPlan);

  if (currentIndex === -1 || currentIndex === allPlans.length - 1) {
    return null; // Already on highest plan
  }

  const upgradePlans = allPlans.slice(currentIndex + 1);

  const planBenefits = {
    freelancer: {
      basic: [
        "Access to client / brands",
        "Verified badge",
        "Smart Inbox",
        "Priority Visibility",
        "Secure Payments",
        "Complete Max 5 project/month",
      ],
      pro: [
        "3% Platform Fees (vs 5%)",
        "Unlimited Projects",
        "24/7 Call Support",
        "Free Access to Offline Events and Meetups",
        "Advanced portfolio features",
        "Priority in search results",
      ],
    },
    hiring: {
      basic: [
        "Unlimited gig creation",
        "Access to verified freelancers",
        "Verified brand badge",
        "Direct messaging & smart inbox",
        "Priority brand support",
        "5% platform fee",
      ],
      pro: [
        "3% Platform Fees (vs 5%)",
        "Unlimited Projects",
        "24/7 Call Support",
        "Free Access to Offline Events and Meetups",
        "Advanced analytics",
        "Custom branding",
      ],
    },
  };

  return upgradePlans.map((plan) => ({
    planType: plan,
    benefits: planBenefits[userRole][plan] || [],
    recommended: plan === "basic",
  }));
}

// Feature limits by plan
export function getPlanLimits(planType, userRole) {
  const limits = {
    freelancer: {
      free: {
        maxApplications: 3,
        maxProjects: 1,
        maxPortfolioItems: 5,
        canMessage: false,
        verified: false,
      },
      basic: {
        maxApplications: 20,
        maxProjects: 5,
        maxPortfolioItems: 20,
        canMessage: true,
        verified: true,
        platformFee: 5,
      },
      pro: {
        maxApplications: -1, // unlimited
        maxProjects: -1, // unlimited
        maxPortfolioItems: -1, // unlimited
        canMessage: true,
        verified: true,
        platformFee: 3,
        prioritySupport: true,
      },
    },
    hiring: {
      free: {
        maxGigs: 1,
        canMessage: false,
        verified: false,
      },
      basic: {
        maxGigs: -1, // unlimited
        canMessage: true,
        verified: true,
        platformFee: 5,
        accessToVerifiedFreelancers: true,
      },
      pro: {
        maxGigs: -1, // unlimited
        canMessage: true,
        verified: true,
        platformFee: 3,
        accessToVerifiedFreelancers: true,
        prioritySupport: true,
        analytics: true,
      },
    },
  };

  return limits[userRole]?.[planType] || {};
}

// Updated RAZORPAY_PLAN_IDS for create-order/route.js
// Generated on 2025-09-16T13:19:11.684Z

const RAZORPAY_PLAN_IDS = {
  FREELANCER_MONTHLY: process.env.RAZORPAY_FREELANCER_MONTHLY_PLAN || "plan_RIHrARx6N53ijf",
  HIRING_MONTHLY: process.env.RAZORPAY_HIRING_MONTHLY_PLAN || "plan_RIHrC7hao1aMjU",
  HIRING_PRO_MONTHLY: process.env.RAZORPAY_HIRING_PRO_MONTHLY_PLAN || "plan_RIHrDl0m1zQ4hZ",
};

// Enhanced getPlanId function
function getPlanId(userRole, planType, duration) {
  console.log(`🔍 Resolving plan ID for: ${userRole}/${planType}/${duration}`);
  
  // Only basic monthly plans support autopay currently
  if (planType !== "basic" || duration !== "monthly") {
    console.log("⚠️ Plan not eligible for autopay");
    return null;
  }
  
  let planKey;
  
  if (userRole === "hiring") {
    planKey = "HIRING_MONTHLY";
  } else if (userRole === "freelancer") {
    planKey = "FREELANCER_MONTHLY"; 
  } else {
    console.error(`❌ Unknown user role: ${userRole}`);
    return null;
  }
  
  const planId = RAZORPAY_PLAN_IDS[planKey];
  
  console.log(`✅ Plan mapping: ${planKey} -> ${planId}`);
  
  if (!planId) {
    console.error(`❌ No plan ID configured for ${planKey}`);
    console.error("Available plans:", Object.keys(RAZORPAY_PLAN_IDS));
    throw new Error(`Plan ID not found for ${planKey}`);
  }
  
  return planId;
}

export { RAZORPAY_PLAN_IDS, getPlanId };
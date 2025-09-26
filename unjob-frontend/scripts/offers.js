// Run this to verify your plans exist and create missing ones
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function verifyPlans() {
  console.log("🔍 Verifying Razorpay Plans...");

  const requiredPlans = [
    {
      id: "FREELANCER_MONTHLY",
      config: {
        period: "monthly",
        interval: 1,
        item: {
          name: "Freelancer Monthly AutoPay",
          amount: 19900, // ₹199
          currency: "INR",
        },
        notes: {
          userRole: "freelancer",
          planType: "basic",
          duration: "monthly",
        },
      },
    },
    {
      id: "HIRING_MONTHLY",
      config: {
        period: "monthly",
        interval: 1,
        item: {
          name: "Hiring Monthly AutoPay",
          amount: 49900, // ₹499
          currency: "INR",
        },
        notes: {
          userRole: "hiring",
          planType: "basic",
          duration: "monthly",
        },
      },
    },
  ];

  const createdPlans = {};

  for (const plan of requiredPlans) {
    try {
      console.log(`Creating plan: ${plan.id}`);

      const razorpayPlan = await razorpay.plans.create(plan.config);

      createdPlans[plan.id] = razorpayPlan.id;

      console.log(`✅ Plan created: ${plan.id} -> ${razorpayPlan.id}`);
    } catch (error) {
      console.error(`❌ Failed to create ${plan.id}:`, error.message);
    }
  }

  console.log("\n📋 Update your RAZORPAY_PLAN_IDS with these values:");
  console.log(JSON.stringify(createdPlans, null, 2));

  return createdPlans;
}

// Test subscription creation
async function testSubscriptionCreation(planId) {
  try {
    console.log(`\n🧪 Testing subscription creation with plan: ${planId}`);

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 0, // Don't send SMS for test
      total_count: 12,
      notes: {
        test: "capability_test",
      },
    });

    console.log(`✅ Test subscription created: ${subscription.id}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Short URL: ${subscription.short_url}`);

    return subscription;
  } catch (error) {
    console.error(`❌ Subscription creation failed:`, {
      message: error.message,
      description: error.description,
      code: error.code,
    });
  }
}

async function main() {
  const plans = await verifyPlans();

  // Test with first created plan
  const firstPlanId = Object.values(plans)[0];
  if (firstPlanId) {
    await testSubscriptionCreation(firstPlanId);
  }
}

main().catch(console.error);

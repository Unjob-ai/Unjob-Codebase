// Complete Razorpay AutoPay Capability Checker
// File: scripts/check-autopay-capabilities.js
// Run with: node scripts/check-autopay-capabilities.js

import Razorpay from "razorpay";
import fs from 'fs';
import path from 'path';

// Configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_live_R5DaB01QSSlX4y";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "qrWxxEqffm31QrYZdDtH0U9I";

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

console.log("🚀 COMPREHENSIVE RAZORPAY AUTO-PAY SETUP & TEST");
console.log("=".repeat(60));
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Key ID: ${RAZORPAY_KEY_ID.slice(0, 10)}...`);
console.log("=".repeat(60));

// Store results for final report
const testResults = {
  timestamp: new Date().toISOString(),
  environment: process.env.NODE_ENV || 'development',
  capabilities: {},
  createdPlans: {},
  testSubscriptions: [],
  errors: [],
  recommendations: []
};

// 1. CHECK ACCOUNT CAPABILITIES
async function checkAccountCapabilities() {
  console.log("\n📊 STEP 1: CHECKING ACCOUNT CAPABILITIES");
  console.log("-".repeat(50));

  try {
    // Test basic plan creation
    const testPlan = {
      period: "monthly",
      interval: 1,
      item: {
        name: "Capability Test Plan",
        amount: 100, // ₹1.00 for testing
        currency: "INR",
        description: "Test plan for capability verification"
      },
      notes: {
        test: "capability_check",
        created_at: new Date().toISOString()
      },
    };

    console.log("🔍 Testing plan creation...");
    const plan = await razorpay.plans.create(testPlan);
    console.log(`✅ Plan Creation: SUPPORTED (ID: ${plan.id})`);

    // Test subscription creation
    console.log("🔍 Testing subscription creation...");
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.id,
      customer_notify: 0,
      total_count: 1,
      notes: {
        test: "capability_check",
        created_at: new Date().toISOString()
      },
    });

    console.log(`✅ Subscription Creation: SUPPORTED (ID: ${subscription.id})`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Auth URL: ${subscription.short_url}`);

    // Clean up test plan and subscription
    try {
      await razorpay.subscriptions.cancel(subscription.id);
      console.log("🧹 Test subscription cancelled");
    } catch (cleanupError) {
      console.log("⚠️ Could not cancel test subscription:", cleanupError.message);
    }

    testResults.capabilities = {
      plansSupported: true,
      subscriptionsSupported: true,
      testPlanId: plan.id,
      testSubscriptionId: subscription.id,
    };

    return testResults.capabilities;

  } catch (error) {
    console.error(`❌ Capability Check Failed: ${error.message}`);
    testResults.capabilities = {
      plansSupported: false,
      subscriptionsSupported: false,
      error: error.message,
      description: error.description
    };
    testResults.errors.push(`Capability check: ${error.message}`);
    return testResults.capabilities;
  }
}

// 2. CREATE PRODUCTION-READY PLANS
async function createProductionPlans() {
  console.log("\n🏗️ STEP 2: CREATING PRODUCTION AUTOPAY PLANS");
  console.log("-".repeat(50));

  const planConfigs = [
    {
      id: "FREELANCER_MONTHLY",
      name: "Freelancer Monthly AutoPay",
      amount: 19900, // ₹199
      userRole: "freelancer",
      duration: "monthly",
      description: "Monthly subscription for freelancers with auto-renewal"
    },
    {
      id: "HIRING_MONTHLY", 
      name: "Hiring Monthly AutoPay",
      amount: 49900, // ₹499
      userRole: "hiring",
      duration: "monthly",
      description: "Monthly subscription for hiring managers with auto-renewal"
    },
    {
      id: "HIRING_PRO_MONTHLY",
      name: "Hiring Pro Monthly AutoPay", 
      amount: 249900, // ₹2499
      userRole: "hiring",
      duration: "monthly",
      description: "Premium monthly subscription for hiring managers"
    }
  ];

  const createdPlans = {};

  for (const config of planConfigs) {
    try {
      console.log(`\n🔍 Creating ${config.id}: ${config.name}...`);

      const planOptions = {
        period: "monthly",
        interval: 1,
        item: {
          name: config.name,
          amount: config.amount,
          currency: "INR",
          description: config.description
        },
        notes: {
          userRole: config.userRole,
          planType: "basic",
          duration: config.duration,
          autoPayEnabled: "true",
          production: "true",
          createdBy: "autopay_setup_script",
          createdAt: new Date().toISOString()
        },
      };

      const plan = await razorpay.plans.create(planOptions);
      createdPlans[config.id] = plan.id;

      console.log(`✅ Created: ${config.id} -> ${plan.id}`);
      console.log(`   Amount: ₹${config.amount / 100}`);
      console.log(`   For: ${config.userRole} users`);

      // Wait between API calls to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Failed to create ${config.id}: ${error.message}`);
      testResults.errors.push(`Plan creation ${config.id}: ${error.message}`);
    }
  }

  testResults.createdPlans = createdPlans;
  return createdPlans;
}

// 3. TEST AUTOPAY SUBSCRIPTION CREATION
async function testAutoPaySubscriptions(createdPlans) {
  console.log("\n🧪 STEP 3: TESTING AUTOPAY SUBSCRIPTION CREATION");
  console.log("-".repeat(50));

  const testSubscriptions = [];

  // Test each payment method with the freelancer plan
  const testPlanId = createdPlans.FREELANCER_MONTHLY;
  
  if (!testPlanId) {
    console.error("❌ No freelancer plan available for testing");
    return testSubscriptions;
  }

  const paymentMethods = [
    { method: "upi", description: "UPI Auto-Pay" },
    { method: "card", description: "Card Auto-Pay" }, 
    { method: "netbanking", description: "Net Banking Auto-Pay" }
  ];

  for (const paymentMethod of paymentMethods) {
    try {
      console.log(`\n🔍 Testing ${paymentMethod.description}...`);

      const subscriptionOptions = {
        plan_id: testPlanId,
        customer_notify: 0, // Don't send notifications for test
        total_count: 2, // Just 2 payments for test
        method: paymentMethod.method,
        notes: {
          test: "autopay_method_test",
          paymentMethod: paymentMethod.method,
          testPurpose: "capability_verification",
          createdAt: new Date().toISOString()
        }
      };

      const subscription = await razorpay.subscriptions.create(subscriptionOptions);
      
      testSubscriptions.push({
        id: subscription.id,
        method: paymentMethod.method,
        status: subscription.status,
        shortUrl: subscription.short_url,
        planId: testPlanId
      });

      console.log(`✅ ${paymentMethod.description} Test: SUCCESS`);
      console.log(`   Subscription ID: ${subscription.id}`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Payment URL: ${subscription.short_url}`);

      // Clean up test subscription
      try {
        await razorpay.subscriptions.cancel(subscription.id);
        console.log(`🧹 Test subscription cancelled: ${subscription.id}`);
      } catch (cleanupError) {
        console.log(`⚠️ Could not cancel test subscription: ${cleanupError.message}`);
      }

      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.error(`❌ ${paymentMethod.description} Test Failed:`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Description: ${error.description || 'N/A'}`);
      
      testResults.errors.push(`${paymentMethod.method} autopay test: ${error.message}`);
    }
  }

  testResults.testSubscriptions = testSubscriptions;
  return testSubscriptions;
}

// 4. GENERATE ENVIRONMENT CONFIGURATION
function generateEnvironmentConfig(createdPlans) {
  console.log("\n⚙️ STEP 4: GENERATING ENVIRONMENT CONFIGURATION");
  console.log("-".repeat(50));

  const envContent = `# Razorpay Configuration
# Add these to your .env.local file

# Main Razorpay Credentials
RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}

# AutoPay Plan IDs (Generated on ${new Date().toISOString()})
${Object.entries(createdPlans).map(([key, planId]) => 
  `RAZORPAY_${key}_PLAN=${planId}`
).join('\n')}

# Webhook Configuration (Update with your domain)
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
NEXT_PUBLIC_RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}

# Optional: Enable debug logging
RAZORPAY_DEBUG=true
`;

  // Write to file
  const envPath = path.join(process.cwd(), '.env.autopay.generated');
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✅ Environment configuration written to: ${envPath}`);
  console.log("\n📋 Add these environment variables to your .env.local:");
  console.log(envContent);

  return envContent;
}

// 5. GENERATE UPDATED CODE FILES
function generateUpdatedCode(createdPlans) {
  console.log("\n📝 STEP 5: GENERATING UPDATED CODE FILES");
  console.log("-".repeat(50));

  // Updated plan IDs object
  const planIdsCode = `// Updated RAZORPAY_PLAN_IDS for create-order/route.js
// Generated on ${new Date().toISOString()}

const RAZORPAY_PLAN_IDS = {
${Object.entries(createdPlans).map(([key, planId]) => 
  `  ${key}: process.env.RAZORPAY_${key}_PLAN || "${planId}",`
).join('\n')}
};

// Enhanced getPlanId function
function getPlanId(userRole, planType, duration) {
  console.log(\`🔍 Resolving plan ID for: \${userRole}/\${planType}/\${duration}\`);
  
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
    console.error(\`❌ Unknown user role: \${userRole}\`);
    return null;
  }
  
  const planId = RAZORPAY_PLAN_IDS[planKey];
  
  console.log(\`✅ Plan mapping: \${planKey} -> \${planId}\`);
  
  if (!planId) {
    console.error(\`❌ No plan ID configured for \${planKey}\`);
    console.error("Available plans:", Object.keys(RAZORPAY_PLAN_IDS));
    throw new Error(\`Plan ID not found for \${planKey}\`);
  }
  
  return planId;
}

export { RAZORPAY_PLAN_IDS, getPlanId };`;

  // Write updated code to file
  const codePath = path.join(process.cwd(), 'updated-plan-config.js');
  fs.writeFileSync(codePath, planIdsCode);
  
  console.log(`✅ Updated plan configuration written to: ${codePath}`);
  
  return planIdsCode;
}

// 6. GENERATE COMPREHENSIVE REPORT
function generateFinalReport() {
  console.log("\n📊 STEP 6: COMPREHENSIVE TEST REPORT");
  console.log("=".repeat(60));

  const report = {
    ...testResults,
    summary: {
      totalTests: 3,
      passedTests: testResults.errors.length === 0 ? 3 : 3 - testResults.errors.length,
      failedTests: testResults.errors.length,
      plansCreated: Object.keys(testResults.createdPlans).length,
      subscriptionsCreated: testResults.testSubscriptions.length
    }
  };

  console.log("\n✅ TEST SUMMARY:");
  console.log(`   Total Tests: ${report.summary.totalTests}`);
  console.log(`   Passed: ${report.summary.passedTests}`);
  console.log(`   Failed: ${report.summary.failedTests}`);
  console.log(`   Plans Created: ${report.summary.plansCreated}`);
  console.log(`   Subscriptions Tested: ${report.summary.subscriptionsCreated}`);

  if (report.summary.plansCreated > 0) {
    console.log("\n🎯 CREATED PLANS:");
    Object.entries(testResults.createdPlans).forEach(([key, planId]) => {
      console.log(`   ${key}: ${planId}`);
    });
  }

  if (testResults.errors.length > 0) {
    console.log("\n❌ ERRORS ENCOUNTERED:");
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log("\n🚀 NEXT STEPS:");
  if (report.summary.failedTests === 0) {
    console.log("   1. ✅ Copy the generated .env variables to your .env.local");
    console.log("   2. ✅ Update your create-order/route.js with new RAZORPAY_PLAN_IDS");
    console.log("   3. ✅ Deploy and test autopay functionality");
    console.log("   4. ✅ Set up webhook handlers for subscription events");
    console.log("   5. ✅ Add user dashboard for subscription management");
  } else {
    console.log("   1. ❌ Review and fix the errors listed above");
    console.log("   2. ❌ Verify Razorpay account has subscription permissions");
    console.log("   3. ❌ Check API credentials and account settings");
    console.log("   4. ❌ Contact Razorpay support if issues persist");
  }

  // Write detailed report to file
  const reportPath = path.join(process.cwd(), 'autopay-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  return report;
}

// 7. MAIN EXECUTION
async function main() {
  try {
    console.log("🚀 Starting comprehensive autopay setup and testing...\n");

    // Step 1: Check basic capabilities
    const capabilities = await checkAccountCapabilities();
    
    if (!capabilities.plansSupported || !capabilities.subscriptionsSupported) {
      console.error("❌ Basic capabilities not supported. Exiting.");
      return;
    }

    // Step 2: Create production plans
    const createdPlans = await createProductionPlans();
    
    if (Object.keys(createdPlans).length === 0) {
      console.error("❌ No plans were created. Exiting.");
      return;
    }

    // Step 3: Test autopay subscriptions  
    const testSubscriptions = await testAutoPaySubscriptions(createdPlans);

    // Step 4: Generate environment config
    generateEnvironmentConfig(createdPlans);

    // Step 5: Generate updated code
    generateUpdatedCode(createdPlans);

    // Step 6: Generate final report
    const finalReport = generateFinalReport();

    console.log("\n🎉 AUTOPAY SETUP AND TESTING COMPLETE!");
    console.log("\nFiles generated:");
    console.log("   📄 .env.autopay.generated (environment variables)");
    console.log("   📄 updated-plan-config.js (updated code)"); 
    console.log("   📄 autopay-test-report.json (detailed results)");

  } catch (error) {
    console.error("❌ Script execution failed:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Execute the script
main().catch(console.error);
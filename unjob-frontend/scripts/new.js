// Script to create new plans with correct amounts
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: "rzp_live_R5DaB01QSSlX4y",
  key_secret: "qrWxxEqffm31QrYZdDtH0U9I",
});

async function createCorrectPlans() {
  console.log('🔧 Creating correct Razorpay plans...');

  try {
    // 1. Freelancer Monthly Plan - ₹199
    const freelancerPlan = await razorpay.plans.create({
      period: "monthly",
      interval: 1,
      item: {
        name: "Basic Plan - Freelancer Monthly",
        amount: 19900, // ₹199.00 in paisa
        currency: "INR",
      },
      notes: {
        planType: "basic",
        userRole: "freelancer",
        duration: "monthly"
      }
    });

    console.log('✅ Freelancer Plan Created:', freelancerPlan.id);
    console.log('   Amount: ₹199.00');

    // 2. Hiring First Month Plan - ₹9.99
    const hiringFirstPlan = await razorpay.plans.create({
      period: "monthly", 
      interval: 1,
      item: {
        name: "Basic Plan - Hiring First Month",
        amount: 999, // ₹9.99 in paisa
        currency: "INR",
      },
      notes: {
        planType: "basic",
        userRole: "hiring", 
        duration: "monthly",
        isFirstMonth: "true"
      }
    });

    console.log('✅ Hiring First Month Plan Created:', hiringFirstPlan.id);
    console.log('   Amount: ₹9.99');

    // 3. Hiring Recurring Plan - ₹999
    const hiringRecurringPlan = await razorpay.plans.create({
      period: "monthly",
      interval: 1, 
      item: {
        name: "Basic Plan - Hiring Recurring",
        amount: 99900, // ₹999.00 in paisa
        currency: "INR",
      },
      notes: {
        planType: "basic",
        userRole: "hiring",
        duration: "monthly", 
        isRecurring: "true"
      }
    });

    console.log('✅ Hiring Recurring Plan Created:', hiringRecurringPlan.id);
    console.log('   Amount: ₹999.00');

    console.log('\n🎯 NEW PLAN IDS TO UPDATE:');
    console.log(`RAZORPAY_PLAN_FREELANCER=${freelancerPlan.id}`);
    console.log(`RAZORPAY_PLAN_HIRING_FIRST=${hiringFirstPlan.id}`);
    console.log(`RAZORPAY_PLAN_HIRING_RECURRING=${hiringRecurringPlan.id}`);

  } catch (error) {
    console.error('❌ Error creating plans:', error);
  }
}

// Run the script
createCorrectPlans();
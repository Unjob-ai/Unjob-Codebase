// hiring.js - Updated with clearer plan names
const Razorpay = require('razorpay');

// Razorpay credentials
const RAZORPAY_KEY_ID = "rzp_live_R5DaB01QSSlX4y";
const RAZORPAY_KEY_SECRET = "qrWxxEqffm31QrYZdDtH0U9I";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// UPDATED Plan configuration with clearer names
const HIRING_PLANS = {
  FIRST_MONTH: {
    period: 'monthly',
    interval: 1,
    item: {
      name: 'Hiring Plan - First Month ₹9.99 (Then ₹999/month)',
      description: 'Special first month offer: ₹9.99. Recurring: ₹999/month after first payment',
      amount: 999, // ₹9.99 in paise
      currency: 'INR'
    },
    notes: {
      plan_type: 'hiring_first_month',
      original_price: '999',
      discounted_price: '9.99',
      user_role: 'hiring',
      plan_category: 'basic',
      discount_percentage: '99',
      recurring_info: 'After first month: ₹999/month'
    }
  },
  RECURRING: {
    period: 'monthly',
    interval: 1,
    item: {
      name: 'Hiring Plan - Monthly ₹999',
      description: 'Monthly recurring plan for hiring users - ₹999/month',
      amount: 99900, // ₹999 in paise
      currency: 'INR'
    },
    notes: {
      plan_type: 'hiring_recurring',
      price: '999',
      user_role: 'hiring',
      plan_category: 'basic'
    }
  }
};

// Function to update existing plan
async function updatePlanName(planId, newName, newDescription) {
  try {
    // Note: Razorpay doesn't allow updating plan names via API
    // You need to create new plans with better names
    console.log(`⚠️  Cannot update plan ${planId} via API`);
    console.log('You need to create new plans with clearer names');
    return null;
  } catch (error) {
    console.error('Error updating plan:', error);
    throw error;
  }
}

// Create new plans with better names
async function createClearedNamedPlans() {
  try {
    console.log('🚀 Creating Hiring Plans with Clear Names...\n');

    // Create First Month Plan with clear naming
    console.log('📝 Creating First Month Plan with clear name...');
    const firstMonthPlan = await razorpay.plans.create(HIRING_PLANS.FIRST_MONTH);
    
    console.log('✅ First Month Plan Created!');
    console.log(`   Plan ID: ${firstMonthPlan.id}`);
    console.log(`   Name: ${firstMonthPlan.item.name}`);
    console.log(`   Amount: ₹${firstMonthPlan.item.amount / 100}`);

    // Create Recurring Plan
    console.log('\n📝 Creating Recurring Plan...');
    const recurringPlan = await razorpay.plans.create(HIRING_PLANS.RECURRING);
    
    console.log('✅ Recurring Plan Created!');
    console.log(`   Plan ID: ${recurringPlan.id}`);
    console.log(`   Name: ${recurringPlan.item.name}`);
    console.log(`   Amount: ₹${recurringPlan.item.amount / 100}`);

    console.log('\n🔧 NEW PLAN IDs TO USE:');
    console.log('================================');
    console.log('const RAZORPAY_PLAN_IDS = {');
    console.log(`  HIRING_FIRST_MONTH: "${firstMonthPlan.id}",`);
    console.log(`  HIRING_RECURRING: "${recurringPlan.id}"`);
    console.log('};');
    console.log('================================');

    return {
      firstMonthPlanId: firstMonthPlan.id,
      recurringPlanId: recurringPlan.id
    };

  } catch (error) {
    console.error('❌ Error creating plans:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log('🎯 CREATING HIRING PLANS WITH CLEAR NAMES');
    console.log('==========================================\n');
    
    const plans = await createClearedNamedPlans();
    
    console.log('\n✅ Plans created successfully!');
    console.log('Now update your API with the new plan IDs');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
main().catch(console.error);
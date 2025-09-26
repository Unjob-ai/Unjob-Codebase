// Filename: assign-hiring-monthly.js
// Purpose: Assign Hiring monthly subscriptions to specific users
// Run with: node assign-hiring-monthly.js

const mongoose = require("mongoose");
require("dotenv").config();

// --- User and Subscription Schemas ---
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["freelancer", "hiring"],
      required: true,
    },
  },
  { timestamps: true }
);

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userRole: {
      type: String,
      enum: ["freelancer", "hiring"],
      required: true,
    },
    planType: {
      type: String,
      enum: ["basic", "premium"],
      default: "basic",
      required: true,
    },
    duration: {
      type: String,
      enum: ["monthly", "yearly", "lifetime"],
      required: true,
    },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "active", "cancelled", "expired"],
      default: "pending",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    autoRenewal: { type: Boolean, default: false },
    paymentDetails: {
      paymentType: {
        type: String,
        enum: ["one-time", "recurring", "manual_admin"],
        required: true,
      },
      razorpayPaymentId: String,
      paidAt: Date,
    },
  },
  { timestamps: true }
);

// --- Users to assign Hiring monthly plans ---
const usersToAssignHiringMonthly = [
  "123@neuro.net",
  "777@aquabloom.net",
  "321@bytenest.com",
  "ash@grainline.net",
  "adi@med.net",
  "sahil@swift.net",
  "mannu@nova.net",
  "harsh@orbitalx.com",
  "Tej@eco.com",
  "divyam@ironclad.com",
];

async function assignHiringMonthlyPlans() {
  const MONGO_URI =
    "mongodb+srv://unjobai:UnjobAI12345678Dev@cluster0.fd5jyk9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

  try {
    console.log("🚀 Starting Hiring monthly plan assignment...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Successfully connected to MongoDB.");

    const User = mongoose.models.User || mongoose.model("User", userSchema);
    const Subscription =
      mongoose.models.Subscription ||
      mongoose.model("Subscription", subscriptionSchema);

    let processedCount = 0;
    let assignedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const email of usersToAssignHiringMonthly) {
      console.log(`\n--- Processing User: ${email} ---`);
      processedCount++;

      try {
        // Find the user
        const user = await User.findOne({ email });
        if (!user) {
          console.log(`❌ User not found: ${email}`);
          notFoundCount++;
          continue;
        }

        console.log(`👤 Found user: ${user.name} (Current role: ${user.role})`);

        // Remove any existing active subscriptions first
        const existingActiveSubscriptions = await Subscription.find({
          user: user._id,
          status: "active",
        });

        if (existingActiveSubscriptions.length > 0) {
          await Subscription.updateMany(
            { user: user._id, status: "active" },
            { $set: { status: "cancelled" } }
          );
          console.log(
            `🗑️  Cancelled ${existingActiveSubscriptions.length} existing active subscription(s)`
          );
        }

        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 1);

        // Create new Hiring monthly subscription
        const hiringSubscription = new Subscription({
          user: user._id,
          userRole: "hiring", // Set as hiring subscription
          planType: "basic",
          duration: "monthly",
          price: 99, // Hiring monthly price
          originalPrice: 999,
          discount: 90, // 90% discount (99 from 999)
          status: "active",
          startDate: startDate,
          endDate: endDate,
          autoRenewal: true,
          paymentDetails: {
            paymentType: "manual_admin",
            paidAt: new Date(),
            razorpayPaymentId: `manual_hiring_${Date.now()}_${user._id}`,
          },
        });

        await hiringSubscription.save();
        console.log(
          `🎉 SUCCESS: Assigned Hiring monthly subscription to ${user.name}`
        );
        console.log(`   📅 Start: ${startDate.toISOString().split("T")[0]}`);
        console.log(`   📅 End: ${endDate.toISOString().split("T")[0]}`);
        console.log(
          `   💰 Price: ₹${hiringSubscription.price} (${hiringSubscription.discount}% off ₹${hiringSubscription.originalPrice})`
        );
        console.log(`   🆔 Subscription ID: ${hiringSubscription._id}`);
        assignedCount++;
      } catch (userError) {
        console.error(`❌ ERROR processing ${email}:`, userError.message);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("📊 HIRING MONTHLY ASSIGNMENT SUMMARY:");
    console.log("=".repeat(70));
    console.log(
      `📧 Total emails to process: ${usersToAssignHiringMonthly.length}`
    );
    console.log(`⚙️  Users processed: ${processedCount}`);
    console.log(`🎉 Hiring subscriptions assigned: ${assignedCount}`);
    console.log(`🟡 Users skipped: ${skippedCount}`);
    console.log(`❌ Users not found: ${notFoundCount}`);
    console.log("=".repeat(70));

    if (assignedCount > 0) {
      console.log(
        "✅ All specified users now have active Hiring monthly subscriptions!"
      );
      console.log("💡 Plan Details:");
      console.log("   - Plan Type: Basic Hiring Monthly");
      console.log("   - Price: ₹99/month (90% off ₹999)");
      console.log("   - Auto-renewal: Enabled");
      console.log("   - Status: Active");
    }
  } catch (error) {
    console.error("❌ Critical error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed.");
    process.exit(0);
  }
}

// Run the function
assignHiringMonthlyPlans();

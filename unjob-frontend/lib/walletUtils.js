// ====================================================================
// UPDATED AUTO-CREDIT UTILITY - lib/walletUtils.js
// ====================================================================
import Wallet from "@/models/Wallet";
import Project from "@/models/Project";
import Gig from "@/models/Gig";
import User from "@/models/User";
import Notification from "@/models/Notification";

export async function autoAddProjectEarnings(projectId, forceApproved = false) {
  try {
    // Get project details
    const project = await Project.findById(projectId)
      .populate("freelancer", "name email")
      .populate("company", "name")
      .populate("gig", "title freelancerReceivableAmount");

    if (!project) {
      throw new Error("Project not found");
    }

    // FIXED: Allow if forceApproved is true (for immediate processing after approval)
    if (!forceApproved && project.status !== "approved") {
      throw new Error("Project not approved yet");
    }

    // Check if already credited
    if (project.autoCloseTriggered) {
      console.log("✅ Project already credited to wallet");
      return { success: true, alreadyCredited: true };
    }

    const freelancerId = project.freelancer._id;
    const earningsAmount = project.gig.freelancerReceivableAmount || project.gig.budget;

    if (!earningsAmount || earningsAmount <= 0) {
      throw new Error("Invalid earnings amount");
    }

    console.log(`💰 Earnings amount to credit: ₹${earningsAmount.toLocaleString()}`);

    // Get or create wallet
    let wallet = await Wallet.findOne({ user: freelancerId });
    if (!wallet) {
      console.log("💳 No wallet found, creating new wallet...");
      wallet = await Wallet.createUserWallet(freelancerId);
      console.log("✅ Created new wallet");
    } else {
      console.log("💳 Found existing wallet");
    }

    // NEW: Move funds from pending to available balance
    // Look for specific pending transaction for this project/gig
    console.log(`🔍 Looking for pending transaction for gig: ${project.gig._id}`);
    console.log(`💰 Current wallet state: Balance ₹${wallet.balance?.toLocaleString()}, Pending ₹${wallet.pendingAmount?.toLocaleString()}`);
    
    const pendingTransaction = wallet.transactions.find(t => 
      t.status === "pending" && 
      (t.metadata?.gigId?.toString() === project.gig._id.toString() ||
       t.metadata?.projectId?.toString() === project._id.toString() ||
       t.metadata?.gigTitle === project.gig.title)
    );
    
    if (pendingTransaction) {
      console.log(`✅ Found pending transaction: ₹${pendingTransaction.amount} (${pendingTransaction.description})`);
    } else {
      console.log(`❌ No pending transaction found for this project/gig`);
    }
    
    if (pendingTransaction && wallet.pendingAmount >= pendingTransaction.amount) {
      // Move from pending to available
      console.log(`🔄 Moving ₹${pendingTransaction.amount} from pending to available...`);
      
      try {
        await wallet.movePendingToAvailable(
          pendingTransaction.amount,
          `Project completion: ${project.title}`,
          {
            projectId: project._id,
            projectTitle: project.title,
            gigTitle: project.gig.title,
            companyName: project.company.name,
            autoCreated: true,
            relatedModel: "Project",
            relatedId: project._id,
            originalPendingTransactionId: pendingTransaction._id,
          }
        );
        
        // Mark the original pending transaction as completed
        pendingTransaction.status = "completed";
        pendingTransaction.metadata.completedAt = new Date();
        await wallet.save();
        
        console.log(`✅ Moved ₹${pendingTransaction.amount} from pending to available balance`);
      } catch (walletOpError) {
        console.error("❌ Error during wallet operation:", walletOpError);
        throw walletOpError;
      }
    } else {
      // Fallback: Add funds directly to wallet (for existing projects or if no pending found)
      const reason = pendingTransaction ? 
        `insufficient pending amount (need ₹${pendingTransaction.amount}, have ₹${wallet.pendingAmount})` : 
        'no pending transaction found';
        
      console.log(`⚠️ Using fallback method: ${reason}`);
      
      try {
        await wallet.addFunds(
          earningsAmount,
          `Project completion payment: ${project.title}`,
          {
            projectId: project._id,
            projectTitle: project.title,
            gigTitle: project.gig.title,
            companyName: project.company.name,
            autoCreated: true,
            relatedModel: "Project",
            relatedId: project._id,
            fallbackCredit: true,
            fallbackReason: reason,
          }
        );
        
        console.log(`✅ Added ₹${earningsAmount} directly to wallet (${reason})`);
      } catch (walletOpError) {
        console.error("❌ Error during fallback wallet operation:", walletOpError);
        throw walletOpError;
      }
    }

    // Mark project as credited
    project.autoCloseTriggered = true;
    project.metadata = {
      ...project.metadata,
      walletCreditedAt: new Date(),
      walletCreditAmount: earningsAmount,
    };
    await project.save();

    // Create notification
    await Notification.create({
      user: freelancerId,
      type: "wallet_credited",
      title: "💰 Earnings Added to Wallet",
      message: `₹${earningsAmount.toLocaleString()} has been added to your wallet for completing "${
        project.title
      }"`,
      relatedId: project._id,
      actionUrl: "/freelancer/wallet",
    });

    console.log(
      `✅ Added ₹${earningsAmount} to freelancer wallet successfully`
    );

    return {
      success: true,
      amount: earningsAmount,
      newBalance: wallet.balance,
      transactionId: wallet.transactions[wallet.transactions.length - 1]._id,
    };
  } catch (error) {
    console.error("❌ Auto-credit error:", error);
    throw error;
  }
}

// NEW: Function to add pending earnings when gig is accepted
export async function addPendingEarnings(gigId, freelancerId) {
  try {
    const gig = await Gig.findById(gigId);
    if (!gig) {
      throw new Error("Gig not found");
    }

    // Use freelancerReceivableAmount if available, otherwise calculate it
    let earningsAmount = gig.freelancerReceivableAmount;
    if (!earningsAmount && gig.budget) {
      // Calculate as full budget (commission temporarily disabled)
      earningsAmount = Math.round(gig.budget * 1); // Was 0.95
    }

    if (!earningsAmount || earningsAmount <= 0) {
      throw new Error("Invalid gig earnings amount");
    }

    console.log(`💰 Adding ₹${earningsAmount.toLocaleString()} as pending earnings for gig: ${gig.title}`);

    // Get or create wallet
    let wallet = await Wallet.findOne({ user: freelancerId });
    if (!wallet) {
      wallet = await Wallet.createUserWallet(freelancerId);
    }

    // Add to pending funds
    await wallet.addPendingFunds(
      earningsAmount,
      `Project in progress: ${gig.title}`,
      {
        gigId: gig._id,
        gigTitle: gig.title,
        projectInProgress: true,
        autoCreated: true,
        relatedModel: "Gig",
        relatedId: gig._id,
        pendingForApproval: true,
      }
    );

    console.log(`✅ Added ₹${earningsAmount} to pending funds for gig: ${gig.title}`);

    return {
      success: true,
      amount: earningsAmount,
      newPendingBalance: wallet.pendingAmount,
    };
  } catch (error) {
    console.error("❌ Add pending earnings error:", error);
    throw error;
  }
}

// NEW: Function for delayed conversation closure (14 days)
export async function scheduleConversationClosure(projectId, delayDays = 14) {
  try {
    const project = await Project.findById(projectId);
    if (!project || !project.conversation) {
      return { success: false, error: "Project or conversation not found" };
    }

    // Set closure date to 14 days from now
    const closureDate = new Date();
    closureDate.setDate(closureDate.getDate() + delayDays);

    // Update project with scheduled closure
    project.metadata = {
      ...project.metadata,
      scheduledClosureAt: closureDate,
      conversationClosureScheduled: true,
    };
    await project.save();

    console.log(
      `📅 Conversation closure scheduled for ${closureDate} (${delayDays} days from now)`
    );

    return {
      success: true,
      scheduledFor: closureDate,
      delayDays: delayDays,
    };
  } catch (error) {
    console.error("❌ Schedule conversation closure error:", error);
    throw error;
  }
}

// Process all pending approved projects
export async function processAllPendingEarnings() {
  try {
    const pendingProjects = await Project.find({
      status: "approved",
      autoCloseTriggered: false,
    }).populate("gig", "freelancerReceivableAmount");

    const results = [];
    for (const project of pendingProjects) {
      try {
        const result = await autoAddProjectEarnings(project._id);
        results.push({ projectId: project._id, ...result });
      } catch (error) {
        results.push({
          projectId: project._id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("❌ Process all pending earnings error:", error);
    throw error;
  }
}

// services/emailTemplates.js - Complete Email Templates System

const EMAIL_TEMPLATES = {
  // =============================================================================
  // BASE TEMPLATE WRAPPER
  // =============================================================================
  baseTemplate: (content, title = "UNJOB Notification") => `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333; padding: 0;">
      
      <!-- Header Section -->
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #10B981;">
        <h1 style="color: #10B981; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">UNJOB</h1>
        <p style="color: #666; font-size: 16px; margin: 12px 0 0 0; font-weight: 400;">${title}</p>
      </div>
      
      <!-- Main Content -->
      <div style="padding: 40px 30px;">
        ${content}
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">
          © 2025 UNJOB. All rights reserved.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          You received this email because you have an account with UNJOB
        </p>
      </div>
    </div>
  `,

  // =============================================================================
  // POST NOTIFICATIONS
  // =============================================================================
  postLike: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Someone Liked Your Post! ❤️
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        <strong style="color: #10B981;">${
          data.likerName
        }</strong> liked your post. Your content is making an impact!
      </p>
      
      ${
        data.postContent
          ? `
      <div style="background-color: #f8f9fa; border-left: 4px solid #10B981; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #374151; margin: 0; font-style: italic;">
          "${data.postContent}"
        </p>
      </div>
      `
          : ""
      }
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${data.actionUrl}" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        View Post
      </a>
    </div>
  `,
      "Post Liked"
    ),

  postComment: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        New Comment on Your Post! 💬
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        <strong style="color: #10B981;">${
          data.commenterName
        }</strong> commented on your post:
      </p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #10B981; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #374151; margin: 0; font-style: italic;">
          "${data.commentContent}"
        </p>
      </div>
      
      ${
        data.postContent
          ? `
      <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Your original post:</p>
        <p style="color: #374151; margin: 0;">
          "${data.postContent}"
        </p>
      </div>
      `
          : ""
      }
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${data.actionUrl}" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        Reply to Comment
      </a>
    </div>
  `,
      "New Comment"
    ),

  // =============================================================================
  // PAYMENT NOTIFICATIONS
  // =============================================================================
  paymentApproved: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Payment Approved! ✅
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your payment of <strong style="color: #10B981;">₹${data.amount}</strong> has been successfully processed.
      </p>
      
      <div style="background-color: #d4edda; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #10B981; margin: 0 0 10px 0;">Payment Details:</h3>
        <p style="color: #155724; margin: 0 0 8px 0;"><strong>Amount:</strong> ₹${data.amount}</p>
        <p style="color: #155724; margin: 0 0 8px 0;"><strong>Transaction ID:</strong> ${data.transactionId}</p>
        <p style="color: #155724; margin: 0 0 8px 0;"><strong>Plan:</strong> ${data.planType}</p>
        <p style="color: #155724; margin: 0;"><strong>Date:</strong> ${data.paymentDate}</p>
      </div>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${data.actionUrl}" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        View Payment Status
      </a>
    </div>
  `,
      "Payment Approved"
    ),

  // =============================================================================
  // MESSAGE NOTIFICATIONS
  // =============================================================================
  message: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        New Message Received 📧
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        You have a new message from <strong style="color: #10B981;">${data.senderName}</strong>:
      </p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #10B981; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #374151; margin: 0; font-style: italic;">
          "${data.messageContent}"
        </p>
      </div>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${data.actionUrl}" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        Reply to Message
      </a>
    </div>
  `,
      "New Message"
    ),

  // =============================================================================
  // SYSTEM NOTIFICATIONS
  // =============================================================================
  welcome: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Welcome to UNJOB! 🎉
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Welcome to UNJOB! We're excited to have you join our community. Get started by exploring the platform and connecting with like-minded professionals.
      </p>
    </div>
    
    <div style="background-color: #f0f9ff; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #10B981; margin: 0 0 10px 0;">Get Started:</h3>
      <ul style="color: #155724; margin: 0; padding-left: 20px;">
        <li>Complete your profile</li>
        <li>Connect with professionals</li>
        <li>Share your first post</li>
        <li>Explore job opportunities</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${data.actionUrl}" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        Complete Your Profile
      </a>
    </div>
  `,
      "Welcome to UNJOB"
    ),

  // =============================================================================
  // SUBSCRIPTION NOTIFICATIONS
  // =============================================================================
  subscriptionActivated: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Subscription Activated! 🎯
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your <strong style="color: #10B981;">${data.planType} ${
        data.duration || ""
      }</strong> subscription is now active. Enjoy all premium features!
      </p>
    </div>
    
    <div style="background-color: #d4edda; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #10B981; margin: 0 0 10px 0;">Premium Features Available:</h3>
      <ul style="color: #155724; margin: 0; padding-left: 20px;">
        ${
          data.features
            ? data.features.map((feature) => `<li>${feature}</li>`).join("")
            : "<li>All premium features unlocked</li>"
        }
      </ul>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${data.actionUrl}" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        Explore Premium Features
      </a>
    </div>
  `,
      "Subscription Activated"
    ),

  subscriptionReminder: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Subscription Expiring Soon ⏰
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your <strong style="color: #10B981;">${data.planType}</strong> subscription expires in <strong>${data.daysRemaining} days</strong>. Renew to continue enjoying premium features.
      </p>
    </div>
    
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #92400e; margin: 0; font-weight: 600;">
        Don't lose access to your premium features!
      </p>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${data.actionUrl}" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        Renew Subscription
      </a>
    </div>
  `,
      "Subscription Reminder"
    ),

  subscriptionExpired: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Subscription Expired ❌
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your <strong style="color: #dc3545;">${data.planType}</strong> subscription has expired. Renew now to regain access to premium features.
      </p>
    </div>
    
    <div style="background-color: #f8d7da; border: 1px solid #dc3545; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #721c24; margin: 0; font-weight: 600;">
        Premium features are now disabled. Renew to restore access.
      </p>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${data.actionUrl}" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        Renew Now
      </a>
    </div>
  `,
      "Subscription Expired"
    ),

  // =============================================================================
  // GENERIC TEMPLATE
  // =============================================================================
  generic: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        ${data.title}
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        ${data.message}
      </p>
    </div>
    
    ${
      data.actionUrl
        ? `
    <div style="text-align: center; margin: 40px 0;">
      <a href="${data.actionUrl}" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        ${data.actionText || "Take Action"}
      </a>
    </div>
    `
        : ""
    }
  `,
      data.emailTitle || "Notification"
    ),
};

module.exports = EMAIL_TEMPLATES;

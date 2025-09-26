// lib/emailTemplates.js - Complete Email Templates System

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
        Someone Liked Your Post!
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        <strong style="color: #10B981;">${data.likerName}</strong> liked your post "${data.postTitle}"
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
        New Comment on Your Post
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 16px 0;">
        <strong style="color: #10B981;">${data.commenterName}</strong> commented on your post "${data.postTitle}":
      </p>
      
      <div style="background-color: #f8f9fa; border-left: 4px solid #10B981; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #374151; margin: 0; font-style: italic;">
          "${data.commentText}"
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
        Reply to Comment
      </a>
    </div>
  `,
      "New Comment"
    ),

  postGigInvitation: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Someone Invited a Freelancer from Your Post
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        <strong style="color: #10B981;">${data.hiringUserName}</strong> invited <strong>${data.freelancerName}</strong> to work on "${data.gigTitle}" after seeing your post "${data.postTitle}"
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
        View Post
      </a>
    </div>
  `,
      "Freelancer Invitation"
    ),

  // =============================================================================
  // GIG/APPLICATION NOTIFICATIONS
  // =============================================================================
  gigApplication: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        ${
          data.isPriority
            ? "Priority Application Received"
            : "New Application Received"
        }
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        <strong style="color: #10B981;">${
          data.freelancerName
        }</strong> applied to your gig "${data.gigTitle}" with ${
        data.iterationsCount
      } iteration${data.iterationsCount > 1 ? "s" : ""}${
        data.isPriority ? " (Premium Member)" : ""
      }
      </p>
    </div>
    
    ${
      data.isPriority
        ? `
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #92400e; margin: 0; font-weight: 600;">
        Priority Application - Premium Member
      </p>
    </div>
    `
        : ""
    }
    
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
        Review Application
      </a>
    </div>
  `,
      data.isPriority ? "Priority Application" : "New Application"
    ),

  gigAccepted: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Congratulations! Application Accepted
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your application for "<strong style="color: #10B981;">${data.gigTitle}</strong>" has been accepted by <strong>${data.companyName}</strong>. You can now start working on the project.
      </p>
    </div>
    
    <div style="background-color: #d4edda; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #10B981; margin: 0 0 10px 0;">Next Steps:</h3>
      <ul style="color: #155724; margin: 0; padding-left: 20px;">
        <li>Check the project requirements carefully</li>
        <li>Set up your workspace and timeline</li>
        <li>Communicate with the client for any clarifications</li>
        <li>Start working on the project</li>
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
        Start Project
      </a>
    </div>
  `,
      "Application Accepted"
    ),

  gigRejected: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Application Not Selected
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your application for "${data.gigTitle}" was not selected this time. ${
        data.rejectionReason ? `Reason: ${data.rejectionReason}` : ""
      }
      </p>
    </div>
    
    <div style="background-color: #e8f4fd; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #10B981; margin: 0 0 10px 0;">Don't Give Up!</h3>
      <p style="color: #0c5460; margin: 0;">
        Keep applying to other opportunities. Each application is a learning experience that brings you closer to your next great project.
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
        Find More Opportunities
      </a>
    </div>
  `,
      "Application Update"
    ),

  // =============================================================================
  // PROJECT NOTIFICATIONS
  // =============================================================================
  projectSubmission: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Project Submission Received
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        <strong style="color: #10B981;">${data.freelancerName}</strong> submitted work for "${data.gigTitle}". Please review and provide feedback.
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
        Review Submission
      </a>
    </div>
  `,
      "Project Submission"
    ),

  projectStatusUpdate: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Project Status Updated
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        The status of your project "${data.gigTitle}" has been updated from <strong>${data.oldStatus}</strong> to <strong style="color: #10B981;">${data.newStatus}</strong>.
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
        View Project
      </a>
    </div>
  `,
      "Project Update"
    ),

  // =============================================================================
  // SUBSCRIPTION NOTIFICATIONS
  // =============================================================================
  subscriptionActivated: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Subscription Activated!
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your <strong style="color: #10B981;">${data.planType} ${
        data.duration
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
        Subscription Expiring Soon
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
        Subscription Expired
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
        Premium features are no longer available
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
        Renew Now
      </a>
    </div>
  `,
      "Subscription Expired"
    ),

  // =============================================================================
  // PAYMENT NOTIFICATIONS
  // =============================================================================
  paymentCompleted: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Payment Completed Successfully
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your payment of <strong style="color: #10B981;">₹${
          data.amount
        }</strong> has been completed successfully.
      </p>
    </div>
    
    <div style="background-color: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #10B981; margin: 0 0 10px 0;">Payment Details:</h3>
      <p style="color: #555; margin: 0;">
        Amount: ₹${data.amount}<br>
        Payment ID: ${data.id || "N/A"}<br>
        Date: ${new Date().toLocaleDateString("en-IN")}
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
        View Payment History
      </a>
    </div>
  `,
      "Payment Completed"
    ),

  paymentFailed: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Payment Failed
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your payment of <strong style="color: #dc3545;">₹${data.amount}</strong> failed. Please check your payment method and try again.
      </p>
    </div>
    
    <div style="background-color: #f8d7da; border: 1px solid #dc3545; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #721c24; margin: 0; font-weight: 600;">
        Please retry your payment or contact support if the issue persists.
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
        Retry Payment
      </a>
    </div>
  `,
      "Payment Failed"
    ),

  paymentRequestSubmitted: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Payment Request Submitted
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello Admin,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        <strong style="color: #10B981;">${data.freelancerName}</strong> submitted a payment request for <strong>₹${data.amount}</strong>
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
        Review Request
      </a>
    </div>
  `,
      "Payment Request"
    ),

  paymentRequestApproved: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Payment Request Approved
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your payment request for <strong style="color: #10B981;">₹${data.amount}</strong> has been approved and will be processed within 1-2 business days.
      </p>
    </div>
    
    <div style="background-color: #d4edda; border: 1px solid #10B981; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #155724; margin: 0; font-weight: 600;">
        Your payment will be transferred to your registered account soon!
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
        New Message Received
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
        Welcome to UNJOB!
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${
          data.recipientName || "there"
        }</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Welcome to UNJOB! Complete your profile to start ${
          data.role === "hiring" ? "posting gigs" : "applying to opportunities"
        }.
      </p>
    </div>
    
    <div style="background-color: #e8f4fd; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #10B981; margin: 0 0 10px 0;">Get Started:</h3>
      <ul style="color: #0c5460; margin: 0; padding-left: 20px;">
        <li>Complete your profile information</li>
        <li>Add your skills and experience</li>
        <li>Upload a professional photo</li>
        <li>${
          data.role === "hiring"
            ? "Start posting your first gig"
            : "Browse available opportunities"
        }</li>
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
        Complete Profile
      </a>
    </div>
  `,
      "Welcome to UNJOB"
    ),

  profileIncomplete: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Complete Your Profile
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Please complete your profile by adding: <strong style="color: #10B981;">${data.missingFields.join(
          ", "
        )}</strong>. This will help you get better opportunities.
      </p>
    </div>
    
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="color: #92400e; margin: 0; font-weight: 600;">
        A complete profile increases your chances of getting hired!
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
        Complete Profile
      </a>
    </div>
  `,
      "Profile Incomplete"
    ),

  // =============================================================================
  // INVOICE EMAIL TEMPLATE
  // =============================================================================
  invoice: (invoiceData) => {
    const {
      customer,
      subscription,
      payment,
      invoiceNumber,
      invoiceDate,
      company,
    } = invoiceData;

    return EMAIL_TEMPLATES.baseTemplate(
      `
      <div style="margin-bottom: 32px;">
        <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
          Your Invoice is Ready
        </h2>
        
        <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
          Hello <strong style="color: #333;">${customer.name}</strong>,
        </p>
        
        <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
          Thank you for your subscription payment. Your invoice <strong style="color: #10B981;">${invoiceNumber}</strong> is now available.
        </p>
      </div>
      
      <!-- Invoice Summary Card -->
      <div style="background-color: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 12px; border-left: 4px solid #10B981; padding: 24px; margin: 32px 0;">
        <h3 style="color: #10B981; margin: 0 0 20px 0; font-size: 18px; font-weight: 600; border-bottom: 2px solid #10B981; padding-bottom: 8px;">
          Invoice Summary
        </h3>
        
        <div style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
            <span style="color: #555; font-weight: 500;">Invoice Number:</span>
            <span style="color: #333; font-weight: 600;">${invoiceNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
            <span style="color: #555; font-weight: 500;">Invoice Date:</span>
            <span style="color: #333;">${new Date(
              invoiceDate
            ).toLocaleDateString("en-IN")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
            <span style="color: #555; font-weight: 500;">Plan Type:</span>
            <span style="color: #333; text-transform: capitalize;">${
              subscription.planType
            }</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
            <span style="color: #555; font-weight: 500;">Duration:</span>
            <span style="color: #333; text-transform: capitalize;">${
              subscription.duration
            }</span>
          </div>
        </div>
        
        <!-- Amount Section -->
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-top: 20px;">
          <div style="display: flex; justify-content: space-between; padding: 6px 0; color: #555;">
            <span>Subtotal:</span>
            <span>₹${payment.subtotal.toLocaleString("en-IN")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; color: #555;">
            <span>GST (18%):</span>
            <span>₹${payment.tax.toLocaleString("en-IN")}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; font-weight: bold; font-size: 18px; color: #10B981; border-top: 2px solid #10B981; margin-top: 10px;">
            <span>Total Amount:</span>
            <span>₹${payment.total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>
      
      <!-- Download Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="${
          process.env.NEXTAUTH_URL || "http://localhost:3000"
        }/api/subscription/invoice?format=pdf" 
           style="display: inline-block; 
                  background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                  color: #ffffff; 
                  padding: 16px 32px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: 600; 
                  font-size: 16px;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
          Download PDF Invoice
        </a>
      </div>
    `,
      "Invoice Receipt"
    );
  },
};

export default EMAIL_TEMPLATES;

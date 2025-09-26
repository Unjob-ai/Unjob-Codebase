// lib/NotificationService.js - Complete Enhanced Notification Service
import Notification from "@/models/Notification";
import User from "@/models/User";
import EMAIL_TEMPLATES from "@/lib/emailTemplates";

class NotificationService {
  // =============================================================================
  // EMAIL SENDING UTILITY
  // =============================================================================
  static async sendEmail(to, subject, htmlContent) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: {
            name: "UNJOB",
            email: process.env.FROM_EMAIL || "noreply@unjob.com",
          },
          to: [
            {
              email: to.email,
              name: to.name,
            },
          ],
          subject: subject,
          htmlContent: htmlContent,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          `Brevo API error: ${result.message || response.statusText}`
        );
      }

      console.log(`✅ Email sent successfully to ${to.email}`);
      return {
        success: true,
        messageId: result.messageId,
        sentTo: to.email,
      };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to.email}:`, error);
      return { success: false, error: error.message };
    }
  }

  // =============================================================================
  // ENHANCED NOTIFICATION CREATION (Website + Email)
  // =============================================================================
  static async createNotificationWithEmail({
    userId,
    type,
    title,
    message,
    relatedId = null,
    relatedModel = null,
    actionUrl = null,
    metadata = {},
    priority = "medium",
    senderUser = null,
    emailData = {},
    sendEmail = true,
  }) {
    try {
      // Create website notification
      const notificationData = {
        user: userId,
        type,
        title,
        message,
        relatedId,
        relatedModel,
        actionUrl: actionUrl
          ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${actionUrl}`
          : null,
        metadata,
        priority,
      };

      // Add sender info if provided
      if (senderUser) {
        notificationData.avatar = senderUser.image;
        notificationData.senderName =
          senderUser.name || senderUser.email?.split("@")[0];
      }

      const notification = await Notification.create(notificationData);
      console.log(
        `✅ Website notification created: ${type} for user ${userId}`
      );

      // Send email if enabled
      if (sendEmail && EMAIL_TEMPLATES[type]) {
        try {
          // Get user details for email
          const user = await User.findById(userId);
          if (!user) {
            console.warn(`⚠️ User ${userId} not found for email notification`);
            return notification;
          }

          // Prepare email data
          const emailTemplateData = {
            recipientName: user.name || user.email?.split("@")[0],
            actionUrl: actionUrl
              ? `${
                  process.env.NEXTAUTH_URL || "http://localhost:3000"
                }${actionUrl}`
              : "#",
            ...emailData,
          };

          // Generate email content
          const htmlContent = EMAIL_TEMPLATES[type](emailTemplateData);

          // Email subject mapping
          const subjectMap = {
            post_like: "Someone liked your post - UNJOB",
            post_comment: "New comment on your post - UNJOB",
            post_gig_invitation: "Freelancer invitation from your post - UNJOB",
            gig_application: emailData.isPriority
              ? "Priority application received - UNJOB"
              : "New application received - UNJOB",
            priority_gig_application: "Priority application received - UNJOB",
            gig_accepted: "Application accepted! - UNJOB",
            gig_rejected: "Application update - UNJOB",
            project_submission: "Project submission received - UNJOB",
            project_status_update: "Project status updated - UNJOB",
            subscription_activated: "Subscription activated - UNJOB",
            subscription_reminder: "Subscription expiring soon - UNJOB",
            subscription_expired: "Subscription expired - UNJOB",
            payment_completed: "Payment completed - UNJOB",
            payment_failed: "Payment failed - UNJOB",
            payment_request_submitted: "Payment request submitted - UNJOB",
            payment_request_approved: "Payment request approved - UNJOB",
            message: "New message received - UNJOB",
            welcome: "Welcome to UNJOB!",
            profile_incomplete: "Complete your profile - UNJOB",
            invoice: `Invoice ${emailData.invoiceNumber} - UNJOB`,
          };

          const subject = subjectMap[type] || "Notification from UNJOB";

          // Send email
          await this.sendEmail(
            { email: user.email, name: user.name },
            subject,
            htmlContent
          );
        } catch (emailError) {
          console.error(
            `❌ Failed to send email for notification ${type}:`,
            emailError
          );
          // Don't throw - website notification should still work even if email fails
        }
      }

      return notification;
    } catch (error) {
      console.error("❌ Failed to create notification:", error);
      throw error;
    }
  }

  // =============================================================================
  // POST NOTIFICATIONS
  // =============================================================================
  static async notifyPostLike(
    postOwnerId,
    likerUser,
    postId,
    postTitle,
    recipientUser = null
  ) {
    if (postOwnerId.toString() === likerUser._id.toString()) {
      return; // Don't notify self
    }

    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(postOwnerId);
    }

    return this.createNotificationWithEmail({
      userId: postOwnerId,
      type: "post_like",
      title: "❤️ Someone liked your post",
      message: `${
        likerUser.name || likerUser.email?.split("@")[0]
      } liked your post "${postTitle?.substring(0, 50)}${
        postTitle?.length > 50 ? "..." : ""
      }"`,
      relatedId: postId,
      relatedModel: "Post",
      actionUrl: `/dashboard/post/${postId}`,
      senderUser: likerUser,
      priority: "low",
      emailData: {
        likerName: likerUser.name || likerUser.email?.split("@")[0],
        postTitle: postTitle,
      },
    });
  }

  static async notifyPostComment(
    postOwnerId,
    commenterUser,
    postId,
    postTitle,
    commentText,
    recipientUser = null
  ) {
    if (postOwnerId.toString() === commenterUser._id.toString()) {
      return; // Don't notify self
    }

    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(postOwnerId);
    }

    return this.createNotificationWithEmail({
      userId: postOwnerId,
      type: "post_comment",
      title: "💬 New comment on your post",
      message: `${
        commenterUser.name || commenterUser.email?.split("@")[0]
      } commented: "${commentText?.substring(0, 100)}${
        commentText?.length > 100 ? "..." : ""
      }"`,
      relatedId: postId,
      relatedModel: "Post",
      actionUrl: `/dashboard/post/${postId}`,
      senderUser: commenterUser,
      priority: "medium",
      metadata: { commentText },
      emailData: {
        commenterName: commenterUser.name || commenterUser.email?.split("@")[0],
        postTitle: postTitle,
        commentText: commentText?.substring(0, 200),
      },
    });
  }

  static async notifyPostOwnerOfInvitation(
    postOwnerId,
    hiringUser,
    freelancerUser,
    postId,
    postTitle,
    gigTitle,
    recipientUser = null
  ) {
    // Don't notify if hiring user is the post owner
    if (postOwnerId.toString() === hiringUser._id.toString()) {
      return;
    }

    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(postOwnerId);
    }

    return this.createNotificationWithEmail({
      userId: postOwnerId,
      type: "post_gig_invitation",
      title: "🎯 Someone Invited a Freelancer from Your Post",
      message: `${hiringUser.name || hiringUser.email?.split("@")[0]} invited ${
        freelancerUser.name || freelancerUser.email?.split("@")[0]
      } to work on "${gigTitle}" after seeing your post "${postTitle?.substring(
        0,
        50
      )}${postTitle?.length > 50 ? "..." : ""}"`,
      relatedId: postId,
      relatedModel: "Post",
      actionUrl: `/dashboard/post/${postId}`,
      senderUser: hiringUser,
      priority: "medium",
      metadata: {
        postTitle,
        gigTitle,
        freelancerName: freelancerUser.name,
        hiringUserName: hiringUser.name,
      },
      emailData: {
        hiringUserName: hiringUser.name || hiringUser.email?.split("@")[0],
        freelancerName:
          freelancerUser.name || freelancerUser.email?.split("@")[0],
        gigTitle: gigTitle,
        postTitle: postTitle,
      },
    });
  }

  // =============================================================================
  // GIG/APPLICATION NOTIFICATIONS
  // =============================================================================
  static async notifyGigApplication(
    companyId,
    freelancerUser,
    gigId,
    gigTitle,
    iterationsCount,
    isPriority = false,
    recipientUser = null
  ) {
    const premiumBadge = isPriority ? " (Premium Member)" : "";
    const priorityPrefix = isPriority ? "🔥 Priority " : "📄 New ";

    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(companyId);
    }

    return this.createNotificationWithEmail({
      userId: companyId,
      type: isPriority ? "priority_gig_application" : "gig_application",
      title: `${priorityPrefix}Application Received`,
      message: `${
        freelancerUser.name || freelancerUser.email?.split("@")[0]
      } applied to your gig "${gigTitle}" with ${iterationsCount} iteration${
        iterationsCount > 1 ? "s" : ""
      }${premiumBadge}`,
      relatedId: gigId,
      relatedModel: "Gig",
      actionUrl: `/dashboard/gigs/${gigId}/applications`,
      senderUser: freelancerUser,
      priority: isPriority ? "high" : "medium",
      metadata: {
        gigTitle,
        iterationsCount,
        isPriority,
        freelancerName: freelancerUser.name,
      },
      emailData: {
        freelancerName:
          freelancerUser.name || freelancerUser.email?.split("@")[0],
        gigTitle: gigTitle,
        iterationsCount: iterationsCount,
        isPriority: isPriority,
      },
    });
  }

  static async notifyApplicationAccepted(
    freelancerId,
    companyUser,
    gigId,
    gigTitle,
    projectDetails = {},
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(freelancerId);
    }

    return this.createNotificationWithEmail({
      userId: freelancerId,
      type: "gig_accepted",
      title: "🎉 Application Accepted!",
      message: `Congratulations! Your application for "${gigTitle}" has been accepted. You can now start working on the project.`,
      relatedId: gigId,
      relatedModel: "Gig",
      actionUrl: `/dashboard/settings/freelancer`,
      senderUser: companyUser,
      priority: "high",
      metadata: {
        gigTitle,
        companyName: companyUser.name,
        projectDetails,
      },
      emailData: {
        gigTitle: gigTitle,
        companyName: companyUser.name || companyUser.email?.split("@")[0],
        projectDetails: projectDetails,
      },
    });
  }

  static async notifyApplicationRejected(
    freelancerId,
    companyUser,
    gigId,
    gigTitle,
    reason = "",
    recipientUser = null
  ) {
    const reasonText = reason ? ` Reason: ${reason}` : "";

    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(freelancerId);
    }

    return this.createNotificationWithEmail({
      userId: freelancerId,
      type: "gig_rejected",
      title: "❌ Application Not Selected",
      message: `Your application for "${gigTitle}" was not selected.${reasonText} Keep applying to other opportunities!`,
      relatedId: gigId,
      relatedModel: "Gig",
      actionUrl: `/dashboard/settings/freelancer`,
      senderUser: companyUser,
      priority: "medium",
      metadata: {
        gigTitle,
        companyName: companyUser.name,
        rejectionReason: reason,
      },
      emailData: {
        gigTitle: gigTitle,
        rejectionReason: reason,
      },
    });
  }

  // =============================================================================
  // PROJECT NOTIFICATIONS
  // =============================================================================
  static async notifyProjectSubmission(
    companyId,
    freelancerUser,
    projectId,
    gigTitle,
    submissionDetails,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(companyId);
    }

    return this.createNotificationWithEmail({
      userId: companyId,
      type: "project_submission",
      title: "📤 Project Submission Received",
      message: `${
        freelancerUser.name || freelancerUser.email?.split("@")[0]
      } submitted work for "${gigTitle}". Please review and provide feedback.`,
      relatedId: projectId,
      relatedModel: "Project",
      actionUrl: `/dashboard/settings/hiring`,
      senderUser: freelancerUser,
      priority: "high",
      metadata: {
        gigTitle,
        submissionDetails,
        freelancerName: freelancerUser.name,
      },
      emailData: {
        freelancerName:
          freelancerUser.name || freelancerUser.email?.split("@")[0],
        gigTitle: gigTitle,
        submissionDetails: submissionDetails,
      },
    });
  }

  static async notifyProjectStatusUpdate(
    userId,
    senderUser,
    projectId,
    gigTitle,
    oldStatus,
    newStatus,
    recipientUser = null
  ) {
    const statusMessages = {
      approved: "✅ Your project submission has been approved!",
      needs_revision: "🔄 Your project needs revision",
      completed: "🎉 Project completed successfully!",
      rejected: "❌ Project submission was rejected",
    };

    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(userId);
    }

    return this.createNotificationWithEmail({
      userId,
      type: "project_status_update",
      title: "📋 Project Status Updated",
      message:
        statusMessages[newStatus] ||
        `Project "${gigTitle}" status changed from ${oldStatus} to ${newStatus}`,
      relatedId: projectId,
      relatedModel: "Project",
      actionUrl: `/dashboard/settings/hiring`,
      senderUser: senderUser,
      priority: "high",
      metadata: {
        gigTitle,
        oldStatus,
        newStatus,
      },
      emailData: {
        gigTitle: gigTitle,
        oldStatus: oldStatus,
        newStatus: newStatus,
      },
    });
  }

  // =============================================================================
  // SUBSCRIPTION NOTIFICATIONS
  // =============================================================================
  static async notifySubscriptionActivated(
    userId,
    subscriptionDetails,
    recipientUser = null
  ) {
    const { planType, duration, features } = subscriptionDetails;

    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(userId);
    }

    return this.createNotificationWithEmail({
      userId,
      type: "subscription_activated",
      title: "🚀 Subscription Activated!",
      message: `Your ${planType} ${duration} subscription is now active. Enjoy all premium features!`,
      relatedId: subscriptionDetails._id,
      relatedModel: "Subscription",
      actionUrl: `/dashboard/settings/subscription`,
      priority: "high",
      metadata: {
        planType,
        duration,
        features,
      },
      emailData: {
        planType: planType,
        duration: duration,
        features: features,
      },
    });
  }

  static async notifySubscriptionExpiring(
    userId,
    subscriptionDetails,
    daysRemaining,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(userId);
    }

    return this.createNotificationWithEmail({
      userId,
      type: "subscription_reminder",
      title: "⏰ Subscription Expiring Soon",
      message: `Your ${subscriptionDetails.planType} subscription expires in ${daysRemaining} days. Renew to continue enjoying premium features.`,
      relatedId: subscriptionDetails._id,
      relatedModel: "Subscription",
      actionUrl: `/dashboard/settings/subscription`,
      priority: "medium",
      metadata: {
        daysRemaining,
        planType: subscriptionDetails.planType,
      },
      emailData: {
        planType: subscriptionDetails.planType,
        daysRemaining: daysRemaining,
      },
    });
  }

  static async notifySubscriptionExpired(
    userId,
    subscriptionDetails,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(userId);
    }

    return this.createNotificationWithEmail({
      userId,
      type: "subscription_expired",
      title: "❗ Subscription Expired",
      message: `Your ${subscriptionDetails.planType} subscription has expired. Renew now to regain access to premium features.`,
      relatedId: subscriptionDetails._id,
      relatedModel: "Subscription",
      actionUrl: `/dashboard/settings/subscription`,
      priority: "high",
      metadata: {
        planType: subscriptionDetails.planType,
      },
      emailData: {
        planType: subscriptionDetails.planType,
      },
    });
  }

  // =============================================================================
  // PAYMENT NOTIFICATIONS
  // =============================================================================
  static async notifyPaymentCompleted(
    userId,
    paymentDetails,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(userId);
    }

    return this.createNotificationWithEmail({
      userId,
      type: "payment_completed",
      title: "💰 Payment Completed",
      message: `Payment of ₹${paymentDetails.amount} has been completed successfully.`,
      relatedId: paymentDetails._id,
      relatedModel: "Payment",
      actionUrl: `/dashboard/payments`,
      priority: "medium",
      metadata: paymentDetails,
      emailData: {
        amount: paymentDetails.amount,
        id: paymentDetails._id,
      },
    });
  }

  static async notifyPaymentFailed(
    userId,
    paymentDetails,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(userId);
    }

    return this.createNotificationWithEmail({
      userId,
      type: "payment_failed",
      title: "❌ Payment Failed",
      message: `Payment of ₹${paymentDetails.amount} failed. Please check your payment method and try again.`,
      relatedId: paymentDetails._id,
      relatedModel: "Payment",
      actionUrl: `/dashboard/payments`,
      priority: "high",
      metadata: paymentDetails,
      emailData: {
        amount: paymentDetails.amount,
        id: paymentDetails._id,
      },
    });
  }

  static async notifyPaymentRequestSubmitted(
    adminUserId,
    freelancerUser,
    paymentDetails,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(adminUserId);
    }

    return this.createNotificationWithEmail({
      userId: adminUserId,
      type: "payment_request_submitted",
      title: "💳 Payment Request Submitted",
      message: `${
        freelancerUser.name || freelancerUser.email?.split("@")[0]
      } submitted a payment request for ₹${paymentDetails.amount}`,
      relatedId: paymentDetails._id,
      relatedModel: "Payment",
      actionUrl: `/admin/payments/${paymentDetails._id}`,
      senderUser: freelancerUser,
      priority: "medium",
      metadata: paymentDetails,
      emailData: {
        freelancerName:
          freelancerUser.name || freelancerUser.email?.split("@")[0],
        amount: paymentDetails.amount,
      },
    });
  }

  static async notifyPaymentRequestApproved(
    freelancerId,
    adminUser,
    paymentDetails,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(freelancerId);
    }

    return this.createNotificationWithEmail({
      userId: freelancerId,
      type: "payment_request_approved",
      title: "✅ Payment Request Approved",
      message: `Your payment request for ₹${paymentDetails.amount} has been approved and will be processed within 1-2 business days.`,
      relatedId: paymentDetails._id,
      relatedModel: "Payment",
      actionUrl: `/dashboard/payments`,
      senderUser: adminUser,
      priority: "high",
      metadata: paymentDetails,
      emailData: {
        amount: paymentDetails.amount,
      },
    });
  }

  // =============================================================================
  // MESSAGE NOTIFICATIONS
  // =============================================================================
  static async notifyNewMessage(
    recipientId,
    senderUser,
    messageContent,
    conversationId,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(recipientId);
    }

    return this.createNotificationWithEmail({
      userId: recipientId,
      type: "message",
      title: "💬 New Message",
      message: `${
        senderUser.name || senderUser.email?.split("@")[0]
      }: ${messageContent?.substring(0, 100)}${
        messageContent?.length > 100 ? "..." : ""
      }`,
      relatedId: conversationId,
      relatedModel: "Message",
      actionUrl: `/dashboard/messages/${conversationId}`,
      senderUser: senderUser,
      priority: "medium",
      metadata: {
        messageContent,
        conversationId,
      },
      emailData: {
        senderName: senderUser.name || senderUser.email?.split("@")[0],
        messageContent: messageContent?.substring(0, 200),
      },
    });
  }

  // =============================================================================
  // SYSTEM NOTIFICATIONS
  // =============================================================================
  static async notifyWelcome(userId, userDetails) {
    return this.createNotificationWithEmail({
      userId,
      type: "welcome",
      title: "🎉 Welcome to UnJob!",
      message: `Welcome ${
        userDetails.name || "there"
      }! Complete your profile to start ${
        userDetails.role === "hiring"
          ? "posting gigs"
          : "applying to opportunities"
      }.`,
      actionUrl: `/dashboard/profile`,
      priority: "medium",
      metadata: userDetails,
      emailData: {
        role: userDetails.role,
      },
    });
  }

  static async notifyProfileIncomplete(
    userId,
    missingFields,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(userId);
    }

    return this.createNotificationWithEmail({
      userId,
      type: "profile_incomplete",
      title: "📝 Complete Your Profile",
      message: `Please complete your profile by adding: ${missingFields.join(
        ", "
      )}. This will help you get better opportunities.`,
      actionUrl: `/dashboard/profile`,
      priority: "medium",
      metadata: { missingFields },
      emailData: {
        missingFields: missingFields,
      },
    });
  }

  // =============================================================================
  // INVOICE NOTIFICATION
  // =============================================================================
  static async notifyInvoiceGenerated(
    userId,
    invoiceData,
    recipientUser = null
  ) {
    // Get recipient user if not provided
    if (!recipientUser) {
      recipientUser = await User.findById(userId);
    }

    return this.createNotificationWithEmail({
      userId,
      type: "invoice",
      title: "📧 Your Invoice is Ready",
      message: `Your invoice ${invoiceData.invoiceNumber} for ${invoiceData.subscription.planType} subscription is now available.`,
      relatedId: invoiceData.payment.id,
      relatedModel: "Payment",
      actionUrl: `/api/subscription/invoice?format=pdf`,
      priority: "medium",
      emailData: invoiceData,
    });
  }

  // =============================================================================
  // BULK NOTIFICATION HELPERS
  // =============================================================================
  static async createBulkNotifications(notifications) {
    try {
      const results = await Promise.allSettled(
        notifications.map((notification) =>
          this.createNotificationWithEmail(notification)
        )
      );

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.filter(
        (result) => result.status === "rejected"
      ).length;

      console.log(
        `✅ Bulk notifications: ${successful} successful, ${failed} failed`
      );
      return { successful, failed, results };
    } catch (error) {
      console.error("❌ Bulk notification creation failed:", error);
      throw error;
    }
  }

  // =============================================================================
  // NOTIFICATION CLEANUP
  // =============================================================================
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { read: true },
        { new: true }
      );
      return notification;
    } catch (error) {
      console.error("❌ Failed to mark notification as read:", error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { user: userId, read: false },
        { read: true }
      );
      return result;
    } catch (error) {
      console.error("❌ Failed to mark all notifications as read:", error);
      throw error;
    }
  }

  static async deleteOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true,
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old notifications`);
      return result;
    } catch (error) {
      console.error("❌ Failed to cleanup old notifications:", error);
      throw error;
    }
  }

  // =============================================================================
  // BACKWARD COMPATIBILITY - Original methods without email
  // =============================================================================
  static async createNotification(params) {
    return this.createNotificationWithEmail({
      ...params,
      sendEmail: false, // Disable email for backward compatibility
    });
  }
}

// At the end of your EMAIL_TEMPLATES object, before export
EMAIL_TEMPLATES.post_like = EMAIL_TEMPLATES.postLike;
EMAIL_TEMPLATES.post_comment = EMAIL_TEMPLATES.postComment;
EMAIL_TEMPLATES.post_gig_invitation = EMAIL_TEMPLATES.postGigInvitation;
EMAIL_TEMPLATES.gig_application = EMAIL_TEMPLATES.gigApplication;
EMAIL_TEMPLATES.priority_gig_application = EMAIL_TEMPLATES.gigApplication;
EMAIL_TEMPLATES.gig_accepted = EMAIL_TEMPLATES.gigAccepted;
EMAIL_TEMPLATES.gig_rejected = EMAIL_TEMPLATES.gigRejected;
EMAIL_TEMPLATES.project_submission = EMAIL_TEMPLATES.projectSubmission;
EMAIL_TEMPLATES.project_status_update = EMAIL_TEMPLATES.projectStatusUpdate;
EMAIL_TEMPLATES.subscription_activated = EMAIL_TEMPLATES.subscriptionActivated;
EMAIL_TEMPLATES.subscription_reminder = EMAIL_TEMPLATES.subscriptionReminder;
EMAIL_TEMPLATES.subscription_expired = EMAIL_TEMPLATES.subscriptionExpired;
EMAIL_TEMPLATES.payment_completed = EMAIL_TEMPLATES.paymentCompleted;
EMAIL_TEMPLATES.payment_failed = EMAIL_TEMPLATES.paymentFailed;
EMAIL_TEMPLATES.payment_request_submitted =
  EMAIL_TEMPLATES.paymentRequestSubmitted;
EMAIL_TEMPLATES.payment_request_approved =
  EMAIL_TEMPLATES.paymentRequestApproved;
EMAIL_TEMPLATES.profile_incomplete = EMAIL_TEMPLATES.profileIncomplete;

export default NotificationService;

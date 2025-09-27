// services/enhancedNotificationService.js
import { Notification } from "../models/NotificationModel.js";
import { User } from "../models/UserModel.js";
import emailService from "./emailService.js";
import fs from "fs/promises";
import path from "path";

class EnhancedNotificationService {
  constructor() {
    this.emailService = emailService;
    this.initialized = false;
    this.emailEnabled = false;
    // Don't initialize immediately - use lazy initialization like your working service
  }

  initializeService() {
    if (this.initialized) {
      return;
    }

    try {
      const apiKey = process.env.BREVO_API_KEY;

      if (!apiKey) {
        console.warn(
          "BREVO_API_KEY not found. Enhanced notification email service will be disabled."
        );
        this.emailEnabled = false;
        this.initialized = true;
        return;
      }

      this.emailEnabled = true;
      this.initialized = true;
      console.log("✅ Enhanced notification service initialized successfully");
    } catch (error) {
      console.error(
        "❌ Enhanced notification service initialization failed:",
        error
      );
      this.emailEnabled = false;
      this.initialized = true;
    }
  }

  async loadEmailTemplate(templateName) {
    try {
      // Ensure this resolves correctly
      // Change this line in your service:
      const templatePath = path.join(
        process.cwd(),
        "src",
        "emailTemplates",
        `${templateName}.html`
      );
      const template = await fs.readFile(templatePath, "utf-8");
      return template;
    } catch (error) {
      console.error(`Failed to load email template ${templateName}:`, error);
      return this.getDefaultTemplate();
    }
  }

  replaceTemplateVariables(template, variables) {
    let processedTemplate = template;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      processedTemplate = processedTemplate.replace(
        regex,
        variables[key] || ""
      );
    });
    return processedTemplate;
  }

  getDefaultTemplate() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>UNJOB Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #10B981;">
          <h1 style="color: #10B981; margin: 0; font-size: 32px; font-weight: bold;">UNJOB</h1>
          <p style="color: #666; margin: 12px 0 0 0;">{{title}}</p>
        </div>
        <div style="padding: 40px 30px;">
          {{content}}
        </div>
        <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">© 2025 UNJOB. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  async sendEmail(to, subject, templateName, templateData) {
    // Initialize service if not already done (lazy initialization)
    this.initializeService();

    try {
      if (!this.emailEnabled) {
        console.warn(
          "Enhanced notification email service not available. Skipping email:",
          subject
        );
        return { success: false, error: "Email service not configured" };
      }

      const template = await this.loadEmailTemplate(templateName);
      const html = this.replaceTemplateVariables(template, templateData);

      const result = await this.emailService.sendEmail({
        to,
        subject,
        html,
      });

      if (result.success) {
        console.log(`✅ Email sent successfully to ${to}: ${subject}`);
      }

      return result;
    } catch (error) {
      console.error(`❌ Email sending failed:`, error);

      return {
        success: false,
        error: error.message,
        to,
        subject,
      };
    }
  }

  async createInAppNotification(userId, notificationData) {
    try {
      const notification = new Notification({
        user: userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        relatedId: notificationData.relatedId,
        relatedModel: notificationData.relatedModel,
        actionUrl: notificationData.actionUrl,
        metadata: notificationData.metadata,
        priority: notificationData.priority || "medium",
        avatar: notificationData.avatar,
        senderName: notificationData.senderName,
        read: false,
      });

      await notification.save();
      console.log("✅ In-app notification created:", notification._id);

      return { success: true, notification };
    } catch (error) {
      console.error("❌ Failed to create in-app notification:", error);
      return { success: false, error: error.message };
    }
  }

  async notifyUser(
    userId,
    userEmail,
    notificationData,
    emailTemplateName,
    emailSubject,
    emailTemplateData
  ) {
    const results = {
      email: null,
      inApp: null,
    };

    // Create in-app notification
    results.inApp = await this.createInAppNotification(
      userId,
      notificationData
    );

    // Send email notification - only if email is provided and service is available
    if (userEmail && emailTemplateName) {
      results.email = await this.sendEmail(
        userEmail,
        emailSubject,
        emailTemplateName,
        emailTemplateData
      );
    }

    return results;
  }

  // Comment Notifications
  async notifyCommentAdded(commentData) {
    const {
      postOwnerId,
      postOwnerEmail,
      postOwnerName,
      commenterName,
      commentContent,
      postTitle,
      postId,
    } = commentData;

    const notificationData = {
      type: "post_comment",
      title: "New Comment on Your Post",
      message: `${commenterName} commented on your post: "${commentContent.substring(
        0,
        50
      )}${commentContent.length > 50 ? "..." : ""}"`,
      relatedId: postId,
      relatedModel: "Post",
      actionUrl: `${process.env.CLIENT_URL}/posts/${postId}`,
      priority: "medium",
      senderName: commenterName,
    };

    const emailTemplateData = {
      title: "New Comment on Your Post",
      recipientName: postOwnerName,
      commenterName,
      commentContent,
      postTitle,
      actionUrl: `${process.env.CLIENT_URL}/posts/${postId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      postOwnerId,
      postOwnerEmail,
      notificationData,
      "comment_notification",
      `${commenterName} commented on your post`,
      emailTemplateData
    );
  }

  // Post Like Notifications
  async notifyPostLike(likeData) {
    const {
      postOwnerId,
      postOwnerEmail,
      postOwnerName,
      likerName,
      likerAvatar,
      postTitle,
      postContent,
      postId,
    } = likeData;

    const notificationData = {
      type: "post_like",
      title: "Someone Liked Your Post",
      message: `${likerName} liked your post "${postTitle || "your post"}"`,
      relatedId: postId,
      relatedModel: "Post",
      actionUrl: `${process.env.CLIENT_URL}/posts/${postId}`,
      priority: "low",
      senderName: likerName,
      avatar: likerAvatar,
    };

    const emailTemplateData = {
      title: "Someone Liked Your Post!",
      recipientName: postOwnerName,
      likerName,
      likerAvatar,
      postTitle: postTitle || "Your Post",
      postContent: postContent?.substring(0, 150) || "",
      actionUrl: `${process.env.CLIENT_URL}/posts/${postId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    console.log(
      "📧 Email service status:",
      this.emailService ? "Available" : "Not available"
    );
    console.log("📧 Sending like email to:", postOwnerEmail);
    console.log("📧 Email template:", "post-interaction");
    
    return await this.notifyUser(
      postOwnerId,
      postOwnerEmail,
      notificationData,
      "post_like_notification",
      `${likerName} liked your post on UNJOB`,
      emailTemplateData
    );
  }

  // Follow Notifications
  async notifyNewFollower(followerData) {
    const {
      followedUserId,
      followedUserEmail,
      followedUserName,
      followerName,
      followerAvatar,
      followerBio,
      followerSkills,
      followerId,
    } = followerData;

    const notificationData = {
      type: "user_follow",
      title: "New Follower",
      message: `${followerName} started following you`,
      relatedId: followerId,
      relatedModel: "User",
      actionUrl: `${process.env.CLIENT_URL}/profile/${followerId}`,
      priority: "medium",
      senderName: followerName,
      avatar: followerAvatar,
    };

    const emailTemplateData = {
      title: "New Follower!",
      recipientName: followedUserName,
      followerName,
      followerAvatar,
      followerBio,
      followerSkills,
      actionUrl: `${process.env.CLIENT_URL}/profile/${followerId}`,
      followBackUrl: `${process.env.CLIENT_URL}/follow/${followerId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      followedUserId,
      followedUserEmail,
      notificationData,
      "follow_notification",
      `${followerName} started following you on UNJOB`,
      emailTemplateData
    );
  }

  // Gig Invitation Notifications
  async notifyGigInvitation(invitationData) {
    const {
      inviteeId,
      inviteeEmail,
      inviteeName,
      inviterName,
      gigTitle,
      gigId,
      invitationId,
    } = invitationData;

    const notificationData = {
      type: "gig_invitation",
      title: "Gig Invitation Received",
      message: `${inviterName} invited you to apply for "${gigTitle}"`,
      relatedId: invitationId,
      relatedModel: "GigInvitation",
      actionUrl: `${process.env.CLIENT_URL}/gigs/${gigId}`,
      priority: "high",
      senderName: inviterName,
    };

    const emailTemplateData = {
      title: "You're Invited to Apply for a Gig",
      recipientName: inviteeName,
      inviterName,
      gigTitle,
      actionUrl: `${process.env.CLIENT_URL}/gigs/${gigId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      inviteeId,
      inviteeEmail,
      notificationData,
      "gig_invitation",
      `You're invited to apply for "${gigTitle}"`,
      emailTemplateData
    );
  }

  // Gig Application Notifications
  async notifyGigApplication(applicationData) {
    const {
      gigOwnerId,
      gigOwnerEmail,
      gigOwnerName,
      applicantName,
      gigTitle,
      gigId,
      applicationId,
    } = applicationData;

    const notificationData = {
      type: "gig_application",
      title: "New Application Received",
      message: `${applicantName} applied to your gig "${gigTitle}"`,
      relatedId: applicationId,
      relatedModel: "Application",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/gigs/${gigId}/applications`,
      priority: "high",
      senderName: applicantName,
    };

    const emailTemplateData = {
      title: "New Application for Your Gig",
      recipientName: gigOwnerName,
      applicantName,
      gigTitle,
      actionUrl: `${process.env.CLIENT_URL}/dashboard/gigs/${gigId}/applications`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      gigOwnerId,
      gigOwnerEmail,
      notificationData,
      "gig_application",
      `New application for "${gigTitle}"`,
      emailTemplateData
    );
  }

  // Subscription Creation Notifications
  async notifySubscriptionCreated(subscriptionData) {
    const {
      userId,
      userEmail,
      userName,
      planType,
      amount,
      subscriptionId,
      invoiceData,
    } = subscriptionData;

    const notificationData = {
      type: "subscription_activated",
      title: "Subscription Activated",
      message: `Your ${planType} subscription has been activated successfully`,
      relatedId: subscriptionId,
      relatedModel: "Subscription",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/billing`,
      priority: "medium",
    };

    const emailTemplateData = {
      title: "Subscription Activated - Invoice",
      recipientName: userName,
      planType,
      amount,
      invoiceData,
      actionUrl: `${process.env.CLIENT_URL}/dashboard/billing`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      userId,
      userEmail,
      notificationData,
      "subscription_invoice",
      `Subscription Activated - Invoice for ${planType} Plan`,
      emailTemplateData
    );
  }

  // Subscription Renewal Notifications
  async notifySubscriptionRenewal(renewalData) {
    const {
      userId,
      userEmail,
      userName,
      planType,
      renewalDate,
      subscriptionId,
    } = renewalData;

    const notificationData = {
      type: "subscription_renewal",
      title: "Subscription Renewal Reminder",
      message: `Your ${planType} subscription renews on ${renewalDate}`,
      relatedId: subscriptionId,
      relatedModel: "Subscription",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/billing`,
      priority: "medium",
    };

    const emailTemplateData = {
      title: "Subscription Renewal Reminder",
      recipientName: userName,
      planType,
      renewalDate,
      actionUrl: `${process.env.CLIENT_URL}/dashboard/billing`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      userId,
      userEmail,
      notificationData,
      "subscription_renewal",
      `${planType} Subscription Renewal Reminder`,
      emailTemplateData
    );
  }

  // Application Status Update Notifications
  async notifyApplicationStatusUpdate(statusData) {
    const {
      applicantId,
      applicantEmail,
      applicantName,
      gigTitle,
      newStatus,
      gigId,
      applicationId,
    } = statusData;

    const statusMessages = {
      accepted: "Your application has been accepted!",
      rejected: "Your application was not selected this time",
      in_review: "Your application is currently under review",
      negotiation: "The client wants to negotiate terms with you",
    };

    const notificationData = {
      type: "application_status_update",
      title: `Application ${
        newStatus.charAt(0).toUpperCase() + newStatus.slice(1)
      }`,
      message: `${statusMessages[newStatus]} for "${gigTitle}"`,
      relatedId: applicationId,
      relatedModel: "Application",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/applications/${applicationId}`,
      priority: newStatus === "accepted" ? "high" : "medium",
    };

    const emailTemplateData = {
      title: `Application Status Update`,
      recipientName: applicantName,
      gigTitle,
      newStatus,
      statusMessage: statusMessages[newStatus],
      actionUrl: `${process.env.CLIENT_URL}/dashboard/applications/${applicationId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      applicantId,
      applicantEmail,
      notificationData,
      "application_status_update",
      `Application ${newStatus} for "${gigTitle}"`,
      emailTemplateData
    );
  }

  // Project Submission Notifications
  async notifyProjectSubmission(submissionData) {
    const {
      gigOwnerId,
      gigOwnerEmail,
      gigOwnerName,
      freelancerName,
      projectTitle,
      gigId,
      projectId,
    } = submissionData;

    const notificationData = {
      type: "project_submission",
      title: "Project Submitted for Review",
      message: `${freelancerName} submitted "${projectTitle}" for your review`,
      relatedId: projectId,
      relatedModel: "Project",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/projects/${projectId}`,
      priority: "high",
      senderName: freelancerName,
    };

    const emailTemplateData = {
      title: "Project Submitted for Review",
      recipientName: gigOwnerName,
      freelancerName,
      projectTitle,
      actionUrl: `${process.env.CLIENT_URL}/dashboard/projects/${projectId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      gigOwnerId,
      gigOwnerEmail,
      notificationData,
      "project_submission",
      `Project submitted: "${projectTitle}"`,
      emailTemplateData
    );
  }

  // Project Review Notifications
  async notifyProjectReview(reviewData) {
    const {
      freelancerId,
      freelancerEmail,
      freelancerName,
      reviewContent,
      projectTitle,
      rating,
      projectId,
    } = reviewData;

    const notificationData = {
      type: "project_status_update",
      title: "Review Received for Your Project",
      message: `You received a ${rating}-star review for "${projectTitle}"`,
      relatedId: projectId,
      relatedModel: "Project",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/projects/${projectId}`,
      priority: "medium",
    };

    const emailTemplateData = {
      title: "Review Received for Your Project",
      recipientName: freelancerName,
      reviewContent,
      projectTitle,
      rating,
      actionUrl: `${process.env.CLIENT_URL}/dashboard/projects/${projectId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      freelancerId,
      freelancerEmail,
      notificationData,
      "project_review",
      `Review received for "${projectTitle}"`,
      emailTemplateData
    );
  }

  // Project Completion Notifications
  async notifyProjectCompletion(completionData) {
    const {
      freelancerId,
      freelancerEmail,
      freelancerName,
      gigOwnerId,
      gigOwnerEmail,
      gigOwnerName,
      projectTitle,
      projectId,
    } = completionData;

    // Notify freelancer
    const freelancerNotificationData = {
      type: "gig_completed",
      title: "Project Completed Successfully",
      message: `Your project "${projectTitle}" has been marked as completed`,
      relatedId: projectId,
      relatedModel: "Project",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/projects/${projectId}`,
      priority: "high",
    };

    const freelancerEmailData = {
      title: "Project Completed Successfully",
      recipientName: freelancerName,
      projectTitle,
      actionUrl: `${process.env.CLIENT_URL}/dashboard/projects/${projectId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    // Notify gig owner
    const gigOwnerNotificationData = {
      type: "gig_completed",
      title: "Project Completed",
      message: `Project "${projectTitle}" has been completed successfully`,
      relatedId: projectId,
      relatedModel: "Project",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/projects/${projectId}`,
      priority: "high",
    };

    const gigOwnerEmailData = {
      title: "Project Completed",
      recipientName: gigOwnerName,
      projectTitle,
      freelancerName,
      actionUrl: `${process.env.CLIENT_URL}/dashboard/projects/${projectId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    const results = await Promise.all([
      this.notifyUser(
        freelancerId,
        freelancerEmail,
        freelancerNotificationData,
        "project_completion",
        `Project completed: "${projectTitle}"`,
        freelancerEmailData
      ),
      this.notifyUser(
        gigOwnerId,
        gigOwnerEmail,
        gigOwnerNotificationData,
        "project_completion",
        `Project completed: "${projectTitle}"`,
        gigOwnerEmailData
      ),
    ]);

    return results;
  }

  // Payment Notifications
  async notifyPayment(paymentData) {
    const {
      userId,
      userEmail,
      userName,
      amount,
      paymentType,
      transactionId,
      paymentId,
    } = paymentData;

    const notificationData = {
      type: "payment_completed",
      title: "Payment Processed",
      message: `Payment of ₹${amount} has been processed successfully`,
      relatedId: paymentId,
      relatedModel: "Payment",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/payments`,
      priority: "high",
    };

    const emailTemplateData = {
      title: "Payment Confirmation",
      recipientName: userName,
      amount,
      paymentType,
      transactionId,
      actionUrl: `${process.env.CLIENT_URL}/dashboard/payments`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      userId,
      userEmail,
      notificationData,
      "payment_confirmation",
      `Payment Confirmation - ₹${amount}`,
      emailTemplateData
    );
  }

  // Welcome Email Notifications
  async notifyWelcome(welcomeData) {
    const { userId, userEmail, userName } = welcomeData;

    const notificationData = {
      type: "welcome",
      title: "Welcome to UNJOB",
      message: "Welcome to UNJOB! Complete your profile to get started",
      relatedId: userId,
      relatedModel: "User",
      actionUrl: `${process.env.CLIENT_URL}/profile/complete`,
      priority: "medium",
    };

    const emailTemplateData = {
      title: "Welcome to UNJOB!",
      recipientName: userName,
      actionUrl: `${process.env.CLIENT_URL}/profile/complete`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      userId,
      userEmail,
      notificationData,
      "welcome_email",
      "Welcome to UNJOB - Let's Get Started!",
      emailTemplateData
    );
  }

  // Password Reset Notifications
  async notifyPasswordReset(resetData) {
    const { userEmail, userName, resetToken } = resetData;

    const emailTemplateData = {
      title: "Password Reset Request",
      recipientName: userName,
      resetUrl: `${process.env.CLIENT_URL}/reset-password/${resetToken}`,
      expirationTime: "15 minutes",
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.sendEmail(
      userEmail,
      "Password Reset Request - UNJOB",
      "password_reset",
      emailTemplateData
    );
  }

  // Email Verification Notifications
  async notifyEmailVerification(verificationData) {
    const { userEmail, userName, verificationToken } = verificationData;

    const emailTemplateData = {
      title: "Verify Your Email Address",
      recipientName: userName,
      verificationUrl: `${process.env.CLIENT_URL}/verify-email/${verificationToken}`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.sendEmail(
      userEmail,
      "Verify Your Email - UNJOB",
      "email_verification",
      emailTemplateData
    );
  }

  // System Announcement Notifications
  async notifySystemAnnouncement(announcementData) {
    const { userIds, title, content, actionUrl } = announcementData;

    const results = [];

    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user) continue;

        const notificationData = {
          type: "system_maintenance",
          title,
          message: content,
          actionUrl: actionUrl || `${process.env.CLIENT_URL}/announcements`,
          priority: "medium",
        };

        const emailTemplateData = {
          title,
          recipientName: user.name,
          announcementContent: content,
          actionUrl: actionUrl || `${process.env.CLIENT_URL}/announcements`,
          baseUrl: process.env.CLIENT_URL,
        };

        const result = await this.notifyUser(
          userId,
          user.email,
          notificationData,
          "system_announcement",
          title,
          emailTemplateData
        );

        results.push({ userId, success: true, result });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }

  // Deadline Reminder Notifications
  async notifyDeadlineReminder(reminderData) {
    const { userId, userEmail, userName, gigTitle, deadline, gigId } =
      reminderData;

    const notificationData = {
      type: "project_deadline_reminder",
      title: "Project Deadline Approaching",
      message: `Deadline for "${gigTitle}" is approaching: ${deadline}`,
      relatedId: gigId,
      relatedModel: "Gig",
      actionUrl: `${process.env.CLIENT_URL}/dashboard/gigs/${gigId}`,
      priority: "high",
    };

    const emailTemplateData = {
      title: "Project Deadline Reminder",
      recipientName: userName,
      gigTitle,
      deadline,
      actionUrl: `${process.env.CLIENT_URL}/dashboard/gigs/${gigId}`,
      baseUrl: process.env.CLIENT_URL,
    };

    return await this.notifyUser(
      userId,
      userEmail,
      notificationData,
      "gig_deadline_reminder",
      `Deadline Reminder: ${gigTitle}`,
      emailTemplateData
    );
  }

  // Bulk notification sender
  async sendBulkNotifications(
    recipients,
    notificationData,
    emailTemplateName,
    emailSubject,
    emailTemplateData
  ) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.notifyUser(
          recipient.userId,
          recipient.email,
          notificationData,
          emailTemplateName,
          emailSubject,
          { ...emailTemplateData, recipientName: recipient.name }
        );

        results.push({
          userId: recipient.userId,
          email: recipient.email,
          success: result.email?.success && result.inApp?.success,
          ...result,
        });

        // Add delay to prevent overwhelming email service
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        results.push({
          userId: recipient.userId,
          email: recipient.email,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  // Test connection method
  async testConnection() {
    if (!this.emailEnabled) {
      return { success: false, error: "Email service not enabled" };
    }

    return await this.emailService.testConnection();
  }
}

export const enhancedNotificationService = new EnhancedNotificationService();

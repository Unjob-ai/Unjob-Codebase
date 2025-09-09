// services/notificationService.js - Complete Notification Service

const nodemailer = require("nodemailer");
const EMAIL_TEMPLATES = require("./emailTemplates");

class NotificationService {
  constructor() {
    this.transporter = null;
    this.initializeEmailTransporter();
  }

  // =============================================================================
  // EMAIL CONFIGURATION
  // =============================================================================
  initializeEmailTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      console.log("📧 Email transporter initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize email transporter:", error);
    }
  }

  // =============================================================================
  // CORE EMAIL SENDING FUNCTION
  // =============================================================================
  async sendEmail({ to, subject, html, priority = "normal" }) {
    if (!this.transporter) {
      console.error("❌ Email transporter not initialized");
      return { success: false, error: "Email service not available" };
    }

    try {
      const mailOptions = {
        from: `"UNJOB" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        priority,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${to}:`, result.messageId);

      return {
        success: true,
        messageId: result.messageId,
        to,
        subject,
      };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      return {
        success: false,
        error: error.message,
        to,
        subject,
      };
    }
  }

  // =============================================================================
  // POST NOTIFICATIONS
  // =============================================================================
  async notifyPostLike(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      likerName: data.likerName,
      postContent: data.postContent,
      actionUrl:
        data.actionUrl || `${process.env.CLIENT_URL}/posts/${data.postId}`,
    };

    const html = EMAIL_TEMPLATES.postLike(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: `${data.likerName} liked your post on UNJOB`,
      html,
    });
  }

  async notifyPostComment(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      commenterName: data.commenterName,
      commentContent: data.commentContent,
      postContent: data.postContent,
      actionUrl:
        data.actionUrl || `${process.env.CLIENT_URL}/posts/${data.postId}`,
    };

    const html = EMAIL_TEMPLATES.postComment(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: `${data.commenterName} commented on your post`,
      html,
    });
  }

  // =============================================================================
  // MESSAGE NOTIFICATIONS
  // =============================================================================
  async notifyNewMessage(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      senderName: data.senderName,
      messageContent: data.messageContent,
      actionUrl: data.actionUrl || `${process.env.CLIENT_URL}/messages`,
    };

    const html = EMAIL_TEMPLATES.message(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: `New message from ${data.senderName}`,
      html,
    });
  }

  // =============================================================================
  // PAYMENT NOTIFICATIONS
  // =============================================================================
  async notifyPaymentApproved(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      amount: data.amount,
      transactionId: data.transactionId,
      planType: data.planType,
      paymentDate: data.paymentDate || new Date().toLocaleDateString(),
      actionUrl:
        data.actionUrl || `${process.env.CLIENT_URL}/dashboard/billing`,
    };

    const html = EMAIL_TEMPLATES.paymentApproved(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: "Payment Approved - UNJOB Subscription",
      html,
    });
  }

  // =============================================================================
  // SUBSCRIPTION NOTIFICATIONS
  // =============================================================================
  async notifySubscriptionActivated(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      planType: data.planType,
      duration: data.duration,
      features: data.features || [
        "Unlimited job applications",
        "Priority support",
        "Advanced analytics",
        "Premium profile visibility",
      ],
      actionUrl: data.actionUrl || `${process.env.CLIENT_URL}/dashboard`,
    };

    const html = EMAIL_TEMPLATES.subscriptionActivated(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: "Subscription Activated - Welcome to UNJOB Premium",
      html,
    });
  }

  async notifySubscriptionReminder(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      planType: data.planType,
      daysRemaining: data.daysRemaining,
      actionUrl:
        data.actionUrl || `${process.env.CLIENT_URL}/dashboard/billing`,
    };

    const html = EMAIL_TEMPLATES.subscriptionReminder(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: `Your UNJOB subscription expires in ${data.daysRemaining} days`,
      html,
    });
  }

  async notifySubscriptionExpired(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      planType: data.planType,
      actionUrl:
        data.actionUrl || `${process.env.CLIENT_URL}/dashboard/billing`,
    };

    const html = EMAIL_TEMPLATES.subscriptionExpired(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: "UNJOB Subscription Expired - Renew Now",
      html,
    });
  }

  // =============================================================================
  // WELCOME & SYSTEM NOTIFICATIONS
  // =============================================================================
  async sendWelcomeEmail(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      actionUrl: data.actionUrl || `${process.env.CLIENT_URL}/profile/edit`,
    };

    const html = EMAIL_TEMPLATES.welcome(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: "Welcome to UNJOB - Your Career Journey Starts Here",
      html,
    });
  }

  // =============================================================================
  // GENERIC NOTIFICATION
  // =============================================================================
  async sendGenericNotification(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      title: data.title,
      message: data.message,
      actionUrl: data.actionUrl,
      actionText: data.actionText,
      emailTitle: data.emailTitle,
    };

    const html = EMAIL_TEMPLATES.generic(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: data.subject || "UNJOB Notification",
      html,
      priority: data.priority || "normal",
    });
  }

  // =============================================================================
  // BULK NOTIFICATION METHODS
  // =============================================================================
  async sendBulkNotifications(recipients, templateType, data) {
    const results = [];

    for (const recipient of recipients) {
      try {
        let result;
        const recipientData = { ...data, recipientName: recipient.name };

        switch (templateType) {
          case "postLike":
            result = await this.notifyPostLike(recipient.email, recipientData);
            break;
          case "postComment":
            result = await this.notifyPostComment(
              recipient.email,
              recipientData
            );
            break;
          case "message":
            result = await this.notifyNewMessage(
              recipient.email,
              recipientData
            );
            break;
          case "paymentApproved":
            result = await this.notifyPaymentApproved(
              recipient.email,
              recipientData
            );
            break;
          case "subscriptionActivated":
            result = await this.notifySubscriptionActivated(
              recipient.email,
              recipientData
            );
            break;
          case "subscriptionReminder":
            result = await this.notifySubscriptionReminder(
              recipient.email,
              recipientData
            );
            break;
          case "subscriptionExpired":
            result = await this.notifySubscriptionExpired(
              recipient.email,
              recipientData
            );
            break;
          case "welcome":
            result = await this.sendWelcomeEmail(
              recipient.email,
              recipientData
            );
            break;
          case "generic":
            result = await this.sendGenericNotification(
              recipient.email,
              recipientData
            );
            break;
          default:
            result = { success: false, error: "Unknown template type" };
        }

        results.push({
          recipient: recipient.email,
          ...result,
        });

        // Add delay between emails to avoid spam
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `❌ Failed to send bulk notification to ${recipient.email}:`,
          error
        );
        results.push({
          recipient: recipient.email,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `📧 Bulk notification complete: ${successCount} sent, ${failureCount} failed`
    );

    return {
      total: recipients.length,
      success: successCount,
      failed: failureCount,
      results,
    };
  }

  // =============================================================================
  // IN-APP NOTIFICATION METHODS
  // =============================================================================
  async createInAppNotification(userId, notificationData) {
    try {
      const Notification = require("../models/Notification"); // Adjust path as needed

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

  // =============================================================================
  // COMBINED NOTIFICATION METHODS (EMAIL + IN-APP)
  // =============================================================================
  async notifyUser(userId, userEmail, notificationData, options = {}) {
    const results = {
      email: null,
      inApp: null,
    };

    // Send in-app notification
    if (options.sendInApp !== false) {
      results.inApp = await this.createInAppNotification(
        userId,
        notificationData
      );
    }

    // Send email notification
    if (options.sendEmail !== false && userEmail) {
      const emailData = {
        recipientName: notificationData.recipientName || "User",
        ...notificationData,
      };

      switch (notificationData.type) {
        case "post_like":
          results.email = await this.notifyPostLike(userEmail, emailData);
          break;
        case "post_comment":
          results.email = await this.notifyPostComment(userEmail, emailData);
          break;
        case "message":
          results.email = await this.notifyNewMessage(userEmail, emailData);
          break;
        case "payment_approved":
          results.email = await this.notifyPaymentApproved(
            userEmail,
            emailData
          );
          break;
        case "subscription_activated":
          results.email = await this.notifySubscriptionActivated(
            userEmail,
            emailData
          );
          break;
        case "subscription_reminder":
          results.email = await this.notifySubscriptionReminder(
            userEmail,
            emailData
          );
          break;
        case "subscription_expired":
          results.email = await this.notifySubscriptionExpired(
            userEmail,
            emailData
          );
          break;
        case "welcome":
          results.email = await this.sendWelcomeEmail(userEmail, emailData);
          break;
        default:
          results.email = await this.sendGenericNotification(
            userEmail,
            emailData
          );
      }
    }

    return results;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================
  async testEmailConnection() {
    try {
      if (!this.transporter) {
        throw new Error("Email transporter not initialized");
      }

      await this.transporter.verify();
      console.log("✅ Email connection test successful");
      return { success: true, message: "Email connection verified" };
    } catch (error) {
      console.error("❌ Email connection test failed:", error);
      return { success: false, error: error.message };
    }
  }

  async sendTestEmail(recipientEmail) {
    const testData = {
      recipientName: "Test User",
      title: "Test Notification",
      message: "This is a test notification to verify email functionality.",
      actionUrl: process.env.CLIENT_URL,
      actionText: "Visit UNJOB",
      subject: "UNJOB - Test Email",
    };

    return await this.sendGenericNotification(recipientEmail, testData);
  }

  // =============================================================================
  // QUEUE MANAGEMENT (For future implementation)
  // =============================================================================
  async queueNotification(notificationData, priority = "normal") {
    // This method can be implemented with a queue system like Bull or Agenda
    // For now, it directly processes the notification
    console.log("📋 Queuing notification:", notificationData.type);

    // In a real implementation, you would add this to a queue
    // For now, we'll process it immediately
    return await this.notifyUser(
      notificationData.userId,
      notificationData.userEmail,
      notificationData,
      notificationData.options
    );
  }

  // =============================================================================
  // NOTIFICATION PREFERENCES (For future implementation)
  // =============================================================================
  async checkUserPreferences(userId, notificationType) {
    // This method would check user's notification preferences
    // For now, return default preferences
    return {
      email: true,
      inApp: true,
      push: false, // For future push notifications
    };
  }
}

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================
const notificationService = new NotificationService();

module.exports = notificationService;

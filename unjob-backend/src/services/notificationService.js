import axios from "axios";
import EMAIL_TEMPLATES from "./emailTemplates.js";
import { Notification } from "../models/NotificationModel.js";

class NotificationService {
  constructor() {
    this.transporter = null;
    this.emailService = null;
    this.initialized = false;
  }

  initializeEmailService() {
    if (this.initialized) {
      return;
    }

    try {
      const apiKey = process.env.BREVO_API_KEY;
      const fromEmail =
        process.env.FROM_EMAIL || "shishirshrivastava30@gmail.com";
      const fromName = process.env.FROM_NAME || "UNJOB Team";

      if (!apiKey) {
        console.warn(
          "BREVO_API_KEY not found. Email notifications will be disabled."
        );
        this.emailService = null;
        this.initialized = true;
        return;
      }

      this.emailService = {
        apiKey,
        apiUrl: "https://api.brevo.com/v3/smtp/email",
        fromEmail,
        fromName,
      };

      console.log("Email service initialized successfully with Brevo");
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize email service:", error);
      this.emailService = null;
      this.initialized = true;
    }
  }

  async sendEmail({ to, subject, html, text = null, priority = "normal" }) {
    this.initializeEmailService();

    if (!this.emailService) {
      console.warn("Email service not available. Skipping email:", subject);
      return {
        success: false,
        error: "Email service not configured",
        to: Array.isArray(to) ? to : [to],
        subject,
      };
    }

    try {
      const payload = {
        sender: {
          email: this.emailService.fromEmail,
          name: this.emailService.fromName,
        },
        to: Array.isArray(to)
          ? to.map((email) => ({ email }))
          : [{ email: to }],
        subject,
        htmlContent: html,
        ...(text && { textContent: text }),
      };

      const response = await axios.post(this.emailService.apiUrl, payload, {
        headers: {
          "api-key": this.emailService.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log(`Email sent successfully to: ${to}`);
      return {
        success: true,
        messageId: response.data.messageId,
        to: Array.isArray(to) ? to : [to],
        subject,
      };
    } catch (error) {
      console.error(
        `Email sending failed:`,
        error.response?.data || error.message
      );
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        to: Array.isArray(to) ? to : [to],
        subject,
      };
    }
  }

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

  async sendPasswordResetEmail(email, resetToken, userName = "User") {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const expirationTime = "10 minutes";

    const html = this.getPasswordResetTemplate({
      userName,
      resetUrl,
      expirationTime,
    });

    const text = `
Hi ${userName},

You requested a password reset for your UNJOB account.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${expirationTime}.

If you didn't request this, please ignore this email.

Best regards,
The UNJOB Team
    `;

    return await this.sendEmail({
      to: email,
      subject: "Reset Your UNJOB Password",
      html,
      text,
    });
  }

  async sendEmailVerificationEmail(
    email,
    verificationToken,
    userName = "User"
  ) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

    const html = this.getEmailVerificationTemplate({
      userName,
      verificationUrl,
    });

    const text = `
Hi ${userName},

Welcome to UNJOB! Please verify your email address to complete your registration.

Click the link below to verify your email:
${verificationUrl}

If you didn't create an account, please ignore this email.

Best regards,
The UNJOB Team
    `;

    return await this.sendEmail({
      to: email,
      subject: "Verify Your UNJOB Account",
      html,
      text,
    });
  }

  async sendWelcomeEmail(recipientEmail, data) {
    const templateData = {
      recipientName: data.recipientName,
      actionUrl: data.actionUrl || `${process.env.CLIENT_URL}/dashboard`,
    };

    const html = EMAIL_TEMPLATES.welcome(templateData);

    return await this.sendEmail({
      to: recipientEmail,
      subject: "Welcome to UNJOB - Your Career Journey Starts Here",
      html,
    });
  }

  getPasswordResetTemplate({ userName, resetUrl, expirationTime }) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333; padding: 0;">
      
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #10B981;">
        <h1 style="color: #10B981; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">UNJOB</h1>
        <p style="color: #666; font-size: 16px; margin: 12px 0 0 0; font-weight: 400;">Password Reset Request</p>
      </div>
      
      <div style="padding: 40px 30px;">
        <div style="margin-bottom: 32px;">
          <h2 style="color: #333; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
            Hi <strong style="color: #333;">${userName}</strong>,
          </p>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 24px 0;">
            We received a request to reset your password for your UNJOB account. Click the button below to reset your password:
          </p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; 
                    background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                    color: #ffffff; 
                    padding: 16px 32px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    font-size: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            Reset Password
          </a>
        </div>
        
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            <strong>This link expires in ${expirationTime}.</strong>
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
          If you didn't request this password reset, please ignore this email. Your password will not be changed.
        </p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">
          © 2025 UNJOB. All rights reserved.
        </p>
      </div>
    </body>
    </html>
    `;
  }

  getEmailVerificationTemplate({ userName, verificationUrl }) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333; padding: 0;">
      
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #10B981;">
        <h1 style="color: #10B981; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">UNJOB</h1>
        <p style="color: #666; font-size: 16px; margin: 12px 0 0 0; font-weight: 400;">Email Verification</p>
      </div>
      
      <div style="padding: 40px 30px;">
        <div style="margin-bottom: 32px;">
          <h2 style="color: #333; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Verify Your Email Address</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
            Hi <strong style="color: #333;">${userName}</strong>,
          </p>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 24px 0;">
            Welcome to UNJOB! Please verify your email address to complete your account setup and start exploring opportunities.
          </p>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${verificationUrl}" 
             style="display: inline-block; 
                    background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                    color: #ffffff; 
                    padding: 16px 32px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    font-size: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
          If you didn't create an account with UNJOB, please ignore this email.
        </p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">
          © 2025 UNJOB. All rights reserved.
        </p>
      </div>
    </body>
    </html>
    `;
  }

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

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `Failed to send bulk notification to ${recipient.email}:`,
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
      `Bulk notification complete: ${successCount} sent, ${failureCount} failed`
    );

    return {
      total: recipients.length,
      success: successCount,
      failed: failureCount,
      results,
    };
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
      console.log("In-app notification created:", notification._id);

      return { success: true, notification };
    } catch (error) {
      console.error("Failed to create in-app notification:", error);
      return { success: false, error: error.message };
    }
  }

  async notifyUser(userId, userEmail, notificationData, options = {}) {
    const results = {
      email: null,
      inApp: null,
    };

    if (options.sendInApp !== false) {
      results.inApp = await this.createInAppNotification(
        userId,
        notificationData
      );
    }

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

  async testEmailConnection() {
    if (!this.emailService) {
      return {
        success: false,
        error: "Email service not configured",
      };
    }

    try {
      const testResult = await this.sendEmail({
        to: this.emailService.fromEmail,
        subject: "UNJOB Email Service Test",
        html: "<h1>Email service is working!</h1><p>This is a test email from UNJOB using Brevo API.</p>",
        text: "Email service is working! This is a test email from UNJOB using Brevo API.",
      });

      return testResult;
    } catch (error) {
      console.error("Email connection test failed:", error);
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

  async queueNotification(notificationData, priority = "normal") {
    console.log("Queuing notification:", notificationData.type);

    return await this.notifyUser(
      notificationData.userId,
      notificationData.userEmail,
      notificationData,
      notificationData.options
    );
  }

  async checkUserPreferences(userId, notificationType) {
    return {
      email: true,
      inApp: true,
      push: false,
    };
  }
}

const notificationService = new NotificationService();

export default notificationService;

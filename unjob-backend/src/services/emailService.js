// services/emailService.js - Brevo Email Service Implementation
import axios from "axios";

class EmailService {
  constructor() {
    this.apiKey = null;
    this.apiUrl = "https://api.brevo.com/v3/smtp/email";
    this.fromEmail = null;
    this.fromName = null;
    this.initialized = false;
    this.emailEnabled = false;

    // Don't initialize immediately - use lazy initialization
    console.log("📧 Email service created (will initialize on first use)");
  }

  // Lazy initialization - only initialize when first needed
  initializeEmailService() {
    if (this.initialized) {
      return this.emailEnabled;
    }

    try {
      this.apiKey = process.env.BREVO_API_KEY;
      this.fromEmail =
        process.env.FROM_EMAIL || "shishirshrivastava30@gmail.com";
      this.fromName = process.env.FROM_NAME || "UNJOB Team";

      if (!this.apiKey) {
        console.warn(
          "⚠️ BREVO_API_KEY not found. Email service will be disabled."
        );
        this.emailEnabled = false;
        this.initialized = true;
        return false;
      }

      this.emailEnabled = true;
      this.initialized = true;
      console.log("✅ Email service initialized with Brevo successfully");
      return true;
    } catch (error) {
      console.error("❌ Email service initialization failed:", error);
      this.emailEnabled = false;
      this.initialized = true;
      return false;
    }
  }

  // Main email sending method
  async sendEmail({ to, subject, html, text = null }) {
    // Initialize service if not already done
    this.initializeEmailService();

    if (!this.emailEnabled) {
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
          email: this.fromEmail,
          name: this.fromName,
        },
        to: Array.isArray(to)
          ? to.map((email) => ({ email }))
          : [{ email: to }],
        subject,
        htmlContent: html,
        ...(text && { textContent: text }),
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log(`✅ Email sent successfully to: ${to}`);
      return {
        success: true,
        messageId: response.data.messageId,
        to: Array.isArray(to) ? to : [to],
        subject,
      };
    } catch (error) {
      console.error(
        `❌ Email sending failed:`,
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

  // Send password reset email
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

  // Send email verification email
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

  // Send welcome email
  async sendWelcomeEmail(email, userName = "User") {
    const dashboardUrl = `${process.env.CLIENT_URL}/dashboard`;

    const html = this.getWelcomeTemplate({
      userName,
      dashboardUrl,
    });

    const text = `
Hi ${userName},

Welcome to UNJOB! Your account has been successfully created.

Get started by visiting your dashboard:
${dashboardUrl}

We're excited to have you join our community!

Best regards,
The UNJOB Team
    `;

    return await this.sendEmail({
      to: email,
      subject: "Welcome to UNJOB!",
      html,
      text,
    });
  }

  // Password reset email template
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
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #10B981;">
        <h1 style="color: #10B981; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">UNJOB</h1>
        <p style="color: #666; font-size: 16px; margin: 12px 0 0 0; font-weight: 400;">Password Reset Request</p>
      </div>
      
      <!-- Content -->
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
            <strong>⏰ This link expires in ${expirationTime}.</strong>
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
          If you didn't request this password reset, please ignore this email. Your password will not be changed.
          <br><br>
          For security reasons, this link can only be used once and will expire soon.
        </p>
        
        <p style="color: #6b7280; font-size: 12px; line-height: 1.4; margin: 20px 0 0 0;">
          If the button doesn't work, copy and paste this link into your browser:
          <br>
          <a href="${resetUrl}" style="color: #10B981; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">
          © 2025 UNJOB. All rights reserved.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          You received this email because you requested a password reset for your UNJOB account.
        </p>
      </div>
    </body>
    </html>
    `;
  }

  // Email verification template
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
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #10B981;">
        <h1 style="color: #10B981; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">UNJOB</h1>
        <p style="color: #666; font-size: 16px; margin: 12px 0 0 0; font-weight: 400;">Email Verification</p>
      </div>
      
      <!-- Content -->
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
        
        <p style="color: #6b7280; font-size: 12px; line-height: 1.4; margin: 20px 0 0 0;">
          If the button doesn't work, copy and paste this link into your browser:
          <br>
          <a href="${verificationUrl}" style="color: #10B981; word-break: break-all;">${verificationUrl}</a>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">
          © 2025 UNJOB. All rights reserved.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          You received this email because you created an account with UNJOB.
        </p>
      </div>
    </body>
    </html>
    `;
  }

  // Welcome email template
  getWelcomeTemplate({ userName, dashboardUrl }) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to UNJOB</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333; padding: 0;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px 30px; text-align: center; border-bottom: 3px solid #10B981;">
        <h1 style="color: #10B981; margin: 0; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">UNJOB</h1>
        <p style="color: #666; font-size: 16px; margin: 12px 0 0 0; font-weight: 400;">Welcome to the Community!</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 40px 30px;">
        <div style="margin-bottom: 32px;">
          <h2 style="color: #333; margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Welcome to UNJOB! 🎉</h2>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
            Hi <strong style="color: #333;">${userName}</strong>,
          </p>
          
          <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 24px 0;">
            Welcome to UNJOB! We're excited to have you join our community of talented professionals and innovative companies.
          </p>
        </div>
        
        <div style="background-color: #f0f9ff; border: 1px solid #10B981; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <h3 style="color: #10B981; margin: 0 0 16px 0; font-size: 18px;">Get Started:</h3>
          <ul style="color: #155724; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Complete your profile to stand out</li>
            <li>Browse exciting job opportunities</li>
            <li>Connect with other professionals</li>
            <li>Share your portfolio and achievements</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="${dashboardUrl}" 
             style="display: inline-block; 
                    background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                    color: #ffffff; 
                    padding: 16px 32px; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: 600; 
                    font-size: 16px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            Go to Dashboard
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
          If you have any questions, feel free to reach out to our support team. We're here to help!
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">
          © 2025 UNJOB. All rights reserved.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          You're receiving this because you created an account with UNJOB.
        </p>
      </div>
    </body>
    </html>
    `;
  }

  // Test email connection
  async testConnection() {
    // Initialize service first
    if (!this.initializeEmailService()) {
      return {
        success: false,
        error: "Email service not configured - BREVO_API_KEY missing",
      };
    }

    try {
      const testResult = await this.sendEmail({
        to: this.fromEmail, // Send test email to yourself
        subject: "UNJOB Email Service Test",
        html: "<h1>🎉 Email service is working!</h1><p>This is a test email from UNJOB using Brevo API.</p>",
        text: "Email service is working! This is a test email from UNJOB using Brevo API.",
      });

      return testResult;
    } catch (error) {
      console.error("Email connection test failed:", error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;

// app/api/email/verify-and-edit/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================
const EMAIL_TEMPLATES = {
  baseTemplate: (content, title = "UNJOB Email Verification") => `
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
          This email was sent to verify your new email address
        </p>
      </div>
    </div>
  `,

  emailVerificationCode: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Verify Your New Email Address
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 16px 0;">
        You requested to change your email address from <strong>${data.currentEmail}</strong> to <strong style="color: #10B981;">${data.newEmail}</strong>.
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
        Please use the verification code below to confirm this change:
      </p>
    </div>
    
    <!-- Verification Code Section -->
    <div style="text-align: center; margin: 40px 0;">
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #10B981; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <p style="color: #374151; font-size: 14px; font-weight: 600; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">
          Your Verification Code
        </p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #10B981; font-family: 'Courier New', monospace; margin: 10px 0;">
          ${data.verificationCode}
        </div>
        <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
          This code expires in ${data.expiryMinutes} minutes
        </p>
      </div>
    </div>
    
    <!-- Security Notice -->
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 32px 0;">
      <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
        🔒 Security Notice
      </h3>
      <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.5;">
        <li>This code will expire in ${data.expiryMinutes} minutes</li>
        <li>If you didn't request this change, please ignore this email</li>
        <li>Your current email (${data.currentEmail}) will remain active until verification is complete</li>
        <li>Never share this verification code with anyone</li>
      </ul>
    </div>
  `,
      "Email Verification Required"
    ),

  emailChangeConfirmation: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Email Address Successfully Changed
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        Your email address has been successfully changed from <strong>${
          data.oldEmail
        }</strong> to <strong style="color: #10B981;">${
        data.newEmail
      }</strong> on ${data.changeDate}.
      </p>
    </div>
    
    <!-- Success Confirmation -->
    <div style="background-color: #d4edda; border: 1px solid #10B981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="color: #10B981; font-size: 48px; margin: 0 0 12px 0;">✓</div>
      <h3 style="color: #155724; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">
        Email Change Confirmed
      </h3>
      <p style="color: #155724; margin: 0; font-size: 14px;">
        You can now use your new email address to sign in to your account
      </p>
    </div>
    
    <!-- Next Steps -->
    <div style="background-color: #f8f9fa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #10B981; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
        What's Next?
      </h3>
      <ul style="color: #555; margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Use ${data.newEmail} to sign in to your UNJOB account</li>
        <li>Update your email preferences if needed</li>
        <li>All future notifications will be sent to your new email address</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${
        process.env.NEXTAUTH_URL || "http://localhost:3000"
      }/auth/signin" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #10B981 0%, #047857 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        Sign In to Your Account
      </a>
    </div>
  `,
      "Email Changed Successfully"
    ),

  emailChangeNotification: (data) =>
    EMAIL_TEMPLATES.baseTemplate(
      `
    <div style="margin-bottom: 32px;">
      <h2 style="color: #333; margin: 0 0 16px 0; font-size: 28px; font-weight: 600; line-height: 1.3;">
        Your Email Address Was Changed
      </h2>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
        Hello <strong style="color: #333;">${data.recipientName}</strong>,
      </p>
      
      <p style="color: #555; line-height: 1.6; font-size: 16px; margin: 0;">
        This is to inform you that the email address associated with your UNJOB account has been changed from <strong>${
          data.oldEmail
        }</strong> to <strong style="color: #10B981;">${
        data.newEmail
      }</strong> on ${data.changeDate}.
      </p>
    </div>
    
    <!-- Security Alert -->
    <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #856404; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
        🔔 Security Alert
      </h3>
      <p style="color: #856404; margin: 0; line-height: 1.5;">
        If you did not make this change, please contact our support team immediately to secure your account.
      </p>
    </div>
    
    <!-- Action Required -->
    <div style="background-color: #f8d7da; border: 1px solid #dc3545; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #721c24; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">
        ⚠️ Didn't Make This Change?
      </h3>
      <p style="color: #721c24; margin: 0 0 12px 0; line-height: 1.5;">
        If you did not authorize this email change:
      </p>
      <ul style="color: #721c24; margin: 0; padding-left: 20px; line-height: 1.5;">
        <li>Contact our support team immediately</li>
        <li>Change your password right away</li>
        <li>Review your account activity</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/support" 
         style="display: inline-block; 
                background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                color: #ffffff; 
                padding: 16px 32px; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: 600; 
                font-size: 16px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        Contact Support
      </a>
    </div>
  `,
      "Security Alert - Email Changed"
    ),
};

// =============================================================================
// EMAIL SENDING FUNCTION
// =============================================================================
async function sendEmail(to, subject, htmlContent) {
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
            name: to.name || to.email.split("@")[0],
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
// API ROUTE HANDLERS
// =============================================================================

// POST - Send verification email with edit token
export async function POST(req) {
  try {
    const { email, newEmail } = await req.json();

    // Basic validation
    if (!email) {
      return NextResponse.json(
        { error: "Current email is required" },
        { status: 400 }
      );
    }

    if (!newEmail) {
      return NextResponse.json(
        { error: "New email is required" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid new email address" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user by current email
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found with this email" },
        { status: 404 }
      );
    }

    // Check if new email is already in use
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: "New email is already in use by another account" },
        { status: 400 }
      );
    }

    // Generate verification token (6-digit code)
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const tokenExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store pending email change
    user.pendingEmailChange = {
      newEmail,
      verificationToken,
      tokenExpiry,
      requested: new Date(),
    };
    await user.save();

    // Prepare email data
    const emailData = {
      recipientName: user.name || newEmail.split("@")[0],
      verificationCode: verificationToken,
      currentEmail: email,
      newEmail: newEmail,
      expiryMinutes: 5,
      userName: user.name || user.email?.split("@")[0],
    };

    // Send verification email
    try {
      const htmlContent = EMAIL_TEMPLATES.emailVerificationCode(emailData);
      const subject = "Verify Your New Email Address - UNJOB";

      const emailResult = await sendEmail(
        { email: newEmail, name: user.name || newEmail.split("@")[0] },
        subject,
        htmlContent
      );

      if (!emailResult.success) {
        throw new Error(emailResult.error);
      }

      console.log(
        `✅ Verification email sent to ${newEmail} for user ${user._id}`
      );
    } catch (emailError) {
      console.error("❌ Failed to send verification email:", emailError);
      // Clear the pending change if email fails
      user.pendingEmailChange = undefined;
      await user.save();

      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent to new email address",
      verificationSent: true,
      expiresIn: 5 * 60 * 1000, // 5 minutes in milliseconds
    });
  } catch (error) {
    console.error("Email verification request error:", error);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }
}

// PUT - Verify token and update email
export async function PUT(req) {
  try {
    const { token, email } = await req.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: "Token and email are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user with pending email change
    const user = await User.findOne({
      "pendingEmailChange.verificationToken": token,
      "pendingEmailChange.newEmail": email,
      "pendingEmailChange.tokenExpiry": { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Double-check new email isn't taken
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Email is already in use by another account" },
        { status: 400 }
      );
    }

    // Update user email
    const oldEmail = user.email;
    user.email = email;
    user.isVerified = true;
    user.verified = true;
    user.pendingEmailChange = undefined; // Remove pending change
    user.verificationToken = null;

    // Add to email change history if method exists
    if (user.addEmailChangeToHistory) {
      user.addEmailChangeToHistory(oldEmail, email);
    }

    await user.save();

    // Send confirmation emails
    try {
      const changeDate = new Date().toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Send confirmation to new email
      const confirmationData = {
        recipientName: user.name || email.split("@")[0],
        oldEmail: oldEmail,
        newEmail: email,
        changeDate: changeDate,
      };

      const confirmationHtml =
        EMAIL_TEMPLATES.emailChangeConfirmation(confirmationData);
      await sendEmail(
        { email: email, name: user.name || email.split("@")[0] },
        "Email Address Successfully Changed - UNJOB",
        confirmationHtml
      );

      // Send notification to old email
      const notificationData = {
        recipientName: user.name || oldEmail.split("@")[0],
        oldEmail: oldEmail,
        newEmail: email,
        changeDate: changeDate,
      };

      const notificationHtml =
        EMAIL_TEMPLATES.emailChangeNotification(notificationData);
      await sendEmail(
        { email: oldEmail, name: user.name || oldEmail.split("@")[0] },
        "Security Alert - Your Email Address Was Changed - UNJOB",
        notificationHtml
      );

      console.log(
        `✅ Confirmation emails sent for email change: ${oldEmail} → ${email}`
      );
    } catch (emailError) {
      console.error("❌ Failed to send confirmation emails:", emailError);
      // Don't fail the request if confirmation emails fail
    }

    // Log email change for security
    console.log(
      `✅ Email changed for user ${user._id}: ${oldEmail} → ${email}`
    );

    return NextResponse.json({
      success: true,
      message: "Email successfully updated and verified",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify and update email" },
      { status: 500 }
    );
  }
}

// GET - Check verification status
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { error: "Token and email parameters are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if token is valid and not expired
    const user = await User.findOne({
      "pendingEmailChange.verificationToken": token,
      "pendingEmailChange.newEmail": email,
      "pendingEmailChange.tokenExpiry": { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({
        valid: false,
        message: "Invalid or expired verification token",
      });
    }

    // Calculate remaining time
    const remainingTime = user.pendingEmailChange.tokenExpiry - new Date();

    return NextResponse.json({
      valid: true,
      message: "Token is valid",
      currentEmail: user.email,
      newEmail: user.pendingEmailChange.newEmail,
      requestedAt: user.pendingEmailChange.requested,
      expiresAt: user.pendingEmailChange.tokenExpiry,
      remainingTime: Math.max(0, remainingTime),
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate token" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel pending email change
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.pendingEmailChange) {
      return NextResponse.json(
        { error: "No pending email change found" },
        { status: 400 }
      );
    }

    // Store the cancelled email for logging
    const cancelledEmail = user.pendingEmailChange.newEmail;

    // Remove pending email change
    user.pendingEmailChange = undefined;
    await user.save();

    console.log(
      `✅ Email change cancelled for user ${user._id}: ${user.email} → ${cancelledEmail}`
    );

    return NextResponse.json({
      success: true,
      message: "Pending email change cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel email change error:", error);
    return NextResponse.json(
      { error: "Failed to cancel email change" },
      { status: 500 }
    );
  }
}

// PATCH - Resend verification email
export async function PATCH(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Current email is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Find user with pending email change
    const user = await User.findOne({
      email,
      "pendingEmailChange.newEmail": { $exists: true },
    });

    if (!user || !user.pendingEmailChange) {
      return NextResponse.json(
        { error: "No pending email change found" },
        { status: 404 }
      );
    }

    // Check if too soon to resend (prevent spam)
    const timeSinceRequest = new Date() - user.pendingEmailChange.requested;
    const minResendInterval = 30 * 1000; // 30 seconds

    if (timeSinceRequest < minResendInterval) {
      return NextResponse.json(
        {
          error: "Please wait before requesting another verification email",
          retryAfter: Math.ceil((minResendInterval - timeSinceRequest) / 1000),
        },
        { status: 429 }
      );
    }

    // Generate new verification token
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const tokenExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update pending email change
    user.pendingEmailChange.verificationToken = verificationToken;
    user.pendingEmailChange.tokenExpiry = tokenExpiry;
    user.pendingEmailChange.requested = new Date();
    await user.save();

    // Prepare email data
    const emailData = {
      recipientName:
        user.name || user.pendingEmailChange.newEmail.split("@")[0],
      verificationCode: verificationToken,
      currentEmail: user.email,
      newEmail: user.pendingEmailChange.newEmail,
      expiryMinutes: 5,
      userName: user.name || user.email?.split("@")[0],
    };

    // Resend verification email
    try {
      const htmlContent = EMAIL_TEMPLATES.emailVerificationCode(emailData);
      const subject = "Verify Your New Email Address - UNJOB";

      const emailResult = await sendEmail(
        {
          email: user.pendingEmailChange.newEmail,
          name: user.name || user.pendingEmailChange.newEmail.split("@")[0],
        },
        subject,
        htmlContent
      );

      if (!emailResult.success) {
        throw new Error(emailResult.error);
      }

      console.log(
        `✅ Verification email resent to ${user.pendingEmailChange.newEmail} for user ${user._id}`
      );
    } catch (emailError) {
      console.error("❌ Failed to resend verification email:", emailError);
      return NextResponse.json(
        { error: "Failed to resend verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification email resent successfully",
      expiresIn: 5 * 60 * 1000, // 5 minutes in milliseconds
    });
  } catch (error) {
    console.error("Resend verification email error:", error);
    return NextResponse.json(
      { error: "Failed to resend verification email" },
      { status: 500 }
    );
  }
}

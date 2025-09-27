// app/api/auth/forgot-password/route.js - Refined Light Mode Email Template
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";

export async function POST(request) {
  try {
    console.log("🚀 Starting forgot password process...");

    const { email } = await request.json();
    console.log("📧 Email received:", email);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log("⚠️ User not found, but returning success for security");
      return NextResponse.json(
        {
          message:
            "If an account with that email exists, we've sent you a password reset link.",
        },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to user
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpiry: resetTokenExpiry,
    });

    // Create reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    console.log("📮 Sending password reset email to:", user.email);

    try {
      // Send email using Brevo API
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
              email: user.email,
              name: user.name,
            },
          ],
          subject: "Reset Your UNJOB Password",
          htmlContent: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1f2937; padding: 0;">
              
              <!-- Header Section -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 40px 30px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                <h1 style="color: #047857; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">UNJOB</h1>
                <p style="color: #64748b; font-size: 16px; margin: 12px 0 0 0; font-weight: 400;">Password Reset Request</p>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 40px 30px;">
                
                <!-- Greeting -->
                <div style="margin-bottom: 32px;">
                  <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; line-height: 1.3;">
                    Reset Your Password
                  </h2>
                  
                  <p style="color: #475569; line-height: 1.6; font-size: 16px; margin: 0 0 12px 0;">
                    Hello <strong style="color: #1e293b;">${user.name}</strong>,
                  </p>
                  
                  <p style="color: #475569; line-height: 1.6; font-size: 16px; margin: 0;">
                    We received a request to reset the password for your UNJOB account associated with <strong style="color: #0f766e;">${
                      user.email
                    }</strong>
                  </p>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${resetUrl}" 
                     style="display: inline-block; 
                            background: linear-gradient(135deg, #059669 0%, #047857 100%); 
                            color: #ffffff; 
                            padding: 16px 32px; 
                            text-decoration: none; 
                            border-radius: 8px; 
                            font-weight: 600; 
                            font-size: 16px;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                            transition: all 0.2s ease;">
                    Reset Password
                  </a>
                </div>
                
                <!-- Alternative Link -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 32px 0;">
                  <p style="color: #374151; margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">
                    Can't click the button? Copy and paste this link:
                  </p>
                  <p style="color: #0f766e; word-break: break-all; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; font-size: 13px; margin: 0; padding: 8px; background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 6px;">
                    ${resetUrl}
                  </p>
                </div>
                
                <!-- Important Information -->
                <div style="border-left: 4px solid #fbbf24; background-color: #fffbeb; padding: 16px 20px; margin: 32px 0; border-radius: 0 8px 8px 0;">
                  <p style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
                    Important Security Information
                  </p>
                  <ul style="color: #a16207; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.5;">
                    <li>This link expires in 1 hour (${resetTokenExpiry.toLocaleString()})</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Your password will remain unchanged until you complete the reset</li>
                  </ul>
                </div>
                
                <!-- Support Section -->
                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 24px; margin: 32px 0; text-align: center;">
                  <p style="color: #475569; font-size: 14px; margin: 0 0 8px 0;">
                    Need help or have questions?
                  </p>
                  <p style="color: #0f766e; font-size: 14px; margin: 0; font-weight: 500;">
                    Contact our support team at support@unjob.com
                  </p>
                </div>
                
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px 0;">
                  © 2025 UNJOB. All rights reserved.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  This email was sent to ${user.email}
                </p>
              </div>
              
            </div>
          `,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          `Brevo API error: ${result.message || response.statusText}`
        );
      }

      console.log("✅ Email sent successfully!");
      console.log("📧 Message ID:", result.messageId);

      return NextResponse.json(
        {
          message:
            "Password reset link has been sent to your email address. Please check your inbox and spam folder.",
          success: true,
          sentTo: user.email,
          messageId: result.messageId,
          instructions: [
            "Check your inbox for the password reset email",
            "If you don't see it, check your spam/junk folder",
            "The reset link expires in 1 hour",
            "Click the reset button or copy the link to reset your password",
          ],
        },
        { status: 200 }
      );
    } catch (emailError) {
      console.error("❌ Failed to send email:", emailError);
      return NextResponse.json(
        { error: `Failed to send reset email: ${emailError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("🔥 General error:", error);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

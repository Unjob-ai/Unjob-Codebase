// app/forgot-password/page.js
"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
        toast.success("Password reset link sent to your email");
      } else {
        setError(data.error || "Failed to send reset email");
        toast.error(data.error || "Failed to send reset email");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("An error occurred. Please try again.");
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError("");
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Gradient + Blur Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-green-900/30 z-0" />
      <div
        className="absolute top-[-800px] left-1/2 transform -translate-x-1/2 w-[1500px] h-[1500px] bg-no-repeat bg-top bg-contain pointer-events-none z-0"
        style={{
          backgroundImage:
            "url('/4fead141e6838d415e5b083de8afdbddb8332763.png')",
        }}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md rounded-[30px] border border-white/10 backdrop-blur-xl bg-white/5 px-8 py-10 shadow-2xl">
          {!submitted ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold tracking-wide text-white">
                  FORGOT PASSWORD
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                  Enter your email to receive a password reset link
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email" className="text-sm">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    className={`bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                      error
                        ? "border-red-500/50 focus:ring-red-400"
                        : "border-white/10 focus:ring-green-400"
                    }`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-400 to-green-600 text-black rounded-full text-md py-3 font-semibold hover:scale-[1.02] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                      Sending Reset Link...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Send Reset Link
                    </div>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-semibold tracking-wide text-white">
                  CHECK YOUR EMAIL
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                  We've sent a password reset link to
                </p>
                <p className="text-green-400 font-medium">{email}</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-blue-300">
                    <strong>Didn't receive the email?</strong>
                  </p>
                  <ul className="text-xs text-blue-200 mt-2 space-y-1">
                    <li>• Check your spam or junk folder</li>
                    <li>• Make sure you entered the correct email</li>
                    <li>• The link expires in 1 hour</li>
                  </ul>
                </div>

                <Button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                    setError("");
                  }}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 rounded-full py-3"
                >
                  Try Different Email
                </Button>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-green-400 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

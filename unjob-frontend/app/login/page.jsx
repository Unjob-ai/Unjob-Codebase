"use client";

import { useState, Suspense, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

// ✅ Create a separate component for the form that uses useSearchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState("freelancer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  // Handle URL error parameters
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const errorMessage =
        error === "OAuthAccountNotLinked"
          ? "Email already in use with another provider"
          : error === "CredentialsSignin"
          ? "Invalid email or password"
          : error === "Configuration"
          ? "Server configuration error"
          : "Authentication failed";

      setGeneralError(errorMessage);
      toast.error(errorMessage);
      // Clean URL without triggering navigation
      const url = new URL(window.location);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url);
    }
  }, [searchParams]);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError("");
    setErrors({});

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        role,
        redirect: false,
      });

      if (result?.error) {
        // Handle specific error types
        const errorMessage = result.error.includes("registered as a")
          ? result.error
          : result.error === "Invalid credentials"
          ? "Invalid email or password"
          : result.error === "UserNotFound"
          ? "No account found with this email"
          : result.error === "IncorrectPassword"
          ? "Incorrect password"
          : result.error === "Please sign in with Google"
          ? "Please sign in with Google"
          : result.error === "AccountNotVerified"
          ? "Please verify your account first"
          : "Login failed. Please try again.";


        console.log(result.error); // Log the exact error for debugging
        setGeneralError(errorMessage);
        toast.error(errorMessage);
      } else {
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = "An unexpected error occurred. Please try again.";
      setGeneralError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
    if (generalError) {
      setGeneralError("");
    }
  };

  return (
    <div className="w-full max-w-md rounded-[30px] border border-white/10 backdrop-blur-xl bg-white/5 px-8 py-10 shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold tracking-wide text-white">
          GET STARTED WITH UNJOB
        </h2>
      </div>

      {/* General Error Display */}
      {generalError && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{generalError}</p>
        </div>
      )}

      {/* Role Toggle */}
      <div className="flex items-center justify-between bg-white/10 rounded-full p-1 mb-6">
        <button
          type="button"
          className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-all ${
            role === "freelancer" ? "bg-green-500 text-black" : "text-white"
          }`}
          onClick={() => setRole("freelancer")}
        >
          I'm a Freelancer
        </button>
        <button
          type="button"
          className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-all ${
            role === "hiring" ? "bg-green-500 text-black" : "text-white"
          }`}
          onClick={() => setRole("hiring")}
        >
          I am Hiring
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email Field */}
        <div>
          <Label htmlFor="email" className="text-sm">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            className={`bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
              errors.email
                ? "border-red-500/50 focus:ring-red-400"
                : "border-white/10 focus:ring-green-400"
            }`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            required
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <Label htmlFor="password" className="text-sm">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className={`bg-white/10 border rounded-xl px-4 py-3 pr-12 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                errors.password
                  ? "border-red-500/50 focus:ring-red-400"
                  : "border-white/10 focus:ring-green-400"
              }`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                clearError("password");
              }}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <Checkbox id="remember" />
            <Label htmlFor="remember" className="text-sm text-gray-300">
              Remember me
            </Label>
          </div>
          <Link
            href="/forgot-password"
            className="text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            Forgot Password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-green-400 to-green-600 text-black rounded-full text-md py-3 font-semibold hover:scale-[1.02] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
              Signing In...
            </div>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="mt-6 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[#0D0E12] text-gray-400">Or continue with</span>
        </div>
      </div>

      {/* Google Sign In Button */}
      <div className="mt-6">
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white rounded-full py-3 font-medium hover:bg-white/10 transition-colors"
          onClick={() => {
            setLoading(true);
            // Store the selected role in a cookie before Google OAuth
            document.cookie = `selectedRole=${role}; path=/; max-age=600`; // 10 minutes
            signIn("google", { callbackUrl: "/dashboard" });
          }}
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.9996 10.2297C19.9996 9.5497 19.9496 8.8697 19.8496 8.1997H10.1996V12.0497H15.6996C15.4996 13.2997 14.7996 14.3497 13.7996 15.0497V17.5497H17.0996C19.0996 15.7497 19.9996 13.2297 19.9996 10.2297Z" fill="#4285F4"/>
            <path d="M10.2 20.0001C12.9 20.0001 15.2 19.1001 17.1 17.5501L13.8 15.0501C12.9 15.6501 11.7 16.0001 10.2 16.0001C7.5 16.0001 5.3 14.2501 4.5 11.8501H1.1V14.4501C3 17.7501 6.4 20.0001 10.2 20.0001Z" fill="#34A853"/>
            <path d="M4.5 11.85C4.1 10.65 4.1 9.35 4.5 8.15V5.55H1.1C-0.1 8.35 -0.1 11.65 1.1 14.45L4.5 11.85Z" fill="#FBBC05"/>
            <path d="M10.2 4C11.7 4 13 4.5 14.1 5.3L17 2.4C15.2 0.9 12.7 0 10.2 0C6.4 0 3 2.25 1.1 5.55L4.5 8.15C5.3 5.75 7.5 4 10.2 4Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>
      </div>

      <div className="mt-6 text-center text-sm text-gray-400">
        Don't have an account?{" "}
        <Link href="/signup" className="text-green-400 hover:underline">
          Create account
        </Link>
      </div>
    </div>
  );
}

// ✅ Main component wrapped with Suspense
export default function LoginPage() {
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
        <Suspense
          fallback={
            <div className="w-full max-w-md rounded-[30px] border border-white/10 backdrop-blur-xl bg-white/5 px-8 py-10 shadow-2xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading...</p>
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

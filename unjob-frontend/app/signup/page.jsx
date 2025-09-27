"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("freelancer");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameStatus, setUsernameStatus] = useState("");
  const [usernameCheckTimer, setUsernameCheckTimer] = useState(null);
  const [emailStatus, setEmailStatus] = useState("");
  const [emailCheckTimer, setEmailCheckTimer] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    companySize: "",
    industry: "",
    country: "",
    mobile: "",
    agreeToTerms: false,
    agreeToMarketing: false,
  });

  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  const companySizes = [
    "1-10 employees",
    "11-50 employees",
    "51-200 employees",
    "201-500 employees",
    "500+ employees",
  ];

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "E-commerce",
    "Marketing",
    "Manufacturing",
    "Real Estate",
    "Consulting",
    "Other",
  ];

  const countries = [
    { name: "Afghanistan", code: "AF", dialCode: "+93" },
    { name: "Albania", code: "AL", dialCode: "+355" },
    { name: "Algeria", code: "DZ", dialCode: "+213" },
    { name: "Argentina", code: "AR", dialCode: "+54" },
    { name: "Armenia", code: "AM", dialCode: "+374" },
    { name: "Australia", code: "AU", dialCode: "+61" },
    { name: "Austria", code: "AT", dialCode: "+43" },
    { name: "Bangladesh", code: "BD", dialCode: "+880" },
    { name: "Belgium", code: "BE", dialCode: "+32" },
    { name: "Brazil", code: "BR", dialCode: "+55" },
    { name: "Canada", code: "CA", dialCode: "+1" },
    { name: "China", code: "CN", dialCode: "+86" },
    { name: "Denmark", code: "DK", dialCode: "+45" },
    { name: "Egypt", code: "EG", dialCode: "+20" },
    { name: "Finland", code: "FI", dialCode: "+358" },
    { name: "France", code: "FR", dialCode: "+33" },
    { name: "Germany", code: "DE", dialCode: "+49" },
    { name: "Ghana", code: "GH", dialCode: "+233" },
    { name: "Greece", code: "GR", dialCode: "+30" },
    { name: "India", code: "IN", dialCode: "+91" },
    { name: "Indonesia", code: "ID", dialCode: "+62" },
    { name: "Iran", code: "IR", dialCode: "+98" },
    { name: "Iraq", code: "IQ", dialCode: "+964" },
    { name: "Ireland", code: "IE", dialCode: "+353" },
    { name: "Israel", code: "IL", dialCode: "+972" },
    { name: "Italy", code: "IT", dialCode: "+39" },
    { name: "Japan", code: "JP", dialCode: "+81" },
    { name: "Jordan", code: "JO", dialCode: "+962" },
    { name: "Kenya", code: "KE", dialCode: "+254" },
    { name: "Kuwait", code: "KW", dialCode: "+965" },
    { name: "Malaysia", code: "MY", dialCode: "+60" },
    { name: "Mexico", code: "MX", dialCode: "+52" },
    { name: "Netherlands", code: "NL", dialCode: "+31" },
    { name: "Nigeria", code: "NG", dialCode: "+234" },
    { name: "Norway", code: "NO", dialCode: "+47" },
    { name: "Pakistan", code: "PK", dialCode: "+92" },
    { name: "Philippines", code: "PH", dialCode: "+63" },
    { name: "Poland", code: "PL", dialCode: "+48" },
    { name: "Portugal", code: "PT", dialCode: "+351" },
    { name: "Qatar", code: "QA", dialCode: "+974" },
    { name: "Russia", code: "RU", dialCode: "+7" },
    { name: "Saudi Arabia", code: "SA", dialCode: "+966" },
    { name: "Singapore", code: "SG", dialCode: "+65" },
    { name: "South Africa", code: "ZA", dialCode: "+27" },
    { name: "South Korea", code: "KR", dialCode: "+82" },
    { name: "Spain", code: "ES", dialCode: "+34" },
    { name: "Sri Lanka", code: "LK", dialCode: "+94" },
    { name: "Sweden", code: "SE", dialCode: "+46" },
    { name: "Switzerland", code: "CH", dialCode: "+41" },
    { name: "Thailand", code: "TH", dialCode: "+66" },
    { name: "Turkey", code: "TR", dialCode: "+90" },
    { name: "Ukraine", code: "UA", dialCode: "+380" },
    { name: "United Arab Emirates", code: "AE", dialCode: "+971" },
    { name: "United Kingdom", code: "GB", dialCode: "+44" },
    { name: "United States", code: "US", dialCode: "+1" },
    { name: "Vietnam", code: "VN", dialCode: "+84" },
  ];

  const [selectedCountry, setSelectedCountry] = useState(null);

  const validateUsername = (username) => {
    if (!username) return { valid: false, message: "Username is required" };
    if (username.length < 3)
      return {
        valid: false,
        message: "Username must be at least 3 characters",
      };
    if (username.length > 30)
      return {
        valid: false,
        message: "Username must be less than 30 characters",
      };
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return {
        valid: false,
        message: "Username can only contain letters, numbers, and underscores",
      };
    if (/^\d+$/.test(username))
      return {
        valid: false,
        message: "Username must contain at least one letter",
      };
    return { valid: true, message: "" };
  };

  const checkUsernameAvailability = async (username) => {
    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameStatus("invalid");
      setErrors((prev) => ({ ...prev, username: validation.message }));
      return;
    }

    setUsernameStatus("checking");
    setErrors((prev) => ({ ...prev, username: "" }));

    try {
      const response = await fetch("/api/auth/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.toLowerCase() }),
      });

      const data = await response.json();

      if (data.available) {
        setUsernameStatus("available");
      } else {
        setUsernameStatus("taken");
        setErrors((prev) => ({
          ...prev,
          username: "Username is already taken",
        }));
      }
    } catch (error) {
      console.error("Username check error:", error);
      setUsernameStatus("");
      setErrors((prev) => ({
        ...prev,
        username: "Error checking username availability",
      }));
    }
  };

  const checkEmailAvailability = async (email) => {
    // Basic email validation first
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setEmailStatus("invalid");
      setErrors((prev) => ({ ...prev, email: "Please enter a valid email address" }));
      return;
    }

    setEmailStatus("checking");
    setErrors((prev) => ({ ...prev, email: "" }));

    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (data.available) {
        setEmailStatus("available");
      } else {
        setEmailStatus("taken");
        setErrors((prev) => ({
          ...prev,
          email: "This email address is already registered. Please use a different email or try logging in.",
        }));
      }
    } catch (error) {
      console.error("Email check error:", error);
      setEmailStatus("");
      setErrors((prev) => ({
        ...prev,
        email: "Error checking email availability",
      }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    if (field === "username") {
      if (usernameCheckTimer) {
        clearTimeout(usernameCheckTimer);
      }

      setUsernameStatus("");

      if (value.trim()) {
        const timer = setTimeout(() => {
          checkUsernameAvailability(value.trim());
        }, 500);
        setUsernameCheckTimer(timer);
      }
    }

    if (field === "email") {
      if (emailCheckTimer) {
        clearTimeout(emailCheckTimer);
      }

      setEmailStatus("");

      if (value.trim()) {
        const timer = setTimeout(() => {
          checkEmailAvailability(value.trim());
        }, 800); // Slightly longer delay for email
        setEmailCheckTimer(timer);
      }
    }

    if (field === "password") {
      setPasswordValidation({
        length: value.length >= 8,
        uppercase: /[A-Z]/.test(value),
        lowercase: /[a-z]/.test(value),
        number: /\d/.test(value),
      });
    }

    if (field === "country") {
      const country = countries.find((c) => c.code === value);
      setSelectedCountry(country);
      // Clear mobile number when country changes to avoid confusion
      setFormData((prev) => ({ ...prev, mobile: "" }));
    }
  };

  useEffect(() => {
    return () => {
      if (usernameCheckTimer) {
        clearTimeout(usernameCheckTimer);
      }
      if (emailCheckTimer) {
        clearTimeout(emailCheckTimer);
      }
    };
  }, [usernameCheckTimer, emailCheckTimer]);

  const validateMobileNumber = (mobile, countryCode) => {
    if (!mobile) return false;

    // Remove any non-digit characters for validation
    const cleanMobile = mobile.replace(/\D/g, "");

    // Basic validation based on country
    switch (countryCode) {
      case "IN": // India
        return /^[6-9]\d{9}$/.test(cleanMobile);
      case "US":
      case "CA": // US/Canada
        return /^\d{10}$/.test(cleanMobile);
      case "GB": // UK
        return /^\d{10,11}$/.test(cleanMobile);
      case "AU": // Australia
        return /^\d{9,10}$/.test(cleanMobile);
      default:
        // Generic validation for other countries (6-15 digits)
        return /^\d{6,15}$/.test(cleanMobile);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name =
        activeTab === "freelancer"
          ? "Name is required"
          : "Contact person name is required";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else {
      const usernameValidation = validateUsername(formData.username.trim());
      if (!usernameValidation.valid) {
        newErrors.username = usernameValidation.message;
      } else if (usernameStatus === "taken") {
        newErrors.username = "Username is already taken";
      } else if (usernameStatus !== "available") {
        newErrors.username = "Please wait for username availability check";
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)
    ) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.country) {
      newErrors.country = "Please select your country";
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (
      !validateMobileNumber(formData.mobile.trim(), formData.country)
    ) {
      newErrors.mobile = "Please enter a valid mobile number for your country";
    }

    if (activeTab === "company") {
      if (!formData.companyName.trim()) {
        newErrors.companyName = "Company name is required";
      }
      if (!formData.companySize) {
        newErrors.companySize = "Please select company size";
      }
      if (!formData.industry) {
        newErrors.industry = "Please select industry";
      }
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the Terms of Service";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const registrationData = {
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        country: formData.country,
        mobile: formData.mobile.trim(),
        role: activeTab === "freelancer" ? "freelancer" : "hiring",
      };

      if (activeTab === "company") {
        registrationData.companyName = formData.companyName.trim();
        registrationData.companySize = formData.companySize;
        registrationData.industry = formData.industry;
      }

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Account created successfully!");

        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          role: registrationData.role,
          redirect: false,
        });

        if (result?.error) {
          toast.error(
            "Registration successful, but auto-login failed. Please login manually."
          );
          router.push("/login");
        } else {
          setTimeout(() => {
            window.location.href = "/dashboard?welcome=true";
          }, 500);
        }
      } else {
        // Handle specific backend errors
        const errorMessage = data.error || "Registration failed";
        
        // Clear previous errors
        setErrors({});
        
        // Map specific backend error messages to form fields
        if (errorMessage.includes("email")) {
          if (errorMessage.includes("already exists") || errorMessage.includes("User already exists with this email")) {
            setErrors({ email: "This email address is already registered. Please use a different email or try logging in." });
          } else if (errorMessage.includes("valid email")) {
            setErrors({ email: "Please provide a valid email address" });
          } else {
            setErrors({ email: errorMessage });
          }
        } else if (errorMessage.includes("mobile number") || errorMessage.includes("mobile")) {
          if (errorMessage.includes("already exists") || errorMessage.includes("User already exists with this mobile number")) {
            setErrors({ mobile: "This mobile number is already registered. Please use a different number or try logging in." });
          } else if (errorMessage.includes("valid mobile")) {
            setErrors({ mobile: "Please enter a valid mobile number for your country" });
          } else if (errorMessage.includes("required")) {
            setErrors({ mobile: "Mobile number is required" });
          } else {
            setErrors({ mobile: errorMessage });
          }
        } else if (errorMessage.includes("username")) {
          if (errorMessage.includes("already exists") || errorMessage.includes("User already exists with this username")) {
            setErrors({ username: "This username is already taken. Please choose a different username." });
            setUsernameStatus("taken");
          } else if (errorMessage.includes("between 3 and 30")) {
            setErrors({ username: "Username must be between 3 and 30 characters" });
          } else if (errorMessage.includes("letters, numbers, and underscores")) {
            setErrors({ username: "Username can only contain letters, numbers, and underscores" });
          } else if (errorMessage.includes("at least one letter")) {
            setErrors({ username: "Username must contain at least one letter" });
          } else {
            setErrors({ username: errorMessage });
          }
        } else if (errorMessage.includes("password")) {
          if (errorMessage.includes("at least 6 characters")) {
            setErrors({ password: "Password must be at least 6 characters long" });
          } else {
            setErrors({ password: errorMessage });
          }
        } else if (errorMessage.includes("company name") || errorMessage.includes("Company name")) {
          setErrors({ companyName: "Company name is required for hiring accounts" });
        } else if (errorMessage.includes("company size") || errorMessage.includes("Company size")) {
          setErrors({ companySize: "Company size is required for hiring accounts" });
        } else if (errorMessage.includes("industry") || errorMessage.includes("Industry")) {
          setErrors({ industry: "Industry is required for hiring accounts" });
        } else if (errorMessage.includes("country") || errorMessage.includes("Country")) {
          setErrors({ country: "Please select a valid country" });
        } else if (errorMessage.includes("Name") || errorMessage.includes("name")) {
          if (activeTab === "freelancer") {
            setErrors({ name: "Name is required" });
          } else {
            setErrors({ name: "Contact person name is required" });
          }
        } else {
          // Generic error - show as toast if no specific field
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      
      // Handle different types of errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Network error. Please check your internet connection and try again.");
      } else if (error.message.includes('JSON')) {
        toast.error("Server response error. Please try again.");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const UsernameStatusIndicator = () => {
    if (usernameStatus === "checking") {
      return (
        <div className="flex items-center gap-1 text-xs text-blue-400 mt-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking availability...
        </div>
      );
    }
    if (usernameStatus === "available") {
      return (
        <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
          <CheckCircle className="h-3 w-3" />
          Username is available
        </div>
      );
    }
    return null;
  };

  const EmailStatusIndicator = () => {
    if (emailStatus === "checking") {
      return (
        <div className="flex items-center gap-1 text-xs text-blue-400 mt-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking email...
        </div>
      );
    }
    if (emailStatus === "available") {
      return (
        <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
          <CheckCircle className="h-3 w-3" />
          Email is available
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
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
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-wide text-white">
              CREATE YOUR ACCOUNT
            </h2>
            <p className="text-sm text-gray-300 mt-2">
              Join the future of work
            </p>
          </div>

          <div className="flex items-center justify-between bg-white/10 rounded-full p-1 mb-6">
            <button
              type="button"
              className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-all ${
                activeTab === "freelancer"
                  ? "bg-green-500 text-black"
                  : "text-white"
              }`}
              onClick={() => setActiveTab("freelancer")}
            >
              I'm a Freelancer
            </button>
            <button
              type="button"
              className={`w-1/2 py-2 text-sm font-semibold rounded-full transition-all ${
                activeTab === "company"
                  ? "bg-green-500 text-black"
                  : "text-white"
              }`}
              onClick={() => setActiveTab("company")}
            >
              I am Hiring
            </button>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm">
                {activeTab === "freelancer" ? "Full Name" : "Your Name"}
              </Label>
              <Input
                id="name"
                type="text"
                placeholder={
                  activeTab === "freelancer"
                    ? "Enter your full name"
                    : "Enter your name"
                }
                className={`bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                  errors.name
                    ? "border-red-500/50 focus:ring-red-400"
                    : "border-white/10 focus:ring-green-400"
                }`}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                required
              />
              {errors.name && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="username" className="text-sm">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Choose a unique username"
                className={`bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                  errors.username
                    ? "border-red-500/50 focus:ring-red-400"
                    : usernameStatus === "available"
                    ? "border-green-500/50 focus:ring-green-400"
                    : "border-white/10 focus:ring-green-400"
                }`}
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                required
              />
              {errors.username && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.username}
                </p>
              )}
              <UsernameStatusIndicator />
            </div>

            <div>
              <Label htmlFor="email" className="text-sm">
                {activeTab === "freelancer"
                  ? "Email Address"
                  : "Business Email"}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={
                  activeTab === "freelancer"
                    ? "Enter your email"
                    : "Enter business email"
                }
                className={`bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                  errors.email
                    ? "border-red-500/50 focus:ring-red-400"
                    : emailStatus === "available"
                    ? "border-green-500/50 focus:ring-green-400"
                    : "border-white/10 focus:ring-green-400"
                }`}
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
              <EmailStatusIndicator />
            </div>

            <div>
              <Label htmlFor="country" className="text-sm">
                Country of Origin
              </Label>
              <Select
                value={formData.country}
                onValueChange={(value) => handleInputChange("country", value)}
              >
                <SelectTrigger
                  className={`bg-white/10 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                    errors.country
                      ? "border-red-500/50 focus:ring-red-400"
                      : "border-white/10 focus:ring-green-400"
                  }`}
                >
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 border-gray-700 backdrop-blur-xl max-h-60">
                  {countries.map((country) => (
                    <SelectItem
                      key={country.code}
                      value={country.code}
                      className="text-white hover:bg-white/10"
                    >
                      <div className="flex items-center gap-2">
                        <span>{country.name}</span>
                        <span className="text-gray-400 text-xs">
                          {country.dialCode}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.country}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="mobile" className="text-sm">
                Mobile Number
              </Label>
              <div className="flex gap-2 mt-1">
                <div className="flex items-center bg-white/10 border border-white/10 rounded-xl px-3 py-3 text-white text-sm min-w-[80px]">
                  {selectedCountry ? selectedCountry.dialCode : "+1"}
                </div>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter your mobile number"
                  className={`flex-1 bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 transition-colors ${
                    errors.mobile
                      ? "border-red-500/50 focus:ring-red-400"
                      : "border-white/10 focus:ring-green-400"
                  }`}
                  value={formData.mobile}
                  onChange={(e) => handleInputChange("mobile", e.target.value)}
                  required
                />
              </div>
              {errors.mobile && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.mobile}
                </p>
              )}
              {selectedCountry && (
                <p className="text-xs text-gray-400 mt-1">
                  Format: {selectedCountry.dialCode} followed by local number
                </p>
              )}
            </div>

            {activeTab === "company" && (
              <>
                <div>
                  <Label htmlFor="companyName" className="text-sm">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Enter your company name"
                    className={`bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                      errors.companyName
                        ? "border-red-500/50 focus:ring-red-400"
                        : "border-white/10 focus:ring-green-400"
                    }`}
                    value={formData.companyName}
                    onChange={(e) =>
                      handleInputChange("companyName", e.target.value)
                    }
                    required
                  />
                  {errors.companyName && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.companyName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="companySize" className="text-sm">
                    Company Size
                  </Label>
                  <Select
                    value={formData.companySize}
                    onValueChange={(value) =>
                      handleInputChange("companySize", value)
                    }
                  >
                    <SelectTrigger
                      className={`bg-white/10 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                        errors.companySize
                          ? "border-red-500/50 focus:ring-red-400"
                          : "border-white/10 focus:ring-green-400"
                      }`}
                    >
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900/95 border-gray-700 backdrop-blur-xl">
                      {companySizes.map((size) => (
                        <SelectItem
                          key={size}
                          value={size}
                          className="text-white hover:bg-white/10"
                        >
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.companySize && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.companySize}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="industry" className="text-sm">
                    Industry
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) =>
                      handleInputChange("industry", value)
                    }
                  >
                    <SelectTrigger
                      className={`bg-white/10 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                        errors.industry
                          ? "border-red-500/50 focus:ring-red-400"
                          : "border-white/10 focus:ring-green-400"
                      }`}
                    >
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900/95 border-gray-700 backdrop-blur-xl">
                      {industries.map((industry) => (
                        <SelectItem
                          key={industry}
                          value={industry}
                          className="text-white hover:bg-white/10"
                        >
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.industry && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.industry}
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <Label htmlFor="password" className="text-sm">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  className={`bg-white/10 border rounded-xl px-4 py-3 pr-12 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                    errors.password
                      ? "border-red-500/50 focus:ring-red-400"
                      : "border-white/10 focus:ring-green-400"
                  }`}
                  value={formData.password}
                  onChange={(e) =>
                    handleInputChange("password", e.target.value)
                  }
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

              {formData.password && (
                <div className="space-y-1 text-xs mt-2">
                  <div
                    className={`flex items-center gap-1 ${
                      passwordValidation.length
                        ? "text-green-400"
                        : "text-gray-400"
                    }`}
                  >
                    {passwordValidation.length ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    At least 8 characters
                  </div>
                  <div
                    className={`flex items-center gap-1 ${
                      passwordValidation.uppercase
                        ? "text-green-400"
                        : "text-gray-400"
                    }`}
                  >
                    {passwordValidation.uppercase ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    One uppercase letter
                  </div>
                  <div
                    className={`flex items-center gap-1 ${
                      passwordValidation.lowercase
                        ? "text-green-400"
                        : "text-gray-400"
                    }`}
                  >
                    {passwordValidation.lowercase ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    One lowercase letter
                  </div>
                  <div
                    className={`flex items-center gap-1 ${
                      passwordValidation.number
                        ? "text-green-400"
                        : "text-gray-400"
                    }`}
                  >
                    {passwordValidation.number ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    One number
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-sm">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className={`bg-white/10 border rounded-xl px-4 py-3 pr-12 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 mt-1 transition-colors ${
                    errors.confirmPassword
                      ? "border-red-500/50 focus:ring-red-400"
                      : "border-white/10 focus:ring-green-400"
                  }`}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreeToTerms", checked)
                  }
                />
                <Label htmlFor="terms" className="text-sm text-gray-300">
                  I agree to the{" "}
                  <Link
                    href="/terms-of-services"
                    className="text-green-400 hover:underline"
                  >
                    Terms of Service
                  </Link>
                </Label>
              </div>
              {errors.agreeToTerms && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.agreeToTerms}
                </p>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketing"
                  checked={formData.agreeToMarketing}
                  onCheckedChange={(checked) =>
                    handleInputChange("agreeToMarketing", checked)
                  }
                />
                <Label htmlFor="marketing" className="text-sm text-gray-300">
                  Receive updates and marketing communications
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-400 to-green-600 text-black rounded-full text-md py-3 font-semibold hover:scale-[1.02] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              disabled={
                loading ||
                !formData.agreeToTerms ||
                usernameStatus === "checking"
              }
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Creating Account...
                </div>
              ) : (
                `Create ${
                  activeTab === "freelancer" ? "Freelancer" : "Company"
                } Account`
              )}
            </Button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#0D0E12] text-gray-400">
                Or sign up with
              </span>
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white rounded-full py-3 font-medium hover:bg-white/10 transition-colors"
              onClick={() => {
                setLoading(true);
                const selectedRole =
                  activeTab === "freelancer" ? "freelancer" : "hiring";
                document.cookie = `selectedRole=${selectedRole}; path=/; max-age=600`;
                signIn("google", {
                  callbackUrl: "/dashboard",
                });
              }}
              disabled={loading}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.9996 10.2297C19.9996 9.5497 19.9496 8.8697 19.8496 8.1997H10.1996V12.0497H15.6996C15.4996 13.2997 14.7996 14.3497 13.7996 15.0497V17.5497H17.0996C19.0996 15.7497 19.9996 13.2297 19.9996 10.2297Z"
                  fill="#4285F4"
                />
                <path
                  d="M10.2 20.0001C12.9 20.0001 15.2 19.100117.1 17.5501L13.8 15.0501C12.9 15.6501 11.7 16.0001 10.2 16.0001C7.5 16.0001 5.3 14.2501 4.5 11.8501H1.1V14.4501C3 17.7501 6.4 20.0001 10.2 20.0001Z"
                  fill="#34A853"
                />
                <path
                  d="M4.5 11.85C4.1 10.65 4.1 9.35 4.5 8.15V5.55H1.1C-0.1 8.35 -0.1 11.65 1.1 14.45L4.5 11.85Z"
                  fill="#FBBC05"
                />
                <path
                  d="M10.2 4C11.7 4 13 4.5 14.1 5.3L17 2.4C15.2 0.9 12.7 0 10.2 0C6.4 0 3 2.25 1.1 5.55L4.5 8.15C5.3 5.75 7.5 4 10.2 4Z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </div>
          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-green-400 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

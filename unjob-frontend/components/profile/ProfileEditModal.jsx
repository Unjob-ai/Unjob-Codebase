"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  X,
  Plus,
  Upload,
  AlertCircle,
  Check,
  Loader2,
  Mail,
  Clock,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { debounce } from "lodash";

const SKILLS_DATA = {
  "Design & Creative": {
    "Graphic Design": [
      "Logo Design",
      "Brand Identity",
      "Brochure/Flyer Design",
      "Business Cards",
      "Social Media Graphics",
      "Poster/Banner Design",
    ],
    "UI/UX Design": [
      "Web UI Design",
      "Mobile App Design",
      "Dashboard Design",
      "Design Systems",
      "Wireframing",
      "Prototyping",
    ],
    "Motion Graphics": [
      "Explainer Videos",
      "Kinetic Typography",
      "Logo Animation",
      "Reels & Shorts Animation",
    ],
    "3D Design & Modeling": [
      "3D Product Visualization",
      "Game Assets",
      "NFT Art",
      "Character Modeling",
    ],
    Illustration: [
      "Character Illustration",
      "Comic Art",
      "Children's Book Illustration",
      "Vector Art",
    ],
    Painting: [
      "Acrylic Painting",
      "Watercolor Painting",
      "Oil Painting",
      "Canvas Art",
    ],
    "Portrait Art": [
      "Hand-drawn Portraits",
      "Realistic Portraits",
      "Caricature Art",
      "Couple & Family Portraits",
    ],
  },
  "Video & Animation": {
    "Video Editing": [
      "Reels & Shorts Editing",
      "YouTube Video Editing",
      "Wedding & Event Videos",
      "Cinematic Cuts",
    ],
    Animation: [
      "2D Animation",
      "3D Animation",
      "Whiteboard Animation",
      "Explainer Videos",
    ],
    "VFX & Post Production": [
      "Green Screen Editing",
      "Color Grading",
      "Rotoscoping",
    ],
  },
  "Writing & Translation": {
    Copywriting: ["Website Copy", "Landing Pages", "Ad Copy", "Sales Copy"],
    "Content Writing": [
      "Blog Posts",
      "Technical Writing",
      "Product Descriptions",
      "Ghostwriting",
    ],
    "SEO Writing": [
      "Keyword Research",
      "On-page Optimization",
      "Meta Descriptions",
    ],
    "Translation & Localization": [
      "Document Translation",
      "Subtitling",
      "Voiceover Scripts",
    ],
  },
  "Digital Marketing": {
    "Performance Marketing": [
      "Meta Ads",
      "Google Ads",
      "TikTok Ads",
      "Funnel Building",
    ],
    "Email Marketing": [
      "Mailchimp Campaigns",
      "Automated Sequences",
      "Cold Email Writing",
    ],
    "Social Media Management": [
      "Content Calendars",
      "Community Engagement",
      "Brand Strategy",
    ],
    SEO: ["Technical SEO", "Link Building", "Site Audits"],
  },
  "Tech & Development": {
    "Web Development": [
      "Full Stack Development",
      "Frontend Development",
      "Backend Development",
      "WordPress/Shopify",
    ],
    "App Development": [
      "iOS/Android Development",
      "Progressive Web Apps",
      "API Integration",
    ],
    "No-Code Development": ["Webflow", "Bubble", "Softr"],
    "DevOps & Cloud": [
      "AWS/GCP/Azure Setup",
      "CI/CD Pipelines",
      "Server Management",
    ],
  },
  "AI & Automation": {
    "AI Content Creation": [
      "AI Blog Generation",
      "AI Voiceover & Dubbing",
      "AI Video Scripts",
    ],
    "AI Avatar Videos": [
      "Talking Head Videos",
      "Explainer Avatars",
      "Virtual Influencers",
    ],
    "Prompt Engineering": [
      "ChatGPT/Claude Prompts",
      "Midjourney/DALLE Prompts",
      "Custom GPTs",
    ],
    "AI Product Photography": [
      "AI Product Renders",
      "Lifestyle Product Mockups",
      "Virtual Try-On Assets",
    ],
  },
};

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

const INDUSTRIES = [
  { label: "Technology", value: "technology" },
  { label: "Healthcare", value: "healthcare" },
  { label: "Finance", value: "finance" },
  { label: "Education", value: "education" },
  { label: "E-commerce", value: "e-commerce" },
  { label: "Marketing", value: "marketing" },
  { label: "Manufacturing", value: "manufacturing" },
  { label: "Real Estate", value: "real-estate" },
  { label: "Consulting", value: "consulting" },
  { label: "Entertainment", value: "entertainment" },
  { label: "Other", value: "other" },
];

const COUNTRIES = [
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

const YEARS_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];

export default function ProfileEditModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    bio: "",
    location: "",
    skills: [],
    companyName: "",
    companySize: "",
    industry: "",
    description: "",
    countryOfOrigin: "",
  });

  // Username validation states
  const [usernameValidation, setUsernameValidation] = useState({
    isChecking: false,
    isAvailable: null,
    message: "",
  });

  // Email verification states
  const [emailVerification, setEmailVerification] = useState({
    isVerifying: false,
    otpSent: false,
    otp: "",
    timeLeft: 0,
    canResend: true,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attemptedClose, setAttemptedClose] = useState(false);

  useEffect(() => {
    if (profile) {
      const nameParts = (profile.name || "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      setFormData({
        firstName,
        lastName,
        username: profile.username || "",
        email: profile.email || "",
        bio: profile.profile?.bio || "",
        location: profile.profile?.location || "",
        skills: profile.profile?.structuredSkills || [],
        companyName: profile.profile?.companyName || "",
        companySize: profile.profile?.companySize || "",
        industry: profile.profile?.industry || "",
        description: profile.profile?.description || "",
        countryOfOrigin: profile.countryOfOrigin || "",
      });
      setImagePreview(profile.image);
      setAttemptedClose(false);
    }
  }, [profile]);

  // Debounced username validation
  const debouncedUsernameCheck = useCallback(
    debounce(async (username) => {
      if (!username || username === profile?.username) {
        setUsernameValidation({
          isChecking: false,
          isAvailable: null,
          message: "",
        });
        return;
      }

      if (username.length < 3) {
        setUsernameValidation({
          isChecking: false,
          isAvailable: false,
          message: "Username must be at least 3 characters",
        });
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setUsernameValidation({
          isChecking: false,
          isAvailable: false,
          message:
            "Username can only contain letters, numbers, and underscores",
        });
        return;
      }

      if (/^\d+$/.test(username)) {
        setUsernameValidation({
          isChecking: false,
          isAvailable: false,
          message: "Username must contain at least one letter",
        });
        return;
      }

      setUsernameValidation({
        isChecking: true,
        isAvailable: null,
        message: "",
      });

      try {
        const response = await fetch("/api/auth/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            currentUserId: profile?._id,
          }),
        });

        const data = await response.json();

        setUsernameValidation({
          isChecking: false,
          isAvailable: data.available,
          message: data.message || data.error,
        });
      } catch (error) {
        setUsernameValidation({
          isChecking: false,
          isAvailable: false,
          message: "Error checking username availability",
        });
      }
    }, 500),
    [profile?.username, profile?._id]
  );

  // Email OTP timer
  useEffect(() => {
    let interval;
    if (emailVerification.timeLeft > 0) {
      interval = setInterval(() => {
        setEmailVerification((prev) => ({
          ...prev,
          timeLeft: prev.timeLeft - 1,
          canResend: prev.timeLeft <= 1,
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [emailVerification.timeLeft]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Trigger username validation
    if (field === "username") {
      debouncedUsernameCheck(value.toLowerCase());
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send OTP for email verification
  const sendEmailOTP = async () => {
    if (!formData.email || formData.email === profile?.email) return;

    setEmailVerification((prev) => ({ ...prev, isVerifying: true }));

    try {
      const response = await fetch("/api/email/verify-and-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.email,
          newEmail: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailVerification({
          isVerifying: false,
          otpSent: true,
          otp: "",
          timeLeft: 300, // 5 minutes
          canResend: false,
        });
        toast.success("Verification email sent to your new email address");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setEmailVerification((prev) => ({ ...prev, isVerifying: false }));
      toast.error(error.message || "Failed to send verification email");
    }
  };

  const verifyEmailOTP = async () => {
    if (!emailVerification.otp) return;

    try {
      const response = await fetch("/api/email/verify-and-edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: emailVerification.otp,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Email verified and updated successfully!");

        // Reset email verification state
        setEmailVerification({
          isVerifying: false,
          otpSent: false,
          otp: "",
          timeLeft: 0,
          canResend: true,
        });

        // Update the profile data
        onProfileUpdated(data.user);

        // Close modal first
        handleClose();

        // Show logout message and redirect
        toast.success("Please login again with your new email address", {
          duration: 4000,
        });

        // Wait a moment for the toast to show, then logout
        setTimeout(async () => {
          try {
            await signOut({
              callbackUrl: "/login?message=email_changed",
              redirect: true,
            });
          } catch (error) {
            console.error("Logout error:", error);
            // Fallback: force page reload to clear session
            window.location.href = "/login?message=email_changed";
          }
        }, 1500);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error.message || "Invalid verification code");
    }
  };

  const addSkill = () => {
    setFormData((prev) => ({
      ...prev,
      skills: [...prev.skills, { category: "", subcategory: "", years: "" }],
    }));
  };

  const updateSkill = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.map((skill, i) =>
        i === index
          ? {
              ...skill,
              [field]: value,
              ...(field === "category" ? { subcategory: "" } : {}),
            }
          : skill
      ),
    }));
  };

  const removeSkill = (index) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  // Enhanced form validation
  const isFormValid = () => {
    const baseValidation =
      formData.firstName.trim() &&
      formData.lastName.trim() &&
      formData.username.trim() &&
      formData.username.length >= 3 &&
      usernameValidation.isAvailable !== false &&
      formData.email.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.bio.trim() &&
      formData.bio.length >= 10;

    if (profile.role === "hiring") {
      return baseValidation && formData.companyName.trim() && formData.industry;
    } else {
      return (
        baseValidation &&
        formData.skills.length >= 1 &&
        formData.skills.every(
          (skill) => skill.category && skill.subcategory && skill.years
        )
      );
    }
  };

  // Get validation errors for display
  const getValidationErrors = () => {
    const errors = [];

    if (!formData.firstName.trim()) errors.push("First name is required");
    if (!formData.lastName.trim()) errors.push("Last name is required");
    if (!formData.username.trim()) errors.push("Username is required");
    if (formData.username.trim() && formData.username.length < 3)
      errors.push("Username must be at least 3 characters");
    if (usernameValidation.isAvailable === false)
      errors.push("Username is not available");
    if (!formData.email.trim()) errors.push("Email is required");
    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    )
      errors.push("Valid email is required");
    if (!formData.bio.trim()) errors.push("Bio is required");
    if (formData.bio.trim() && formData.bio.length < 10)
      errors.push("Bio must be at least 10 characters");

    if (profile.role === "hiring") {
      if (!formData.companyName.trim()) errors.push("Company name is required");
      if (!formData.industry) errors.push("Industry selection is required");
    } else if (profile.role === "freelancer") {
      if (formData.skills.length < 1)
        errors.push("At least 1 skill is required");
      if (
        formData.skills.some(
          (skill) => !skill.category || !skill.subcategory || !skill.years
        )
      ) {
        errors.push("All skill fields must be completed");
      }
    }

    return errors;
  };

  // Handle close with validation
  const handleCloseAttempt = () => {
    if (!isFormValid()) {
      setAttemptedClose(true);
      toast.error("Please fill all required fields before closing");
      return;
    }
    handleClose();
  };

  const handleClose = () => {
    // Reset form state
    setFormData({
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      bio: "",
      location: "",
      skills: [],
      companyName: "",
      companySize: "",
      industry: "",
      description: "",
      countryOfOrigin: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setLoading(false);
    setAttemptedClose(false);
    setUsernameValidation({
      isChecking: false,
      isAvailable: null,
      message: "",
    });
    setEmailVerification({
      isVerifying: false,
      otpSent: false,
      otp: "",
      timeLeft: 0,
      canResend: true,
    });
    onClose();
  };

  const getSubcategories = (category) => {
    return Object.keys(SKILLS_DATA[category] || {});
  };

  const getUsernameIcon = () => {
    if (usernameValidation.isChecking) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
    }
    if (usernameValidation.isAvailable === true) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    if (usernameValidation.isAvailable === false) {
      return <X className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if email changed and needs verification
    if (formData.email !== profile.email && !emailVerification.otpSent) {
      toast.error("Please verify your new email address");
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      const fullName =
        `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
      submitData.append("name", fullName);
      submitData.append("username", formData.username.trim());

      const profileData = {
        bio: formData.bio,
        location: formData.location,
        isCompleted: true,
      };

      // Add country data if selected
      if (formData.countryOfOrigin) {
        const selectedCountry = COUNTRIES.find(
          (c) => c.code === formData.countryOfOrigin
        );
        if (selectedCountry) {
          submitData.append("countryOfOrigin", selectedCountry.code);
          submitData.append("countryName", selectedCountry.name);
          submitData.append("phoneCountryCode", selectedCountry.dialCode);
        }
      }

      if (profile.role === "hiring") {
        profileData.companyName = formData.companyName;
        if (formData.companySize && formData.companySize.trim() !== "") {
          profileData.companySize = formData.companySize;
        }
        profileData.industry = formData.industry;
        profileData.description = formData.description;
        if (formData.skills && formData.skills.length > 0) {
          profileData.structuredSkills = formData.skills;
        }
      } else {
        profileData.structuredSkills = formData.skills;
      }

      submitData.append("profile", JSON.stringify(profileData));

      if (imageFile) {
        submitData.append("image", imageFile);
      }

      const response = await fetch(`/api/profile/${profile._id}`, {
        method: "PUT",
        body: submitData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const data = await response.json();
      toast.success("Profile updated successfully!");
      onProfileUpdated(data.user);
      handleClose();
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAttempt}>
      <DialogContent className="bg-white text-black max-w-4xl w-[95vw] sm:w-[90vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-8">
        {/* Header */}
        <DialogHeader className="px-6 py-4 pb-3 border-b border-gray-200 relative">
          <DialogTitle className="text-lg sm:text-xl font-bold text-black tracking-wide">
            EDIT PROFILE
          </DialogTitle>
        </DialogHeader>

        {/* Validation Alert */}
        {attemptedClose && !isFormValid() && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-300 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-red-700 font-medium mb-2 text-sm">
                  Please complete all required fields:
                </h4>
                <ul className="text-xs text-red-600 space-y-1">
                  {getValidationErrors().map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Profile Image Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 ring-2 ring-gray-200">
              <AvatarImage
                src={imagePreview || "/placeholder.svg"}
                alt={`${formData.firstName} ${formData.lastName}`}
                className="object-cover"
              />
              <AvatarFallback className="bg-gray-200 text-black text-lg sm:text-xl font-semibold">
                {formData.firstName?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center sm:items-start">
              <Label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex items-center space-x-2 text-black hover:text-gray-700 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm font-medium">Change Photo</span>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Basic Information Section */}
            <div className="space-y-6">
              <h3 className="text-base font-semibold text-black">
                Basic Information
              </h3>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-black mb-2 block">
                    First Name<span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    className={`bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 text-base ${
                      attemptedClose && !formData.firstName.trim()
                        ? "border-red-300 bg-red-50"
                        : ""
                    }`}
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-black mb-2 block">
                    Last Name<span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    className={`bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 text-base ${
                      attemptedClose && !formData.lastName.trim()
                        ? "border-red-300 bg-red-50"
                        : ""
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Username Field with Real-time Validation */}
              <div>
                <Label className="text-sm font-medium text-black mb-2 block">
                  Username<span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="relative">
                  <Input
                    value={formData.username}
                    onChange={(e) =>
                      handleInputChange(
                        "username",
                        e.target.value.toLowerCase()
                      )
                    }
                    className={`bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 text-base pr-10 ${
                      attemptedClose && usernameValidation.isAvailable === false
                        ? "border-red-300 bg-red-50"
                        : usernameValidation.isAvailable === true
                        ? "border-green-300 bg-green-50"
                        : ""
                    }`}
                    placeholder="Enter your username"
                    minLength={3}
                    maxLength={30}
                    pattern="^[a-zA-Z0-9_]+$"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {getUsernameIcon()}
                  </div>
                </div>
                <div className="text-xs mt-1">
                  {usernameValidation.message ? (
                    <span
                      className={
                        usernameValidation.isAvailable === false
                          ? "text-red-500"
                          : "text-green-500"
                      }
                    >
                      {usernameValidation.message}
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      Username must be 3-30 characters (letters, numbers,
                      underscores only)
                    </span>
                  )}
                </div>
              </div>

              {/* Email Field with OTP Verification */}
              <div>
                <Label className="text-sm font-medium text-black mb-2 block">
                  Email Address<span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      className={`bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 text-base ${
                        attemptedClose &&
                        (!formData.email.trim() ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
                          ? "border-red-300 bg-red-50"
                          : ""
                      }`}
                      placeholder="Enter your email address"
                      required
                    />
                    {formData.email !== profile?.email && formData.email && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <Mail className="h-4 w-4 text-orange-500" />
                      </div>
                    )}
                  </div>

                  {/* Email Change Notice */}
                  {formData.email !== profile?.email && formData.email && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-orange-700 font-medium">
                            Email Change Required
                          </p>
                          <p className="text-xs text-orange-600 mt-1">
                            You're changing your email from {profile?.email} to{" "}
                            {formData.email}. Verification is required.
                          </p>

                          {!emailVerification.otpSent ? (
                            <Button
                              type="button"
                              onClick={sendEmailOTP}
                              disabled={emailVerification.isVerifying}
                              className="mt-2 bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 h-auto rounded"
                            >
                              {emailVerification.isVerifying ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Mail className="h-3 w-3 mr-1" />
                                  Send Verification Email
                                </>
                              )}
                            </Button>
                          ) : (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center space-x-2">
                                <Input
                                  placeholder="Enter verification code"
                                  value={emailVerification.otp}
                                  onChange={(e) =>
                                    setEmailVerification((prev) => ({
                                      ...prev,
                                      otp: e.target.value,
                                    }))
                                  }
                                  className="bg-white border-orange-200 text-black h-8 text-xs flex-1"
                                  maxLength={6}
                                />
                                <Button
                                  type="button"
                                  onClick={verifyEmailOTP}
                                  disabled={!emailVerification.otp}
                                  className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 h-8 rounded"
                                >
                                  Verify
                                </Button>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center text-orange-600">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {emailVerification.timeLeft > 0
                                    ? `Expires in ${Math.floor(
                                        emailVerification.timeLeft / 60
                                      )}:${(emailVerification.timeLeft % 60)
                                        .toString()
                                        .padStart(2, "0")}`
                                    : "Code expired"}
                                </div>

                                {emailVerification.canResend && (
                                  <Button
                                    type="button"
                                    onClick={sendEmailOTP}
                                    disabled={emailVerification.isVerifying}
                                    className="bg-transparent hover:bg-orange-50 text-orange-600 text-xs px-2 py-0 h-auto border-0"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Resend
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Country of Origin Field */}
              <div>
                <Label className="text-sm font-medium text-black mb-2 block">
                  Country of Origin
                </Label>
                <Select
                  value={formData.countryOfOrigin}
                  onValueChange={(value) =>
                    handleInputChange("countryOfOrigin", value)
                  }
                >
                  <SelectTrigger className="bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 hover:bg-white text-black max-h-60">
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name} ({country.dialCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bio Field */}
              <div>
                <Label className="text-sm font-medium text-black mb-2 block">
                  Bio<span className="text-red-500 ml-1">*</span>
                </Label>
                <Textarea
                  placeholder="User interface designer based in India"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  className={`bg-gray-100 border-gray-200 text-black min-h-[100px] rounded-lg focus:border-gray-400 focus:ring-0 text-base resize-none ${
                    attemptedClose &&
                    (!formData.bio.trim() || formData.bio.length < 10)
                      ? "border-red-300 bg-red-50"
                      : ""
                  }`}
                  maxLength={500}
                  required
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.bio.length}/500 characters (minimum 10 required)
                </div>
              </div>

              {/* Location Field */}
              <div>
                <Label className="text-sm font-medium text-black mb-2 block">
                  Location
                </Label>
                <Input
                  placeholder="e.g., New York, NY"
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  className="bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 text-base"
                />
              </div>
            </div>

            {/* Professional Information Section (Only for Hiring Role) */}
            {profile.role === "hiring" && (
              <div className="space-y-6">
                <h3 className="text-base font-semibold text-black">
                  Professional Information
                </h3>

                <div>
                  <Label className="text-sm font-medium text-black mb-2 block">
                    Company Name<span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Input
                    placeholder="Your Company Name"
                    value={formData.companyName}
                    onChange={(e) =>
                      handleInputChange("companyName", e.target.value)
                    }
                    className={`bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 text-base ${
                      attemptedClose && !formData.companyName.trim()
                        ? "border-red-300 bg-red-50"
                        : ""
                    }`}
                    required
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-black mb-2 block">
                    Company Size
                  </Label>
                  <Select
                    value={formData.companySize}
                    onValueChange={(value) =>
                      handleInputChange("companySize", value)
                    }
                  >
                    <SelectTrigger className="bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 hover:bg-white text-black">
                      {COMPANY_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-black mb-2 block">
                    Industry<span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) =>
                      handleInputChange("industry", value)
                    }
                  >
                    <SelectTrigger
                      className={`bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 ${
                        attemptedClose && !formData.industry
                          ? "border-red-300 bg-red-50"
                          : ""
                      }`}
                    >
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 hover:bg-white text-black">
                      {INDUSTRIES.map((industry) => (
                        <SelectItem key={industry.value} value={industry.value}>
                          {industry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-black mb-2 block">
                    Company Description
                  </Label>
                  <Textarea
                    placeholder="Describe your company..."
                    value={formData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    className="bg-gray-100 border-gray-200 text-black min-h-[100px] rounded-lg focus:border-gray-400 focus:ring-0 text-base resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Skills Section - Only show for freelancers */}
          {profile.role === "freelancer" && (
            <div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
                <h3 className="text-sm font-medium text-black">
                  Select Your Skills<span className="text-red-500 ml-1">*</span>
                </h3>
                <Button
                  type="button"
                  onClick={addSkill}
                  className="bg-transparent hover:bg-gray-50 text-black border-0 p-2 rounded-lg self-start sm:self-auto"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {formData.skills.map((skill, index) => (
                  <div key={index} className="space-y-4">
                    {/* Skill Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Skill Category */}
                      <div>
                        <Label className="text-sm font-medium text-black mb-2 block">
                          Skill {index + 1}
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Select
                          value={skill.category}
                          onValueChange={(value) =>
                            updateSkill(index, "category", value)
                          }
                        >
                          <SelectTrigger
                            className={`bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 ${
                              attemptedClose && !skill.category
                                ? "border-red-300 bg-red-50"
                                : ""
                            }`}
                          >
                            <SelectValue placeholder="Select skill" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 hover:bg-white text-black">
                            {Object.keys(SKILLS_DATA).map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sub-category */}
                      <div>
                        <Label className="text-sm font-medium text-black mb-2 block">
                          Sub-category
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Select
                          value={skill.subcategory}
                          onValueChange={(value) =>
                            updateSkill(index, "subcategory", value)
                          }
                          disabled={!skill.category}
                        >
                          <SelectTrigger
                            className={`bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 ${
                              attemptedClose &&
                              !skill.subcategory &&
                              skill.category
                                ? "border-red-300 bg-red-50"
                                : ""
                            }`}
                          >
                            <SelectValue placeholder="Select subcategory" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 hover:bg-white text-black">
                            {getSubcategories(skill.category).map(
                              (subcategory) => (
                                <SelectItem
                                  key={subcategory}
                                  value={subcategory}
                                >
                                  {subcategory}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Years of Experience */}
                      <div>
                        <Label className="text-sm font-medium text-black mb-2 block">
                          Number of years
                          <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Select
                          value={skill.years}
                          onValueChange={(value) =>
                            updateSkill(index, "years", value)
                          }
                        >
                          <SelectTrigger
                            className={`bg-gray-100 border-gray-200 text-black h-12 rounded-lg focus:border-gray-400 focus:ring-0 ${
                              attemptedClose && !skill.years
                                ? "border-red-300 bg-red-50"
                                : ""
                            }`}
                          >
                            <SelectValue placeholder="Years" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 hover:bg-white text-black">
                            {YEARS_OPTIONS.map((years) => (
                              <SelectItem key={years} value={years}>
                                {years}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Remove Skill Button */}
                    {formData.skills.length > 1 && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1 rounded-lg text-sm"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {formData.skills.length === 0 && (
                  <div
                    className={`text-center py-8 rounded-lg ${
                      attemptedClose ? "bg-red-50 border border-red-200" : ""
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        attemptedClose ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      {attemptedClose
                        ? "Please add at least one skill to continue"
                        : "Click the + button to add your first skill"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-6 border-t border-gray-200">
            <Button
              type="submit"
              disabled={loading || !isFormValid()}
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-12 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

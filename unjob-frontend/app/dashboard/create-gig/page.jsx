"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  X,
  Calendar,
  AlertCircle,
  CheckCircle,
  Info,
  Gift,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

const CATEGORIES = {
  "Design And Creative": [
    "Logo Design",
    "Brand Identity",
    "Brochure/Flyer Design",
    "Business Cards",
    "Social Media Graphics",
    "Poster/Banner Design",
    "Web UI Design",
    "Mobile App Design",
    "Dashboard Design",
    "Design Systems",
    "Wireframing",
    "Prototyping (Figma/Adobe XD)",
    "Explainer Videos",
    "Kinetic Typography",
    "Logo Animation",
    "Reels & Shorts Animation",
    "3D Product Visualization",
    "Game Assets",
    "NFT Art",
    "Character Modeling",
    "Character Illustration",
    "Comic Art",
    "Children's Book Illustration",
    "Vector Art",
    "Acrylic Painting",
    "Watercolor Painting",
    "Oil Painting",
    "Canvas Art",
    "Pencil Sketches",
    "Charcoal Drawing",
    "Ink Illustration",
    "Line Art",
    "Hand-drawn Portraits",
    "Realistic Portraits",
    "Caricature Art",
    "Couple & Family Portraits",
    "Modern Calligraphy",
    "Custom Lettering",
    "Name Art",
    "Collage Art",
    "Texture Art",
    "Traditional + Digital Fusion",
    "Interior Wall Paintings",
    "Outdoor Murals",
    "Street Art Concepts",
  ],
  "Video And Animation": [
    "Reels & Shorts Editing",
    "YouTube Video Editing",
    "Wedding & Event Videos",
    "Cinematic Cuts",
    "2D Animation",
    "3D Animation",
    "Whiteboard Animation",
    "Explainer Videos",
    "Green Screen Editing",
    "Color Grading",
    "Rotoscoping",
  ],
  "Writing And Translation": [
    "Website Copy",
    "Landing Pages",
    "Ad Copy",
    "Sales Copy",
    "YouTube Scripts",
    "Instagram Reels",
    "Podcast Scripts",
    "Blog Posts",
    "Technical Writing",
    "Product Descriptions",
    "Ghostwriting",
    "Keyword Research",
    "On-page Optimization",
    "Meta Descriptions",
    "Document Translation",
    "Subtitling",
    "Voiceover Scripts",
  ],
  "Digital Marketing": [
    "Meta Ads",
    "Google Ads",
    "TikTok Ads",
    "Funnel Building",
    "Mailchimp/Klaviyo/HubSpot Campaigns",
    "Automated Sequences",
    "Cold Email Writing",
    "Content Calendars",
    "Community Engagement",
    "Brand Strategy",
    "Technical SEO",
    "Link Building",
    "Site Audits",
    "Influencer research",
    "UGC Scripts & Briefs",
  ],
  "Tech And Development": [
    "Full Stack Development",
    "Frontend (React, Next.js)",
    "Backend (Node.js, Django)",
    "WordPress/Shopify",
    "iOS/Android (Flutter, React Native)",
    "Progressive Web Apps (PWA)",
    "API Integration",
    "Webflow",
    "Bubble",
    "Softr",
    "Manual Testing",
    "Automation Testing",
    "Test Plan Creation",
    "AWS / GCP / Azure Setup",
    "CI/CD Pipelines",
    "Server Management",
  ],
  "Ai And Automation": [
    "AI Blog Generation",
    "AI Voiceover & Dubbing",
    "AI Video Scripts",
    "Talking Head Videos",
    "Explainer Avatars",
    "Virtual Influencers",
    "ChatGPT/Claude Prompt Design",
    "Midjourney/DALLE Prompts",
    "Custom GPTs / API Workflows",
    "Vapi / AutoGPT Setup",
    "Zapier / Make Integrations",
    "Custom AI Workflows",
    "Assistant Building",
    "GPT App Development",
    "OpenAI API Integration",
    "AI-generated Product Renders",
    "Lifestyle Product Mockups",
    "Model-less Product Photography",
    "360° Product Spins (AI-generated)",
    "AI Backdrop Replacement",
    "Packaging Mockups (AI-enhanced)",
    "Virtual Try-On Assets",
    "Catalog Creation with AI Models",
    "Product UGC Simulation (AI Actors)",
  ],
  "Business And Legal": [
    "Invoicing & Reconciliation",
    "Monthly Financial Statements",
    "Tally / QuickBooks / Zoho Books",
    "Business Plans",
    "Startup Financial Decks",
    "Investor-Ready Models",
    "GST Filing (India)",
    "US/UK Tax Filing",
    "Company Registration Help",
    "NDA / Founder Agreements",
    "Employment Contracts",
    "SaaS Terms & Privacy Policies",
    "IP & Trademark Filing",
    "GST Registration",
    "Pitch Deck Design",
  ],
};

export default function CreateGigPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gigCreated, setGigCreated] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [isFirstGig, setIsFirstGig] = useState(false);
  const [gigId, setGigId] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});

  const [profileComplete, setProfileComplete] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [showProfileCheck, setShowProfileCheck] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: "I want ", // Pre-filled with required prefix
    category: "",
    subCategory: "",
    tags: [],
    projectOverview: "",
    deliverables: [],
    budget: "",
    timeline: "", // Will be converted to number of days
    quantity: 1, // New quantity field
    assetDescription: "",
    bannerImage: null,
    assetFiles: [],
  });

  const bannerInputRef = useRef(null);
  const assetsInputRef = useRef(null);

  useEffect(() => {
    const checkSubscriptionAndGigs = async () => {
      try {
        // Check existing gigs count
        const gigsResponse = await fetch("/api/gigs/user-stats");
        const gigsData = await gigsResponse.json();
        const isFirstTime = gigsData.success && gigsData.totalGigs === 0;
        setIsFirstGig(isFirstTime);

        // If not first gig, check subscription
        if (!isFirstTime) {
          const response = await fetch("/api/subscription/manage");
          const data = await response.json();
          setSubscriptionStatus(data);
        } else {
          // First gig - no subscription required
          setSubscriptionStatus({
            success: true,
            hasActiveSubscription: true, // Allow form access
            isFirstGigFree: true,
          });
        }
      } catch (error) {
        console.error("Error checking status:", error);
        setSubscriptionStatus({ success: false, hasActiveSubscription: false });
      } finally {
        setCheckingSubscription(false);
      }
    };

    if (status === "authenticated") {
      checkSubscriptionAndGigs();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const checkSubscriptionAndGigs = async () => {
      try {
        // First check profile completion
        await checkProfileCompleteness();

        // Then check existing gigs count
        const gigsResponse = await fetch("/api/gigs/user-stats");
        const gigsData = await gigsResponse.json();
        const isFirstTime = gigsData.success && gigsData.totalGigs === 0;
        setIsFirstGig(isFirstTime);

        // If not first gig, check subscription
        if (!isFirstTime) {
          const response = await fetch("/api/subscription/manage");
          const data = await response.json();
          setSubscriptionStatus(data);
        } else {
          // First gig - no subscription required
          setSubscriptionStatus({
            success: true,
            hasActiveSubscription: true,
            isFirstGigFree: true,
          });
        }
      } catch (error) {
        console.error("Error checking status:", error);
        setSubscriptionStatus({ success: false, hasActiveSubscription: false });
      } finally {
        setCheckingSubscription(false);
      }
    };

    if (status === "authenticated") {
      checkSubscriptionAndGigs();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    // Only redirect if not checking, not first gig, and no active subscription
    if (!checkingSubscription && subscriptionStatus && !isFirstGig) {
      if (!subscriptionStatus.hasActiveSubscription) {
        toast.error(
          "You need an active subscription to create additional gigs."
        );
        router.push("/dashboard/settings/hiring?view=subscription");
      }
    }
  }, [checkingSubscription, subscriptionStatus, isFirstGig, router]);

  const handleInputChange = (field, value) => {
    // Special handling for title to maintain "I want " prefix
    if (field === "title") {
      if (!value.startsWith("I want ")) {
        value = "I want " + value.replace(/^I want\s*/, "");
      }
    }

    // Special handling for timeline - convert to number of days
    if (field === "timeline") {
      // Allow only positive integers
      const numValue = parseInt(value);
      if (value === "" || (numValue > 0 && numValue <= 365)) {
        value = value === "" ? "" : numValue.toString();
      } else {
        return; // Don't update if invalid
      }
    }

    // Special handling for quantity
    if (field === "quantity") {
      const numValue = parseInt(value);
      if (value === "" || (numValue > 0 && numValue <= 100)) {
        value = value === "" ? 1 : numValue;
      } else {
        return; // Don't update if invalid
      }
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleTagRemove = (tagToRemove) => {
    handleInputChange(
      "tags",
      formData.tags.filter((tag) => tag !== tagToRemove)
    );
  };

  const handleFileUpload = (files, type) => {
    if (type === "banner") {
      handleInputChange("bannerImage", files[0]);
    } else {
      handleInputChange("assetFiles", [
        ...formData.assetFiles,
        ...Array.from(files),
      ]);
    }
  };

  const removeFile = (index, type) => {
    if (type === "banner") {
      handleInputChange("bannerImage", null);
    } else {
      handleInputChange(
        "assetFiles",
        formData.assetFiles.filter((_, i) => i !== index)
      );
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.replace("#", "").trim();
    if (tag && !formData.tags.includes(tag)) {
      handleInputChange("tags", [...formData.tags, tag]);
      setTagInput("");
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.title.trim() || formData.title === "I want ") {
        newErrors.title = "Please complete the title after 'I want'";
      }
      if (!formData.category) newErrors.category = "Category is required";
      if (!formData.projectOverview.trim())
        newErrors.projectOverview = "Project overview is required";
    }

    if (step === 2) {
      if (!formData.budget) newErrors.budget = "Budget is required";
      if (parseInt(formData.budget) < 500)
        newErrors.budget = "Minimum budget is ₹500";
      if (!formData.timeline.trim())
        newErrors.timeline = "Project deadline is required";
      if (!formData.quantity || formData.quantity < 1)
        newErrors.quantity = "Quantity must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep((prev) => prev + 1);
      } else {
        await createGigDirectly();
      }
    }
  };

  const checkProfileCompleteness = async () => {
    try {
      setProfileLoading(true);
      console.log("🔍 Fetching hiring manager profile...");

      const response = await fetch(`/api/profile/${session.user.id}`);
      const data = await response.json();

      if (response.ok && data.user) {
        setUserProfile(data.user);
        const missing = validateRequiredFields(data.user);

        if (missing.length === 0) {
          console.log("✅ Profile complete - allowing gig creation");
          setProfileComplete(true);
          setShowProfileCheck(false);
        } else {
          console.log("❌ Profile incomplete:", missing);
          setMissingFields(missing);
          setShowProfileCheck(true);
          setProfileComplete(false);
        }
      } else {
        setMissingFields([{ field: "profile", label: "Profile Data" }]);
        setShowProfileCheck(true);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMissingFields([{ field: "profile", label: "Profile Data" }]);
      setShowProfileCheck(true);
    } finally {
      setProfileLoading(false);
    }
  };

  const validateRequiredFields = (userData) => {
    if (!userData || userData.role !== "hiring") return [];

    const missing = [];
    const profile = userData.profile || {};

    // Check basic fields
    if (!userData.name?.trim())
      missing.push({ field: "name", label: "Full Name" });
    if (!userData.image?.trim())
      missing.push({ field: "image", label: "Profile Picture" });

    // Check profile fields
    if (!profile.location?.trim())
      missing.push({ field: "location", label: "Location" });
    if (!profile.companyName?.trim())
      missing.push({ field: "companyName", label: "Company Name" });
    if (!profile.companySize?.trim())
      missing.push({ field: "companySize", label: "Company Size" });
    if (!profile.industry?.trim())
      missing.push({ field: "industry", label: "Industry" });

    return missing;
  };

  const createGigDirectly = async () => {
    try {
      setIsSubmitting(true);

      const submitFormData = new FormData();
      submitFormData.append("title", formData.title);
      submitFormData.append("category", formData.category);
      submitFormData.append("subCategory", formData.subCategory);
      submitFormData.append("projectOverview", formData.projectOverview);
      submitFormData.append("tags", JSON.stringify(formData.tags));
      submitFormData.append(
        "deliverables",
        JSON.stringify(formData.deliverables)
      );
      submitFormData.append("budget", formData.budget);
      submitFormData.append("timeline", formData.timeline);
      submitFormData.append("quantity", formData.quantity.toString());
      submitFormData.append("assetDescription", formData.assetDescription);
      submitFormData.append("status", "active");

      if (formData.bannerImage) {
        submitFormData.append("bannerImage", formData.bannerImage);
      }

      formData.assetFiles.forEach((file) => {
        submitFormData.append("assetFiles", file);
      });

      const response = await fetch("/api/gigs/createGig", {
        method: "POST",
        body: submitFormData,
      });

      const result = await response.json();

      if (result.success) {
        setGigId(result.gigId);
        setGigCreated(true);

        if (result.isFirstGig) {
          toast.success(
            "🎉 First gig created successfully - no subscription required!"
          );
        } else {
          toast.success("🎉 Gig created and activated successfully!");
        }
      } else {
        // Handle specific error cases
        if (result.error === "SUBSCRIPTION_REQUIRED") {
          toast.error(result.message);
          router.push(result.redirectTo);
          return;
        } else if (result.error === "SUBSCRIPTION_LIMIT_REACHED") {
          toast.error(result.message);
          router.push(result.redirectTo);
          return;
        }

        setErrors({ submit: result.error || "Failed to create gig" });
        toast.error(result.error || "Failed to create gig");
      }
    } catch (error) {
      console.error("Error creating gig:", error);
      setErrors({ submit: "An error occurred while creating the gig" });
      toast.error("An error occurred while creating the gig");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, name: "Basic Info", active: currentStep === 1 },
    { id: 2, name: "Budget & Timeline", active: currentStep === 2 },
    { id: 3, name: "Visuals", active: currentStep === 3 },
  ];

  if (status === "loading" || checkingSubscription || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">
            {profileLoading
              ? "Validating your profile..."
              : "Checking your access..."}
          </p>
        </div>
      </div>
    );
  }

  // Profile Completion Modal - Render BEFORE early returns
  if (showProfileCheck || !profileComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="bg-white border-2 border-gray-200 text-black max-w-3xl shadow-2xl">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-100 border-2 border-green-200">
                  <AlertCircle className="h-6 w-6 text-green-600" />
                </div>
                Complete Your Hiring Profile
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-green-50 border-2 border-green-200 shadow-lg rounded-xl p-6">
                <h3 className="font-bold text-black text-lg mb-2">
                  Profile Setup Required
                </h3>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                  To post gigs and connect with freelancers, please complete
                  these required fields:
                </p>

                <div className="space-y-3 bg-white rounded-xl p-4 border border-green-200">
                  <h4 className="font-semibold text-green-700 text-sm mb-3">
                    Missing Fields ({missingFields.length}):
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {missingFields.map((field, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-black font-medium text-sm">
                          {field.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <Button
                  onClick={() => router.push("/dashboard/profile")}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 h-12 rounded-xl font-semibold"
                >
                  Complete Profile Now
                </Button>
                <Button
                  onClick={checkProfileCompleteness}
                  variant="outline"
                  className="bg-gray-100 border-2 border-gray-200 text-gray-700 hover:bg-gray-200 h-12 rounded-xl px-6 font-medium"
                >
                  Recheck Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Don't redirect first-time users - show the form
  if (!isFirstGig && !subscriptionStatus?.hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Verifying subscription...</p>
      </div>
    );
  }
  if (gigCreated) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-black/40 backdrop-blur-xl border border-green-500/20 rounded-3xl p-12 shadow-2xl">
              <CheckCircle className="h-20 w-20 text-green-400 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-white mb-4">
                Gig Created Successfully!
              </h1>
              <p className="text-gray-300 mb-8">
                Your gig "{formData.title}" is now live and accepting
                applications.
              </p>

              {isFirstGig && (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Gift className="h-5 w-5 text-green-400" />
                    <span className="text-green-300 font-medium">
                      First Gig Free!
                    </span>
                  </div>
                  <p className="text-green-200 text-sm">
                    This was your complimentary first gig. For additional gigs,
                    you'll need an active subscription.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-8">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  onClick={() => router.push(`/dashboard/gigs/${gigId}`)}
                >
                  View Gig
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-400 hover:bg-green-600/10 rounded-xl"
                  onClick={() => router.push("/dashboard/gigs")}
                >
                  Go to Dashboard
                </Button>
              </div>

              {isFirstGig && (
                <Button
                  className="w-full bg-gradient-to-r from-green-600 to-green-600 hover:from-green-700 hover:to-green-700 text-white rounded-xl"
                  onClick={() =>
                    router.push("/dashboard/settings/hiring?view=subscription")
                  }
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Get Subscription for More Gigs
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* First Gig Banner */}
      {isFirstGig && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3">
          <div className="max-w-4xl mx-auto px-6 flex items-center justify-center gap-2">
            <Gift className="h-5 w-5" />
            <span className="font-medium">
              First Gig Special: Post your first gig for FREE! No subscription
              required.
            </span>
          </div>
        </div>
      )}

      <div className="px-6 py-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">CREATE NEW GIG</h1>
          <Button
            type="button"
            onClick={() => setIsTutorialOpen(true)}
            className="h-10 px-4 bg-green-600/80 hover:bg-green-700 text-white rounded-xl"
          >
            Watch tutorial
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-8">
        <div className="flex gap-4 mb-12">
          {steps.map((step) => (
            <button
              key={step.id}
              className={`flex-1 px-6 py-4 rounded-2xl text-sm font-medium transition-all border backdrop-blur-sm ${
                step.active
                  ? "bg-green-600/80 text-white border-green-500 shadow-lg shadow-green-500/25"
                  : currentStep > step.id
                  ? "bg-green-600/20 text-green-400 border-green-600/50"
                  : "bg-black/40 text-gray-400 border-gray-600/50 hover:border-green-600/30"
              }`}
              onClick={() => setCurrentStep(step.id)}
            >
              {step.name}
            </button>
          ))}
        </div>

        <div>
          <div className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl">
            {currentStep === 1 && (
              <div className="space-y-8">
                <div>
                  <Label className="text-white text-sm mb-3 block">
                    Gig Title<span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="I want a landing page design for my healthcare app"
                    className="w-full h-12 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white placeholder-gray-400 rounded-xl"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    All gig titles must start with "I want" to clearly describe
                    what you need
                  </p>
                  {errors.title && (
                    <p className="text-red-400 text-sm mt-2">{errors.title}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-white text-sm mb-3 block">
                      Select category<span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => {
                        handleInputChange("category", value);
                        handleInputChange("subCategory", "");
                      }}
                    >
                      <SelectTrigger className="w-full h-12 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white rounded-xl">
                        <SelectValue placeholder="Design" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50">
                        {Object.keys(CATEGORIES).map((category) => (
                          <SelectItem
                            key={category}
                            value={category}
                            className="text-white"
                          >
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="text-red-400 text-sm mt-2">
                        {errors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-white text-sm mb-3 block">
                      Select Sub-category<span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formData.subCategory}
                      onValueChange={(value) =>
                        handleInputChange("subCategory", value)
                      }
                      disabled={!formData.category}
                    >
                      <SelectTrigger className="w-full h-12 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white rounded-xl">
                        <SelectValue placeholder="UX/UI Designing" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800/90 backdrop-blur-xl border-gray-600/50">
                        {formData.category &&
                          CATEGORIES[formData.category]?.map((subcat) => (
                            <SelectItem
                              key={subcat}
                              value={subcat}
                              className="text-white"
                            >
                              {subcat}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-white text-sm mb-3 block">
                    Tags<span className="text-red-400">*</span>
                  </Label>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="#Figma #UIDesign #Prototype"
                        className="flex-1 h-12 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white placeholder-gray-400 rounded-xl"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        onClick={handleAddTag}
                        className="h-12 px-4 bg-green-600/80 hover:bg-green-700 text-white rounded-xl backdrop-blur-sm"
                      >
                        Add
                      </Button>
                    </div>

                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.tags.map((tag, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm border border-green-600/30"
                          >
                            #{tag}
                            <button
                              type="button"
                              onClick={() => handleTagRemove(tag)}
                              className="hover:text-red-400 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-white text-sm mb-3 block">
                    Project Overview<span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    value={formData.projectOverview}
                    onChange={(e) =>
                      handleInputChange("projectOverview", e.target.value)
                    }
                    placeholder="Describe your project in detail. What are you looking for? What should the final deliverable include?"
                    className="w-full h-32 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white placeholder-gray-400 rounded-xl resize-none"
                  />
                  {errors.projectOverview && (
                    <p className="text-red-400 text-sm mt-2">
                      {errors.projectOverview}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-white text-sm mb-3 block">
                    Upload Project Assets
                  </Label>
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer backdrop-blur-sm",
                      formData.assetFiles.length > 0
                        ? "border-green-600/50 bg-green-600/10"
                        : "border-gray-600/50 bg-gray-800/30 hover:border-green-600/30 hover:bg-green-600/5"
                    )}
                    onClick={() => assetsInputRef.current?.click()}
                  >
                    <input
                      ref={assetsInputRef}
                      type="file"
                      multiple
                      accept="*/*"
                      onChange={(e) =>
                        handleFileUpload(e.target.files, "assets")
                      }
                      className="hidden"
                    />

                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <div>
                      <p className="text-white font-medium">Upload Assets</p>
                      <p className="text-gray-400 text-sm">
                        Reference files, examples, brand guidelines, etc.
                      </p>
                    </div>

                    {formData.assetFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {formData.assetFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2"
                          >
                            <span className="text-green-400 text-sm">
                              {file.name}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index, "assets");
                              }}
                              className="border-red-600 text-red-400 hover:bg-red-600/10 rounded-lg"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-white text-sm mb-3 block">
                    Describe Assets
                  </Label>
                  <Textarea
                    value={formData.assetDescription}
                    onChange={(e) =>
                      handleInputChange("assetDescription", e.target.value)
                    }
                    placeholder="Describe the uploaded assets and how they should be used in the project..."
                    className="w-full h-24 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white placeholder-gray-400 rounded-xl resize-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <Label className="text-white text-sm mb-3 block">
                    Set a fixed price for this gig
                    <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                      ₹
                    </span>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) =>
                        handleInputChange("budget", e.target.value)
                      }
                      placeholder="1,200"
                      className="w-full h-12 pl-8 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white placeholder-gray-400 rounded-xl"
                    />
                  </div>
                  {errors.budget && (
                    <p className="text-red-400 text-sm mt-2">{errors.budget}</p>
                  )}
                </div>

                <div>
                  <Label className="text-white text-sm mb-3 block">
                    Project Deadline (Number of Days)
                    <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.timeline}
                    onChange={(e) =>
                      handleInputChange("timeline", e.target.value)
                    }
                    placeholder="7"
                    min="1"
                    max="365"
                    className="w-full h-12 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white placeholder-gray-400 rounded-xl"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Enter number of days (1-365)
                  </p>
                  {errors.timeline && (
                    <p className="text-red-400 text-sm mt-2">
                      {errors.timeline}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-white text-sm mb-3 block">
                    Quantity Needed<span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      handleInputChange("quantity", e.target.value)
                    }
                    placeholder="1"
                    min="1"
                    max="100"
                    className="w-full h-12 bg-gray-800/50 backdrop-blur-sm border-gray-600/50 text-white placeholder-gray-400 rounded-xl"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    How many items/deliverables do you need? (1-100)
                  </p>
                  {errors.quantity && (
                    <p className="text-red-400 text-sm mt-2">
                      {errors.quantity}
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8">
                <div>
                  <Label className="text-white text-sm mb-3 block">
                    Upload Gig Banner Image
                    <span className="text-gray-400 text-xs ml-2">
                      (Optional)
                    </span>
                  </Label>
                  <div className="bg-blue-900/20 backdrop-blur-sm rounded-2xl p-4 border border-blue-500/30 mb-4">
                    <div className="flex items-center gap-3">
                      <Info className="h-5 w-5 text-blue-400" />
                      <p className="text-blue-300 text-sm">
                        If you don't upload a banner image, we'll automatically
                        use your profile picture as the gig banner.
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer backdrop-blur-sm",
                      formData.bannerImage
                        ? "border-green-600/50 bg-green-600/10"
                        : "border-gray-600/50 bg-gray-800/30 hover:border-green-600/30 hover:bg-green-600/5"
                    )}
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleFileUpload(e.target.files, "banner")
                      }
                      className="hidden"
                    />

                    {formData.bannerImage ? (
                      <div className="space-y-4">
                        <img
                          src={URL.createObjectURL(formData.bannerImage)}
                          alt="Banner preview"
                          className="max-w-full h-32 object-cover rounded-xl mx-auto"
                        />
                        <div className="flex items-center justify-center gap-4">
                          <p className="text-green-400 text-sm">
                            {formData.bannerImage.name}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(0, "banner");
                            }}
                            className="border-red-600 text-red-400 hover:bg-red-600/10 rounded-lg"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-white font-medium">
                            Upload Banner Image (Optional)
                          </p>
                          <p className="text-gray-400 text-sm">
                            Click to upload or drag and drop
                            <br />
                            <span className="text-green-400 cursor-pointer hover:underline">
                              Browse files
                            </span>
                            <br />
                            <span className="text-xs text-gray-500 mt-2 block">
                              No banner? We'll use your profile picture instead
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="bg-red-900/20 backdrop-blur-sm rounded-2xl p-4 border border-red-500/30">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-red-300 text-sm">{errors.submit}</p>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-8">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="flex-1 h-12 border-gray-600 text-gray-300 hover:bg-gray-800/50 rounded-xl backdrop-blur-sm"
                >
                  Previous
                </Button>
              )}

              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-green-500/25"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating...
                  </div>
                ) : currentStep === 3 ? (
                  "Create Gig"
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Modal */}
      {showProfileCheck && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent className="bg-white border-2 border-gray-200 text-black max-w-3xl shadow-2xl">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-100 border-2 border-blue-200">
                  <AlertCircle className="h-6 w-6 text-green-600" />
                </div>
                Complete Your Hiring Profile
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-green-50 border-2 border-green-200 shadow-lg rounded-xl p-6">
                <h3 className="font-bold text-black text-lg mb-2">
                  Profile Setup Required
                </h3>
                <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                  To post gigs and connect with freelancers, please complete
                  these required fields:
                </p>

                <div className="space-y-3 bg-white rounded-xl p-4 border border-green-200">
                  <h4 className="font-semibold text-green-700 text-sm mb-3">
                    Missing Fields ({missingFields.length}):
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {missingFields.map((field, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-black font-medium text-sm">
                          {field.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <Button
                  onClick={() => router.push("/dashboard/profile")}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 h-12 rounded-xl font-semibold"
                >
                  Complete Profile Now
                </Button>
                <Button
                  onClick={checkProfileCompleteness}
                  variant="outline"
                  className="bg-gray-100 border-2 border-gray-200 text-gray-700 hover:bg-gray-200 h-12 rounded-xl px-6 font-medium"
                >
                  Recheck Profile
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={isTutorialOpen} onOpenChange={setIsTutorialOpen}>
        <DialogContent className="max-w-3xl w-[95vw] bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>How to create a gig</DialogTitle>
          </DialogHeader>
          <div className="w-full aspect-video">
            <iframe
              className="w-full h-full rounded-xl"
              src="https://www.youtube.com/embed/2sLQvcp3x9U?rel=0"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

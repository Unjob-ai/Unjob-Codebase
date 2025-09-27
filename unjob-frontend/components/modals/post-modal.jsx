"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  X,
  Upload,
  Image as ImageIcon,
  Video,
  AlertCircle,
  User,
  Building,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";

// Categories and subcategories
const CATEGORIES = {
  "Design & Creative": [
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
  "Video & Animation": [
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
  "Writing & Translation": [
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
  "Tech & Development": [
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
  "AI & Automation": [
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
  "Business & Legal": [
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

const PROJECT_OPTIONS = [
  "Un-job Ai",
  "Digital Art & Graphics",
  "Music & DJ",
  "Food & Streetfood",
  "Web Design & Development",
];


const REQUIRED_FIELDS = {
  freelancer: {
    basic: ["name", "image"],
    profile: ["bio", "skills"], // Removed "location"
  },
  hiring: {
    basic: ["name", "image"],
    profile: [
      "lastName",
      "bio", // Removed "location"
      "companyName",
      "companySize",
      "industry",
      "description",
    ],
  },
};

export function PostModal({ onClose, onSuccess }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [project, setProject] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [showProfileCheck, setShowProfileCheck] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch user profile on component mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile();
    }
  }, [session?.user?.id]);

  const fetchUserProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await fetch(`/api/profile/${session.user.id}`);
      const data = await response.json();

      if (response.ok && data.user) {
        setUser(data.user);
        checkProfileCompleteness(data.user);
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const checkProfileCompleteness = (userData) => {
    if (!userData) return;

    const missing = [];
    const userRole = userData.role;
    console.log("Checking profile for role:", userRole);
    const requiredFields = REQUIRED_FIELDS[userRole];

    if (!requiredFields) {
      console.error("Unknown user role:", userRole);
      return;
    }

    // Check basic fields
    requiredFields.basic.forEach((field) => {
      if (
        !userData[field] ||
        (typeof userData[field] === "string" && !userData[field].trim())
      ) {
        missing.push({
          field,
          label:
            field === "name"
              ? "Full Name"
              : field.charAt(0).toUpperCase() + field.slice(1),
          type: "basic",
        });
      }
    });

    // Check profile fields
    const profile = userData.profile || {};
    requiredFields.profile.forEach((field) => {
      if (field === "skills") {
        const hasBasicSkills =
          profile.skills &&
          Array.isArray(profile.skills) &&
          profile.skills.length > 0 &&
          profile.skills.some((skill) => skill && skill.trim());

        const hasStructuredSkills =
          profile.structuredSkills &&
          Array.isArray(profile.structuredSkills) &&
          profile.structuredSkills.length > 0 &&
          profile.structuredSkills.some(
            (skill) =>
              skill &&
              typeof skill === "object" &&
              skill.category &&
              skill.subcategory
          );

        if (!hasBasicSkills && !hasStructuredSkills) {
          missing.push({
            field,
            label: "Skills",
            type: "profile",
          });
        }
      } else {
        if (
          !profile[field] ||
          (typeof profile[field] === "string" && !profile[field].trim())
        ) {
          missing.push({
            field,
            label: getFieldLabel(field),
            type: "profile",
          });
        }
      }
    });

    setMissingFields(missing);
    setShowProfileCheck(missing.length > 0);
  };

  const getFieldLabel = (field) => {
    const labels = {
      firstName: "First Name",
      lastName: "Last Name",
      bio: "Bio/About",
      location: "Location",
      skills: "Skills",
      companyName: "Company Name",
      companySize: "Company Size",
      industry: "Industry",
      description: "Company Description",
    };
    return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
  };

  const handleProfileRedirect = () => {
    router.push("/dashboard/profile");
    onClose();
  };

  const handleFilesChange = (e) => {
    const newFiles = Array.from(e.target.files || []);

    // Clear media error when files are selected
    setMediaError(false);

    // Separate images and videos
    const imageFiles = newFiles.filter((file) =>
      file.type.startsWith("image/")
    );
    const videoFiles = newFiles.filter((file) =>
      file.type.startsWith("video/")
    );

    // Check file count restrictions
    const currentImages = selectedFiles.filter((file) =>
      file.type.startsWith("image/")
    );
    const currentVideos = selectedFiles.filter((file) =>
      file.type.startsWith("video/")
    );

    // Validate image limit (max 1)
    if (currentImages.length + imageFiles.length > 1) {
      toast.error("You can only upload one image");
      return;
    }

    // Validate video limit (max 1)
    if (currentVideos.length + videoFiles.length > 1) {
      toast.error("You can only upload one video");
      return;
    }

    // Validate file sizes
    for (const file of newFiles) {
      if (file.type.startsWith("image/")) {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB
          toast.error(
            `Image "${file.name}" is too large. Maximum size is 10MB.`
          );
          return;
        }
      } else if (file.type.startsWith("video/")) {
        if (file.size > 100 * 1024 * 1024) {
          // 100MB instead of 300MB
          toast.error(
            `Video "${file.name}" is too large. Maximum size is 100MB.`
          );
          return;
        }
      }
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileToRemove) => {
    setSelectedFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setSubCategory(""); // Reset subcategory when category changes
  };

  // NEW: Function to handle direct Cloudinary upload with real progress
  const uploadFileToCloudinary = (file) => {
    return new Promise(async (resolve, reject) => {
      // 1. Get signature from your backend
      const signatureResponse = await fetch("/api/upload-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "unjob/posts" }),
      });

      if (!signatureResponse.ok) {
        toast.error("Could not get upload signature.");
        reject(new Error("Signature fetch failed"));
        return;
      }

      const { signature, timestamp } = await signatureResponse.json();

      // 2. Prepare FormData for Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);

      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("folder", "unjob/posts");

      console.log(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

      // 3. Use XMLHttpRequest for real progress tracking
      const xhr = new XMLHttpRequest();
      const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`;

      xhr.open("POST", url, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round(
            (event.loaded * 100) / event.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response); // Resolve with the full response
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            console.error("Cloudinary upload error:", error);
            toast.error(`Upload failed: ${error.error.message}`);
            reject(error);
          } catch (e) {
            toast.error("Upload failed with an unknown error.");
            reject(new Error("Unknown upload error"));
          }
        }
      };

      xhr.onerror = () => {
        toast.error("A network error occurred during upload.");
        reject(new Error("XHR onerror"));
      };

      xhr.send(formData);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset error states
    setMediaError(false);

    // Your existing validation checks remain the same
    if (missingFields.length > 0) {
      setShowProfileCheck(true);
      toast.error("Please complete your profile before creating posts");
      return;
    }
    if (!title.trim() || !description.trim() || !category || !subCategory) {
      toast.error("Please fill all required fields.");
      return;
    }
    
    // NEW: Validate that at least one media file is uploaded
    if (!selectedFiles || selectedFiles.length === 0) {
      setMediaError(true);
      toast.error("Please upload at least one image or video to create a post.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    // This object will be sent to your /api/posts route as JSON
    const postPayload = {
      title: title.trim(),
      description: description.trim(),
      category,
      subCategory,
      project: project || "",
      tags: [], // Add your tag logic here if you have one
      images: [],
      videos: [],
    };

    try {
      // Step 1: Upload files directly to Cloudinary (if any)
      const imageFile = selectedFiles.find((f) => f.type.startsWith("image/"));
      const videoFile = selectedFiles.find((f) => f.type.startsWith("video/"));

      if (imageFile) {
        toast("Uploading image...");
        const response = await uploadFileToCloudinary(imageFile);
        postPayload.images.push(response.secure_url);
        toast.dismiss();
      }

      if (videoFile) {
        toast("Uploading video... this may take a moment.");
        const response = await uploadFileToCloudinary(videoFile);
        postPayload.videos.push(response.secure_url);
        toast.dismiss();
      }

      // Step 2: Create the post in your database with the Cloudinary URLs
      setUploadProgress(0); // Reset progress for the final step
      toast.loading("Finalizing post...");

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postPayload),
      });

      toast.dismiss();

      if (res.ok) {
        toast.success(
          project ? "Project added to portfolio!" : "Post created successfully!"
        );
        onSuccess?.();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.details || err.error || "Failed to create the post.");
      }
    } catch (err) {
      console.error("Post creation process failed:", err);
      toast.dismiss();
      toast.error("Something went wrong during the upload. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Show loading state while fetching profile
  if (profileLoading) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="bg-white border border-gray-200 text-black max-w-md">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Checking profile...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show profile completion check
  if (showProfileCheck && missingFields.length > 0) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="bg-white border-2 border-gray-200 text-black max-w-2xl shadow-2xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100 border-2 border-green-200">
                <AlertCircle className="h-6 w-6 text-green-600" />
              </div>
              Complete Your Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Status Card */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-green-500 shadow-lg">
                    {user?.role === "freelancer" ? (
                      <User className="h-6 w-6 text-white" />
                    ) : (
                      <Building className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-black text-lg mb-2">
                      Profile Setup Required
                    </h3>
                    <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                      To create posts and showcase your work on Un-job, please
                      complete the following required fields in your profile:
                    </p>

                    {/* Missing Fields List */}
                    <div className="space-y-3 bg-white rounded-xl p-4 border border-green-200">
                      <h4 className="font-semibold text-green-700 text-sm mb-2">
                        Required Fields:
                      </h4>
                      {missingFields.map((field, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-100"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
                          <span className="text-black font-medium text-sm">
                            {field.label}
                          </span>
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                            {field.type === "basic"
                              ? "Basic Info"
                              : "Profile Info"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Progress Indicator */}
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-yellow-800 text-sm font-medium">
                          Profile Completion:{" "}
                          {Math.max(0, 100 - missingFields.length * 20)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <Button
                onClick={handleProfileRedirect}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 h-12 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                Complete Profile Now
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="bg-gray-100 border-2 border-gray-200 text-gray-700 hover:bg-gray-200 hover:border-gray-300 h-12 rounded-xl px-6 font-medium"
              >
                Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show main post creation modal if profile is complete
  return (
    <Dialog open onOpenChange={onClose} className="sm:mt-8 ">
      <DialogContent
        className={`
      bg-white border border-gray-200 text-black
      w-full max-w-full
      sm:max-w-lg md:max-w-xl lg:max-w-4xl xl:max-w-6xl
      sm:rounded-2xl rounded-none
      sm:p-0 p-0 
      !overflow-x-hidden
    `}
        style={{ maxWidth: "100vw", maxHeight: "100vh" }}
      >
        {/* Header */}
        <DialogHeader className="p-6 pb-4 mt-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-black">
              {project ? "ADD TO PORTFOLIO" : "CREATE POST"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-black mb-3 block">
                  Upload Content *
                </Label>
                <div
                  className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center min-h-[300px] cursor-pointer p-6 transition-colors ${
                    mediaError
                      ? "border-red-400 bg-red-50 hover:border-red-500 hover:bg-red-100/50"
                      : "border-gray-300 bg-gray-50 hover:border-green-500 hover:bg-green-50/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drag & Drop your Content
                    </p>
                    <p className="text-sm text-gray-500 mb-4">or</p>
                    <Button
                      type="button"
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-2 rounded-full"
                    >
                      Browse Files
                    </Button>
                    <p className="text-xs text-gray-400 mt-3">
                      At least 1 Image or Video required • Max: 1 Image (10MB) • 1 Video (100MB)
                    </p>
                  </div>

                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFilesChange}
                    hidden
                    ref={fileInputRef}
                  />
                </div>

                {/* Media Error Message */}
                {mediaError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600 font-medium">
                      Please upload at least one image or video to create a post.
                    </p>
                  </div>
                )}

                {/* File Previews */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-black mb-3 block">
                      Selected Files ({selectedFiles.length})
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                            {file.type.startsWith("image/") ? (
                              <>
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`preview-${file.name}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 left-2">
                                  <ImageIcon className="h-4 w-4 text-white bg-black/50 rounded p-0.5" />
                                </div>
                              </>
                            ) : (
                              <>
                                <video
                                  src={URL.createObjectURL(file)}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                                <div className="absolute top-2 left-2">
                                  <Video className="h-4 w-4 text-white bg-black/50 rounded p-0.5" />
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(file);
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <div className="mt-1">
                            <p className="text-xs text-gray-600 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {loading && uploadProgress > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields Section */}
            <div className="space-y-6">
              {/* Title Field */}
              <div>
                <Label
                  htmlFor="title"
                  className="text-sm font-medium text-black mb-3 block"
                >
                  Title *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-gray-50 border-gray-300 text-black rounded-xl h-12 focus:border-green-500 focus:ring-green-500"
                  placeholder="Enter post title..."
                />
              </div>

              <div>
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-black mb-3 block"
                >
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="bg-gray-50 border-gray-300 text-black rounded-xl min-h-[100px] resize-none focus:border-green-500 focus:ring-green-500"
                  placeholder="Describe your work..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label
                    htmlFor="category"
                    className="text-sm font-medium text-black mb-3 block"
                  >
                    Category *
                  </Label>
                  <select
                    id="category"
                    value={category}
                    onChange={handleCategoryChange}
                    className="w-full bg-gray-50 border-gray-300 text-black h-12 rounded-xl px-3 focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Select Category</option>
                    {Object.keys(CATEGORIES).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label
                    htmlFor="subCategory"
                    className="text-sm font-medium text-black mb-3 block"
                  >
                    Sub-category *
                  </Label>
                  <select
                    id="subCategory"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full bg-gray-50 border-gray-300 text-black h-12 rounded-xl px-3 focus:ring-green-500 focus:border-green-500 max-h-48 overflow-y-auto"
                    required
                    disabled={!category}
                  >
                    <option value="">Select Sub-category</option>
                    {category &&
                      CATEGORIES[category]?.map((subCat) => (
                        <option key={subCat} value={subCat}>
                          {subCat}
                        </option>
                      ))}
                  </select>
                  {!category && (
                    <p className="text-xs text-gray-500 mt-1">
                      Please select a category first
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-12 rounded-full text-base font-medium"
                  disabled={loading}
                >
                  {loading
                    ? uploadProgress > 0
                      ? `Uploading... ${uploadProgress}%`
                      : "Creating..."
                    : project
                    ? "Add to Portfolio"
                    : "Create Post"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

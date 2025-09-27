"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  X,
  AlertCircle,
  Trash2,
  Edit3,
  Loader2,
  Upload,
  Image as ImageIcon,
  FileText,
  Plus,
  Eye,
  Download,
  Play,
  Pause,
  Square,
  CheckCircle,
  XCircle,
} from "lucide-react";
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
  ],
};

// Updated GIG_STATUSES to match backend validation
const GIG_STATUSES = {
  draft: {
    label: "Draft",
    description: "Save as draft (not visible to freelancers)",
    icon: Edit3,
    color: "gray",
    buttonClass: "bg-gray-600 hover:bg-gray-700 text-white",
  },
  active: {
    label: "Active",
    description: "Make live and visible to freelancers",
    icon: Play,
    color: "green",
    buttonClass: "bg-green-600 hover:bg-green-700 text-white",
  },
  paused: {
    label: "Paused",
    description: "Pause this gig (hide from freelancers)",
    icon: Pause,
    color: "yellow",
    buttonClass: "bg-yellow-600 hover:bg-yellow-700 text-white",
  },
  completed: {
    label: "Completed",
    description: "Mark as completed",
    icon: CheckCircle,
    color: "blue",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  cancelled: {
    label: "Cancelled",
    description: "Cancel this gig",
    icon: XCircle,
    color: "red",
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
};
export default function EditGigModal({
  isOpen,
  onClose,
  gig,
  onGigUpdated,
  onGigDeleted,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState({});
  const [currentStatus, setCurrentStatus] = useState("");

  // File upload refs and states
  const bannerInputRef = useRef(null);
  const assetInputRef = useRef(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [newBannerFile, setNewBannerFile] = useState(null);
  const [newAssetFiles, setNewAssetFiles] = useState([]);
  const [removedAssets, setRemovedAssets] = useState([]);
  const [currentAssets, setCurrentAssets] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    subCategory: "",
    tags: [],
    projectOverview: "",
    budget: "",
    timeline: "",
    assetDescription: "",
    deliverables: [],
  });

  // Initialize form data when gig changes
  useEffect(() => {
    if (gig) {
      setFormData({
        title: gig.title || "",
        category: gig.category || "",
        subCategory: gig.subCategory || "",
        tags: gig.tags || [],
        projectOverview: gig.projectOverview || gig.description || "",
        budget: gig.budget?.toString() || "",
        timeline: gig.timeline || "",
        assetDescription: gig.DerscribeAssets || gig.assetDescription || "",
        deliverables: gig.deliverables || [],
      });

      // Set current status
      setCurrentStatus(gig.status || "draft");

      // Set current assets
      setCurrentAssets(gig.uploadAssets || []);

      // Set banner preview to current banner
      setBannerPreview(gig.bannerImage || null);

      // Reset file states
      setNewBannerFile(null);
      setNewAssetFiles([]);
      setRemovedAssets([]);
    }
  }, [gig]);

  const handleInputChange = (field, value) => {
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

  const handleAddTag = () => {
    const tag = tagInput.replace("#", "").trim();
    if (tag && !formData.tags.includes(tag)) {
      handleInputChange("tags", [...formData.tags, tag]);
      setTagInput("");
    }
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Banner image must be less than 10MB");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      setNewBannerFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setBannerPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBanner = () => {
    setBannerPreview(null);
    setNewBannerFile(null);
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
  };

  const handleAssetUpload = (e) => {
    const files = Array.from(e.target.files);

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        continue;
      }

      if (newAssetFiles.find((f) => f.name === file.name)) {
        toast.error(`File ${file.name} is already selected`);
        continue;
      }

      setNewAssetFiles((prev) => [...prev, file]);
    }

    // Reset input
    if (assetInputRef.current) {
      assetInputRef.current.value = "";
    }
  };

  const handleRemoveNewAsset = (fileName) => {
    setNewAssetFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

  const handleRemoveCurrentAsset = (assetUrl) => {
    setRemovedAssets((prev) => [...prev, assetUrl]);
  };

  const handleRestoreAsset = (assetUrl) => {
    setRemovedAssets((prev) => prev.filter((url) => url !== assetUrl));
  };

  const getFileName = (url) => {
    return url.split("/").pop().split("?")[0] || "File";
  };

  const isImageFile = (url) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
    return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
  };

  // Frontend validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.projectOverview.trim())
      newErrors.projectOverview = "Project overview is required";
    if (!formData.budget) newErrors.budget = "Budget is required";
    if (parseInt(formData.budget) < 100)
      newErrors.budget = "Minimum budget is ₹100";
    if (!formData.timeline.trim())
      newErrors.timeline = "Project deadline is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate status change
  const canChangeToStatus = (newStatus) => {
    if (!Object.keys(GIG_STATUSES).includes(newStatus)) {
      return { valid: false, reason: "Invalid status" };
    }

    if (newStatus === "active") {
      // Check if all required fields are filled
      if (
        !formData.title ||
        !formData.category ||
        !formData.budget ||
        !formData.projectOverview
      ) {
        return {
          valid: false,
          reason:
            "Missing required fields (title, category, budget, project overview)",
        };
      }
    }

    if (newStatus === "completed") {
      if (!gig.applications || gig.applications.length === 0) {
        return {
          valid: false,
          reason: "Cannot mark as completed: No applications received",
        };
      }
    }

    return { valid: true };
  };

  const handleUpdateGig = async (newStatus = null) => {
    // Debug: Log the status being sent
    if (newStatus) {
      console.log("🔍 Status being sent:", {
        status: newStatus,
        statusLength: newStatus.length,
        statusType: typeof newStatus,
        statusCharCodes: Array.from(newStatus).map((char) =>
          char.charCodeAt(0)
        ),
      });
    }

    // If changing status, validate status change
    if (newStatus) {
      const statusValidation = canChangeToStatus(newStatus);
      if (!statusValidation.valid) {
        toast.error(statusValidation.reason);
        return;
      }
    } else {
      // Regular form validation
      if (!validateForm()) return;
    }

    try {
      setIsEditing(true);

      const formDataToSend = new FormData();

      // Add text data
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined) {
          if (Array.isArray(formData[key])) {
            formDataToSend.append(key, JSON.stringify(formData[key]));
          } else {
            formDataToSend.append(key, formData[key]);
          }
        }
      });

      // Add status if provided - with extra debugging
      if (newStatus) {
        console.log("📤 Appending status to FormData:", newStatus);
        formDataToSend.append("status", newStatus);

        // Verify it was added correctly
        console.log("✅ FormData status value:", formDataToSend.get("status"));
      }

      // Add removed assets
      if (removedAssets.length > 0) {
        formDataToSend.append("removedAssets", JSON.stringify(removedAssets));
      }

      // Add banner image if changed
      if (newBannerFile) {
        formDataToSend.append("bannerImage", newBannerFile);
        formDataToSend.append("updateBanner", "true");
      }

      // Add new asset files
      newAssetFiles.forEach((file) => {
        formDataToSend.append("newAssetFiles", file);
      });

      console.log("📤 Sending request to:", `/api/gigs/${gig._id}/edit`);

      const response = await fetch(`/api/gigs/${gig._id}/edit`, {
        method: "PUT",
        body: formDataToSend,
      });

      const result = await response.json();

      console.log("📥 API Response:", result);

      if (result.success) {
        const statusMessage = newStatus
          ? `Gig ${
              newStatus === "active" ? "published" : newStatus
            } successfully!`
          : "Gig updated successfully!";

        toast.success(statusMessage);

        // Update current status if it was changed
        if (newStatus) {
          setCurrentStatus(newStatus);
        }

        onGigUpdated(result.gig);

        // Close modal if publishing or completing
        if (newStatus === "active" || newStatus === "completed") {
          onClose();
        }
      } else {
        console.error("❌ API Error:", result.error);
        toast.error(result.error || "Failed to update gig");
        setErrors({ submit: result.error });
      }
    } catch (error) {
      console.error("❌ Error updating gig:", error);
      toast.error("An error occurred while updating the gig");
      setErrors({ submit: "An error occurred while updating the gig" });
    } finally {
      setIsEditing(false);
    }
  };
  const handleDeleteGig = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/gigs/${gig._id}/edit`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Gig deleted successfully!");
        onGigDeleted(gig._id);
        onClose();
        setShowDeleteConfirm(false);
      } else {
        toast.error(result.error || "Failed to delete gig");
      }
    } catch (error) {
      console.error("Error deleting gig:", error);
      toast.error("An error occurred while deleting the gig");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!gig) return null;

  return (
    <>
      {/* Main Edit Modal */}
      <Dialog open={isOpen && !showDeleteConfirm} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-white border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-green-600" />
              Edit Gig
              <span className="text-sm font-normal text-gray-500">
                • Status: {GIG_STATUSES[currentStatus]?.label || currentStatus}
              </span>
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Update your gig details, images, and requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Status Display */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Current Status
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {GIG_STATUSES[currentStatus]?.description ||
                      "Unknown status"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {React.createElement(
                    GIG_STATUSES[currentStatus]?.icon || Edit3,
                    {
                      className: `h-5 w-5 text-${
                        GIG_STATUSES[currentStatus]?.color || "gray"
                      }-600`,
                    }
                  )}
                  <span className="font-medium text-gray-900">
                    {GIG_STATUSES[currentStatus]?.label || currentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Banner Image Section */}
            <div>
              <Label className="text-black text-sm mb-3 block font-medium">
                Banner Image
              </Label>

              {bannerPreview ? (
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => bannerInputRef.current?.click()}
                        className="bg-white text-black hover:bg-gray-100"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Change
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleRemoveBanner}
                        className="bg-red-600 text-white border-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                >
                  <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-600 text-sm font-medium mb-1">
                    Click to upload banner image
                  </p>
                  <p className="text-gray-400 text-xs">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              )}

              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
              />
            </div>

            {/* Title */}
            <div>
              <Label className="text-black text-sm mb-2 block font-medium">
                Gig Title<span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Landing Page Design for HealthTech App"
                className="w-full h-11 bg-gray-50 border-gray-300 text-black placeholder-gray-500 rounded-lg focus:border-green-500 focus:ring-green-500"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Category and Sub-category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black text-sm mb-2 block font-medium">
                  Category<span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    handleInputChange("category", value);
                    handleInputChange("subCategory", "");
                  }}
                >
                  <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-300 text-black rounded-lg focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {Object.keys(CATEGORIES).map((category) => (
                      <SelectItem
                        key={category}
                        value={category}
                        className="text-black hover:bg-green-50 hover:text-green-700"
                      >
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <Label className="text-black text-sm mb-2 block font-medium">
                  Sub-category
                </Label>
                <Select
                  value={formData.subCategory}
                  onValueChange={(value) =>
                    handleInputChange("subCategory", value)
                  }
                  disabled={!formData.category}
                >
                  <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-300 text-black rounded-lg focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="Select sub-category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {formData.category &&
                      CATEGORIES[formData.category]?.map((subcat) => (
                        <SelectItem
                          key={subcat}
                          value={subcat}
                          className="text-black hover:bg-green-50 hover:text-green-700"
                        >
                          {subcat}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label className="text-black text-sm mb-2 block font-medium">
                Tags
              </Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="#Figma #UIDesign #Prototype"
                    className="flex-1 h-11 bg-gray-50 border-gray-300 text-black placeholder-gray-500 rounded-lg focus:border-green-500 focus:ring-green-500"
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
                    className="h-11 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    Add
                  </Button>
                </div>

                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm border border-green-200"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleTagRemove(tag)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Project Overview */}
            <div>
              <Label className="text-black text-sm mb-2 block font-medium">
                Project Overview<span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={formData.projectOverview}
                onChange={(e) =>
                  handleInputChange("projectOverview", e.target.value)
                }
                placeholder="Describe your project in detail..."
                className="w-full h-32 bg-gray-50 border-gray-300 text-black placeholder-gray-500 rounded-lg resize-none focus:border-green-500 focus:ring-green-500"
              />
              {errors.projectOverview && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.projectOverview}
                </p>
              )}
            </div>

            {/* Budget and Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-black text-sm mb-2 block font-medium">
                  Budget<span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">
                    ₹
                  </span>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) =>
                      handleInputChange("budget", e.target.value)
                    }
                    placeholder="1,200"
                    className="w-full h-11 pl-8 bg-gray-50 border-gray-300 text-black placeholder-gray-500 rounded-lg focus:border-green-500 focus:ring-green-500"
                  />
                </div>
                {errors.budget && (
                  <p className="text-red-500 text-sm mt-1">{errors.budget}</p>
                )}
              </div>

              <div>
                <Label className="text-black text-sm mb-2 block font-medium">
                  Timeline<span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.timeline}
                  onChange={(e) =>
                    handleInputChange("timeline", e.target.value)
                  }
                  placeholder="2 days"
                  className="w-full h-11 bg-gray-50 border-gray-300 text-black placeholder-gray-500 rounded-lg focus:border-green-500 focus:ring-green-500"
                />
                {errors.timeline && (
                  <p className="text-red-500 text-sm mt-1">{errors.timeline}</p>
                )}
              </div>
            </div>

            {/* Asset Files Section */}
            <div>
              <Label className="text-black text-sm mb-3 block font-medium">
                Project Assets
              </Label>

              {/* Current Assets */}
              {currentAssets.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Current Assets
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentAssets.map((asset, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-3 ${
                          removedAssets.includes(asset)
                            ? "border-red-200 bg-red-50 opacity-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isImageFile(asset) ? (
                            <img
                              src={asset}
                              alt="Asset"
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <FileText className="h-12 w-12 text-gray-400" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {getFileName(asset)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(asset, "_blank")}
                                className="h-6 px-2 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              {removedAssets.includes(asset) ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleRestoreAsset(asset)}
                                  className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Restore
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleRemoveCurrentAsset(asset)
                                  }
                                  className="h-6 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Assets */}
              {newAssetFiles.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    New Assets to Upload
                  </h4>
                  <div className="space-y-2">
                    {newAssetFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 border border-green-200 bg-green-50 rounded-lg p-3"
                      >
                        {file.type.startsWith("image/") ? (
                          <ImageIcon className="h-8 w-8 text-green-600" />
                        ) : (
                          <FileText className="h-8 w-8 text-green-600" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveNewAsset(file.name)}
                          className="h-8 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload New Assets */}
              <div
                onClick={() => assetInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-sm font-medium mb-1">
                  Click to upload new assets
                </p>
                <p className="text-gray-400 text-xs">
                  Images, documents, videos up to 10MB each
                </p>
              </div>

              <input
                ref={assetInputRef}
                type="file"
                multiple
                onChange={handleAssetUpload}
                className="hidden"
              />
            </div>

            {/* Asset Description */}
            <div>
              <Label className="text-black text-sm mb-2 block font-medium">
                Asset Description
              </Label>
              <Textarea
                value={formData.assetDescription}
                onChange={(e) =>
                  handleInputChange("assetDescription", e.target.value)
                }
                placeholder="Describe any uploaded assets and how they should be used..."
                className="w-full h-24 bg-gray-50 border-gray-300 text-black placeholder-gray-500 rounded-lg resize-none focus:border-green-500 focus:ring-green-500"
              />
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <p className="text-red-700 text-sm">{errors.submit}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-3 flex-wrap">
            {/* Delete Button */}
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-white border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Gig
            </Button>

            {/* Status Change Buttons */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(GIG_STATUSES).map(([status, config]) => {
                if (status === currentStatus) return null; // Don't show current status button

                const Icon = config.icon;
                const statusValidation = canChangeToStatus(status);

                return (
                  <Button
                    key={status}
                    onClick={() => handleUpdateGig(status)}
                    disabled={isEditing || !statusValidation.valid}
                    className={`${config.buttonClass} ${
                      !statusValidation.valid
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    title={
                      !statusValidation.valid
                        ? statusValidation.reason
                        : config.description
                    }
                  >
                    {isEditing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4 mr-2" />
                    )}
                    {config.label}
                  </Button>
                );
              })}
            </div>

            {/* Save/Update Button */}
            <Button
              onClick={() => handleUpdateGig()}
              disabled={isEditing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>

            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={onClose}
              className="bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md bg-white border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Gig
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Are you sure you want to delete "{gig.title}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-yellow-800 text-sm font-medium">Warning</p>
                <p className="text-yellow-700 text-sm mt-1">
                  If this gig has active applications, you won't be able to
                  delete it. Please close or complete the gig first.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black"
            >
              Cancel
            </Button>

            <Button
              onClick={handleDeleteGig}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Gig"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// EditPostModal.jsx
"use client";

import { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { Upload, X, Video, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export function EditPostModal({ isOpen, onClose, post, onPostUpdated }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: post?.title || "",
    description: post?.description || "",
    category: post?.category || "",
    subCategory: post?.subCategory || "",
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingMedia, setExistingMedia] = useState({
    images: post?.images || [],
    videos: post?.videos || [],
  });
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      category: e.target.value,
      subCategory: "", // Reset subcategory when category changes
    }));
  };

  const handleFilesChange = (e) => {
    const newFiles = Array.from(e.target.files || []);

    // Validate file count and sizes (same as your original logic)
    const imageFiles = newFiles.filter((file) =>
      file.type.startsWith("image/")
    );
    const videoFiles = newFiles.filter((file) =>
      file.type.startsWith("video/")
    );

    if (existingMedia.images.length + imageFiles.length > 1) {
      toast.error("You can only have one image");
      return;
    }

    if (existingMedia.videos.length + videoFiles.length > 1) {
      toast.error("You can only have one video");
      return;
    }

    // Validate file sizes
    for (const file of newFiles) {
      if (file.type.startsWith("image/")) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(
            `Image "${file.name}" is too large. Maximum size is 10MB.`
          );
          return;
        }
      } else if (file.type.startsWith("video/")) {
        if (file.size > 300 * 1024 * 1024) {
          toast.error(
            `Video "${file.name}" is too large. Maximum size is 300MB.`
          );
          return;
        }
      }
    }

    setSelectedFiles(newFiles);
  };

  const removeExistingMedia = (type, index) => {
    setExistingMedia((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  const removeNewFile = (fileToRemove) => {
    setSelectedFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.category ||
      !formData.subCategory
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    setLoading(true);

    try {
      // If there are new files, upload them first
      let newImageUrls = [];
      let newVideoUrls = [];

      if (selectedFiles.length > 0) {
        // Upload new files (use your existing upload logic)
        for (const file of selectedFiles) {
          if (file.type.startsWith("image/")) {
            // Upload image to Cloudinary
            const formData = new FormData();
            formData.append("file", file);
            // Add your Cloudinary upload logic here
            // newImageUrls.push(uploadedUrl);
          } else if (file.type.startsWith("video/")) {
            // Upload video to Cloudinary
            // newVideoUrls.push(uploadedUrl);
          }
        }
      }

      // Update post with both existing and new media
      const updatePayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subCategory: formData.subCategory,
        images: [...existingMedia.images, ...newImageUrls],
        videos: [...existingMedia.videos, ...newVideoUrls],
      };

      const response = await fetch(`/api/posts/${post._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Post updated successfully!");
        onPostUpdated?.(data.post);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update post");
      }
    } catch (error) {
      console.error("Post update error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-2 border-green-500 text-black max-w-4xl w-[95vw] rounded-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-green-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-green-600">
              Edit Post
            </DialogTitle>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-black transition-colors hover:bg-gray-100 rounded-full p-1"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Media Section */}
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-green-600 mb-3 block">
                  Media Content
                </Label>

                {/* Existing Media */}
                {(existingMedia.images.length > 0 ||
                  existingMedia.videos.length > 0) && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium text-black mb-3 block">
                      Current Media
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {existingMedia.images.map((image, index) => (
                        <div key={`image-${index}`} className="relative group">
                          <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 border-green-200 hover:border-green-400 transition-colors">
                            <img
                              src={image}
                              alt={`Current image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2">
                              <ImageIcon className="h-4 w-4 text-white bg-black/70 rounded p-0.5" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExistingMedia("images", index)}
                            className="absolute -top-2 -right-2 bg-green-500 hover:bg-green-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {existingMedia.videos.map((video, index) => (
                        <div key={`video-${index}`} className="relative group">
                          <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 border-green-200 hover:border-green-400 transition-colors">
                            <video
                              src={video}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute top-2 left-2">
                              <Video className="h-4 w-4 text-white bg-black/70 rounded p-0.5" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExistingMedia("videos", index)}
                            className="absolute -top-2 -right-2 bg-green-500 hover:bg-green-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload New Media */}
                <div
                  className="border-2 border-dashed border-green-300 hover:border-green-500 rounded-xl flex flex-col items-center justify-center min-h-[200px] bg-green-50 hover:bg-green-100 cursor-pointer p-6 transition-all"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium text-green-600 mb-2">
                    Add New Media
                  </p>
                  <p className="text-sm text-gray-500 mb-4">or</p>
                  <Button
                    type="button"
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full shadow-lg hover:shadow-xl transition-all"
                  >
                    Browse Files
                  </Button>
                  <p className="text-xs text-gray-600 mt-3">
                    1 Image (Max 10MB) • 1 Video (Max 300MB)
                  </p>

                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFilesChange}
                    hidden
                    ref={fileInputRef}
                  />
                </div>

                {/* New File Previews */}
                {selectedFiles.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-black mb-3 block">
                      New Files ({selectedFiles.length})
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedFiles.map((file, i) => (
                        <div key={i} className="relative group">
                          <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 border-green-200 hover:border-green-400 transition-colors">
                            {file.type.startsWith("image/") ? (
                              <>
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`preview-${file.name}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 left-2">
                                  <ImageIcon className="h-4 w-4 text-white bg-black/70 rounded p-0.5" />
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
                                  <Video className="h-4 w-4 text-white bg-black/70 rounded p-0.5" />
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeNewFile(file)}
                            className="absolute -top-2 -right-2 bg-green-500 hover:bg-green-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
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
                  className="text-sm font-medium text-green-600 mb-3 block"
                >
                  Title *
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="bg-white border-2 border-gray-200 focus:border-green-500 text-black rounded-xl h-12 hover:border-green-300 transition-colors"
                  placeholder="Enter post title..."
                />
              </div>

              {/* Description Field */}
              <div>
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-green-600 mb-3 block"
                >
                  Description *
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  className="bg-white border-2 border-gray-200 focus:border-green-500 text-black rounded-xl min-h-[100px] resize-none hover:border-green-300 transition-colors"
                  placeholder="Describe your work..."
                />
              </div>

              {/* Category Fields */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label
                    htmlFor="category"
                    className="text-sm font-medium text-green-600 mb-3 block"
                  >
                    Category *
                  </Label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleCategoryChange}
                    className="w-full bg-white border-2 border-gray-200 focus:border-green-500 text-black h-12 rounded-xl px-3 hover:border-green-300 transition-colors"
                    required
                  >
                    <option value="" className="text-gray-500">
                      Select Category
                    </option>
                    {Object.keys(CATEGORIES).map((cat) => (
                      <option key={cat} value={cat} className="text-black">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label
                    htmlFor="subCategory"
                    className="text-sm font-medium text-green-600 mb-3 block"
                  >
                    Sub-category *
                  </Label>
                  <select
                    id="subCategory"
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleInputChange}
                    className="w-full bg-white border-2 border-gray-200 focus:border-green-500 text-black h-12 rounded-xl px-3 hover:border-green-300 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                    required
                    disabled={!formData.category}
                  >
                    <option value="" className="text-gray-500">
                      Select Sub-category
                    </option>
                    {formData.category &&
                      CATEGORIES[formData.category]?.map((subCat) => (
                        <option
                          key={subCat}
                          value={subCat}
                          className="text-black"
                        >
                          {subCat}
                        </option>
                      ))}
                  </select>
                  {!formData.category && (
                    <p className="text-xs text-gray-500 mt-1">
                      Please select a category first
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white h-12 rounded-full text-base font-medium shadow-lg hover:shadow-xl transition-all disabled:bg-gray-300 disabled:text-gray-500"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Post"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

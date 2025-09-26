"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const VALID_CATEGORIES = {
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
  Portfolio: ["Project"],
};

const SORT_OPTIONS = [
  { label: "Latest", value: "latest" },
  { label: "Most Liked", value: "likes" },
  { label: "Most Commented", value: "comments" },
  { label: "Oldest", value: "oldest" },
];

export function SearchFilter({
  onSearch,
  onFilter,
  searchPlaceholder = "Search...",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tempFilters, setTempFilters] = useState([]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleFilterSelect = (filterType, filterValue) => {
    let updatedFilters = [...tempFilters];

    if (filterType === "category") {
      // Remove existing category and subcategory filters
      updatedFilters = updatedFilters.filter(
        (f) => f.type !== "category" && f.type !== "subcategory"
      );
      updatedFilters.push({ type: "category", value: filterValue });
    } else if (filterType === "subcategory") {
      // Remove existing subcategory filter
      updatedFilters = updatedFilters.filter((f) => f.type !== "subcategory");
      updatedFilters.push({ type: "subcategory", value: filterValue });
    } else {
      // For sort options, replace existing sort filter
      updatedFilters = updatedFilters.filter((f) => f.type !== filterType);
      updatedFilters.push({ type: filterType, value: filterValue });
    }

    setTempFilters(updatedFilters);
  };

  const removeFilter = (filterToRemove) => {
    const updatedFilters = activeFilters.filter(
      (filter) =>
        !(
          filter.type === filterToRemove.type &&
          filter.value === filterToRemove.value
        )
    );
    setActiveFilters(updatedFilters);
    onFilter?.(updatedFilters);
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setTempFilters([]);
    onFilter?.([]);
  };

  const applyFilters = () => {
    setActiveFilters(tempFilters);
    onFilter?.(tempFilters);
    setIsFilterModalOpen(false);
  };

  const handleModalOpen = (open) => {
    if (open) {
      setTempFilters([...activeFilters]);
      setSelectedCategory(null);
    }
    setIsFilterModalOpen(open);
  };

  const isFilterSelected = (type, value) => {
    return tempFilters.some((f) => f.type === type && f.value === value);
  };

  const goBackToCategories = () => {
    setSelectedCategory(null);
  };

  return (
    <div className="">
      <header className="bg-black/80 backdrop-blur px-4 sm:px-6 sticky top-0 z-50">
        <div className="flex flex-col items-center">
          {/* Main Search Box Container */}
          <div className="w-full max-w-3xl">
            <div className="relative flex items-center rounded-full bg-[#0c0c0c] px-4 py-2 shadow-md border border-gray-800/50">
              <Search className="text-white/70 mr-3 h-5 w-5 flex-shrink-0" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchChange}
                className="flex-1 bg-transparent border-none focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-white/60 p-0 h-auto"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    onSearch?.("");
                  }}
                  className="text-white/70 hover:text-white mx-2"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Filter Button */}
              <div className="flex items-center gap-2 ml-3">
                <Dialog open={isFilterModalOpen} onOpenChange={handleModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="icon"
                      className="rounded-full bg-black hover:bg-green-800/20 text-white h-8 w-8 relative"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      {activeFilters.length > 0 && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {activeFilters.length}
                        </div>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white text-black max-w-6xl w-[95vw] h-[90vh] sm:max-h-[85vh] overflow-y-scroll p-0 flex flex-col">
                    <DialogHeader className="p-4 border-b border-gray-200 flex-shrink-0">
                      <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-green-600" />
                        {selectedCategory ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={goBackToCategories}
                              className="text-green-600 hover:text-green-700"
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </button>
                            {selectedCategory}
                          </div>
                        ) : (
                          "Filter & Sort Posts"
                        )}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                      {/* Scrollable Content Area */}
                      <div className="flex-1 overflow-y-auto px-4 py-4">
                        {!selectedCategory ? (
                          // Main Categories View - Responsive Layout
                          <div className="space-y-8">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Categories
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.keys(VALID_CATEGORIES).map(
                                  (category) => (
                                    <button
                                      key={category}
                                      onClick={() =>
                                        setSelectedCategory(category)
                                      }
                                      className={`p-3 text-center rounded-lg border-2 transition-all font-medium ${
                                        isFilterSelected("category", category)
                                          ? "bg-green-500 border-green-500 text-white"
                                          : "bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50"
                                      }`}
                                    >
                                      <div className="font-medium">
                                        {category}
                                      </div>
                                      <div className="text-xs mt-1 opacity-70">
                                        {VALID_CATEGORIES[category].length}{" "}
                                        subcategories
                                      </div>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Sort Options - Responsive Grid */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Sort By
                              </h3>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {SORT_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() =>
                                      handleFilterSelect("sort", option.value)
                                    }
                                    className={`p-3 text-center rounded-lg border-2 transition-all font-medium ${
                                      isFilterSelected("sort", option.value)
                                        ? "bg-green-500 border-green-500 text-white"
                                        : "bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Subcategories View - Responsive Layout with Better Mobile Support
                          <div className="space-y-6">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  handleFilterSelect(
                                    "category",
                                    selectedCategory
                                  )
                                }
                                className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                                  isFilterSelected("category", selectedCategory)
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "bg-white border-green-300 text-green-600 hover:bg-green-50"
                                }`}
                              >
                                Select "{selectedCategory}"
                              </button>
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Subcategories (
                                {VALID_CATEGORIES[selectedCategory].length}{" "}
                                total)
                              </h3>
                              {/* Mobile: Single column with better touch targets */}
                              {/* Desktop: Multiple columns */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {VALID_CATEGORIES[selectedCategory].map(
                                  (subcategory) => (
                                    <button
                                      key={subcategory}
                                      onClick={() =>
                                        handleFilterSelect(
                                          "subcategory",
                                          subcategory
                                        )
                                      }
                                      className={`p-3 text-left rounded-lg border-2 transition-all text-sm sm:text-base ${
                                        isFilterSelected(
                                          "subcategory",
                                          subcategory
                                        )
                                          ? "bg-green-500 border-green-500 text-white font-medium"
                                          : "bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50"
                                      }`}
                                    >
                                      {subcategory}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Selected Filters Preview */}
                        {tempFilters.length > 0 && (
                          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">
                              Selected Filters:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {tempFilters.map((filter, index) => (
                                <Badge
                                  key={index}
                                  className="bg-green-100 text-green-700 border-green-300 px-3 py-1"
                                >
                                  {filter.type}: {filter.value}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Sticky Action Buttons */}
                      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={applyFilters}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 font-medium"
                          >
                            Apply Filters ({tempFilters.length})
                          </Button>
                          <div className="flex gap-2 sm:flex-1">
                            <Button
                              onClick={() => setIsFilterModalOpen(false)}
                              variant="outline"
                              className="flex-1 bg-white text-gray-700 border-gray-300 hover:bg-gray-50 py-3 font-medium"
                            >
                              Cancel
                            </Button>
                            {tempFilters.length > 0 && (
                              <Button
                                onClick={() => setTempFilters([])}
                                variant="outline"
                                className="flex-1 bg-white text-red-600 border-red-300 hover:bg-red-50 py-3 font-medium"
                              >
                                Clear All
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFilters.length > 0 && (
            <div className="w-full max-w-3xl mt-4 flex items-center gap-2 flex-wrap justify-center">
              {activeFilters.map((filter, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 bg-green-600/20 text-green-300 px-2.5 py-1 rounded-full text-xs border border-green-600/30"
                >
                  <span className="capitalize">{filter.type}:</span>
                  <span>{filter.value}</span>
                  <button
                    onClick={() => removeFilter(filter)}
                    className="hover:text-green-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-400 hover:text-white underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

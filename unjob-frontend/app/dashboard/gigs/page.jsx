"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Filter,
  Search,
  Loader2,
  ChevronDown,
  Lock,
  Crown,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";

// Import our modular components
import FilterModal from "@/components/GigFilters";
import GigDetailsModal from "@/components/GigDetailsModel";
import GigCard from "@/components/GigCard";

export default function GigsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);
  const [userRole, setUserRole] = useState("freelancer");
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
 const [filters, setFilters] = useState({
  category: "",
  subCategory: "",
  company: "",
  priceRange: null,
});

  // Sentinel ref for infinite scroll
  const loaderRef = useRef(null);
  // Refs to avoid stale values inside IntersectionObserver
  const hasMoreRef = useRef(true);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);


  // Subscription state
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [showUpgradeButton, setShowUpgradeButton] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserRole();
      fetchSubscriptionData();
      // reset to first page on filter/sort changes
      fetchGigs(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, filters, sortBy]);

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/profile/cover");
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.user?.role || "freelancer");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("freelancer");
    }
  };

  const fetchSubscriptionData = async () => {
    try {
      setSubscriptionLoading(true);
      const response = await fetch("/api/subscription/manage");

      if (response.ok) {
        const data = await response.json();
        setSubscriptionData(data);
        setHasActiveSubscription(data.hasActiveSubscription);
      } else {
        console.error("Failed to fetch subscription data");
        setHasActiveSubscription(false);
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      setHasActiveSubscription(false);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const fetchGigs = async (pageToLoad = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        setLoading(true);
        loadingRef.current = true;
        setHasMore(true);
        hasMoreRef.current = true;
      }
      const queryParams = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: "12",
        status: "active",
      });

      console.log("Current Filters:", filters);


     if (filters.category) queryParams.set("category", filters.category);
     if (filters.subCategory) queryParams.set("subCategory", filters.subCategory);
     if (filters.company) queryParams.set("company", filters.company);

      //  Only add price filters if user has actually set them
     if (filters.priceRange && Array.isArray(filters.priceRange)) {
  queryParams.set("minPrice", filters.priceRange[0].toString());
  queryParams.set("maxPrice", filters.priceRange[1].toString());
}


      if (sortBy) queryParams.set("sort", sortBy);
      if (searchTerm) queryParams.set("search", searchTerm);

      const response = await fetch(`/api/gigs?${queryParams}`);
      // console.log("Final query:", queryParams.toString());

      const data = await response.json();
      // console.log(data)


      if (response.ok && data.success) {
        if (append) {
          setGigs((prev) => [...prev, ...(data.gigs || [])]);
        } else {
          setGigs(data.gigs || []);
        }
        setPagination(data.pagination || {});
        const totalPages = data.pagination?.totalPages ?? 1;
        const more = pageToLoad < totalPages;
        setHasMore(more);
        hasMoreRef.current = more;
        setPage(pageToLoad);
        pageRef.current = pageToLoad;
      } else {
        toast.error(data.error || "Failed to fetch gigs");
        if (!append) setGigs([]);
        setHasMore(false);
        hasMoreRef.current = false;
      }
    } catch (error) {
      console.error("Error fetching gigs:", error);
      toast.error("Failed to fetch gigs");
      if (!append) setGigs([]);
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      if (append) {
        setLoadingMore(false);
        loadingMoreRef.current = false;
      } else {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  };

  const handleGigClick = async (gig) => {
    if (!hasActiveSubscription) {
      toast.error("Premium subscription required to view gig details");
      return;
    }
    router.push(`/dashboard/gigs/${gig._id}`);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

const handleClearFilters = () => {
  setFilters({
    category: "",
    subCategory: "",
    company: "",
    priceRange: null,
  });
  setSearchTerm("");
};


  const handleSearch = () => {
    // reset and fetch first page for new search
    fetchGigs(1, false);
  };

  // Page navigation for numeric pagination
  const goToPage = (targetPage) => {
    const total = pagination?.totalPages || 1;
    if (targetPage < 1 || targetPage > total) return;
    fetchGigs(targetPage, false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Pagination mode (button-based): no intersection observer needed

  // ✅ FIX: Simplified function to use existing state, avoiding the failed API call.
  const handleUpgradeClick = () => {
    toast.success("Redirecting to your settings...");
    // The user's role is already in the 'userRole' state. No need to fetch it again.
    if (userRole === "freelancer") {
      router.push("/dashboard/settings/freelancer?view=subscription");
    } else if (userRole === "hiring") {
      router.push("/dashboard/settings/hiring?view=subscription");
    } else {
      // Fallback for safety
      toast.error(
        "Could not determine user role. Redirecting to general settings."
      );
      router.push("/dashboard/settings");
    }
  };

  const handleApplyToGig = async (gigId, applicationData) => {
    if (!hasActiveSubscription) {
      toast.error("Premium subscription required to apply to gigs");
      return;
    }

    try {
      const response = await fetch("/api/applications/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gigId,
          ...applicationData,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Application submitted successfully!");
        router.push("/dashboard/settings");
      } else {
        toast.error(
          data.message || data.error || "Failed to submit application"
        );
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application");
    }
  };

  if (status === "loading" || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div
              className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4"
              style={{
                borderColor: "#10B981",
              }}
            ></div>
            <div
              className="absolute inset-0 rounded-full blur-xl"
              style={{
                background: "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                opacity: 0.2,
              }}
            ></div>
          </div>
          <p className="text-gray-400">Loading premium gigs...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-gray-400">
            You need to be signed in to view gigs.
          </p>
        </div>
      </div>
    );
  }

  // Subscription Required Overlay Component

  const SubscriptionRequiredOverlay = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#10B981]/20 to-[#376A59]/20 rounded-full flex items-center justify-center">
            <Crown className="w-10 h-10 text-[#10B981]" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Subscription Required
          </h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Unlock access to premium gigs and advanced features with our
            subscription plans.
          </p>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-center text-sm text-gray-300">
            <Zap className="w-4 h-4 mr-2 text-[#10B981]" />
            Priority access to high-paying gigs
          </div>
          <div className="flex items-center justify-center text-sm text-gray-300">
            <Crown className="w-4 h-4 mr-2 text-[#10B981]" />
            Featured profile placement
          </div>
          <div className="flex items-center justify-center text-sm text-gray-300">
            <Lock className="w-4 h-4 mr-2 text-[#10B981]" />
            Advanced filtering & search
          </div>
        </div>

        <Button
          onClick={handleUpgradeClick}
          className="w-full py-3 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
          style={{
            background: "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
          }}
        >
          <Crown className="w-4 h-4 mr-2" />
          Upgrade Now
        </Button>
      </div>
    </div>
  );

  // Mobile Upgrade Button (always visible on mobile for non-subscribers)
  const MobileUpgradeButton = () => (
    <div className="sm:hidden fixed bottom-6 left-4 right-4 z-40">
      <Button
        // ✅ FIX: Added the missing onClick handler.
        onClick={handleUpgradeClick}
        className="w-full py-4 text-white font-semibold rounded-xl shadow-2xl transition-all duration-300"
        style={{
          background: "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
        }}
      >
        <Crown className="w-5 h-5 mr-2" />
        Unlock Premium Gigs
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white relative">
      <div
        className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-500 ${
          !hasActiveSubscription ? "blur-sm pointer-events-none" : ""
        }`}
        onMouseEnter={() =>
          !hasActiveSubscription && setShowUpgradeButton(true)
        }
        onMouseLeave={() =>
          !hasActiveSubscription && setShowUpgradeButton(false)
        }
      >
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  GIGS FOR YOU
                </h1>
              </div>
              <p className="text-gray-400 text-sm sm:text-base">
                {pagination.totalGigs
                  ? `${pagination.totalGigs} premium gigs available`
                  : "Loading..."}
              </p>
            </div>

            {/* Desktop Controls */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger
                    className="text-white w-40 backdrop-blur-sm border-gray-600"
                    style={{
                      background:
                        "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 border-gray-700/50 backdrop-blur-xl">
                    <SelectItem value="newest">Popular Gigs</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="price_high">
                      Price: High to Low
                    </SelectItem>
                    <SelectItem value="price_low">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="featured">Featured First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setShowFilters(true)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 backdrop-blur-sm"
                style={{ borderColor: "#10B981" }}
                onMouseEnter={(e) => {
                  e.target.style.background =
                    "linear-gradient(180deg, #10B981 0%, #376A59 100%)";
                  e.target.style.color = "black";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = "#D1D5DB";
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="sm:hidden space-y-4 mb-6">
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger
                  className="flex-1 text-white backdrop-blur-sm border-gray-600"
                  style={{
                    background:
                      "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900/95 border-gray-700/50 backdrop-blur-xl">
                  <SelectItem value="newest">Popular Gigs</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="featured">Featured First</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowFilters(true)}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 backdrop-blur-sm px-4"
                style={{ borderColor: "#10B981" }}
                onMouseEnter={(e) => {
                  e.target.style.background =
                    "linear-gradient(180deg, #10B981 0%, #376A59 100%)";
                  e.target.style.color = "black";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.color = "#D1D5DB";
                }}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search premium gigs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 bg-black border-gray-700/50 text-white backdrop-blur-sm focus:border-[#10B981] focus:ring-[#10B981]"
              />
            </div>
          </div>

          {/* Active Filters Display */}
         {(filters.category ||
  filters.subCategory ||
  filters.company ||
  (filters.priceRange && Array.isArray(filters.priceRange)) ||
  searchTerm) && (
  <div className="mb-6 flex flex-wrap items-center gap-2">
    <span className="text-gray-400 text-sm">Active filters:</span>
    <Button
      onClick={handleClearFilters}
      variant="ghost"
      size="sm"
      className="text-gray-400 hover:text-white text-xs hover:bg-gray-800"
    >
      Clear all
    </Button>
  </div>
)}

        </div>

        {/* Gigs Grid */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#10B981]" />
          </div>
        ) : gigs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {gigs.map((gig) => (
              <GigCard
                key={gig._id}
                gig={gig}
                userRole={userRole}
                onClick={() => handleGigClick(gig)}
                showApplyButton={
                  userRole === "freelancer" && hasActiveSubscription
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            {/* No gigs found UI */}
          </div>
        )}

        {/* Numeric Pagination */}
        {pagination?.totalPages > 1 && (
          <div className="flex justify-center mt-8 sm:mt-12">
            {(() => {
              const total = pagination.totalPages || 1;
              const current = pagination.currentPage || page;
              const windowSize = 1; // pages around current
              const pages = [];
              const add = (p) => pages.push(p);
              add(1);
              for (let p = current - windowSize; p <= current + windowSize; p++) {
                if (p > 1 && p < total) add(p);
              }
              if (total > 1) add(total);
              // sort unique
              const uniqueSorted = Array.from(new Set(pages)).sort((a, b) => a - b);
              // insert ellipses
              const display = [];
              for (let i = 0; i < uniqueSorted.length; i++) {
                const p = uniqueSorted[i];
                if (i > 0 && p !== uniqueSorted[i - 1] + 1) display.push("ellipsis-" + i);
                display.push(p);
              }

              return (
                <div className="inline-flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage || loading}
                    onClick={() => goToPage(current - 1)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Prev
                  </Button>
                  {display.map((item) =>
                    typeof item === "number" ? (
                      <Button
                        key={`page-${item}`}
                        size="sm"
                        onClick={() => goToPage(item)}
                        className={
                          item === current
                            ? "text-white border-0"
                            : "border-gray-600 text-gray-300 hover:bg-gray-800"
                        }
                        style={
                          item === current
                            ? { background: "linear-gradient(180deg, #10B981 0%, #376A59 100%)" }
                            : {}
                        }
                        variant={item === current ? "default" : "outline"}
                      >
                        {item}
                      </Button>
                    ) : (
                      <span key={item} className="px-2 text-gray-500">…</span>
                    )
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage || loading}
                    onClick={() => goToPage(current + 1)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Next
                  </Button>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Subscription Required Overlay */}
      {!hasActiveSubscription && <SubscriptionRequiredOverlay />}

      {/* Desktop Upgrade Button (appears on hover) */}
      {!hasActiveSubscription && showUpgradeButton && (
        <div className="hidden sm:block fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <Button
            // ✅ FIX: Added the missing onClick handler.
            onClick={handleUpgradeClick}
            className="px-8 py-4 text-white font-semibold rounded-xl shadow-2xl transition-all duration-300 transform hover:scale-105"
            style={{
              background: "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
            }}
          >
            <Crown className="w-5 h-5 mr-2" />
            Unlock Premium Access
          </Button>
        </div>
      )}

      {/* Mobile Upgrade Button */}
      {!hasActiveSubscription && <MobileUpgradeButton />}

      {/* Modals */}
      <FilterModal
        isOpen={showFilters && hasActiveSubscription}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={filters}
      />

      <GigDetailsModal
        gig={selectedGig}
        isOpen={!!selectedGig && hasActiveSubscription}
        onClose={() => setSelectedGig(null)}
        userRole={userRole}
        onApply={handleApplyToGig}
      />
    </div>
  );
}

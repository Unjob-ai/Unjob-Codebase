"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search,
  Filter,
  Star,
  MapPin,
  Briefcase,
  DollarSign,
  Users,
  Building,
  MessageCircle,
  UserPlus,
  Award,
  Send,
  Eye,
  ChevronRight,
  Menu,
  X,
  Home,
  FileText,
  Calendar,
  Bell,
  Settings,
  Lock,
  ChevronDown,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

export default function BrandDirectoryUI() {
  const { data: session } = useSession();

  // State management
  const [activeTab, setActiveTab] = useState("brands");
  const [searchQuery, setSearchQuery] = useState("");
  const [freelancers, setFreelancers] = useState([]);
  const [hiringManagers, setHiringManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination states
  const [freelancerPage, setFreelancerPage] = useState(1);
  const [hiringPage, setHiringPage] = useState(1);
  const [freelancerTotal, setFreelancerTotal] = useState(0);
  const [hiringTotal, setHiringTotal] = useState(0);
  const [freelancerTotalPages, setFreelancerTotalPages] = useState(0);
  const [hiringTotalPages, setHiringTotalPages] = useState(0);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    skills: [],
    location: "",
    minRating: "0",
    maxHourlyRate: "",
    minHourlyRate: "",
    companySize: "",
    industry: "",
    availability: "",
  });

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Mobile states
  const [isMobile, setIsMobile] = useState(false);

  // Infinite scroll
  const observerTarget = useRef(null);
  const isFetchingRef = useRef(false);

  // Available options for filters
  const skillOptions = [
    "JavaScript",
    "React",
    "Node.js",
    "Python",
    "PHP",
    "Java",
    "C++",
    "UI/UX Design",
    "Graphic Design",
    "Content Writing",
    "SEO",
    "Marketing",
    "Data Analysis",
    "Machine Learning",
    "DevOps",
    "Project Management",
  ];

  const availabilityOptions = ["Available", "Busy", "Unavailable"];
  const companySizeOptions = ["1-10", "11-50", "51-200", "201-500", "500+"];

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch users function with proper pagination
  const fetchUsers = useCallback(
    async (pageNum = 1, resetData = false, searchTerm = "") => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        if (resetData) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const queryParams = new URLSearchParams({
          limit: "10", // Fetch 10 items per page for proper pagination
          page: pageNum.toString(),
        });

        if (searchTerm.trim()) {
          queryParams.append("search", searchTerm.trim());
        }

        const response = await fetch(
          `/api/users/by-role?${queryParams.toString()}`
        );
        const data = await response.json();

        if (data.success) {
          // Update freelancers
          if (resetData || pageNum === 1) {
            setFreelancers(data.data.freelancers.users);
            setFreelancerPage(1);
          } else {
            setFreelancers((prev) => [...prev, ...data.data.freelancers.users]);
          }

          // Update hiring managers
          if (resetData || pageNum === 1) {
            setHiringManagers(data.data.hiring.users);
            setHiringPage(1);
          } else {
            setHiringManagers((prev) => [...prev, ...data.data.hiring.users]);
          }

          // Set totals and pagination info
          setFreelancerTotal(data.data.freelancers.total);
          setHiringTotal(data.data.hiring.total);
          setFreelancerTotalPages(data.data.freelancers.totalPages);
          setHiringTotalPages(data.data.hiring.totalPages);

          // Update current page
          if (!resetData && pageNum > 1) {
            if (activeTab === "freelancers") {
              setFreelancerPage(pageNum);
            } else {
              setHiringPage(pageNum);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [activeTab]
  );

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (isFetchingRef.current) return;

    const currentPage =
      activeTab === "freelancers" ? freelancerPage : hiringPage;
    const totalPages =
      activeTab === "freelancers" ? freelancerTotalPages : hiringTotalPages;

    if (currentPage < totalPages) {
      fetchUsers(currentPage + 1, false, searchQuery);
    }
  }, [
    activeTab,
    freelancerPage,
    hiringPage,
    freelancerTotalPages,
    hiringTotalPages,
    searchQuery,
    fetchUsers,
  ]);

  // Apply advanced filters
  const applyFilters = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users/by-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...filters,
          minRating: parseInt(filters.minRating),
          availability:
            filters.availability === "any" ? "" : filters.availability,
          limit: 10,
          page: 1,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const freelancerUsers = data.data.users.filter(
          (u) => u.role === "freelancer"
        );
        const hiringUsers = data.data.users.filter((u) => u.role === "hiring");

        setFreelancers(freelancerUsers);
        setHiringManagers(hiringUsers);
        setFreelancerPage(1);
        setHiringPage(1);
        setShowFilters(false);
        toast.success("Filters applied successfully");
      }
    } catch (error) {
      console.error("Error applying filters:", error);
      toast.error("Failed to apply filters");
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setFreelancerPage(1);
    setHiringPage(1);
    fetchUsers(1, true, searchQuery);
  };

  // Initial load
  useEffect(() => {
    fetchUsers(1, true, "");
  }, []);

  // Infinite scroll setup
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingRef.current && !loading) {
          loadMore();
        }
      },
      { rootMargin: "100px" }
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [loadMore, loading]);

  // Reset pagination when tab changes
  useEffect(() => {
    // No need to fetch again, just switch the view
  }, [activeTab]);

  // Brand Card Component
  const BrandCard = ({ user }) => {
    const handleAvatarClick = (e) => {
      e.stopPropagation();
      window.location.href = `/dashboard/profile/${user._id}`;
    };

    return (
      <div
        onClick={() => {
          setSelectedUser(user);
          setShowUserModal(true);
        }}
        className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300 group cursor-pointer hover:bg-gray-800/60"
      >
        <div className="flex items-center gap-4">
          {/* Brand Logo */}
          <div className="relative">
            <div
              onClick={handleAvatarClick}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden ring-2 ring-gray-700 group-hover:ring-green-500/50 transition-all cursor-pointer hover:ring-green-400"
            >
              <Avatar className="h-14 w-14">
                <AvatarImage src={user.image || user.logo} alt={user.name} />
                <AvatarFallback className="bg-white text-black text-lg font-bold">

                  {typeof user.name === 'string' ? user.name.charAt(0) : "B"}

                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Brand Info */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-green-400 transition-colors">
              {user.profile?.companyName || user.name}
            </h3>
            <p className="text-gray-400 text-sm">
              {user.profile?.industry ||
                user.profile?.companyName ||
                user.description ||
                user.category ||
                "Brand"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Freelancer Card Component
  const FreelancerCard = ({ user }) => {
    const handleAvatarClick = (e) => {
      e.stopPropagation();
      window.location.href = `/dashboard/profile/${user._id}`;
    };

    return (
      <div
        onClick={() => {
          setSelectedUser(user);
          setShowUserModal(true);
        }}
        className="bg-gray-900/80 border border-gray-800/50 rounded-2xl p-6 hover:border-green-500/30 transition-all duration-300 group cursor-pointer hover:bg-gray-800/60"
      >
        <div className="flex items-center gap-4">
          {/* Freelancer Avatar */}
          <div className="relative">
            <Avatar
              onClick={handleAvatarClick}
              className="h-16 w-16 ring-2 ring-gray-700 group-hover:ring-green-500/50 transition-all cursor-pointer hover:ring-green-400"
            >
              <AvatarImage src={user.image} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white text-lg font-semibold">

                {typeof user.name === 'string' ? user.name.charAt(0) : "F"}

              </AvatarFallback>
            </Avatar>
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                <Award className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Freelancer Info */}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-green-400 transition-colors">
              {user.name}
            </h3>
            <p className="text-gray-400 text-sm">
              {user.profile?.structuredSkills
                ?.slice(0, 2)
                .map((skill) => skill.subcategory)
                .join(", ") ||
                user.profile?.skills?.slice(0, 2).join(", ") ||
                "Freelancer"}
            </p>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              {user.stats?.rating > 0 && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{user.stats.rating.toFixed(1)}</span>
                </div>
              )}
              {user.profile?.hourlyRate && (
                <span className="text-green-400 font-medium">
                  ${user.profile.hourlyRate}/hr
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    return activeTab === "brands" ? hiringManagers : freelancers;
  };

  const getCurrentTotal = () => {
    return activeTab === "brands" ? hiringTotal : freelancerTotal;
  };

  const hasMoreData = () => {
    const currentPage = activeTab === "brands" ? hiringPage : freelancerPage;
    const totalPages =
      activeTab === "brands" ? hiringTotalPages : freelancerTotalPages;
    return currentPage < totalPages;
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <div className="bg-black border-b border-gray-800/50 p-6">
          {/* Search Bar */}
          <div className="max-w-2xl">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search for brand / freelancer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus:border-green-500 focus:ring-green-500 rounded-xl"
              />
            </form>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          {/* Header with count and filters */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Total {getCurrentTotal()}{" "}
                {activeTab === "brands" ? "Brands" : "Freelancers"}
              </h1>
              <p className="text-gray-400 mt-1">
                Showing {getCurrentData().length} of {getCurrentTotal()} results
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowFilters(true)}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:border-green-500 hover:text-green-400 rounded-xl px-6"
              >
                <Filter className="h-4 w-4 mr-2" />
                All {activeTab === "brands" ? "Brand" : "Freelancer"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-black border border-gray-800 mb-8 h-12 rounded-xl">
              <TabsTrigger
                value="brands"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg h-10"
              >
                <Building className="h-4 w-4 mr-2" />
                Brands ({hiringTotal})
              </TabsTrigger>
              <TabsTrigger
                value="freelancers"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-lg h-10"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Freelancers ({freelancerTotal})
              </TabsTrigger>
            </TabsList>

            {/* Brands Grid */}
            <TabsContent value="brands" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hiringManagers.map((user) => (
                  <BrandCard key={user._id} user={user} />
                ))}
              </div>
            </TabsContent>

            {/* Freelancers Grid */}
            <TabsContent value="freelancers" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {freelancers.map((user) => (
                  <FreelancerCard key={user._id} user={user} />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Loading More Indicator */}
          {loadingMore && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading more...</p>
            </div>
          )}

          {/* Initial Loading */}
          {loading && getCurrentData().length === 0 && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && getCurrentData().length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-xl mb-4">
                No {activeTab} found
              </div>
              <p className="text-gray-500">
                Try adjusting your search criteria or filters
              </p>
            </div>
          )}

          {/* End of Results */}
          {!loading &&
            !loadingMore &&
            getCurrentData().length > 0 &&
            !hasMoreData() && (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  You've reached the end of the results
                </p>
              </div>
            )}

          {/* Intersection Observer Target */}
          {hasMoreData() && <div ref={observerTarget} className="h-1" />}
        </div>
      </div>

      {/* Filters Modal */}
      {showFilters && (
        <Dialog open={showFilters} onOpenChange={setShowFilters}>
          <DialogContent className="bg-white text-black border-gray-300 max-w-2xl w-[90vw] max-h-[90vh] rounded-2xl">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
                <Filter className="h-6 w-6 text-green-500" />
                Advanced Filters
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Skills Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {skillOptions.map((skill) => (
                    <Button
                      key={skill}
                      onClick={() => {
                        setFilters((prev) => ({
                          ...prev,
                          skills: prev.skills.includes(skill)
                            ? prev.skills.filter((s) => s !== skill)
                            : [...prev.skills, skill],
                        }));
                      }}
                      variant={
                        filters.skills.includes(skill) ? "default" : "outline"
                      }
                      size="sm"
                      className={
                        filters.skills.includes(skill)
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "bg-white border-gray-300 text-black hover:border-green-500 hover:bg-green-50"
                      }
                    >
                      {skill}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Location
                </label>
                <Input
                  placeholder="Enter location..."
                  value={filters.location}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="bg-white border-gray-300 text-black placeholder-gray-500 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              {/* Rating Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Minimum Rating
                </label>
                <Select
                  value={filters.minRating.toString()}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      minRating: value,
                    }))
                  }
                >
                  <SelectTrigger className="bg-white border-gray-300 text-black focus:border-green-500">
                    <SelectValue placeholder="Select minimum rating" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300">
                    <SelectItem value="0">Any Rating</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    skills: [],
                    location: "",
                    minRating: "0",
                    maxHourlyRate: "",
                    minHourlyRate: "",
                    companySize: "",
                    industry: "",
                    availability: "",
                  });
                }}
                className="bg-white border-gray-300 text-black hover:bg-gray-50"
              >
                Reset
              </Button>
              <Button
                onClick={applyFilters}
                className="bg-green-500 text-white hover:bg-green-600"
              >
                Apply Filters
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="bg-white text-black border-gray-300 max-w-2xl w-[90vw] max-h-[90vh] rounded-2xl">
            <DialogHeader className="border-b border-gray-200 pb-4">
              <div className="flex items-start gap-4">
                <Avatar
                  onClick={() =>
                    (window.location.href = `/dashboard/profile/${selectedUser._id}`)
                  }
                  className="h-16 w-16 ring-2 ring-green-500/30 cursor-pointer hover:ring-green-500/50 transition-all"
                >
                  <AvatarImage
                    src={selectedUser.image}
                    alt={selectedUser.name}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white text-lg font-semibold">
                    {typeof selectedUser.name === 'string' ? selectedUser.name.charAt(0) : "U"}

                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <DialogTitle className="text-2xl font-bold text-black flex items-center gap-2">
                    {selectedUser.name}
                    {selectedUser.isVerified && (
                      <Award className="h-5 w-5 text-green-500" />
                    )}
                  </DialogTitle>
                  <p className="text-gray-600 mt-1">
                    {selectedUser.role === "freelancer"
                      ? selectedUser.profile?.structuredSkills?.[0]?.category ||
                        "Freelancer"
                      : selectedUser.profile?.companyName || "Brand"}
                  </p>
                  {selectedUser.profile?.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 text-sm">
                        {selectedUser.profile.location}
                      </span>
                    </div>
                  )}
                  {selectedUser.stats?.rating > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium text-black">
                        {selectedUser.stats.rating.toFixed(1)}
                      </span>
                      <span className="text-gray-600">
                        ({selectedUser.stats.totalReviews} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {selectedUser.profile?.bio && (
                <div>
                  <h3 className="font-semibold text-black mb-2">About</h3>
                  <p className="text-gray-700">{selectedUser.profile.bio}</p>
                </div>
              )}

              {/* Company Information for Hiring Managers */}
              {selectedUser.role === "hiring" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedUser.profile?.companyName && (
                    <div>
                      <h3 className="font-semibold text-black mb-2 flex items-center gap-2">
                        <Building className="h-4 w-4 text-green-500" />
                        Company
                      </h3>
                      <p className="text-gray-700">
                        {selectedUser.profile.companyName}
                      </p>
                    </div>
                  )}

                  {selectedUser.profile?.industry && (
                    <div>
                      <h3 className="font-semibold text-black mb-2 flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-green-500" />
                        Industry
                      </h3>
                      <p className="text-gray-700">
                        {selectedUser.profile.industry}
                      </p>
                    </div>
                  )}

                  {selectedUser.profile?.companySize && (
                    <div>
                      <h3 className="font-semibold text-black mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-500" />
                        Company Size
                      </h3>
                      <p className="text-gray-700">
                        {selectedUser.profile.companySize}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Structured Skills */}
              {selectedUser.profile?.structuredSkills &&
                selectedUser.profile.structuredSkills.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-black mb-3">
                      Skills & Expertise
                    </h3>
                    <div className="space-y-3">
                      {selectedUser.profile.structuredSkills.map(
                        (skill, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-black">
                                  {skill.subcategory}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {skill.category}
                                </p>
                              </div>
                              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                                {skill.years}{" "}
                                {skill.years === "1" ? "year" : "years"}
                              </Badge>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Legacy Skills */}
              {selectedUser.profile?.skills &&
                selectedUser.profile.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-black mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.profile.skills.map((skill, index) => (
                        <Badge
                          key={index}
                          className="bg-green-500/20 text-green-600 border-green-500/30"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              {/* Stats for Freelancers */}
              {selectedUser.role === "freelancer" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-black">
                      {selectedUser.stats?.completedProjects || 0}
                    </div>
                    <div className="text-sm text-gray-600">
                      Projects Completed
                    </div>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-semibold text-black">
                      {selectedUser.stats?.followers || 0}
                    </div>
                    <div className="text-sm text-gray-600">Followers</div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowUserModal(false)}
                className="bg-white border-gray-300 text-black hover:bg-gray-50"
              >
                Close
              </Button>
              <Button
                onClick={() =>
                  (window.location.href = `/dashboard/profile/${selectedUser._id}`)
                }
                className="bg-green-500 text-white hover:bg-green-600"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Full Profile
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

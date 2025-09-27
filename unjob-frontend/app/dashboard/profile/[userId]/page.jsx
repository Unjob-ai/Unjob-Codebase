"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InviteToGigModal } from "@/components/modals/InviteToGigModal";
import GigCard from "@/components/GigCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  MessageCircle,
  Briefcase,
  Calendar,
  Edit,
  Star,
  MapPin,
  UserPlus,
  UserMinus,
  Loader2,
  Building,
  DollarSign,
  Award,
  Heart,
  ExternalLink,
  Eye,
  Github,
  Globe,
  TrendingUp,
  FileText,
  User,
  Video,
  MoreHorizontal,
  Zap,
  Clock,
  Target,
  Share2,
  Copy,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  // User data states
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Follow states
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [followLoading, setFollowLoading] = useState(new Set());
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Tab and modal states
  const [activeTab, setActiveTab] = useState("posts");
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  const isOwnProfile = session?.user?.id === params.userId;
  const isFollowing = followingUsers.has(params.userId);
  const isLoadingFollow = followLoading.has(params.userId);
  const isHiringRole = user?.role === "hiring";
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Tab configuration based on user role
  const getTabsForRole = (role) => {
    if (role === "hiring") {
      return [
        {
          id: "gigs",
          label: "Job Posts",
          icon: Briefcase,
          count: gigs.length,
        },
      ];
    } else {
      return [
        {
          id: "posts",
          label: "Posts",
          icon: FileText,
          count: posts.length,
        },
        {
          id: "projects",
          label: "Projects",
          icon: Briefcase,
          count: portfolios.length,
        },
        {
          id: "about",
          label: "Skills",
          icon: Users,
        },
      ];
    }
  };

  const tabs = user ? getTabsForRole(user.role) : [];

  useEffect(() => {
    if (params.userId) {
      fetchUserProfile();
    }
  }, [params.userId]);

  useEffect(() => {
    if (user) {
      if (user.role === "hiring") {
        fetchUserGigs();
        setActiveTab("gigs");
      } else {
        fetchUserPosts();
        fetchUserPortfolios();
        setActiveTab("posts");
      }
    }
  }, [user]);
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!session?.user) return;

      try {
        const response = await fetch("/api/profile/cover");
        const data = await response.json();

        if (response.ok && data.user) {
          setCurrentUserRole(data.user.role);
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };

    fetchCurrentUser();
  }, [session]);
  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/profile/${params.userId}`);
      const data = await response.json();
      if (response.ok && data.user) {
        setUser(data.user);
        setFollowersCount(data.user.followers?.length || 0);
        setFollowingCount(data.user.following?.length || 0);

        // Initialize follow status
        if (session?.user?.id && data.user.followers) {
          const isUserFollowing = data.user.followers.includes(session.user.id);
          if (isUserFollowing) {
            setFollowingUsers(new Set([params.userId]));
          }
        }
      } else {
        toast.error("User not found");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const response = await fetch(`/api/posts?userId=${params.userId}`);
      const data = await response.json();
      if (response.ok) {
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchUserPortfolios = async () => {
    try {
      const response = await fetch(`/api/portfolio?userId=${params.userId}`);
      const data = await response.json();
      if (response.ok) {
        setPortfolios(data.portfolios || []);
      }
    } catch (error) {
      console.error("Error fetching portfolios:", error);
    }
  };

  const fetchUserGigs = async () => {
    try {
      const response = await fetch(
        `/api/gigs?company=${params.userId}&status=all`
      );
      const data = await response.json();
      if (response.ok) {
        setGigs(data.gigs || []);
      }
    } catch (error) {
      console.error("Error fetching gigs:", error);
    }
  };

  const fetchFollowersData = async () => {
    try {
      const response = await fetch(`/api/profile/${params.userId}/followers`);
      const data = await response.json();
      if (response.ok) {
        setFollowers(data.followers || []);
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
    }
  };

  const fetchFollowingData = async () => {
    try {
      const response = await fetch(`/api/profile/${params.userId}/following`);
      const data = await response.json();
      if (response.ok) {
        setFollowing(data.following || []);
      }
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const handleFollow = async () => {
    if (!session?.user?.id) {
      toast.error("Please log in to follow users");
      return;
    }

    if (followLoading.has(params.userId)) return;

    setFollowLoading((prev) => new Set([...prev, params.userId]));

    try {
      const response = await fetch("/api/profile/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: params.userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setFollowingUsers((prev) => {
          const newSet = new Set(prev);
          if (data.isFollowing) {
            newSet.add(params.userId);
          } else {
            newSet.delete(params.userId);
          }
          return newSet;
        });

        setFollowersCount((prev) => (data.isFollowing ? prev + 1 : prev - 1));
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to update follow status");
      }
    } catch (error) {
      console.error("Follow error:", error);
      toast.error("Network error occurred");
    } finally {
      setFollowLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(params.userId);
        return newSet;
      });
    }
  };

  const handlePostClick = (post) => {
    router.push(`/dashboard/post/${post._id}`);
  };

  const handleProjectClick = (portfolio) => {
    router.push(`/dashboard/project/${portfolio._id}`);
  };

  const handleGigClick = (gig) => {
    router.push(`/dashboard/gigs/${gig._id}`);
  };

  const handleFollowersClick = () => {
    fetchFollowersData();
    setShowFollowersModal(true);
  };

  const handleFollowingClick = () => {
    fetchFollowingData();
    setShowFollowingModal(true);
  };

  const hasUserLiked = (post) => {
    return post?.likes?.some((l) => l?.user?._id === session?.user?.id);
  };

  const formatJoinDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths > 0)
      return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
    if (diffInWeeks > 0)
      return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
    if (diffInDays > 0)
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    return "Today";
  };

  const getGigStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "paused":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "closed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const shouldShowInviteButton = () => {
    return (
      currentUserRole === "hiring" &&
      user?.role === "freelancer" &&
      !isOwnProfile
    );
  };

  // Add this handler function after your existing handlers (around line 200-250)
  const handleInviteToGig = () => {
    if (!user) {
      toast.error("Unable to send invitation - user data not available");
      return;
    }

    setShowInviteModal(true);
  };

  // Get display name based on role
  const getDisplayName = (user) => {
    if (user.role === "hiring" && user.profile?.companyName) {
      return user.profile.companyName;
    }
    return user.name;
  };

  const publicProfileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/profile/${params.userId}`
      : "";
  const shareUrl = publicProfileUrl;
  const shareText = user?.name
    ? `${getDisplayName(user)} on Unjob`
    : "Check out this profile on Unjob";
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl"></div>
          </div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-gray-900/50 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-white">User Not Found</h1>
          <p className="text-gray-400 mb-6">
            The profile you're looking for doesn't exist.
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black border-0"
          >
            Go Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      {/* Header */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white hover:bg-gray-900/50 backdrop-blur-sm border border-gray-800"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back
          </Button>
        </div>
      </div>

      {/* Cover Section */}
      <div className="relative max-w-6xl mx-auto w-full rounded-2xl mb-0">
        <div className="relative h-72 sm:h-80 rounded-b-3xl overflow-hidden">
          {user.coverImage ? (
            <img
              src={user.coverImage}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900/50 to-black flex items-center justify-center">
              {isHiringRole ? (
                <Building className="w-16 h-16 text-gray-600" />
              ) : (
                <Users className="w-16 h-16 text-gray-600" />
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        {/* Floating Profile Avatar */}
        <div className="absolute left-4 sm:left-10 -bottom-10 sm:-bottom-12 z-10">
          <Avatar className="w-28 h-28 sm:w-36 sm:h-36 border-4 border-green-500 bg-black shadow-lg ring-4 ring-black">
            <AvatarImage src={user.image} />
            <AvatarFallback className="bg-gray-900 text-white text-3xl font-bold">
              {getDisplayName(user)?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-14 lg:mt-10">
        {/* Name & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-4 gap-7">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl mt-4 font-extrabold text-white leading-none">
                {getDisplayName(user)}
              </h1>
              {user.isVerified && (
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-4">
                  <Star className="h-4 w-4 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 mb-1">
              <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1">
                {isHiringRole ? "Company" : "Freelancer"}
              </Badge>
              <span className="flex items-center gap-1 text-gray-300 text-sm">
                <Calendar className="h-4 w-4" />
                Joined {formatJoinDate(user.createdAt)}
              </span>
              {user.profile?.location && (
                <span className="flex items-center gap-1 text-gray-300 text-sm">
                  <MapPin className="h-4 w-4" />
                  {user.profile.location}
                </span>
              )}
            </div>
            {user.profile?.bio && (
              <p className="text-gray-300 text-base mt-2 max-w-2xl">
                {user.profile.bio}
              </p>
            )}
            {/* Company-specific info */}
            {isHiringRole && user.profile?.industry && (
              <p className="text-green-400 text-sm mt-1">
                {user.profile.industry}
              </p>
            )}
          </div>

          <div className="flex gap-4 mt-4 sm:mt-0">
            {!isOwnProfile && session ? (
              <>
                <Button
                  onClick={handleFollow}
                  disabled={isLoadingFollow}
                  className={
                    isFollowing
                      ? "bg-gray-900/50 border border-gray-800 text-white hover:bg-gray-800/50 backdrop-blur-sm"
                      : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black border-0"
                  }
                  variant={isFollowing ? "outline" : "default"}
                >
                  {isLoadingFollow ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : isFollowing ? (
                    <UserMinus className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {isLoadingFollow
                    ? "Loading..."
                    : isFollowing
                    ? "Following"
                    : "Follow"}
                </Button>

                {/* Invite to Gig Button */}
                {shouldShowInviteButton() && (
                  <Button
                    onClick={handleInviteToGig}
                    className="bg-green-500 text-white border-0"
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    Invite to Gig
                  </Button>
                )}
              </>
            ) : isOwnProfile ? (
              <Button
                onClick={() => router.push("/dashboard/profile")}
                variant="outline"
                className="bg-gray-900/50 border border-green-500/50 text-green-400 hover:bg-green-500/10 backdrop-blur-sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : null}

            <Button
              onClick={() => setShowShareModal(true)}
              variant="outline"
              className="bg-gray-900/50 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mt-10 mb-10">
          {/* Content Count Card */}
          <Card className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:border-green-500/30 transition-all duration-300 hover:scale-105">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-xl bg-green-500/20">
                  {isHiringRole ? (
                    <Briefcase className="h-5 w-5 text-green-400" />
                  ) : (
                    <FileText className="h-5 w-5 text-green-400" />
                  )}
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-bold text-green-400">
                  {isHiringRole ? gigs.length : posts.length}
                </p>
                <p className="text-gray-400 text-sm font-medium">
                  {isHiringRole ? "Job Posts" : "Posts"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:border-green-500/30 transition-all duration-300 hover:scale-105 cursor-pointer"
            onClick={handleFollowersClick}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-xl bg-green-500/20">
                  <Users className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-bold text-green-400">
                  {followersCount}
                </p>
                <p className="text-gray-400 text-sm font-medium">Followers</p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:border-green-500/30 transition-all duration-300 hover:scale-105 cursor-pointer"
            onClick={handleFollowingClick}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 rounded-xl bg-green-500/20">
                  <Heart className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-2xl font-bold text-green-400">
                  {followingCount}
                </p>
                <p className="text-gray-400 text-sm font-medium">Following</p>
              </div>
            </CardContent>
          </Card>

          {/* Projects Card (only for freelancers) */}
          {!isHiringRole && (
            <Card className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:border-green-500/30 transition-all duration-300 hover:scale-105">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 rounded-xl bg-green-500/20">
                    <Briefcase className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold text-green-400">
                    {portfolios.length}
                  </p>
                  <p className="text-gray-400 text-sm font-medium">Projects</p>
                </div>
              </CardContent>
            </Card>
          )}

          {user.stats?.rating > 0 && (
            <Card className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:border-green-500/30 transition-all duration-300 hover:scale-105">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-center mb-2">
                  <div className="p-2 rounded-xl bg-green-500/20">
                    <Star className="h-5 w-5 text-green-400" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-2xl font-bold text-green-400">
                    {user.stats.rating.toFixed(1)}
                  </p>
                  <p className="text-gray-400 text-sm font-medium">Rating</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="flex justify-start mb-6 sm:mb-8 px-2">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex bg-gray-800/50 backdrop-blur-sm rounded-2xl p-1 border border-gray-700/50 min-w-max">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all duration-300 text-xs sm:text-sm font-medium whitespace-nowrap flex items-center ${
                      activeTab === tab.id
                        ? "text-black font-semibold shadow-lg transform scale-105"
                        : "text-gray-400 hover:text-white hover:bg-gray-700/30"
                    }`}
                    style={{
                      background:
                        activeTab === tab.id
                          ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                          : "transparent",
                    }}
                  >
                    <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                          activeTab === tab.id
                            ? "bg-black/20 text-black"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <Card className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="animate-in fade-in duration-500">
              {/* Gigs Tab (for hiring role) */}
              {activeTab === "gigs" && isHiringRole && (
                <>
                  {gigs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {gigs.map((gig) => (
                        <GigCard
                          key={gig._id}
                          gig={gig}
                          userRole={session?.user?.role}
                          onClick={() => handleGigClick(gig)}
                          showApplyButton={false}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-900/50 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-gray-500" />
                      </div>
                      <div className="text-gray-400 mb-2 text-lg">
                        No job posts yet
                      </div>
                      <div className="text-sm text-gray-500">
                        {isOwnProfile
                          ? "Create your first job posting to find talent!"
                          : "This company hasn't posted any jobs yet."}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Posts Tab (for freelancers) */}
              {activeTab === "posts" && !isHiringRole && (
                <>
                  {posts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {posts.map((post) => (
                        <Card
                          key={post._id}
                          onClick={() => handlePostClick(post)}
                          className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:border-green-500/30 transition-all cursor-pointer group hover:scale-105 duration-300"
                        >
                          {/* Media display logic for both images and videos */}
                          {(post.images?.length > 0 ||
                            (post.videos && post.videos.length > 0)) && (
                            <div className="aspect-video overflow-hidden rounded-t-xl relative">
                              {/* Priority: Video first, then images */}
                              {post.videos && post.videos.length > 0 ? (
                                <>
                                  <video
                                    src={
                                      Array.isArray(post.videos)
                                        ? post.videos[0]
                                        : post.videos
                                    }
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    muted
                                  />
                                  {/* Video icon for video posts */}
                                  <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                                    <Video className="h-4 w-4 text-white" />
                                  </div>
                                </>
                              ) : post.images?.length > 0 ? (
                                <>
                                  <img
                                    src={post.images[0]}
                                    alt={post.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  {/* Optional: Image count indicator if multiple images */}
                                  {post.images.length > 1 && (
                                    <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1">
                                      <span className="text-white text-xs">
                                        +{post.images.length - 1}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : null}
                            </div>
                          )}

                          <CardContent className="p-4">
                            <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-green-400 transition">
                              {post.title}
                            </h3>
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                              {post.description}
                            </p>

                            {/* Media indicators in the footer */}
                            <div className="flex items-center justify-between text-gray-500 text-sm">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Heart
                                    className={cn(
                                      "h-4 w-4",
                                      hasUserLiked(post)
                                        ? "text-red-500 fill-red-500"
                                        : ""
                                    )}
                                  />
                                  {post.likes?.length || 0}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="h-4 w-4" />
                                  {post.comments?.length || 0}
                                </div>

                                {/* Media type indicators */}
                                <div className="flex items-center gap-2">
                                  {post.videos && post.videos.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Video className="h-3 w-3 text-blue-400" />
                                      <span className="text-xs text-blue-400">
                                        {post.videos.length}
                                      </span>
                                    </div>
                                  )}
                                  {post.images && post.images.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3 w-3 text-green-400" />
                                      <span className="text-xs text-green-400">
                                        {post.images.length}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span>{getTimeAgo(post.createdAt)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-900/50 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-500" />
                      </div>
                      <div className="text-gray-400 mb-2 text-lg">
                        No posts yet
                      </div>
                      <div className="text-sm text-gray-500">
                        {isOwnProfile
                          ? "Share your first post to showcase your work!"
                          : "This user hasn't posted anything yet."}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Projects Tab (for freelancers) */}
              {activeTab === "projects" && !isHiringRole && (
                <>
                  {portfolios.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {portfolios.map((portfolio) => (
                        <Card
                          key={portfolio._id}
                          onClick={() => handleProjectClick(portfolio)}
                          className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm hover:border-green-500/30 transition-all cursor-pointer group hover:scale-105 duration-300"
                        >
                          {portfolio.images?.[0] && (
                            <div className="aspect-video overflow-hidden rounded-t-xl">
                              <img
                                src={portfolio.images}
                                alt={portfolio.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-white mb-2 line-clamp-2 group-hover:text-green-400 transition">
                              {portfolio.title}
                            </h3>
                            <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                              {portfolio.description}
                            </p>
                            <div className="flex items-center justify-between text-gray-500 text-sm">
                              <div className="flex items-center gap-2">
                                {portfolio.technologies
                                  ?.slice(0, 2)
                                  .map((tech, index) => (
                                    <Badge
                                      key={index}
                                      className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 text-xs"
                                    >
                                      {tech}
                                    </Badge>
                                  ))}
                              </div>
                              <div className="flex items-center gap-2">
                                {portfolio.liveUrl && (
                                  <Globe className="h-4 w-4 text-green-400" />
                                )}
                                {portfolio.githubUrl && (
                                  <Github className="h-4 w-4 text-green-400" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-900/50 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-gray-500" />
                      </div>
                      <div className="text-gray-400 mb-2 text-lg">
                        No projects yet
                      </div>
                      <div className="text-sm text-gray-500">
                        {isOwnProfile
                          ? "Add your first project to showcase your work!"
                          : "This user hasn't added any projects yet."}
                      </div>
                    </div>
                  )}
                </>
              )}


            </div>
          </CardContent>
        </Card>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <Dialog open={showFollowersModal} onOpenChange={setShowFollowersModal}>
          <DialogContent className="bg-black border border-gray-800 text-white max-w-md">
            <DialogHeader className="border-b border-gray-800 pb-4">
              <DialogTitle className="text-xl font-bold text-white">
                Followers ({followersCount})
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto space-y-3 py-4">
              {followers.length > 0 ? (
                followers.map((follower) => (
                  <div
                    key={follower._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-900/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setShowFollowersModal(false);
                      router.push(`/dashboard/profile/${follower._id}`);
                    }}
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-green-500/20">
                      <AvatarImage src={follower.image} />
                      <AvatarFallback className="bg-gray-800 text-white">
                        {follower.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-white">{follower.name}</p>
                      <p className="text-sm text-gray-400">
                        {follower.profile?.bio?.slice(0, 50) ||
                          "No bio available"}
                        {follower.profile?.bio?.length > 50 && "..."}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No followers yet</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <Dialog open={showFollowingModal} onOpenChange={setShowFollowingModal}>
          <DialogContent className="bg-black border border-gray-800 text-white max-w-md">
            <DialogHeader className="border-b border-gray-800 pb-4">
              <DialogTitle className="text-xl font-bold text-white">
                Following ({followingCount})
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto space-y-3 py-4">
              {following.length > 0 ? (
                following.map((followedUser) => (
                  <div
                    key={followedUser._id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-900/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setShowFollowingModal(false);
                      router.push(`/dashboard/profile/${followedUser._id}`);
                    }}
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-green-500/20">
                      <AvatarImage src={followedUser.image} />
                      <AvatarFallback className="bg-gray-800 text-white">
                        {followedUser.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {followedUser.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {followedUser.profile?.bio?.slice(0, 50) ||
                          "No bio available"}
                        {followedUser.profile?.bio?.length > 50 && "..."}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Not following anyone yet</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="bg-white text-black max-w-md w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader className="p-0 mb-4">
              <DialogTitle className="text-xl font-bold text-black flex items-center">
                <Share2 className="h-5 w-5 mr-2" /> Share Profile
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <LinkIcon className="h-4 w-4 text-gray-500 shrink-0" />
                  <Input
                    readOnly
                    value={shareUrl}
                    className="bg-transparent border-0 text-black focus-visible:ring-0 truncate"
                  />
                </div>
                <Button
                  onClick={handleCopyLink}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </>
                  )}
                </Button>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-3">Share via</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <a
                    href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white">
                      WhatsApp
                    </Button>
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-black hover:bg-gray-900 text-white">
                      X / Twitter
                    </Button>
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      LinkedIn
                    </Button>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                      Facebook
                    </Button>
                  </a>
                  <a
                    href={`mailto:?subject=${encodedText}&body=${encodedUrl}`}
                    className="block"
                  >
                    <Button className="w-full bg-gray-700 hover:bg-gray-800 text-white">
                      Email
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InviteToGigModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        freelancer={{
          _id: user?._id,
          name: user?.name,
          image: user?.image,
          profile: user?.profile,
        }}
        onInviteSent={() => {
          toast.success("Invitation sent successfully!");
          setShowInviteModal(false);
        }}
      />

      {/* Custom CSS */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .animate-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hover\\:scale-105:hover {
          transform: scale(1.05);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

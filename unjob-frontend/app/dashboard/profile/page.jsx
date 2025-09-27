"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  Edit,
  MapPin,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  Upload,
  Plus,
  Users,
  UserPlus,
  MessageCircle,
  Briefcase,
  DollarSign,
  Calendar,
  Eye,
  User,
  Share2,
  ArrowLeft,
  Settings,
  BarChart3,
  Video,
  FolderOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import GigCard from "@/components/GigCard";
import AddProjectModal from "@/components/profile/AddProjectModal";
import ProfileEditModal from "@/components/profile/ProfileEditModal";
import { EditPostModal } from "@/components/profile/EditPostModal";
import EditGigModal from "@/components/modals/gig-edit-modal";
const MediaPreview = ({
  item,
  isDesktop = false,
  onClick,
  isOwner = false,
  onEdit,
  onDelete,
}) => {
  const videoRef = useRef(null);
  const hasVideo = item.videos && item.videos.length > 0;
  const hasImage = item.images && item.images.length > 0;



  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const containerClasses = isDesktop
    ? "aspect-square bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-green-500/50 transition-all cursor-pointer group relative"
    : "aspect-square bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden relative";

  return (
    <div
      className={containerClasses}
      onMouseEnter={isDesktop ? handleMouseEnter : undefined}
      onMouseLeave={isDesktop ? handleMouseLeave : undefined}
      onClick={onClick}
    >
      <div className="relative h-full w-full">
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={item.videos[0]}
              muted
              loop
              playsInline
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5">
              <Video className="h-3 w-3 text-white" />
            </div>
          </>
        ) : hasImage ? (
          <img
            src={item.images[0]}
            alt={item.title || "Post image"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-800/50 flex items-center justify-center">
            <div className="text-gray-500 text-sm">No Media</div>
          </div>
        )}

        {/* Owner Actions - Only show for desktop and when user is owner */}
        {isDesktop && isOwner && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item);
              }}
              className="bg-green-500/90 hover:bg-green-600 text-black rounded-full p-1.5 transition-colors"
              title="Edit Post"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className="bg-green-500/90 hover:bg-green-600 text-black rounded-full p-1.5 transition-colors"
              title="Delete Post"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {isDesktop && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="font-medium text-white text-sm mb-1 line-clamp-1">
                {item.title}
              </h3>
              <p className="text-gray-300 text-xs line-clamp-2">
                {item.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Portfolio Project Modal Component
const PortfolioModal = ({ isOpen, onClose, projectTitle, items }) => {
  // Changed from 'posts' to 'items'
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goToImage = (index) => {
    setCurrentIndex(index);
  };

  if (!isOpen || !items.length) return null;

  const currentItem = items[currentIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-700 text-green-400 max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              {projectTitle}
            </DialogTitle>
            <div className="text-sm text-green-600">
              {currentIndex + 1} of {items.length}
            </div>
          </div>
        </DialogHeader>

        <div className="relative">
          {/* Main Image/Video Display */}
          <div className="relative h-96 bg-black">
            {(currentItem.videos && currentItem.videos.length > 0) ||
            currentItem.video ? (
              <video
                src={currentItem.videos?.[0] || currentItem.video}
                controls
                className="w-full h-full object-contain"
              />
            ) : (currentItem.images && currentItem.images.length > 0) ||
              currentItem.image ? (
              <img
                src={currentItem.images?.[0] || currentItem.image}
                alt={currentItem.title || currentItem.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No media available
              </div>
            )}

            {/* Navigation Arrows */}
            {items.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-all"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-all"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}
          </div>

          {/* Item Details */}
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2">
              {currentItem.title || currentItem.name}
            </h3>
            <p className="text-green-300 mb-4">{currentItem.description}</p>

            {/* Tags */}
            {(currentItem.tags || currentItem.skills) &&
              (currentItem.tags || currentItem.skills).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(currentItem.tags || currentItem.skills).map(
                    (tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-gray-800 text-green-600"
                      >
                        #{tag}
                      </Badge>
                    )
                  )}
                </div>
              )}

            {/* Thumbnail Navigation */}
            {items.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {items.map((item, index) => (
                  <button
                    key={item._id || index}
                    onClick={() => goToImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? "border-green-500"
                        : "border-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {(item.images && item.images.length > 0) || item.image ? (
                      <img
                        src={item.images?.[0] || item.image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <div className="text-gray-500 text-xs">No img</div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Portfolio Project Card Component (Updated Version)
const PortfolioProjectCard = ({ projectTitle, items, isDesktop, onClick }) => {
  const router = useRouter();

  // Ensure 'items' is always an array
  const validItems = items || [];

  // Get the first 4 items for the grid preview
  const previewItems = validItems.slice(0, 4);
  const mainItem = validItems[0]; // Used for tags, now we don't need the description here
  const totalItems = validItems.length;
  const hasMore = totalItems > 4;

  const handleProjectClick = () => {
    // Encode projectTitle to make it URL-safe
    const encodedTitle = encodeURIComponent(projectTitle);
    router.push(`/dashboard/project/${encodedTitle}`);
  };

  // Helper to render a single image cell (This function remains the same)
  const ImageCell = ({ item, altText }) => {
    const imageUrl = item?.images?.[0] || item?.image;
    return (
      <div className="relative overflow-hidden w-full h-full">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={altText}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gray-800/50" />
        )}
      </div>
    );
  };

  // The renderGrid function also remains largely the same
  const renderGrid = () => {
    if (totalItems === 1) {
      return (
        <div className="aspect-square relative">
          <ImageCell item={mainItem} altText={projectTitle} />
        </div>
      );
    }
    if (totalItems === 2) {
      return (
        <div className="aspect-square grid grid-cols-2 gap-1">
          {previewItems.map((item, index) => (
            <ImageCell
              key={item._id || index}
              item={item}
              altText={`${projectTitle} ${index + 1}`}
            />
          ))}
        </div>
      );
    }
    if (totalItems === 3) {
      return (
        <div className="aspect-square grid grid-cols-2 grid-rows-2 gap-1">
          <div className="row-span-2 col-span-1">
            <ImageCell item={previewItems[0]} altText={`${projectTitle} 1`} />
          </div>
          <div className="col-span-1">
            <ImageCell item={previewItems[1]} altText={`${projectTitle} 2`} />
          </div>
          <div className="col-span-1">
            <ImageCell item={previewItems[2]} altText={`${projectTitle} 3`} />
          </div>
        </div>
      );
    }
    if (totalItems >= 4) {
      return (
        <div className="aspect-square grid grid-cols-2 grid-rows-2 gap-1">
          {previewItems.map((item, index) => (
            <div key={item._id || index} className="relative">
              <ImageCell item={item} altText={`${projectTitle} ${index + 1}`} />
              {index === 3 && hasMore && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-white text-2xl font-bold">
                    +{totalItems - 4}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="aspect-square bg-gray-800/50 flex items-center justify-center rounded-xl">
        <FolderOpen className="h-12 w-12 text-gray-500" />
      </div>
    );
  };

  return (
    <div className="cursor-pointer group" onClick={handleProjectClick}>
      {/* This div now holds just the image grid and its overlays */}
      <div className="relative aspect-square rounded-xl overflow-hidden border border-transparent group-hover:border-green-500/50 transition-all">
        {renderGrid()}

        {validItems.some((item) => item.videos && item.videos.length > 0) && (
          <div className="absolute top-3 left-3 bg-black/50 rounded-full p-1.5">
            <Video className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="font-semibold text-white text-lg truncate">
          {projectTitle}
        </h3>

        {mainItem?.tags && mainItem.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-400 text-sm mt-1">
            {mainItem.tags.slice(0, 4).map((tag, index) => (
              <span key={index}>#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [portfolioProjects, setPortfolioProjects] = useState([]);
  const [groupedPortfolio, setGroupedPortfolio] = useState({});
  const [userGigs, setUserGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("posts");
  const [showAddProject, setShowAddProject] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showEditPost, setShowEditPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // Portfolio modal states
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState({
    title: "",
    items: [],
  });
  const [showEditGigModal, setShowEditGigModal] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  const coverInputRef = useRef(null);
  const profileInputRef = useRef(null);

  const userRole = session?.user?.role || "freelancer";

  // Helper function to get user identifier from session
  const getUserIdentifier = (session) => {
    if (!session?.user) return null;
    return (
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub ||
      session.user.email ||
      null
    );
  };

  // Helper function to check if profile is actually complete
  const checkProfileCompletion = (profile) => {
    if (!profile?.profile) return false;

    const profileData = profile.profile;
    const hasBasicInfo = profileData.bio && profileData.bio.trim().length >= 20;
    const hasSkills = profileData.skills && profileData.skills.length >= 3;

    if (profile.role === "freelancer") {
      const hasFreelancerInfo =
        profileData.hourlyRate && profileData.hourlyRate >= 5;
      return hasBasicInfo && hasSkills && hasFreelancerInfo;
    } else if (profile.role === "hiring") {
      const hasCompanyInfo =
        profileData.companyName && profileData.companyName.trim().length > 0;
      return hasBasicInfo && hasSkills && hasCompanyInfo;
    }
    return false;
  };

  // Group portfolio projects by project title
  const groupPortfolioByTitle = (portfolioItems) => {
    const grouped = {};
    portfolioItems.forEach((item) => {
      // Corrected Line: Prioritize the 'project' field for grouping
      const projectTitle =
        item.project || item.title || item.name || "Untitled Project";

      if (!grouped[projectTitle]) {
        grouped[projectTitle] = [];
      }
      grouped[projectTitle].push(item);
    });
    return grouped;
  };

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setError("Please log in to view your profile");
      setLoading(false);
      return;
    }
    if (status === "authenticated" && session?.user) {
      const userIdentifier = getUserIdentifier(session);
      if (userIdentifier) {
        fetchProfile(userIdentifier);
      } else {
        setError(
          "User identifier not found in session. Please try logging in again."
        );
        setLoading(false);
      }
    }
  }, [session, status]);

  const fetchProfile = async (userIdentifier) => {
    try {
      let profileUrl = `/api/profile/${userIdentifier}`;
      if (userIdentifier.includes("@")) {
        profileUrl = `/api/profile/by-email/${encodeURIComponent(
          userIdentifier
        )}`;
      }

      const response = await fetch(profileUrl);
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setProfile(data.user);

      // Check if current user is following this profile
      const currentUserId = getUserIdentifier(session);
      if (
        currentUserId &&
        currentUserId !== data.user._id &&
        currentUserId !== data.user.email
      ) {
        checkFollowStatus(data.user._id);
      }

      // Fetch posts and portfolio
      await fetchUserContent(data.user._id);

      // Fetch user's gigs if it's a hiring profile
      if (data.user.role === "hiring") {
        await fetchUserGigs(data.user._id);
      }

      // Fetch follow suggestions
      await fetchSuggestions();
    } catch (error) {
      setError(error.message);
      toast.error("Failed to load profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async (profileUserId) => {
    try {
      const response = await fetch(`/api/profile/${profileUserId}`);
      if (response.ok) {
        const data = await response.json();
        const currentUserId = getUserIdentifier(session);
        setIsFollowing(data.user.followers?.includes(currentUserId) || false);
      }
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  const fetchUserContent = async (userId) => {
    try {
      // --- Step 1: Fetch regular posts (this part remains the same) ---
      const postsResponse = await fetch(`/api/posts?userId=${userId}`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        // Ensure we only show non-portfolio posts in the "Posts" tab
        setPosts(
          (postsData.posts || []).filter((p) => p.postType !== "portfolio")
        );
      }

      // --- Step 2: Fetch all portfolio data from your new single endpoint ---
      const portfolioResponse = await fetch(`/api/portfolio?userId=${userId}`);
      if (portfolioResponse.ok) {
        const data = await portfolioResponse.json();

        // The API returns all portfolio items in `data.portfolio.items`
        const allPortfolioItems = data.portfolio?.items || [];

        // We still group these items by their "project" title for the UI
        // Your groupPortfolioByTitle function is still perfect for this
        const grouped = groupPortfolioByTitle(allPortfolioItems);
        setGroupedPortfolio(grouped);

        // (Optional) You can also store the stats if you want to display them
        // Example: const [portfolioStats, setPortfolioStats] = useState(null);
        // setPortfolioStats(data.stats);
      } else {
        console.error("Failed to fetch portfolio:", portfolioResponse.status);
        setGroupedPortfolio({});
      }
    } catch (error) {
      console.error("Error fetching user content:", error);
    }
  };

  // Function to fetch user's gigs
  const fetchUserGigs = async (userId) => {
    try {
      const response = await fetch(`/api/gigs?company=${userId}&status=all`);
      if (response.ok) {
        const data = await response.json();
        setUserGigs(data.gigs || []);
      }
    } catch (error) {
      console.error("Error fetching user gigs:", error);
      try {
        const response = await fetch(`/api/gigs/getGigs?company=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUserGigs(data.gigs || []);
        }
      } catch (alternativeError) {
        console.error(
          "Error fetching user gigs (alternative):",
          alternativeError
        );
      }
    }
  };

  const fetchFollowers = async () => {
    try {
      const response = await fetch(`/api/profile/followers/${profile._id}`);
      if (response.ok) {
        const data = await response.json();
        setFollowers(data.followers || []);
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
    }
  };

  const fetchFollowing = async () => {
    try {
      const response = await fetch(`/api/profile/following/${profile._id}`);
      if (response.ok) {
        const data = await response.json();
        setFollowing(data.following || []);
      }
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const response = await fetch("/api/profile/follow-suggestions");
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;

    setFollowLoading(true);
    try {
      const response = await fetch("/api/profile/follow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: profile._id }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsFollowing(data.isFollowing);

        // Update follower count in profile
        setProfile((prev) => ({
          ...prev,
          stats: {
            ...prev.stats,
            followers: data.isFollowing
              ? (prev.stats?.followers || 0) + 1
              : Math.max(0, (prev.stats?.followers || 0) - 1),
          },
        }));

        toast.success(data.isFollowing ? "Following!" : "Unfollowed");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update follow status");
      }
    } catch (error) {
      toast.error("Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  // Add this new helper function inside your ProfilePage component
  const validateCoverImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        return reject("Please upload a valid image file.");
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        URL.revokeObjectURL(img.src);

        // ✅ Check ratio: width / height should be close to 4
        const aspectRatio = width / height;
        const isValidAspect = Math.abs(aspectRatio - 4) < 0.05; // small tolerance (±5%)

        if (isValidAspect) {
          resolve();
        } else {
          reject(
            `Invalid aspect ratio. Your image is ${width}x${height}px (${aspectRatio.toFixed(
              2
            )}:1). Please upload a 4:1 banner.`
          );
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject("Could not load image to verify dimensions.");
      };
    });
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 🔍 Dimension validation
    try {
      await validateCoverImageDimensions(file);
    } catch (error) {
      toast.error(error);
      return; // stop upload
    }

    // 📦 Size check
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const originalCoverImage = profile.coverImage;
    setProfile((prev) => ({ ...prev, coverImage: previewUrl }));

    const formData = new FormData();
    formData.append("coverImage", file);

    try {
      const response = await fetch("/api/profile/cover", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setProfile((prev) => ({ ...prev, coverImage: data.coverImage }));
        toast.success("Cover photo updated!");
      } else {
        setProfile((prev) => ({ ...prev, coverImage: originalCoverImage }));
        toast.error(data.error || "Failed to upload cover photo");
      }
    } catch (error) {
      setProfile((prev) => ({ ...prev, coverImage: originalCoverImage }));
      console.error("Cover upload error:", error);
      toast.error("Failed to upload cover photo");
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleEditGig = (gig) => {
    setSelectedGig(gig);
    setShowEditGigModal(true);
  };

  const handleGigUpdated = (updatedGig) => {
    // Update the gig in the userGigs state
    setUserGigs((prev) =>
      prev.map((gig) => (gig._id === updatedGig._id ? updatedGig : gig))
    );
    setShowEditGigModal(false);
    setSelectedGig(null);
  };

  const handleGigDeleted = (deletedGigId) => {
    // Remove the gig from userGigs state
    setUserGigs((prev) => prev.filter((gig) => gig._id !== deletedGigId));
    setShowEditGigModal(false);
    setSelectedGig(null);
  };

  const handleDeleteGig = async (id) => {
    if (!confirm("Are you sure you want to delete this gig?")) return;

    try {
      const res = await fetch(`/api/gigs/getGigs?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        // update state so UI refreshes instantly
        setUserGigs((prev) => prev.filter((gig) => gig._id !== id));
        toast.success("Gig deleted successfully!");
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete gig");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Something went wrong");
    }
  };

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const originalImage = profile.image;
    setProfile((prev) => ({ ...prev, image: previewUrl }));

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch(`/api/profile/${profile._id}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        toast.success("Profile photo updated!");
      } else {
        setProfile((prev) => ({ ...prev, image: originalImage }));
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to upload profile photo");
      }
    } catch (error) {
      setProfile((prev) => ({ ...prev, image: originalImage }));
      console.error("Profile image upload error:", error);
      toast.error("Failed to upload profile photo");
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const startConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: profile._id,
          message: "Hi! I'd like to connect with you.",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to chat
        window.location.href = `/chat/${data.conversation._id}`;
      } else {
        toast.error("Failed to start conversation");
      }
    } catch (error) {
      toast.error("Failed to start conversation");
    }
  };

  const handlePostClick = (post) => {
    // Navigate to the individual post page
    router.push(`/dashboard/post/${post._id}`);
  };

  const handleEditPost = (post) => {
    setSelectedPost(post);
    setShowEditPost(true);
  };

  const handleDeletePost = async (post) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      const response = await fetch(`/api/posts/${post._id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Post deleted successfully!");
        // Refresh posts
        fetchUserContent(profile._id);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete post");
      }
    } catch (error) {
      console.error("Delete post error:", error);
      toast.error("Failed to delete post");
    }
  };

  const handlePostUpdated = () => {
    setShowEditPost(false);
    setSelectedPost(null);
    fetchUserContent(profile._id);
  };

  // Helper function to format gig data
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: "Active", variant: "default", color: "bg-green-500" },
      draft: { label: "Draft", variant: "secondary", color: "bg-gray-500" },
      paused: { label: "Paused", variant: "secondary", color: "bg-yellow-500" },
      completed: {
        label: "Completed",
        variant: "outline",
        color: "bg-blue-500",
      },
      cancelled: {
        label: "Cancelled",
        variant: "destructive",
        color: "bg-red-500",
      },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  // Handle portfolio project click
  const handlePortfolioClick = (projectTitle, projectItems) => {
    setSelectedProject({ title: projectTitle, items: projectItems }); // Changed from 'posts' to 'items'
    setShowPortfolioModal(true);
  };

  if (loading) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  
  if (error) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Profile Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-green-500 hover:bg-green-600 text-black rounded-full"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Button
            onClick={() => window.location.reload()}
            className="rounded-full"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const currentUserIdentifier = getUserIdentifier(session);
  const isOwnProfile =
    currentUserIdentifier === profile.email ||
    currentUserIdentifier === profile._id?.toString() ||
    session?.user?.email === profile.email;

  const isProfileComplete = checkProfileCompletion(profile);
  const isFreelancer = profile.role === "freelancer";
  const isHiring = profile.role === "hiring";

  const displayName =
    isHiring && profile.profile?.companyName
      ? profile.profile.companyName
      : profile.name;

  // Show different tabs based on user role
  const showPostsAndPortfolio = isFreelancer;
  const showGigsTab = isHiring;

  return (
    // Use a fragment to wrap the conditional layout and the shared modals
    <>
      {isMobile ? (
        // Mobile Layout
        <div className="min-h-screen bg-black text-white">
          {/* Mobile Header */}
          <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gray-800/30 p-4">
            <div className="flex items-center justify-between">
              <ArrowLeft className="h-6 w-6 text-white" />
            </div>
          </div>

          {/* Mobile Cover Photo */}
          <div className="relative aspect-[4/1] w-full">
            {profile.coverImage ? (
              <img
                src={profile.coverImage}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
            )}

            {isOwnProfile && (
              <div className="absolute top-4 right-4">
                <button
                  className="bg-black/40 backdrop-blur-sm border border-white/20 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Upload cover Photo
                </button>
              </div>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </div>

          {/* Mobile Profile Section */}
          <div className="px-4 -mt-16 relative z-10">
            {/* Profile Avatar */}
            <div className="relative mb-4">
              <div className="w-32 h-32 rounded-full border-4 border-black bg-black overflow-hidden">
                <img
                  src={profile.image || "/placeholder.svg?height=128&width=128"}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {isOwnProfile && (
                <button
                  className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 rounded-full w-10 h-10 flex items-center justify-center"
                  onClick={() => profileInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5 text-black" />
                </button>
              )}
              <input
                ref={profileInputRef}
                type="file"
                accept="image/*"
                onChange={handleProfileImageUpload}
                className="hidden"
              />
            </div>

            {/* Mobile Stats - Show for all user types */}
            <div className="flex gap-8 mb-6">
              <button
                onClick={() => {
                  fetchFollowers();
                  setShowFollowers(true);
                }}
                className="text-center hover:bg-gray-800/50 rounded-lg p-2 transition-colors"
              >
                <div className="text-2xl font-bold text-green-400">
                  {profile.followers?.length || profile.stats?.followers || 0}
                </div>
                <div className="text-sm text-gray-400">Followers</div>
              </button>
              <button
                onClick={() => {
                  fetchFollowing();
                  setShowFollowing(true);
                }}
                className="text-center hover:bg-gray-800/50 rounded-lg p-2 transition-colors"
              >
                <div className="text-2xl font-bold text-green-400">
                  {profile.following?.length || profile.stats?.following || 0}
                </div>
                <div className="text-sm text-gray-400">Following</div>
              </button>
              <div className="text-center p-2">
                <div className="text-2xl font-bold text-green-400">
                  {isFreelancer
                    ? Object.keys(groupedPortfolio).length
                    : userGigs.length}
                </div>
                <div className="text-sm text-gray-400">
                  {isFreelancer ? "Projects" : "Gigs"}
                </div>
              </div>
            </div>

            {/* Mobile Profile Info */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">{displayName}</h1>

              <p className="text-gray-400 mb-3">
                {profile.profile?.bio ||
                  `${
                    profile.role === "freelancer" ? "Freelancer" : "Company"
                  } Based in India`}
              </p>
              {profile.profile?.location && (
                <div className="flex items-center text-gray-400 text-sm mb-3">
                  <MapPin className="h-4 w-4 mr-1" />
                  {profile.profile.location}
                </div>
              )}
            </div>

            {/* Mobile Action Buttons */}
            <div className="flex gap-3 mb-6">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-black font-medium py-3 rounded-full flex items-center justify-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-black font-medium py-3 rounded-full"
                  >
                    {followLoading
                      ? "Loading..."
                      : isFollowing
                      ? "Following"
                      : "Follow"}
                  </button>
                  <button
                    onClick={startConversation}
                    className="flex-1 border border-gray-600 text-white py-3 rounded-full hover:bg-gray-800/50"
                  >
                    Send Message
                  </button>
                </>
              )}
            </div>

            {/* Mobile Tabs - Show for freelancers */}
            {showPostsAndPortfolio && (
              <div className="flex bg-gray-900/50 backdrop-blur-sm rounded-full p-1 mb-6">
                <button
                  onClick={() => setActiveTab("posts")}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                    activeTab === "posts"
                      ? "bg-green-500 text-black"
                      : "text-gray-400"
                  }`}
                >
                  Posts ({posts.length})
                </button>
                <button
                  onClick={() => setActiveTab("portfolio")}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                    activeTab === "portfolio"
                      ? "bg-green-500 text-black"
                      : "text-gray-400"
                  }`}
                >
                  Portfolio ({Object.keys(groupedPortfolio).length})
                </button>
              </div>
            )}

            {/* Mobile Tabs - Show for hiring */}
            {showGigsTab && (
              <div className="flex bg-gray-900/50 backdrop-blur-sm rounded-full p-1 mb-6">
                <button
                  onClick={() => setActiveTab("gigs")}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                    activeTab === "gigs"
                      ? "bg-green-500 text-black"
                      : "text-gray-400 border border-green-500"
                  }`}
                >
                  Gigs ({userGigs.length})
                </button>
              </div>
            )}

            {/* Watch Tutorial Button - Mobile - appears after gigs for hiring role users */}
             {showGigsTab  && isHiring && (
                    <div className=" flex bg-gray-900/50 backdrop-blur-sm rounded-full p-1 mb-6">
                      <Button
                        onClick={() => setShowTutorialModal(true)}
                        className="bg-green-500 flex-1 hover:bg-green-600 text-black rounded-full "
                      >
                        <Play className="h-6 w-6 mr-3" />
                        Watch Tutorial
                      </Button>
                    </div>
                  )}

            {/* Mobile Content */}
            <div className="pb-20">
              {showPostsAndPortfolio && activeTab === "posts" && (
                <div
                  className={
                    isMobile
                      ? "grid grid-cols-3 gap-1"
                      : "grid grid-cols-4 gap-4"
                  }
                >
                  {posts.map((item) => (
                    <MediaPreview
                      key={item._id}
                      item={item}
                      isDesktop={!isMobile}
                      onClick={() => handlePostClick(item)}
                      isOwner={isOwnProfile}
                      onEdit={handleEditPost}
                      onDelete={handleDeletePost}
                    />
                  ))}
                </div>
              )}

              {showPostsAndPortfolio && activeTab === "portfolio" && (
                <div
                  className={
                    isMobile
                      ? "grid grid-cols-2 gap-4"
                      : "grid grid-cols-3 gap-6"
                  }
                >
                  {Object.entries(groupedPortfolio).map(
                    ([projectTitle, projectItems]) => (
                      <PortfolioProjectCard
                        key={projectTitle}
                        projectTitle={projectTitle}
                        items={projectItems} // Changed from 'posts' to 'items'
                        isDesktop={!isMobile}
                        onClick={() =>
                          handlePortfolioClick(projectTitle, projectItems)
                        }
                      />
                    )
                  )}
                </div>
              )}

 
              

              {showGigsTab && activeTab === "gigs" && (
                <div className="space-y-4">
                  {userGigs.map((gig) => (
                    <Card
                      key={gig._id}
                      className="bg-gray-900/60 border-gray-700/50 rounded-lg backdrop-blur-sm"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base font-semibold text-white">
                                <Link href={`/dashboard/gigs/${gig._id}`}>
                                  {gig.title}
                                </Link>
                              </h3>
                              {getStatusBadge(gig.status)}
                            </div>
                            <p className="text-gray-300 text-sm line-clamp-2 mb-3">
                              {gig.description || gig.projectOverview}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-gray-400">
                              <span>₹{gig.budget?.toLocaleString()}</span>
                              <span>
                                {gig.applications?.length || 0} applications
                              </span>
                              <span>{formatTimeAgo(gig.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

             

              {/* Empty States */}
              {showPostsAndPortfolio &&
                activeTab === "posts" &&
                posts.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-500 mb-4">No posts yet</div>
                    {/* Removed create post button - view only */}
                  </div>
                )}

              {showPostsAndPortfolio &&
                activeTab === "portfolio" &&
                Object.keys(groupedPortfolio).length === 0 && (
                  <div className="text-center py-12">
                    <FolderOpen className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <div className="text-gray-500 mb-4">
                      No portfolio projects yet
                    </div>
                    {isOwnProfile && (
                      <Button
                        className="bg-green-500 hover:bg-green-600 text-black rounded-full"
                        onClick={() => setShowAddProject(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Project
                      </Button>
                    )}
                  </div>
                )}

              {showGigsTab && userGigs.length === 0 && (
                <div className="text-center py-12">
                  <Briefcase className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <div className="text-gray-500 mb-4">No gigs posted yet</div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Desktop Layout
        <div className="min-h-screen bg-black text-white">
          {/* Desktop Cover Photo */}
          <div className="relative aspect-[4/1] w-full max-w-[1584px] mx-auto">
            {profile.coverImage ? (
              <img
                src={profile.coverImage}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
            )}

            {isOwnProfile && (
              // ✅ Wrap button and text in a div for better positioning
              <div className="absolute top-6 right-6 flex flex-col items-center">
                <button
                  className="bg-black/40 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-black/60 transition-all"
                  onClick={() => coverInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Upload cover Photo
                </button>
                {/* ✅ ADD THIS LINE */}
                <p className="text-xs text-white/80 mt-2">
                  Recommended: 4:1 Banner Ratio
                </p>
              </div>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              className="hidden"
            />
          </div>

          <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-10">
            <div className="flex gap-8">
              {/* Desktop Left Sidebar */}
              <div className="w-80 flex-shrink-0">
                {/* Desktop Profile Avatar */}
                <div className="relative mb-6">
                  <div className="w-40 h-40 rounded-full border-4 border-black bg-black overflow-hidden">
                    <img
                      src={
                        profile.image || "/placeholder.svg?height=160&width=160"
                      }
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {isOwnProfile && (
                    <button
                      className="absolute bottom-2 right-2 bg-green-500 hover:bg-green-600 rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                      onClick={() => profileInputRef.current?.click()}
                    >
                      <Camera className="h-5 w-5 text-black" />
                    </button>
                  )}
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Desktop Profile Info */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold mb-3">{displayName}</h1>

                  <p className="text-gray-400 mb-4">
                    {profile.profile?.bio ||
                      `${
                        profile.role === "freelancer" ? "Freelancer" : "Company"
                      } Based in India`}
                  </p>
                  {profile.profile?.location && (
                    <div className="flex items-center text-gray-400 mb-4">
                      <MapPin className="h-4 w-4 mr-2" />
                      {profile.profile.location}
                    </div>
                  )}
                </div>

                {/* Desktop Stats - Show for all user types */}
                <div className="grid grid-cols-3 gap-6 mb-8 text-center">
                  <button
                    onClick={() => {
                      fetchFollowers();
                      setShowFollowers(true);
                    }}
                    className="hover:bg-gray-800/50 rounded-lg p-2 transition-colors"
                  >
                    <div className="text-2xl font-bold text-green-400">
                      {profile.followers?.length ||
                        profile.stats?.followers ||
                        0}
                    </div>
                    <div className="text-sm text-gray-400">Followers</div>
                  </button>
                  <button
                    onClick={() => {
                      fetchFollowing();
                      setShowFollowing(true);
                    }}
                    className="hover:bg-gray-800/50 rounded-lg p-2 transition-colors"
                  >
                    <div className="text-2xl font-bold text-green-400">
                      {profile.following?.length ||
                        profile.stats?.following ||
                        0}
                    </div>
                    <div className="text-sm text-gray-400">Following</div>
                  </button>
                  <div className="p-2">
                    <div className="text-2xl font-bold text-green-400">
                      {isFreelancer
                        ? Object.keys(groupedPortfolio).length
                        : userGigs.length}
                    </div>
                    <div className="text-sm text-gray-400">
                      {isFreelancer ? "Projects" : "Gigs"}
                    </div>
                  </div>
                </div>

                {/* Desktop Action Buttons */}
                <div className="space-y-3">
                  {isOwnProfile ? (
                    <>
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="w-full bg-green-500 hover:bg-green-600 text-black font-medium py-3 rounded-full flex items-center justify-center gap-2 transition-all"
                      >
                        <Edit className="h-5 w-5" />
                        Edit Profile
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className="w-full bg-green-500 hover:bg-green-600 text-black font-medium py-3 rounded-full transition-all"
                      >
                        {followLoading ? (
                          "Loading..."
                        ) : isFollowing ? (
                          <>
                            <Users className="h-5 w-5 mr-2 inline" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-5 w-5 mr-2 inline" />
                            Follow
                          </>
                        )}
                      </button>
                      <button
                        onClick={startConversation}
                        className="w-full bg-gray-900/60 backdrop-blur-sm border border-gray-600/50 text-white py-3 rounded-full hover:bg-gray-800/60 transition-all"
                      >
                        <MessageCircle className="h-5 w-5 mr-2 inline" />
                        Send Message
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Desktop Main Content */}
              <div className="flex-1 mt-20">
                {/* Desktop Tabs - Show for freelancers */}
                {showPostsAndPortfolio && (
                  <div className="flex bg-gray-900/50 backdrop-blur-sm rounded-full p-1 mb-8 w-fit">
                    <button
                      onClick={() => setActiveTab("posts")}
                      className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                        activeTab === "posts"
                          ? "bg-green-500 text-black"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Posts ({posts.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("portfolio")}
                      className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                        activeTab === "portfolio"
                          ? "bg-green-500 text-black"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      Portfolio ({Object.keys(groupedPortfolio).length})
                    </button>
                  </div>
                )}

                {/* Desktop Tabs - Show for hiring */}
                <div className="flex  gap-5 ">
{showGigsTab && (
                  <div className="flex bg-gray-900/50 backdrop-blur-sm rounded-full p-1  w-fit">
                    <button
                      onClick={() => setActiveTab("gigs")}
                      className={`px-8 py-3 rounded-full text-sm font-medium transition-all ${
                        activeTab === "gigs"
                          ? "bg-green-500 text-black"
                          : "text-gray-400 border border-green-500"
                      }`}
                    >
                      Gigs ({userGigs.length})
                    </button>
                  </div>
                )}

                {/* Watch Tutorial Button - appears after gigs for hiring role users */}
                  {showGigsTab && isHiring && (
                    <div className=" flex justify-center mt-2">
                      <Button
                        onClick={() => setShowTutorialModal(true)}
                        className="bg-green-500 hover:bg-green-600 text-black rounded-full "
                      >
                        <Play className="h-6 w-6 " />
                        Watch Tutorial
                      </Button>
                    </div>
                  )}
                </div>
                


                {/* Add Project Button for Portfolio */}
                {activeTab === "portfolio" &&
                  isOwnProfile &&
                  showPostsAndPortfolio && (
                    <div className="mb-6">
                      <Button
                        className="bg-green-500 hover:bg-green-600 text-black rounded-full"
                        onClick={() => setShowAddProject(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Project
                      </Button>
                    </div>
                  )}

                {/* Add Gig Button for Gigs */}

                <div className="flex mb-6  gap-5 items-center">


{activeTab === "gigs" && isOwnProfile && showGigsTab && (
                  <div className="">
                    <Button
                      onClick={() => router.push("/dashboard/create-gig")}
                      className="bg-green-500 hover:bg-green-600 text-black rounded-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Post New Gig
                    </Button>
                  </div>
                )}
                </div> 
                {/* Desktop Content */}
                <div>
                  {showPostsAndPortfolio && activeTab === "posts" && (
                    <div
                      className={
                        isMobile
                          ? "grid grid-cols-3 gap-1"
                          : "grid grid-cols-4 gap-4"
                      }
                    >
                      {posts.map((item) => (
                        <MediaPreview
                          key={item._id}
                          item={item}
                          isDesktop={!isMobile}
                          onClick={() => handlePostClick(item)}
                          isOwner={isOwnProfile}
                          onEdit={handleEditPost}
                          onDelete={handleDeletePost}
                        />
                      ))}
                    </div>
                  )}

                  
                  

                  {showPostsAndPortfolio && activeTab === "portfolio" && (
                    <div className="grid grid-cols-3 gap-6">
                      {Object.entries(groupedPortfolio).map(
                        // The second variable from the map is named 'projectPosts'
                        ([projectTitle, projectPosts]) => (
                          <PortfolioProjectCard
                            key={projectTitle}
                            projectTitle={projectTitle}
                            // ✅ FIX: Use the correct variable 'projectPosts' which was defined in the map function above.
                            items={projectPosts}
                            // ✅ IMPROVEMENT: Set this to 'true' for clarity in the desktop view.
                            isDesktop={true}
                            onClick={() =>
                              handlePortfolioClick(projectTitle, projectPosts)
                            }
                          />
                        )
                      )}
                    </div>
                  )}

                   
                  

                  {showGigsTab && activeTab === "gigs" && (
                    <div className="grid grid-cols-1 gap-6">
                      {userGigs.map((gig) => (
                        <Card
                          key={gig._id}
                          className="bg-gray-900/60 border-gray-700/50 rounded-xl backdrop-blur-sm hover:border-green-500/30 transition-all"
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h3 className="text-xl font-semibold text-white hover:text-green-400 transition-colors">
                                    <Link href={`/dashboard/gigs/${gig._id}`}>
                                      {gig.title}
                                    </Link>
                                  </h3>
                                  {getStatusBadge(gig.status)}
                                </div>
                                <p className="text-green-300 mb-4 line-clamp-3">
                                  {gig.description || gig.projectOverview}
                                </p>
                                <div className="flex items-center gap-6 text-sm text-gray-400">
                                  <div className="flex items-center gap-1">
                                    <IndianRupee className="h-4 w-4" />
                                    {gig.budget?.toLocaleString()}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {gig.applications?.length || 0} applications
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatTimeAgo(gig.createdAt)}
                                  </div>
                                  {gig.skills && gig.skills.length > 0 && (
                                    <div className="flex gap-2">
                                      {gig.skills
                                        .slice(0, 3)
                                        .map((skill, index) => (
                                          <Badge
                                            key={index}
                                            variant="secondary"
                                            className="text-xs bg-gray-800 text-gray-300"
                                          >
                                            {skill}
                                          </Badge>
                                        ))}
                                      {gig.skills.length > 3 && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs bg-gray-800 text-gray-300"
                                        >
                                          +{gig.skills.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isOwnProfile && (
                                <div className="flex gap-2">
                                  {/* Manage Applications */}
                                  <Link
                                    href={`/dashboard/gigs/${gig._id}/applications`}
                                  >
                                    <button className="px-3 py-1 text-sm rounded-lg bg-blue-900/40 text-blue-300 hover:bg-blue-700/70 hover:text-white transition">
                                      Manage
                                    </button>
                                  </Link>

                                  {/* Edit */}
                                  <button
                                    onClick={() => handleEditGig(gig)}
                                    className="px-3 py-1 text-sm rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-green-400 transition"
                                  >
                                    Edit
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={() => handleDeleteGig(gig._id)}
                                    className="px-3 py-1 text-sm rounded-lg bg-red-900/40 text-red-300 hover:bg-red-700/70 hover:text-white transition"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Desktop Empty States */}
                  {showPostsAndPortfolio &&
                    activeTab === "posts" &&
                    posts.length === 0 && (
                      <div className="text-center py-20">
                        <div className="text-gray-500 text-xl mb-6">
                          No posts yet
                        </div>
                        <p className="text-gray-400 mb-8">
                          Share your work and connect with the community
                        </p>
                      </div>
                    )}

                  {showPostsAndPortfolio &&
                    activeTab === "portfolio" &&
                    Object.keys(groupedPortfolio).length === 0 && (
                      <div className="text-center py-20">
                        <FolderOpen className="h-20 w-20 text-gray-500 mx-auto mb-6" />
                        <div className="text-gray-500 text-xl mb-4">
                          No portfolio projects yet
                        </div>
                        <p className="text-gray-400 mb-8">
                          Showcase your best work to attract clients
                        </p>
                        {isOwnProfile && (
                          <Button
                            className="bg-green-500 hover:bg-green-600 text-black rounded-full px-8 py-3"
                            onClick={() => setShowAddProject(true)}
                          >
                            <Plus className="h-5 w-5 mr-2" />
                            Add Your First Project
                          </Button>
                        )}
                      </div>
                    )}

                  {showGigsTab && userGigs.length === 0 && (
                    <div className="text-center py-20">
                      <Briefcase className="h-20 w-20 text-gray-500 mx-auto mb-6" />
                      <div className="text-gray-500 text-xl mb-4">
                        No gigs posted yet
                      </div>
                      <p className="text-gray-400 mb-8">
                        Start posting gigs to find talented freelancers
                      </p>
                      {isOwnProfile && (
                        <Link href="/dashboard/create-gig">
                          <Button className="bg-green-500 hover:bg-green-600 text-black rounded-full px-8 py-3">
                            <Plus className="h-5 w-5 mr-2" />
                            Post Your First Gig
                          </Button>
                        </Link>
                      )}

                       
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Portfolio Modal */}
      <PortfolioModal
        isOpen={showPortfolioModal}
        onClose={() => setShowPortfolioModal(false)}
        projectTitle={selectedProject.title}
        items={selectedProject.items} // Changed from 'posts' to 'items'
      />

      {/* Tutorial Modal */}
     

       <Dialog open={showTutorialModal} onOpenChange={setShowTutorialModal}>
              <DialogContent className="max-w-3xl w-[95vw] bg-gray-900 text-white border-gray-700">
                <DialogHeader>
                  <DialogTitle>Tutorial</DialogTitle>
                </DialogHeader>
                <div className="w-full aspect-video">
                  <iframe
                    className="w-full h-full rounded-xl"
                    src="https://www.youtube.com/embed/AagCPE3kdUk?autoplay=0&rel=0&modestbranding=1"
                    title="Unjob Tutorial"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              </DialogContent>
            </Dialog>

      {/* Modals and Dialogs are now outside the conditional rendering */}
      <AddProjectModal
        isOpen={showAddProject}
        onClose={() => setShowAddProject(false)}
        onProjectAdded={(newProject) => {
          if (profile) {
            fetchUserContent(profile._id);
          }
        }}
      />
      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={profile}
        onProfileUpdated={(updatedProfile) => {
          setProfile(updatedProfile);
          setShowEditModal(false);
          toast.success("Profile updated successfully!");
        }}
      />
      {/* Edit Post Modal */}
      <EditPostModal
        isOpen={showEditPost}
        onClose={() => {
          setShowEditPost(false);
          setSelectedPost(null);
        }}
        post={selectedPost}
        onPostUpdated={handlePostUpdated}
      />

      <EditGigModal
        isOpen={showEditGigModal}
        onClose={() => {
          setShowEditGigModal(false);
          setSelectedGig(null);
        }}
        gig={selectedGig}
        onGigUpdated={handleGigUpdated}
        onGigDeleted={handleGigDeleted}
      />

      <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
        <DialogContent className="bg-white border-gray-700 text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Followers ({followers.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {followers.map((follower) => (
              <div key={follower._id} className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={follower.image} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {follower.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{follower.name}</h3>
                  <p className="text-sm text-gray-400">
                    {follower.profile?.bio}
                  </p>
                </div>

                <Link href={`/dashboard/profile/${follower._id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className=" text-green-800 hover:border-green-500 hover:text-green-400 bg-green-400"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
            {followers.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No followers yet
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
        <DialogContent className="bg-white border-gray-700 text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Following ({following.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {following.map((user) => (
              <div key={user._id} className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{user.name}</h3>
                  <p className="text-sm text-gray-400">{user.profile?.bio}</p>
                </div>
                <Link href={`/dashboard/profile/${user._id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-green-800 hover:border-green-500 hover:text-green-400 bg-green-300"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
            {following.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Not following anyone yet
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Suggested for You
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {suggestions.map((user) => (
              <div key={user._id} className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.image} />
                  <AvatarFallback className="bg-gray-700 text-white">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-medium">{user.name}</h3>
                  <p className="text-sm text-gray-400">{user.profile?.bio}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600 text-black"
                    onClick={() => {
                      // Follow user logic here
                      toast.success(`Following ${user.name}!`);
                    }}
                  >
                    Follow
                  </Button>
                  <Link href={`/profile/${user._id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-400"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {suggestions.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No suggestions available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

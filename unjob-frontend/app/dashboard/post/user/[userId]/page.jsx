"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { EditPostModal } from "@/components/profile/EditPostModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  MessageCircle,
  Share,
  ArrowLeft,
  ExternalLink,
  User,
  Send,
  ChevronLeft,
  ChevronRight,
  Video,
  Edit,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Grid3X3,
  List,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  TrendingUp,
  Eye,
} from "lucide-react";

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

export default function UserPostsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [portfolioProjects, setPortfolioProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // View states
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileReel, setShowMobileReel] = useState(false);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  const [autoReelMode, setAutoReelMode] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Filter and pagination states
  const [filters, setFilters] = useState({
    postType: "", // "", "post", "portfolio"
    category: "",
    subCategory: "",
    project: "",
    sortBy: "createdAt", // createdAt, likes, views, comments
    sortOrder: "desc", // asc, desc
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  // Video control states
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoRefs = useRef({});
  const currentVideoRef = useRef(null);
  const isMobileScrollingRef = useRef(false);
  const lastScrollTimeRef = useRef(0);
  const mobileReelTimeoutRef = useRef(null);

  // Helper function to get media info
  const getMediaInfo = (post) => {
    if (post.videos && Array.isArray(post.videos) && post.videos.length > 0) {
      return {
        url: post.videos[0],
        isVideo: true,
      };
    }

    if (post.images) {
      if (Array.isArray(post.images) && post.images.length > 0) {
        return {
          url: post.images[0],
          isVideo: false,
        };
      } else if (typeof post.images === "string") {
        return {
          url: post.images,
          isVideo: false,
        };
      }
    }

    return { url: null, isVideo: false };
  };

  // Replace the existing mobile check useEffect with this enhanced version
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      const autoReel = window.innerWidth < 600; // Auto-reel for screens smaller than 600px

      setIsMobile(mobile);
      setAutoReelMode(autoReel);

      // Clear any existing timeout
      if (mobileReelTimeoutRef.current) {
        clearTimeout(mobileReelTimeoutRef.current);
      }

      // Auto-enable reel view for very small screens with posts
      if (autoReel && posts.length > 0 && !showMobileReel) {
        // Small delay to prevent glitches during resize
        mobileReelTimeoutRef.current = setTimeout(() => {
          const postsWithMedia = posts.filter((post) => {
            const { url } = getMediaInfo(post);
            return url;
          });

          if (postsWithMedia.length > 0) {
            setCurrentMobileIndex(0);
            setShowMobileReel(true);

            // Start playing first video
            setTimeout(() => {
              const firstPost = postsWithMedia[0];
              const { isVideo } = getMediaInfo(firstPost);
              if (isVideo) {
                playCurrentVideo(firstPost._id);
              }
            }, 300);
          }
        }, 100);
      }
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
      if (mobileReelTimeoutRef.current) {
        clearTimeout(mobileReelTimeoutRef.current);
      }
    };
  }, [posts, showMobileReel]); // Add dependencies

  useEffect(() => {
    if (params.userId) {
      fetchUserPosts();
    }
  }, [params.userId, filters, pagination.page]);

  const fetchUserPosts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        includeStats: "true",
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value)
        ),
      });

      const response = await fetch(`/api/posts/users/${params.userId}`);

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setPosts(data.posts);
        setUserStats(data.userStats);
        setPortfolioProjects(data.portfolioProjects || []);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      } else {
        toast.error("Failed to fetch user posts");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching user posts:", error);
      toast.error("Failed to load user posts");
    } finally {
      setLoading(false);
    }
  };

  // Video control functions for mobile reel
  const pauseAllVideos = useCallback(() => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video && !video.paused) {
        video.pause();
      }
    });
  }, []);

  const playCurrentVideo = useCallback(
    (postId) => {
      const video = videoRefs.current[postId];
      if (video) {
        video.muted = isVideoMuted;
        video.play().catch(console.error);
        currentVideoRef.current = video;
      }
    },
    [isVideoMuted]
  );

  const toggleMute = useCallback(() => {
    setIsVideoMuted((prev) => {
      const newMutedState = !prev;

      if (currentVideoRef.current) {
        currentVideoRef.current.muted = newMutedState;
      }

      Object.values(videoRefs.current).forEach((video) => {
        if (video) {
          video.muted = newMutedState;
        }
      });

      return newMutedState;
    });
  }, []);

  const postsForReel = useMemo(() => {
    return posts.filter((post) => {
      try {
        const { url } = getMediaInfo(post);
        return url && url.length > 0;
      } catch (error) {
        console.warn("Error processing post for reel:", error);
        return false;
      }
    });
  }, [posts]);

  // Mobile scroll handling
  const handleMobileScroll = useCallback(
    (direction) => {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < 400 || isScrolling) return; // Increased debounce
      lastScrollTimeRef.current = now;
      setIsScrolling(true);

      const newIndex =
        direction === "up"
          ? Math.max(0, currentMobileIndex - 1)
          : Math.min(postsForReel.length - 1, currentMobileIndex + 1);

      if (newIndex !== currentMobileIndex) {
        pauseAllVideos();
        setCurrentMobileIndex(newIndex);

        const newPost = postsForReel[newIndex];
        setTimeout(() => {
          const { isVideo } = getMediaInfo(newPost);
          if (isVideo) {
            playCurrentVideo(newPost._id);
          }
        }, 150);
      }

      // Reset scrolling flag
      setTimeout(() => {
        setIsScrolling(false);
      }, 300);
    },
    [
      currentMobileIndex,
      postsForReel,
      pauseAllVideos,
      playCurrentVideo,
      isScrolling,
    ]
  );
  const handleTouchMove = (e) => {
    if (isScrolling) return;

    const currentY = e.touches[0].clientY;
    const diff = touchStartY - currentY;
    const threshold = 80; // Increased threshold for better control

    if (Math.abs(diff) > threshold) {
      e.preventDefault(); // Prevent default scrolling
      handleMobileScroll(diff > 0 ? "down" : "up");
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(0);
  };

  // Modified close function to handle auto-reel mode
  const closeMobileView = () => {
    pauseAllVideos();
    setShowMobileReel(false);
    currentVideoRef.current = null;

    // If in auto-reel mode (screen < 600px), re-enable after a short delay
    if (autoReelMode && posts.length > 0) {
      setTimeout(() => {
        setCurrentMobileIndex(0);
        setShowMobileReel(true);

        const firstPostWithMedia = postsForReel[0];
        if (firstPostWithMedia) {
          const { isVideo } = getMediaInfo(firstPostWithMedia);
          if (isVideo) {
            playCurrentVideo(firstPostWithMedia._id);
          }
        }
      }, 1000);
    }
  };

  // Like functionality
  const handleLike = async (postId) => {
    if (!session?.user?.id) return toast.error("Please log in to like posts");
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      });
      if (response.ok) {
        const { post: updatedPost } = await response.json();
        setPosts((prev) =>
          prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
        );
        toast.success("Post liked!");
      }
    } catch (error) {
      console.error("Error liking post:", error);
      toast.error("Failed to like post");
    }
  };
  // Comment functionality
  const handleComment = async (postId) => {
    if (!commentText.trim()) return;
    if (!session?.user?.id) return toast.error("Please log in to comment");
    try {
      const response = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      if (response.ok) {
        const { post: updatedPost } = await response.json();
        setPosts((prev) =>
          prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
        );
        setCommentText("");
        setShowCommentModal(false);
        toast.success("Comment added!");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };
  // Delete functionality
  const handleDelete = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setPosts((prev) => prev.filter((p) => p._id !== postId));
        toast.success("Post deleted successfully!");
        fetchUserPosts(); // Refresh to update stats
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };
  // Edit functionality
  const handleEdit = (post) => {
    setEditingPost(post);
    setShowEditModal(true);
  };
  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
    setShowEditModal(false);
    setEditingPost(null);
  };
  const toggleDescription = (postId) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };
  const handleMobileCommentClick = (e, post) => {
    e.stopPropagation();
    setShowCommentModal(true);
  };
  const navigateToProfile = (userId, e) => {
    if (e) e.stopPropagation();
    router.push(`/dashboard/profile/${userId}`);
  };
  // 1. Add the missing handleTouchStart function (you're missing this)
  const handleTouchStart = (e) => {
    setTouchStartY(e.touches[0].clientY);
  };
  // 2. Add keyboard navigation support (completely missing)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showMobileReel) {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            handleMobileScroll("up");
            break;
          case "ArrowDown":
            e.preventDefault();
            handleMobileScroll("down");
            break;
          case "Escape":
            if (!autoReelMode) {
              closeMobileView();
            }
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showMobileReel, handleMobileScroll, autoReelMode]);
  // 3. Add wheel event for desktop testing (missing)
  const handleWheel = useCallback(
    (e) => {
      if (!isMobile && showMobileReel) {
        e.preventDefault();
        const direction = e.deltaY > 0 ? "down" : "up";
        handleMobileScroll(direction);
      }
    },
    [isMobile, showMobileReel, handleMobileScroll]
  );
  // 4. Add wheel event listener (missing)
  useEffect(() => {
    if (showMobileReel) {
      const handleWheelEvent = (e) => handleWheel(e);
      window.addEventListener("wheel", handleWheelEvent, { passive: false });
      return () => {
        window.removeEventListener("wheel", handleWheelEvent);
      };
    }
  }, [showMobileReel, handleWheel]);
  // 5. Update your handlePostClick function to respect auto-reel mode
  const handlePostClick = (post, index) => {
    if (isMobile) {
      // If already in auto-reel mode, just navigate to the clicked post
      if (autoReelMode && showMobileReel) {
        const reelIndex = postsForReel.findIndex((p) => p._id === post._id);
        if (reelIndex !== -1) {
          pauseAllVideos();
          setCurrentMobileIndex(reelIndex);

          setTimeout(() => {
            const { isVideo } = getMediaInfo(post);
            if (isVideo) {
              playCurrentVideo(post._id);
            }
          }, 150);
        }
        return;
      }
      // Original mobile logic for manual reel activation
      const postsWithMedia = posts.filter((p) => {
        const { url } = getMediaInfo(p);
        return url;
      });
      const reelIndex = postsWithMedia.findIndex((p) => p._id === post._id);
      if (reelIndex !== -1) {
        setCurrentMobileIndex(reelIndex);
        setShowMobileReel(true);
        setTimeout(() => {
          const { isVideo } = getMediaInfo(post);
          if (isVideo) {
            playCurrentVideo(post._id);
          }
        }, 200);
      }
    } else {
      router.push(`/dashboard/post/${post._id}`);
    }
  };
  // 6. Add visual indicator for auto-reel mode (optional but helpful)
  // Add this just before the closing </div> of your main return statement
  {
    autoReelMode && !showMobileReel && (
      <div className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-3 py-1 rounded-full text-sm">
        Auto-Reel Mode
      </div>
    );
  }
  // 7. Fix the mobile check useEffect dependency issue
  // Your current useEffect has a dependency issue that could cause infinite loops
  // Replace your current mobile check useEffect with this fixed version:
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      const autoReel = window.innerWidth < 600; // Auto-reel for screens smaller than 600px
      setIsMobile(mobile);
      setAutoReelMode(autoReel);
      // Clear any existing timeout
      if (mobileReelTimeoutRef.current) {
        clearTimeout(mobileReelTimeoutRef.current);
      }
      // Auto-enable reel view for very small screens with posts
      if (autoReel && posts.length > 0 && !showMobileReel) {
        // Small delay to prevent glitches during resize
        mobileReelTimeoutRef.current = setTimeout(() => {
          const postsWithMedia = posts.filter((post) => {
            const { url } = getMediaInfo(post);
            return url;
          });
          if (postsWithMedia.length > 0) {
            setCurrentMobileIndex(0);
            setShowMobileReel(true);
            // Start playing first video
            setTimeout(() => {
              const firstPost = postsWithMedia[0];
              const { isVideo } = getMediaInfo(firstPost);
              if (isVideo) {
                playCurrentVideo(firstPost._id);
              }
            }, 300);
          }
        }, 100);
      }
    };
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => {
      window.removeEventListener("resize", checkIsMobile);
      if (mobileReelTimeoutRef.current) {
        clearTimeout(mobileReelTimeoutRef.current);
      }
    };
  }, [posts.length, showMobileReel, playCurrentVideo]); // Fixed dependencies
  // Filter handlers
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // Reset subcategory if category changes
      ...(key === "category" ? { subCategory: "" } : {}),
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const clearFilters = () => {
    setFilters({
      postType: "",
      category: "",
      subCategory: "",
      project: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  // Pagination handlers
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Like Check / Ownership
  const hasUserLiked = (post) =>
    post?.likes?.some((l) => l?.user?._id === session?.user?.id);
  const isOwnPost = (post) => post?.author?._id === session?.user?.id;
  // Mobile Full-Screen Reel View - FIXED: Show only current post
  if (isMobile && showMobileReel && postsForReel.length > 0) {
    const currentReelPost = postsForReel[currentMobileIndex];
    if (!currentReelPost) return null;
    const { url: mediaUrl, isVideo } = getMediaInfo(currentReelPost);
    const isDescriptionExpanded = expandedDescriptions[currentReelPost._id];
    const shouldTruncate =
      currentReelPost.description && currentReelPost.description.length > 100;
    return (
      <div className="fixed inset-0 bg-black z-50 overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: "none" }} // Prevent default touch behaviors
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMobileView}
                className="text-white hover:bg-white/20 mt-12"
              >
                <ArrowLeft className="h-8 w-8" />
              </Button>
            </div>

            {/* Mute/Unmute Button - only show for videos */}
            {isVideo && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20 mt-12 bg-black/40 rounded-full"
              >
                {isVideoMuted ? (
                  <VolumeX className="h-6 w-6" />
                ) : (
                  <Volume2 className="h-6 w-6" />
                )}
              </Button>
            )}
          </div>

          {/* Media Content */}
          <div className="flex-1 flex items-center justify-center relative bg-black">
            {mediaUrl && (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                {isVideo ? (
                  <video
                    ref={(el) => {
                      if (el) {
                        videoRefs.current[currentReelPost._id] = el;
                      }
                    }}
                    src={mediaUrl}
                    className="max-w-full max-h-full object-contain bg-black"
                    style={{
                      width: "auto",
                      height: "auto",
                      maxWidth: "100vw",
                      maxHeight: "100vh",
                    }}
                    autoPlay
                    loop
                    playsInline
                    muted={isVideoMuted}
                    onLoadedData={(e) => {
                      const video = e.target;
                      const videoAspectRatio =
                        video.videoWidth / video.videoHeight;
                      const screenAspectRatio =
                        window.innerWidth / window.innerHeight;

                      if (videoAspectRatio > screenAspectRatio) {
                        video.style.width = "100vw";
                        video.style.height = "auto";
                        video.style.maxHeight = "100vh";
                      } else {
                        video.style.height = "100vh";
                        video.style.width = "auto";
                        video.style.maxWidth = "100vw";
                      }

                      video.style.objectFit = "contain";
                      video.style.backgroundColor = "black";
                      playCurrentVideo(currentReelPost._id);
                    }}
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={currentReelPost.title}
                    className="max-w-full max-h-full object-contain bg-black"
                    style={{
                      width: "auto",
                      height: "auto",
                      maxWidth: "100vw",
                      maxHeight: "100vh",
                      backgroundColor: "black",
                    }}
                    onLoad={(e) => {
                      const img = e.target;
                      const imageAspectRatio =
                        img.naturalWidth / img.naturalHeight;
                      const screenAspectRatio =
                        window.innerWidth / window.innerHeight;

                      if (imageAspectRatio > screenAspectRatio) {
                        img.style.width = "100vw";
                        img.style.height = "auto";
                        img.style.maxHeight = "100vh";
                      } else {
                        img.style.height = "100vh";
                        img.style.width = "auto";
                        img.style.maxWidth = "100vw";
                      }

                      img.style.objectFit = "contain";
                      img.style.backgroundColor = "black";
                    }}
                  />
                )}

                {/* Actions Sidebar */}
                <div className="absolute right-4 bottom-32 flex flex-col gap-6 z-20 mb-12">
                  {/* Like Button */}
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLike(currentReelPost._id)}
                      className="text-white hover:bg-white/20 bg-black/40 rounded-full p-3"
                    >
                      <Heart
                        className={cn(
                          "h-7 w-7",
                          hasUserLiked(currentReelPost)
                            ? "text-red-500 fill-red-500"
                            : "text-white"
                        )}
                      />
                    </Button>
                    <span
                      className={cn(
                        "text-sm font-bold text-white",
                        hasUserLiked(currentReelPost) ? "text-red-500" : ""
                      )}
                    >
                      {currentReelPost.likes?.length || 0}
                    </span>
                  </div>

                  {/* Comment Button */}
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) =>
                        handleMobileCommentClick(e, currentReelPost)
                      }
                      className="text-white hover:bg-white/20 bg-black/40 rounded-full p-3"
                    >
                      <MessageCircle className="h-7 w-7" />
                    </Button>
                    <span className="text-white text-sm font-bold">
                      {currentReelPost.comments?.length || 0}
                    </span>
                  </div>

                  {/* Edit and Delete buttons - only for post owner */}
                  {isOwnPost(currentReelPost) && (
                    <>
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Pause video if playing
                            pauseAllVideos();
                            // Set the editing post and show modal
                            setEditingPost(currentReelPost);
                            setShowEditModal(true);
                          }}
                          className="text-white hover:bg-white/20 bg-black/40 rounded-full p-3"
                        >
                          <Edit className="h-6 w-6" />
                        </Button>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(currentReelPost._id);
                          }}
                          className="text-white hover:bg-white/20 bg-red-500/40 rounded-full p-3"
                        >
                          <Trash2 className="h-6 w-6" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-6 mb-16">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) =>
                        navigateToProfile(currentReelPost.author?._id, e)
                      }
                      className="flex-shrink-0"
                    >
                      <Avatar className="h-12 w-12 ring-2 ring-white/30">
                        <AvatarImage src={currentReelPost.author?.image} />
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                          {currentReelPost.author?.name?.charAt(0) || (
                            <User className="h-6 w-6" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <button
                          onClick={(e) =>
                            navigateToProfile(currentReelPost.author?._id, e)
                          }
                          className="text-white font-semibold text-base hover:text-white/80 transition-colors"
                        >
                          {currentReelPost.author?.name || "Anonymous"}
                        </button>
                      </div>

                      <div className="mb-2 font-medium text-white">
                        {currentReelPost.title}
                      </div>

                      <div className="space-y-2">
                        <p
                          className={cn(
                            "text-white text-sm leading-relaxed break-words",
                            !isDescriptionExpanded && shouldTruncate
                              ? "line-clamp-2"
                              : ""
                          )}
                        >
                          {currentReelPost.description}
                        </p>

                        {shouldTruncate && (
                          <button
                            onClick={() =>
                              toggleDescription(currentReelPost._id)
                            }
                            className="text-white/70 text-sm font-medium hover:text-white transition-colors"
                          >
                            {isDescriptionExpanded ? "Show less" : "more"}
                          </button>
                        )}

                        {currentReelPost.tags &&
                          currentReelPost.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {currentReelPost.tags
                                .slice(0, 3)
                                .map((tag, i) => (
                                  <span
                                    key={i}
                                    className="text-blue-300 text-sm font-medium"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              {currentReelPost.tags.length > 3 && (
                                <span className="text-white/60 text-sm">
                                  +{currentReelPost.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                        <p className="text-white/60 text-xs">
                          {new Date(
                            currentReelPost.createdAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Comment Modal */}
        {showCommentModal && (
          <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
            <DialogContent className="bg-white border-gray-800 text-black max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Comment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Write your comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="bg-gray-100 border-gray-700 text-black placeholder-gray-400"
                  rows={4}
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    onClick={() => setShowCommentModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleComment(currentReelPost._id)}
                    disabled={!commentText.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                  >
                    Post Comment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Post Modal */}
        {showEditModal && editingPost && (
          <EditPostModal
            post={editingPost}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setEditingPost(null);
            }}
            onPostUpdated={handlePostUpdated}
          />
        )}
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-gradient-to-r from-green-500 to-emerald-500"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
        </div>
      </div>

      {/* User Profile Header */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Posts Display */}
        {posts.length > 0 ? (
          <div className="space-y-6">
            {viewMode === "grid" ? (
              <ResponsiveMasonry
                columnsCountBreakPoints={{
                  350: 1,
                  750: 2,
                  900: 3,
                  1200: 4,
                }}
              >
                <Masonry gutter="16px">
                  {posts.map((post, index) => {
                    const { url: mediaUrl, isVideo } = getMediaInfo(post);
                    return (
                      <Card
                        key={post._id}
                        className="bg-gray-900 border-gray-800 cursor-pointer hover:border-green-500/50 transition-all group overflow-hidden"
                        onClick={() => handlePostClick(post, index)}
                      >
                        {mediaUrl && (
                          <div className="relative overflow-hidden">
                            {isVideo ? (
                              <video
                                src={mediaUrl}
                                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                                muted
                              />
                            ) : (
                              <img
                                src={mediaUrl}
                                alt={post.title}
                                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            )}
                            {isVideo && (
                              <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                                <Video className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                        <CardContent className="p-4">
                          <h4 className="text-white font-medium mb-2 line-clamp-2 leading-tight">
                            {post.title}
                          </h4>
                          {post.description && (
                            <p className="text-gray-400 text-sm mb-3 line-clamp-3 leading-relaxed">
                              {post.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                <span>{post.likes?.length || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="h-3 w-3" />
                                <span>{post.comments?.length || 0}</span>
                              </div>
                              {post.stats?.viewsCount && (
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  <span>{post.stats.viewsCount}</span>
                                </div>
                              )}
                            </div>
                            <span className="text-gray-400 text-xs">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {/* Post Type Badge */}
                          {post.postType === "portfolio" && (
                            <Badge className="mt-2 bg-purple-500/20 text-purple-400 border-purple-500/30">
                              Portfolio
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Masonry>
              </ResponsiveMasonry>
            ) : (
              // List View
              <div className="space-y-4">
                {posts.map((post, index) => {
                  const { url: mediaUrl, isVideo } = getMediaInfo(post);
                  return (
                    <Card
                      key={post._id}
                      className="bg-gray-900 border-gray-800 cursor-pointer hover:border-green-500/50 transition-all"
                      onClick={() => handlePostClick(post, index)}
                    >
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* Media */}
                          {mediaUrl && (
                            <div className="w-48 h-32 flex-shrink-0 relative overflow-hidden">
                              {isVideo ? (
                                <video
                                  src={mediaUrl}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              ) : (
                                <img
                                  src={mediaUrl}
                                  alt={post.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {isVideo && (
                                <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                                  <Video className="h-4 w-4 text-white" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-white font-medium mb-2 line-clamp-2">
                                  {post.title}
                                </h4>
                                {post.description && (
                                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                                    {post.description}
                                  </p>
                                )}

                                {/* Stats */}
                                <div className="flex items-center gap-6 text-xs text-gray-400 mb-2">
                                  <div className="flex items-center gap-1">
                                    <Heart className="h-3 w-3" />
                                    <span>{post.likes?.length || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="h-3 w-3" />
                                    <span>{post.comments?.length || 0}</span>
                                  </div>
                                  {post.stats?.viewsCount && (
                                    <div className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" />
                                      <span>{post.stats.viewsCount}</span>
                                    </div>
                                  )}
                                  <span>
                                    {new Date(
                                      post.createdAt
                                    ).toLocaleDateString()}
                                  </span>
                                </div>

                                {/* Tags */}
                                {post.tags && post.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {post.tags.slice(0, 3).map((tag, i) => (
                                      <Badge
                                        key={i}
                                        variant="secondary"
                                        className="bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                                      >
                                        #{tag}
                                      </Badge>
                                    ))}
                                    {post.tags.length > 3 && (
                                      <span className="text-gray-400 text-xs">
                                        +{post.tags.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Actions for owner */}
                              {isOwnPost(post) && (
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(post);
                                    }}
                                    className="text-gray-400 hover:text-white hover:bg-gray-800 h-8 w-8"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(post._id);
                                    }}
                                    className="text-gray-400 hover:text-red-400 hover:bg-gray-800 h-8 w-8"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Post Type Badge */}
                            {post.postType === "portfolio" && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                Portfolio
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="ghost"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={
                            pagination.page === pageNum ? "default" : "ghost"
                          }
                          onClick={() => handlePageChange(pageNum)}
                          className={cn(
                            "w-10 h-10",
                            pagination.page === pageNum
                              ? "bg-green-600 hover:bg-green-700"
                              : "text-gray-400 hover:text-white"
                          )}
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="text-gray-400 hover:text-white"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-8">
              <h3 className="text-xl font-semibold mb-2">No posts found</h3>
              <p className="text-gray-400 mb-4">
                {filters.postType || filters.category || filters.project
                  ? "No posts match your current filters."
                  : "This user hasn't posted anything yet."}
              </p>
              {(filters.postType || filters.category || filters.project) && (
                <Button
                  onClick={clearFilters}
                  className="bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Post Modal */}
      {showEditModal && editingPost && (
        <EditPostModal
          post={editingPost}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingPost(null);
          }}
          onPostUpdated={handlePostUpdated}
        />
      )}
    </div>
  );
}

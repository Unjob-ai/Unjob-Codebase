"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { useFollowState } from "@/hooks/useFollowState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share,
  ExternalLink,
  User,
  Send,
  Video,
  Volume2,
  VolumeX,
  Eye,
  Calendar,
  Tag,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Briefcase,
  Users,
  MapPin,
  DollarSign,
  Clock,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();

  // Project specific states
  const [projectPosts, setProjectPosts] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Reel functionality states
  const [expandedPost, setExpandedPost] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  // Invite to Gig modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [gigFormData, setGigFormData] = useState({
    title: "",
    description: "",
    budget: "",
    deadline: "",
    location: "",
    requirements: "",
  });
  const [sendingInvite, setSendingInvite] = useState(false);

  // FIXED MOBILE SCROLL REFS
  const videoRefs = useRef({});
  const currentVideoRef = useRef(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const isScrolling = useRef(false);
  const scrollCooldown = useRef(false);
  const mobileContainerRef = useRef(null);

  const { followingUsers, followLoading, handleFollow } = useFollowState();

  // Decode the project title from URL
  const projectTitle = decodeURIComponent(params.projectTitle);

  // Helper function to get media URL and type
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

  // Check if mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  useEffect(() => {
    fetchProjectData();
  }, [projectTitle]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/portfolio?project=${encodeURIComponent(projectTitle)}`
      );
      if (response.ok) {
        const data = await response.json();
        setProjectPosts(data.portfolio?.items || []);
        setProjectInfo(data.project || { title: projectTitle });
      }
    } catch (error) {
      console.error("Error fetching project data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Video control functions
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
        video.muted = isMuted;
        video.play().catch(console.error);
        currentVideoRef.current = video;
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
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

  // Get unique tags for filtering
  const allTags = [...new Set(projectPosts.flatMap((post) => post.tags || []))];

  // Filter posts based on selected tag
  const filteredPosts =
    selectedFilter === "all"
      ? projectPosts
      : projectPosts.filter((post) => post.tags?.includes(selectedFilter));

  const toggleDescription = (postId) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Handle post interactions
  const handleLike = async (postId) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      });
      if (response.ok) {
        const { post } = await response.json();
        setProjectPosts((prevPosts) =>
          prevPosts.map((p) => (p._id === postId ? post : p))
        );
        if (expandedPost?._id === postId) {
          setExpandedPost(post);
        }
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleComment = async (postId) => {
    if (!commentText.trim()) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });

      if (response.ok) {
        const { post } = await response.json();
        setProjectPosts((prevPosts) =>
          prevPosts.map((p) => (p._id === postId ? post : p))
        );
        if (expandedPost?._id === postId) {
          setExpandedPost(post);
        }
        setCommentText("");
        setShowCommentModal(false);
        toast.success("Comment added!");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handlePostClick = (post, index) => {
    if (isMobile) {
      setExpandedPost(post);
      setCurrentMobileIndex(index);
      pauseAllVideos();
      setTimeout(() => {
        const { isVideo } = getMediaInfo(post);
        if (isVideo) {
          playCurrentVideo(post._id);
        }
      }, 100);
    } else {
      router.push(`/dashboard/post/${post._id}`);
    }
  };

  const handleMobileCommentClick = (e, post) => {
    e.stopPropagation();
    setExpandedPost(post);
    setShowCommentModal(true);
  };

  const navigateToProfile = (userId, e) => {
    if (e) e.stopPropagation();
    router.push(`/dashboard/profile/${userId}`);
  };

  // FIXED MOBILE SCROLL HANDLER
  const handleMobileScroll = useCallback(
    (direction) => {
      if (scrollCooldown.current || isScrolling.current) {
        return;
      }

      isScrolling.current = true;
      scrollCooldown.current = true;

      const newIndex =
        direction === "down"
          ? Math.min(filteredPosts.length - 1, currentMobileIndex + 1)
          : Math.max(0, currentMobileIndex - 1);

      if (newIndex !== currentMobileIndex) {
        pauseAllVideos();
        setCurrentMobileIndex(newIndex);
        const newPost = filteredPosts[newIndex];
        setExpandedPost(newPost);

        setTimeout(() => {
          const { isVideo } = getMediaInfo(newPost);
          if (isVideo) {
            playCurrentVideo(newPost._id);
          }
        }, 300);
      }

      setTimeout(() => {
        isScrolling.current = false;
      }, 300);

      setTimeout(() => {
        scrollCooldown.current = false;
      }, 500);
    },
    [currentMobileIndex, filteredPosts, pauseAllVideos, playCurrentVideo]
  );

  // FIXED TOUCH HANDLERS
  const handleTouchStart = useCallback((e) => {
    if (isScrolling.current) {
      e.preventDefault();
      return;
    }

    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchMove = useCallback((e) => {
    // Prevent default scrolling behavior
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (isScrolling.current) {
        e.preventDefault();
        return;
      }

      const touchEndY = e.changedTouches[0].clientY;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndTime = Date.now();

      const deltaY = touchStartY.current - touchEndY;
      const deltaX = touchStartX.current - touchEndX;
      const deltaTime = touchEndTime - touchStartTime.current;

      // Check if it's primarily a horizontal swipe (which we want to ignore)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        // This is a horizontal swipe, ignore it to prevent back navigation
        return;
      }

      // Only process vertical swipes
      const minSwipeDistance = 80;
      const maxSwipeTime = 500;
      const minSwipeTime = 100;

      if (
        Math.abs(deltaY) > minSwipeDistance &&
        deltaTime > minSwipeTime &&
        deltaTime < maxSwipeTime &&
        Math.abs(deltaY) > Math.abs(deltaX) // Ensure it's more vertical than horizontal
      ) {
        const direction = deltaY > 0 ? "down" : "up";
        handleMobileScroll(direction);
      }
    },
    [handleMobileScroll]
  );

  const closeMobileView = () => {
    pauseAllVideos();
    setExpandedPost(null);
    setCurrentMobileIndex(0);
    currentVideoRef.current = null;
  };

  // Invite to Gig functionality
  const handleInviteToGig = () => {
    setShowInviteModal(true);
  };

  const handleGigFormChange = (field, value) => {
    setGigFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSendInvite = async () => {
    if (!gigFormData.title.trim() || !gigFormData.description.trim()) {
      toast.error("Please fill in the required fields");
      return;
    }

    setSendingInvite(true);
    try {
      // Here you would make an API call to send the invite
      const response = await fetch("/api/gigs/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...gigFormData,
          projectTitle,
          authorId: projectPosts[0]?.author?._id, // Assuming all posts are from same author
        }),
      });

      if (response.ok) {
        toast.success("Gig invitation sent successfully!");
        setShowInviteModal(false);
        setGigFormData({
          title: "",
          description: "",
          budget: "",
          deadline: "",
          location: "",
          requirements: "",
        });
      } else {
        toast.error("Failed to send invite");
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Failed to send invite");
    } finally {
      setSendingInvite(false);
    }
  };

  const hasUserLiked = (post) => {
    return post?.likes?.some((l) => l?.user?._id === session?.user?.id);
  };

  const isOwnPost = (post) => {
    return post?.author?._id === session?.user?.id;
  };

  // Get project author (assuming all posts are from same author)
  const projectAuthor = projectPosts[0]?.author;
  const isOwnProject = projectAuthor?._id === session?.user?.id;

  // FIXED MOBILE FULL-SCREEN REEL VIEW
  if (isMobile && expandedPost && !showCommentModal) {
    return (
      <div
        className="fixed inset-0 bg-black z-50 overflow-hidden"
        style={{ touchAction: "none" }}
      >
        <div
          ref={mobileContainerRef}
          className="relative w-full h-full"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: "none" }}
        >
          {filteredPosts.map((post, index) => {
            const { url: mediaUrl, isVideo } = getMediaInfo(post);
            const isCurrentPost = index === currentMobileIndex;
            const isDescriptionExpanded = expandedDescriptions[post._id];
            const shouldTruncate =
              post.description && post.description.length > 100;
            const isFollowing = followingUsers.has(post.author?._id);
            const isLoadingFollow = followLoading.has(post.author?._id);
            const isOwnProfile = post.author?._id === session?.user?.id;

            return (
              <div
                key={post._id}
                className={cn(
                  "absolute inset-0 w-full h-full flex flex-col transition-transform duration-300 ease-out",
                  {
                    "translate-y-0": isCurrentPost,
                    "translate-y-full": index > currentMobileIndex,
                    "-translate-y-full": index < currentMobileIndex,
                  }
                )}
                style={{ touchAction: "none" }}
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

                  {/* Project Badge */}
                  <div className="mt-12">
                    <Badge className="bg-[#04aa46] text-white">
                      {projectTitle}
                    </Badge>
                  </div>

                  {/* Invite to Gig Button for Mobile */}
                  {!isOwnProfile && (
                    <Button
                      onClick={handleInviteToGig}
                      size="sm"
                      className="mt-12 bg-[#04aa46] text-white hover:bg-[#04aa46]/80"
                    >
                      <Briefcase className="h-4 w-4 mr-1" />
                      Invite
                    </Button>
                  )}

                  {/* Mute/Unmute Button - only show for videos */}
                  {isCurrentPost && isVideo && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20 mt-12 bg-black/40 rounded-full ml-2"
                    >
                      {isMuted ? (
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
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        {isVideo ? (
                          <video
                            ref={(el) => {
                              if (el) {
                                videoRefs.current[post._id] = el;
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
                            autoPlay={isCurrentPost}
                            loop
                            playsInline
                            muted={isMuted}
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

                              if (isCurrentPost) {
                                playCurrentVideo(post._id);
                              }
                            }}
                          />
                        ) : (
                          <img
                            src={mediaUrl}
                            alt={post.title}
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
                          <div className="flex flex-col items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleLike(post._id)}
                              className="text-white hover:bg-white/20 bg-black/40 rounded-full p-3"
                            >
                              <Heart
                                className={cn(
                                  "h-7 w-7",
                                  hasUserLiked(post)
                                    ? "text-red-500 fill-red-500"
                                    : "text-white"
                                )}
                              />
                            </Button>
                            <span
                              className={cn(
                                "text-sm font-bold text-white",
                                hasUserLiked(post) ? "text-red-500" : ""
                              )}
                            >
                              {post.likes?.length || 0}
                            </span>
                          </div>

                          <div className="flex flex-col items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleMobileCommentClick(e, post)}
                              className="text-white hover:bg-white/20 bg-black/40 rounded-full p-3"
                            >
                              <MessageCircle className="h-7 w-7" />
                            </Button>
                            <span className="text-white text-sm font-bold">
                              {post.comments?.length || 0}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-6 mb-16">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={(e) =>
                                navigateToProfile(post.author?._id, e)
                              }
                              className="flex-shrink-0"
                            >
                              <Avatar className="h-12 w-12 ring-2 ring-white/30">
                                <AvatarImage src={post.author?.image} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                                  {post.author?.name?.charAt(0) || (
                                    <User className="h-6 w-6" />
                                  )}
                                </AvatarFallback>
                              </Avatar>
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <button
                                  onClick={(e) =>
                                    navigateToProfile(post.author?._id, e)
                                  }
                                  className="text-white font-semibold text-base hover:text-white/80 transition-colors"
                                >
                                  {post.author?.name || "Anonymous"}
                                </button>

                                {!isOwnProfile && (
                                  <Button
                                    onClick={(e) =>
                                      handleFollow(post.author?._id, e)
                                    }
                                    disabled={isLoadingFollow}
                                    size="sm"
                                    className={cn(
                                      "font-medium px-4 py-1 text-sm transition-all",
                                      isFollowing
                                        ? "bg-transparent border border-white/50 text-white hover:bg-white/10"
                                        : "bg-white text-black hover:bg-white/90"
                                    )}
                                  >
                                    {isLoadingFollow ? (
                                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : isFollowing ? (
                                      "Following"
                                    ) : (
                                      "Follow"
                                    )}
                                  </Button>
                                )}
                              </div>

                              <div className="mb-2 font-medium text-white">
                                {post.title}
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
                                  {post.description}
                                </p>

                                {shouldTruncate && (
                                  <button
                                    onClick={() => toggleDescription(post._id)}
                                    className="text-white/70 text-sm font-medium hover:text-white transition-colors"
                                  >
                                    {isDescriptionExpanded
                                      ? "Show less"
                                      : "more"}
                                  </button>
                                )}

                                {post.tags && post.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {post.tags.slice(0, 3).map((tag, i) => (
                                      <span
                                        key={i}
                                        className="text-blue-300 text-sm font-medium"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                    {post.tags.length > 3 && (
                                      <span className="text-white/60 text-sm">
                                        +{post.tags.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}

                                <p className="text-white/60 text-xs">
                                  {new Date(
                                    post.createdAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#04aa46] mx-auto mb-4"></div>
          <p className="text-[#646464]">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-lg border-b border-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.back()}
              variant="ghost"
              className="text-white hover:text-[#04aa46] hover:bg-transparent"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Profile
            </Button>

            <div className="flex items-center gap-4">
              {/* Invite to Gig Button for Desktop */}
              {!isMobile && !isOwnProject && projectAuthor && (
                <Button
                  onClick={handleInviteToGig}
                  className="bg-[#04aa46] text-white hover:bg-[#04aa46]/80"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Invite to Gig
                </Button>
              )}

              {/* Filter Tags */}
              {allTags.length > 0 && (
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant={selectedFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedFilter("all")}
                    className={
                      selectedFilter === "all"
                        ? "bg-[#04aa46] hover:bg-[#04aa46]/80"
                        : "border-gray-700 text-[#646464] hover:text-white"
                    }
                  >
                    All
                  </Button>
                  {allTags.slice(0, 4).map((tag) => (
                    <Button
                      key={tag}
                      variant={selectedFilter === tag ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter(tag)}
                      className={
                        selectedFilter === tag
                          ? "bg-[#04aa46] hover:bg-[#04aa46]/80"
                          : "border-gray-700 text-[#646464] hover:text-white"
                      }
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project Header */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">{projectTitle}</h1>
     
          {projectInfo?.description && (
            <p className="text-[#646464] mt-4 max-w-3xl">
              {projectInfo.description}
            </p>
          )}
        </div>

        {/* Mobile Filter Tags */}
        {allTags.length > 0 && isMobile && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <Button
              variant={selectedFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("all")}
              className={
                selectedFilter === "all"
                  ? "bg-[#04aa46] hover:bg-[#04aa46]/80 whitespace-nowrap"
                  : "border-gray-700 text-[#646464] hover:text-white whitespace-nowrap"
              }
            >
              All
            </Button>
            {allTags.map((tag) => (
              <Button
                key={tag}
                variant={selectedFilter === tag ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(tag)}
                className={
                  selectedFilter === tag
                    ? "bg-[#04aa46] hover:bg-[#04aa46]/80 whitespace-nowrap"
                    : "border-gray-700 text-[#646464] hover:text-white whitespace-nowrap"
                }
              >
                {tag}
              </Button>
            ))}
          </div>
        )}

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[#646464] text-xl mb-4">No posts found</div>
            <p className="text-[#646464]">
              {selectedFilter === "all"
                ? "This project doesn't have any posts yet."
                : `No posts found with the tag "${selectedFilter}".`}
            </p>
          </div>
        ) : (
          /* Pinterest-style Masonry Grid */
          <ResponsiveMasonry
            columnsCountBreakPoints={{
              350: 1,
              640: 2,
              900: 3,
              1200: 4,
            }}
          >
            <Masonry gutter="16px">
              {filteredPosts.map((post, index) => {
                const { url: mediaUrl, isVideo } = getMediaInfo(post);

                if (!mediaUrl) return null;

                return (
                  <div key={post._id} className="w-full mb-4">
                    <Card
                      className="bg-gray-900/50 border border-gray-800 shadow-lg transition-all cursor-pointer overflow-hidden break-inside-avoid w-full hover:border-[#04aa46]/30 hover:scale-[1.02] group"
                      onClick={() => handlePostClick(post, index)}
                    >
                      <CardContent className="p-0 relative">
                        {/* Media Section */}
                        <div className="w-full relative overflow-hidden rounded-t-lg">
                          {isVideo ? (
                            <video
                              src={mediaUrl}
                              alt={post.title}
                              className="w-full h-auto object-cover bg-transparent block"
                              loop
                              playsInline
                              preload="metadata"
                              muted
                            />
                          ) : (
                            <img
                              src={mediaUrl}
                              alt={post.title}
                              className="w-full h-auto object-cover bg-transparent block"
                              loading="lazy"
                            />
                          )}

                          {/* Video indicator */}
                          {isVideo && (
                            <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                              <Video className="h-4 w-4 text-white" />
                            </div>
                          )}

                          {/* Mobile overlay */}
                          {isMobile && (
                            <div className="absolute inset-0 bg-black/60 p-3 flex flex-col justify-end opacity-0 group-active:opacity-100 transition-opacity">
                              <div className="flex items-center justify-between text-white text-sm mb-2">
                                <span className="font-medium">
                                  {post.author?.name || "Anonymous"}
                                </span>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1">
                                    <Heart
                                      className={cn(
                                        "h-4 w-4",
                                        hasUserLiked(post)
                                          ? "text-red-500 fill-red-500"
                                          : "text-red-400"
                                      )}
                                    />
                                    <span
                                      className={
                                        hasUserLiked(post)
                                          ? "text-red-500 font-bold"
                                          : ""
                                      }
                                    >
                                      {post.likes?.length || 0}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedPost(post);
                                      setShowCommentModal(true);
                                    }}
                                    className="flex items-center gap-1 hover:text-blue-400"
                                  >
                                    <MessageCircle className="h-4 w-4 text-blue-400" />
                                    <span>{post.comments?.length || 0}</span>
                                  </button>
                                </div>
                              </div>

                              <div>
                                <h3 className="text-white font-bold text-sm line-clamp-2 mb-1">
                                  {post.title}
                                </h3>
                                <p className="text-gray-300 text-xs line-clamp-2 mb-2">
                                  {post.description}
                                </p>
                                {post.category && (
                                  <Badge className="inline-block bg-gradient-to-r from-[#04aa46] to-green-600 text-white border-0 text-xs">
                                    {post.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Desktop hover overlay */}
                          {!isMobile && (
                            <div className="absolute inset-0 bg-black/60 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="text-white space-y-2">
                                <h3 className="font-bold text-sm line-clamp-2">
                                  {post.title}
                                </h3>

                                <div className="flex justify-center mt-2">
                                  <span className="text-white/80 text-xs">
                                    Click to view details
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </Masonry>
          </ResponsiveMasonry>
        )}
      </div>

      {/* Invite to Gig Modal */}
      {showInviteModal && (
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent className="bg-white text-black border-gray-300 max-w-2xl w-[90vw] max-h-[90vh] rounded-2xl p-0 overflow-hidden">
            <DialogHeader className="p-6 border-b border-gray-200">
              <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
                <Briefcase className="h-6 w-6 text-[#04aa46]" />
                Invite to Gig
              </DialogTitle>
              <p className="text-gray-600 mt-2">
                Send a gig invitation to {projectAuthor?.name} for the project "
                {projectTitle}"
              </p>
            </DialogHeader>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Gig Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#04aa46]" />
                  Gig Title *
                </label>
                <Input
                  placeholder="e.g., Website Development for E-commerce"
                  value={gigFormData.title}
                  onChange={(e) => handleGigFormChange("title", e.target.value)}
                  className="border-gray-300 focus:border-[#04aa46] focus:ring-[#04aa46] text-black"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Description *
                </label>
                <Textarea
                  placeholder="Describe the gig requirements, scope, and expectations..."
                  value={gigFormData.description}
                  onChange={(e) =>
                    handleGigFormChange("description", e.target.value)
                  }
                  className="border-gray-300 focus:border-[#04aa46] focus:ring-[#04aa46] text-black min-h-[100px]"
                  rows={4}
                />
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#04aa46]" />
                  Budget
                </label>
                <Input
                  placeholder="e.g., $5000 - $8000"
                  value={gigFormData.budget}
                  onChange={(e) =>
                    handleGigFormChange("budget", e.target.value)
                  }
                  className="border-gray-300 focus:border-[#04aa46] focus:ring-[#04aa46] text-black"
                />
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#04aa46]" />
                  Deadline
                </label>
                <Input
                  type="date"
                  value={gigFormData.deadline}
                  onChange={(e) =>
                    handleGigFormChange("deadline", e.target.value)
                  }
                  className="border-gray-300 focus:border-[#04aa46] focus:ring-[#04aa46] text-black"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#04aa46]" />
                  Location
                </label>
                <Input
                  placeholder="e.g., Remote, New York, or Hybrid"
                  value={gigFormData.location}
                  onChange={(e) =>
                    handleGigFormChange("location", e.target.value)
                  }
                  className="border-gray-300 focus:border-[#04aa46] focus:ring-[#04aa46] text-black"
                />
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-black flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#04aa46]" />
                  Special Requirements
                </label>
                <Textarea
                  placeholder="Any specific skills, tools, or requirements..."
                  value={gigFormData.requirements}
                  onChange={(e) =>
                    handleGigFormChange("requirements", e.target.value)
                  }
                  className="border-gray-300 focus:border-[#04aa46] focus:ring-[#04aa46] text-black"
                  rows={3}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={
                  sendingInvite ||
                  !gigFormData.title.trim() ||
                  !gigFormData.description.trim()
                }
                className="bg-[#04aa46] text-white hover:bg-[#04aa46]/80 disabled:bg-gray-400"
              >
                {sendingInvite ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Invitation
                  </div>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile Comment Modal */}
      {showCommentModal && expandedPost && (
        <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
          <DialogContent className="bg-white text-black border-gray-700 max-w-md w-[90vw] max-h-[80vh] rounded-2xl p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b border-gray-700 text-black">
              <DialogTitle className="text-lg font-bold text-black flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-black" />
                Comments ({expandedPost.comments?.length || 0})
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col max-h-96">
              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-60">
                {expandedPost.comments?.length > 0 ? (
                  expandedPost.comments.map((comment, i) => (
                    <div key={i} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={comment.user?.image} />
                        <AvatarFallback className="bg-[#04aa46] text-white text-xs">
                          {comment.user?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[#04aa46] font-medium text-sm">
                            {comment.user?.name}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                )}
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={session?.user?.image} />
                    <AvatarFallback className="bg-[#04aa46] text-white">
                      {session?.user?.name?.charAt(0) || (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 border-gray-600 text-black resize-none focus:ring-[#04aa46] focus:border-[#04aa46]"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCommentText("");
                          setShowCommentModal(false);
                        }}
                        className="border-gray-600 text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleComment(expandedPost._id)}
                        disabled={!commentText.trim()}
                        className="bg-gradient-to-r from-[#04aa46] to-green-600 text-white hover:from-[#04aa46]/80 hover:to-green-600/80 disabled:bg-gray-600"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Custom CSS */}
      <style jsx global>{`
        /* Prevent default touch behaviors on mobile reel view */
        body.mobile-reel-active {
          overflow: hidden;
          position: fixed;
          width: 100%;
          height: 100%;
          touch-action: none;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { useFollowState } from "@/hooks/useFollowState";
import { InviteToGigModal } from "@/components/modals/InviteToGigModal";
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
  ChevronUp,
  ChevronDown,
  Video,
  Edit,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Briefcase,
  UserPlus,
} from "lucide-react";

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();

  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPostAuthor, setSelectedPostAuthor] = useState(null);

  // Mobile reel states
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileReel, setShowMobileReel] = useState(false);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [allPostsForReel, setAllPostsForReel] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  // Swipe gesture states
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [swipeStartY, setSwipeStartY] = useState(0);
  const [swipeCurrentX, setSwipeCurrentX] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const videoRef = useRef(null);
  const videoRefs = useRef({});
  const currentVideoRef = useRef(null);
  const isMobileScrollingRef = useRef(false);
  const lastScrollTimeRef = useRef(0);
  const { followingUsers, followLoading, handleFollow } = useFollowState();

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

  // Check if mobile
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && post) {
        // Auto-enable mobile reel view on mobile
        setShowMobileReel(true);
      }
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, [post]);

  // Reset swipe states when mobile view changes
  useEffect(() => {
    if (!isMobile || !showMobileReel) {
      setIsSwipeActive(false);
      setSwipeProgress(0);
      setShowSwipeIndicator(false);
      setShowSwipeHint(true); // Reset hint when entering mobile view
    }
  }, [isMobile, showMobileReel]);

  // Hide swipe hint after a few seconds
  useEffect(() => {
    if (showSwipeHint && isMobile && showMobileReel) {
      const timer = setTimeout(() => {
        setShowSwipeHint(false);
      }, 4000); // Hide after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [showSwipeHint, isMobile, showMobileReel]);

  useEffect(() => {
    if (params.id) {
      fetchPost();
      fetchRelatedPosts();
    }
    // eslint-disable-next-line
  }, [params.id]);

  // Fetch current user role
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

  // Initialize following status
  useEffect(() => {
    const initializeFollowingStatus = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/profile/${session.user.id}`);
        const data = await response.json();
        if (response.ok && data.user?.following) {
          setFollowingUsers(new Set(data.user.following));
        }
      } catch (error) {
        console.error("Error fetching following status:", error);
      }
    };

    initializeFollowingStatus();
  }, [session?.user?.id]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/posts/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data.post);
      } else {
        toast.error("Post not found");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching post:", error);
      toast.error("Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (post) {
      const { url } = getMediaInfo(post);
      if (url) {
        setAllPostsForReel([post]);
        setCurrentMobileIndex(0);
      }
    }
  }, [post]);

  const fetchRelatedPosts = async () => {
    try {
      const response = await fetch(`/api/posts?limit=30`);
      if (response.ok) {
        const data = await response.json();
        const filtered = data.posts.filter((p) => p._id !== params.id);
        const shuffled = filtered.sort(() => 0.5 - Math.random());
        setRelatedPosts(shuffled);
      }
    } catch (error) {
      console.error("Error fetching related posts:", error);
    }
  };

  // Update reel posts when post changes
  useEffect(() => {
    if (post && relatedPosts.length > 0) {
      const reelPosts = [post, ...relatedPosts].filter((p) => {
        const { url } = getMediaInfo(p);
        return url;
      });
      setAllPostsForReel(reelPosts);
      setCurrentMobileIndex(0); // Current post is at index 0
    }
  }, [post, relatedPosts]);

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

  // Mobile scroll handling
  const handleMobileScroll = useCallback(
    (direction) => {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < 300) return;
      lastScrollTimeRef.current = now;

      if (isMobileScrollingRef.current) return;
      isMobileScrollingRef.current = true;

      const newIndex =
        direction === "up"
          ? Math.max(0, currentMobileIndex - 1)
          : Math.min(allPostsForReel.length - 1, currentMobileIndex + 1);

      if (newIndex !== currentMobileIndex) {
        pauseAllVideos();
        setCurrentMobileIndex(newIndex);

        const newPost = allPostsForReel[newIndex];
        setTimeout(() => {
          const { isVideo } = getMediaInfo(newPost);
          if (isVideo) {
            playCurrentVideo(newPost._id);
          }
        }, 100);
      }

      setTimeout(() => {
        isMobileScrollingRef.current = false;
      }, 200);
    },
    [currentMobileIndex, allPostsForReel, pauseAllVideos, playCurrentVideo]
  );

  // Like functionality
  const handleLike = async (postId) => {
    if (!session?.user?.id) return toast.error("Please log in to like posts");
    try {
      const response = await fetch(`/api/posts/${postId || post._id}/like`, {
        method: "POST",
      });
      if (response.ok) {
        const { post: updatedPost } = await response.json();

        // Update main post if it's the same
        if (updatedPost._id === post._id) {
          setPost(updatedPost);
        }

        // Update in reel posts array
        setAllPostsForReel((prev) =>
          prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
        );
        setRelatedPosts((prev) =>
          prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
        );
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
      const response = await fetch(`/api/posts/${postId || post._id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      if (response.ok) {
        const { post: updatedPost } = await response.json();

        // Update main post if it's the same
        if (updatedPost._id === post._id) {
          setPost(updatedPost);
        }

        // Update in reel posts array
        setAllPostsForReel((prev) =>
          prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
        );
        setRelatedPosts((prev) =>
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

  // Delete functionality (Green theme)
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const response = await fetch(`/api/posts/${post._id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        toast.success("Post deleted successfully!");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  // Helper function to check if invite button should show
  const shouldShowInviteButton = (postAuthor) => {
    return (
      currentUserRole === "hiring" &&
      postAuthor?.role === "freelancer" &&
      postAuthor?._id !== session?.user?.id
    );
  };

  // Handle invite to gig
  const handleInviteToGig = (author, post) => {
    console.log("📨 handleInviteToGig called", { author, post });
    
    if (!author || !post || !post.author) {
      console.error("Missing required data for invite:", { author, post });
      toast.error("Unable to send invitation - missing data");
      return;
    }

    const postData = {
      postId: post._id,
      postTitle: post.title,
      postOwnerId: post.author._id,
    };

    console.log("✅ Setting modal state", { postData, author });
    setSelectedPostAuthor({ ...author, postData });
    setShowInviteModal(true);
    console.log("🎭 Modal should now be visible");
  };

  // Edit functionality
  const handleEdit = () => setShowEditModal(true);
  const handlePostUpdated = (updatedPost) => {
    fetchPost();
    setShowEditModal(false);
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

  const closeMobileView = () => {
    pauseAllVideos();
    setShowMobileReel(false);
    currentVideoRef.current = null;
  };

  // Media helpers
  const getAllMedia = (post) => {
    if (!post) return [];
    return [
      ...(post.videos || []).map((url) => ({ type: "video", url })),
      ...(post.images || []).map((url) => ({ type: "image", url })),
    ];
  };
  const allMedia = getAllMedia(post);
  const currentMedia = allMedia[currentMediaIndex] || allMedia[0];

  // Like Check / Ownership
  const hasUserLiked = (post) =>
    post?.likes?.some((l) => l?.user?._id === session?.user?.id);
  const isOwnPost = (post) => post?.author?._id === session?.user?.id;

  // Video controls for desktop
  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isVideoPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsVideoPlaying(!isVideoPlaying);
    }
  };
  const toggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isVideoMuted;
      setIsVideoMuted(!isVideoMuted);
    }
  };

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e) => {
    if (!isMobile || !showMobileReel) return;
    
    const touch = e.touches[0];
    setSwipeStartX(touch.clientX);
    setSwipeStartY(touch.clientY);
    setSwipeCurrentX(touch.clientX);
    setIsSwipeActive(false);
    setSwipeProgress(0);
    setShowSwipeIndicator(false);
  }, [isMobile, showMobileReel]);

  const handleTouchMove = useCallback((e) => {
    if (!isMobile || !showMobileReel) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    
    // Get current post to check if invite should be available
    const currentPost = allPostsForReel[0];
    if (!currentPost || !shouldShowInviteButton(currentPost.author)) {
      return; // Don't show swipe UI if invite is not available
    }
    
    // Only activate horizontal swipe if it's more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      setIsSwipeActive(true);
      setSwipeCurrentX(touch.clientX);
      setShowSwipeHint(false); // Hide hint when user starts swiping
      
      // Calculate swipe progress for right swipe (positive deltaX)
      if (deltaX > 0) {
        const progress = Math.min(deltaX / 150, 1); // 150px for full progress
        setSwipeProgress(progress);
        setShowSwipeIndicator(progress > 0.1); // Show indicator after 10% progress
        
        // Add light haptic feedback at 80% progress
        if (progress > 0.8 && navigator.vibrate) {
          navigator.vibrate(25);
        }
      } else {
        setSwipeProgress(0);
        setShowSwipeIndicator(false);
      }
    }
  }, [isMobile, showMobileReel, swipeStartX, swipeStartY, allPostsForReel, shouldShowInviteButton]);

  const handleTouchEnd = useCallback((e) => {
    if (!isMobile || !showMobileReel || !isSwipeActive) {
      setIsSwipeActive(false);
      setSwipeProgress(0);
      setShowSwipeIndicator(false);
      return;
    }
    
    const deltaX = swipeCurrentX - swipeStartX;
    const deltaY = Math.abs(e.changedTouches[0].clientY - swipeStartY);
    
    // Check for successful right swipe (threshold of 100px)
    if (deltaX > 100 && deltaY < 50) {
      // Get current post from reel
      const currentPost = allPostsForReel[0]; // Since we're only showing the first post
      
      // Check if invite should be available
      if (currentPost && shouldShowInviteButton(currentPost.author)) {
        console.log("🎯 Swipe right detected - triggering invite modal");
        handleInviteToGig(currentPost.author, currentPost);
        // Add success haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
      } else {
        console.log("❌ Swipe right detected but invite not available", {
          currentPost: !!currentPost,
          shouldShow: currentPost ? shouldShowInviteButton(currentPost.author) : false
        });
      }
    }
    
    // Reset swipe state
    setIsSwipeActive(false);
    setSwipeProgress(0);
    setShowSwipeIndicator(false);
  }, [isMobile, showMobileReel, isSwipeActive, swipeCurrentX, swipeStartX, swipeStartY, allPostsForReel, shouldShowInviteButton, handleInviteToGig]);

  // Combined touch handlers for both vertical scroll and horizontal swipe
  const handleCombinedTouchStart = useCallback((e) => {
    if (!isMobile || !showMobileReel) return;
    
    const touch = e.touches[0];
    setSwipeStartX(touch.clientX);
    setSwipeStartY(touch.clientY);
    setSwipeCurrentX(touch.clientX);
    setIsSwipeActive(false);
    setSwipeProgress(0);
    setShowSwipeIndicator(false);
  }, [isMobile, showMobileReel]);

  const handleCombinedTouchMove = useCallback((e) => {
    if (!isMobile || !showMobileReel) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    
    // Determine if this is a horizontal or vertical gesture
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe - handle invite functionality
      const currentPost = allPostsForReel[currentMobileIndex];
      if (!currentPost || !shouldShowInviteButton(currentPost.author)) {
        return;
      }
      
      if (Math.abs(deltaX) > 30) {
        setIsSwipeActive(true);
        setSwipeCurrentX(touch.clientX);
        setShowSwipeHint(false);
        
        if (deltaX > 0) {
          const progress = Math.min(deltaX / 150, 1);
          setSwipeProgress(progress);
          setShowSwipeIndicator(progress > 0.1);
          
          if (progress > 0.8 && navigator.vibrate) {
            navigator.vibrate(25);
          }
        } else {
          setSwipeProgress(0);
          setShowSwipeIndicator(false);
        }
      }
    }
    // Vertical swipes are handled by touchend for scrolling
  }, [isMobile, showMobileReel, swipeStartX, swipeStartY, allPostsForReel, currentMobileIndex, shouldShowInviteButton]);

  const handleCombinedTouchEnd = useCallback((e) => {
    if (!isMobile || !showMobileReel) return;
    
    const deltaX = swipeCurrentX - swipeStartX;
    const deltaY = e.changedTouches[0].clientY - swipeStartY;
    
    // Handle horizontal swipe for invite
    if (isSwipeActive && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 100 && Math.abs(deltaY) < 50) {
        const currentPost = allPostsForReel[currentMobileIndex];
        
        if (currentPost && shouldShowInviteButton(currentPost.author)) {
          console.log("🎯 Swipe right detected - triggering invite modal");
          handleInviteToGig(currentPost.author, currentPost);
          if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
          }
        }
      }
    }
    // Handle vertical swipe for scrolling
    else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
      if (deltaY < -50) {
        // Swipe up - next post
        handleMobileScroll("down");
      } else if (deltaY > 50) {
        // Swipe down - previous post
        handleMobileScroll("up");
      }
    }
    
    // Reset swipe state
    setIsSwipeActive(false);
    setSwipeProgress(0);
    setShowSwipeIndicator(false);
  }, [isMobile, showMobileReel, isSwipeActive, swipeCurrentX, swipeStartX, swipeStartY, allPostsForReel, currentMobileIndex, shouldShowInviteButton, handleInviteToGig, handleMobileScroll]);

  // Responsive: Stack 3 posts vertically right, rest as grid below (desktop only)
  const rightColumnPosts = !isMobile ? relatedPosts.slice(0, 3) : [];
  const gridPosts = !isMobile ? relatedPosts.slice(3) : relatedPosts;

  // Mobile Full-Screen Reel View - Updated section
  if (isMobile && showMobileReel && allPostsForReel.length > 0) {
    return (
      <div className="fixed inset-0 bg-black z-50 overflow-hidden">
        {/* Show current post based on currentMobileIndex */}
        {[allPostsForReel[currentMobileIndex]].filter(Boolean).map((reelPost, index) => {
          const { url: mediaUrl, isVideo } = getMediaInfo(reelPost);
          const isCurrentPost = true; // Always true since we're only showing current post
          const isDescriptionExpanded = expandedDescriptions[reelPost._id];
          const shouldTruncate =
            reelPost.description && reelPost.description.length > 100;

          return (
            <div
              key={reelPost._id}
              className="absolute inset-0 w-full h-full flex flex-col"
              onTouchStart={handleCombinedTouchStart}
              onTouchMove={handleCombinedTouchMove}
              onTouchEnd={handleCombinedTouchEnd}
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
                            videoRefs.current[reelPost._id] = el;
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
                          playCurrentVideo(reelPost._id);
                        }}
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt={reelPost.title}
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
                          onClick={() => handleLike(reelPost._id)}
                          className="text-white hover:bg-white/20 bg-black/40 rounded-full p-3"
                        >
                          <Heart
                            className={cn(
                              "h-7 w-7",
                              hasUserLiked(reelPost)
                                ? "text-red-500 fill-red-500"
                                : "text-white"
                            )}
                          />
                        </Button>
                        <span
                          className={cn(
                            "text-sm font-bold text-white",
                            hasUserLiked(reelPost) ? "text-red-500" : ""
                          )}
                        >
                          {reelPost.likes?.length || 0}
                        </span>
                      </div>

                      {/* Comment Button */}
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleMobileCommentClick(e, reelPost)}
                          className="text-white hover:bg-white/20 bg-black/40 rounded-full p-3"
                        >
                          <MessageCircle className="h-7 w-7" />
                        </Button>
                        <span className="text-white text-sm font-bold">
                          {reelPost.comments?.length || 0}
                        </span>
                      </div>

                      {/* Edit and Delete buttons - only for post owner */}
                      {isOwnPost(reelPost) && (
                        <>
                          <div className="flex flex-col items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowEditModal(true)}
                              className="text-white hover:bg-white/20 bg-black/40 rounded-full p-3"
                            >
                              <Edit className="h-6 w-6" />
                            </Button>
                          </div>

                          <div className="flex flex-col items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleDelete}
                              className="text-white hover:bg-white/20 bg-red-500/40 rounded-full p-3"
                            >
                              <Trash2 className="h-6 w-6" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Swipe Right Indicator */}
                    {shouldShowInviteButton(reelPost.author) && showSwipeIndicator && (
                      <div className="absolute left-4 top-[20%] -translate-y-1/2 z-30">
                        <div className="flex items-center gap-3 bg-black/70 rounded-full px-4 py-3 backdrop-blur-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-16 h-1 bg-white/30 rounded-full overflow-hidden"
                            >
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{
                                  width: `${swipeProgress * 100}%`,
                                  backgroundColor: swipeProgress > 0.8 ? '#10b981' : '#3b82f6'
                                }}
                              />
                            </div>
                            <Briefcase className={cn(
                              "h-5 w-5 transition-all duration-300",
                              swipeProgress > 0.8 ? "text-green-400" : "text-blue-400"
                            )} />
                          </div>
                          <span className={cn(
                            "text-sm font-medium transition-all duration-300",
                            swipeProgress > 0.8 ? "text-green-400" : "text-white"
                          )}>
                            {swipeProgress > 0.8 ? "Release to invite to gig!" : "Swipe to invite to gig"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Swipe hint for eligible posts */}
                    {shouldShowInviteButton(reelPost.author) && !showSwipeIndicator && !isSwipeActive && showSwipeHint && (
                      <div className="absolute left-4 top-[20%] -translate-y-1/2 z-20 animate-pulse">
                        <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-2 backdrop-blur-sm">
                          <Briefcase className="h-4 w-4 text-blue-400" />
                          <span className="text-xs text-white/80">Swipe right to invite to gig</span>
                        </div>
                      </div>
                    )}

                    {/* Bottom Overlay - same as before */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pb-6 mb-16">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) =>
                            navigateToProfile(reelPost.author?._id, e)
                          }
                          className="flex-shrink-0"
                        >
                          <Avatar className="h-12 w-12 ring-2 ring-white/30">
                            <AvatarImage src={reelPost.author?.image} />
                            <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                              {reelPost.author?.name?.charAt(0) || (
                                <User className="h-6 w-6" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <button
                              onClick={(e) =>
                                navigateToProfile(reelPost.author?._id, e)
                              }
                              className="text-white font-semibold text-base hover:text-white/80 transition-colors"
                            >
                              {reelPost.author?.name || "Anonymous"}
                            </button>

                            {/* Follow Button for Mobile */}
                            {reelPost.author?._id !== session?.user?.id && (
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={(e) =>
                                    handleFollow(reelPost.author?._id, e)
                                  }
                                  disabled={followLoading.has(
                                    reelPost.author?._id
                                  )}
                                  size="sm"
                                  className={cn(
                                    "font-medium px-3 py-1 text-sm transition-all",
                                    followingUsers.has(reelPost.author?._id)
                                      ? "bg-transparent border border-white/50 text-white hover:bg-white/10"
                                      : "bg-white text-black hover:bg-white/90"
                                  )}
                                >
                                  {followLoading.has(reelPost.author?._id) ? (
                                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : followingUsers.has(
                                      reelPost.author?._id
                                    ) ? (
                                    "Following"
                                  ) : (
                                    "Follow"
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="mb-2 font-medium text-white">
                            {reelPost.title}
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
                              {reelPost.description}
                            </p>

                            {shouldTruncate && (
                              <button
                                onClick={() => toggleDescription(reelPost._id)}
                                className="text-white/70 text-sm font-medium hover:text-white transition-colors"
                              >
                                {isDescriptionExpanded ? "Show less" : "more"}
                              </button>
                            )}

                            {reelPost.tags && reelPost.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {reelPost.tags.slice(0, 3).map((tag, i) => (
                                  <span
                                    key={i}
                                    className="text-blue-300 text-sm font-medium"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {reelPost.tags.length > 3 && (
                                  <span className="text-white/60 text-sm">
                                    +{reelPost.tags.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            <p className="text-white/60 text-xs">
                              {new Date(
                                reelPost.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showEditModal && (
                  <EditPostModal
                    post={post}
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onPostUpdated={handlePostUpdated}
                  />
                )}

                {/* Add the Mobile Comment Modal inside the mobile reel view */}
                {showCommentModal && (
                  <Dialog
                    open={showCommentModal}
                    onOpenChange={setShowCommentModal}
                  >
                    <DialogContent className="bg-white border-gray-800 text-black max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Add Comment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Write your comment..."
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          className="bg-white border-gray-700 text-white placeholder-gray-800"
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
                            onClick={() => handleComment()}
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

                {/* Invite to Gig Modal - Mobile Reel View */}
                <InviteToGigModal
                  isOpen={showInviteModal}
                  onClose={() => {
                    setShowInviteModal(false);
                    setSelectedPostAuthor(null);
                  }}
                  freelancer={selectedPostAuthor}
                  onInviteSent={() => {
                    toast.success("Invitation sent successfully!");
                    setShowInviteModal(false);
                    setSelectedPostAuthor(null);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Loading / Error states
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
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
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-lg border-b border-gray-800">
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

      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-8">
        {/* Left: Main Post Content */}
        <div className="flex-1 space-y-6">
          {/* Media Section */}
          <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 max-w-4xl mx-auto">
            <div className="relative bg-black">
              {currentMedia && (
                <>
                  {currentMedia.type === "video" ? (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        src={currentMedia.url}
                        className="w-full h-auto max-h-[70vh] object-contain"
                        autoPlay
                        loop
                        muted={isVideoMuted}
                        playsInline
                        onClick={toggleVideoPlay}
                      />
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={toggleVideoPlay}
                      >
                        <div className="bg-black/60 rounded-full p-4">
                          {isVideoPlaying ? (
                            <Pause className="h-8 w-8 text-white" />
                          ) : (
                            <Play className="h-8 w-8 text-white" />
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVideoMute();
                        }}
                        className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full"
                      >
                        {isVideoMuted ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <img
                      src={currentMedia.url}
                      alt={post.title}
                      className="w-full h-auto max-h-[70vh] object-contain"
                    />
                  )}
                  {currentMedia.type === "video" && (
                    <div className="absolute top-4 right-4 bg-black/60 rounded-full p-2">
                      <Video className="h-5 w-5 text-white" />
                    </div>
                  )}
                  {/* Media Navigation */}
                  {allMedia.length > 1 && (
                    <>
                      {currentMediaIndex > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setCurrentMediaIndex(currentMediaIndex - 1)
                          }
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </Button>
                      )}
                      {currentMediaIndex < allMedia.length - 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setCurrentMediaIndex(currentMediaIndex + 1)
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </Button>
                      )}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {allMedia.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentMediaIndex(index)}
                            className={cn(
                              "w-2 h-2 rounded-full transition-all",
                              index === currentMediaIndex
                                ? "bg-white scale-125"
                                : "bg-white/50 hover:bg-white/75"
                            )}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Post Details */}
          <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
            <CardContent className="p-6">
              {/* Author Info */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigateToProfile(post.author?._id)}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-green-500/20">
                      <AvatarImage src={post.author?.image} />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                        {post.author?.name?.charAt(0) || (
                          <User className="h-6 w-6" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-white">
                        {post.author?.name || "Anonymous"}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>

                  {/* Follow and Invite Buttons */}
                  {post.author?._id !== session?.user?.id && (
                    <div className="flex items-center gap-3">
                      {/* Follow Button */}
                      <Button
                        onClick={(e) => handleFollow(post.author?._id, e)}
                        disabled={followLoading.has(post.author?._id)}
                        size="sm"
                        className={cn(
                          "font-medium px-4 py-2 transition-all",
                          followingUsers.has(post.author?._id)
                            ? "bg-transparent border border-green-500 text-green-400 hover:bg-green-500/10"
                            : "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                        )}
                      >
                        {followLoading.has(post.author?._id) ? (
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            {followingUsers.has(post.author?._id)
                              ? "Following"
                              : "Follow"}
                          </>
                        )}
                      </Button>

                      {/* Invite to Gig Button */}
                      {shouldShowInviteButton(post.author) && (
                        <Button
                          onClick={() => handleInviteToGig(post.author, post)}
                          size="sm"
                          className="bg-green-500 text-white hover:bg-green-600 px-4 py-2 font-medium"
                        >
                          <Briefcase className="h-4 w-4 mr-2" />
                          Invite to Gig
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {isOwnPost(post) && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleEdit}
                      className="text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDelete}
                      className="text-gray-400 hover:text-red-400 hover:bg-gray-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold mb-4 text-white">
                {post.title}
              </h1>

              {/* Description */}
              {post.description && (
                <p className="text-gray-300 mb-4 leading-relaxed whitespace-pre-wrap">
                  {post.description}
                </p>
              )}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-green-500/20 text-green-400 border-green-500/30"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-6 pt-4 border-t border-gray-800">
                <Button
                  variant="ghost"
                  onClick={() => handleLike()}
                  className={cn(
                    "flex items-center gap-2 transition-all hover:bg-gray-800",
                    hasUserLiked(post)
                      ? "text-red-500"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Heart
                    className={cn(
                      "h-5 w-5",
                      hasUserLiked(post) ? "fill-red-500" : ""
                    )}
                  />
                  <span className="font-medium">{post.likes?.length || 0}</span>
                </Button>

                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="font-medium">
                    {post.comments?.length || 0}
                  </span>
                </Button>

                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                >
                  <Share className="h-5 w-5" />
                  Share
                </Button>

                {post.sourceUrl && (
                  <Button
                    variant="ghost"
                    onClick={() => window.open(post.sourceUrl, "_blank")}
                    className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Source
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">
                Comments ({post.comments?.length || 0})
              </h3>
              {/* Add Comment */}
              {session?.user && (
                <div className="flex gap-3 mb-6">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={session.user.image} />
                    <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white text-sm">
                      {session.user.name?.charAt(0) || (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 resize-none"
                      rows={2}
                    />
                    <Button
                      onClick={() => handleComment()}
                      disabled={!commentText.trim()}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-4 self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              /* Comments List - Fixed Version */
              <div className="space-y-4">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comment, i) => {
                    // Handle multiple possible comment structures (same as dashboard)
                    const commentText = comment.content || comment.text || "";
                    const commentUser = comment.user || comment.author || {};
                    const commentId =
                      comment._id || comment.id || `comment-${i}`;
                    const createdAt = comment.createdAt || new Date();

                    return (
                      <div
                        key={`${commentId}-${i}-${Date.now()}`}
                        className="flex gap-3"
                      >
                        <button
                          onClick={() => navigateToProfile(commentUser._id)}
                          className="flex-shrink-0"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={commentUser.image} />
                            <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white text-sm">
                              {commentUser.name?.charAt(0) || (
                                <User className="h-4 w-4" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1">
                          <div className="bg-gray-800 rounded-lg p-3">
                            <button
                              onClick={() => navigateToProfile(commentUser._id)}
                              className="font-medium text-sm text-white hover:text-green-400 transition-colors"
                            >
                              {commentUser.name || "Anonymous"}
                            </button>
                            <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                              {commentText || "[No comment text]"}
                            </p>
                          </div>
                          <p className="text-gray-500 text-xs mt-1 ml-3">
                            {new Date(createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Related Posts */}
        {!isMobile && (
          <div className="w-80 space-y-6">
            {/* Stacked Posts (Top 3) */}
            {rightColumnPosts.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  Related Posts
                </h3>
                {rightColumnPosts.map((relatedPost) => {
                  const { url: mediaUrl, isVideo } = getMediaInfo(relatedPost);
                  return (
                    <Card
                      key={relatedPost._id}
                      className="bg-gray-900 border-gray-800 cursor-pointer hover:border-green-500/50 transition-all group overflow-hidden"
                      onClick={() =>
                        router.push(`/dashboard/post/${relatedPost._id}`)
                      }
                    >
                      <div className="relative">
                        {mediaUrl && (
                          <div className="relative overflow-hidden bg-gray-800">
                            {isVideo ? (
                              <video
                                src={mediaUrl}
                                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                                muted
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={mediaUrl}
                                alt={relatedPost.title}
                                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            )}
                            {isVideo && (
                              <div className="absolute top-3 right-3 bg-black/70 rounded-full p-1.5">
                                <Video className="h-4 w-4 text-white" />
                              </div>
                            )}
                            
                            {/* Hover overlay with title only */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="absolute bottom-3 left-3 right-3">
                                <h4 className="text-white font-medium text-sm line-clamp-2 leading-tight">
                                  {relatedPost.title}
                                </h4>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid Posts (Below on desktop, all posts on mobile) - Pinterest Style */}
      {gridPosts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white">
              {isMobile ? "Related Posts" : "More Posts"}
            </h3>
          </div>
          
          {/* Pinterest-style Masonry Grid */}
          <ResponsiveMasonry
            columnsCountBreakPoints={{
              350: 1,
              640: 2,
              900: 3,
              1200: 4,
            }}
          >
            <Masonry gutter="16px">
              {gridPosts.map((relatedPost) => {
                const { url: mediaUrl, isVideo } = getMediaInfo(relatedPost);
                
                return (
                  <div key={relatedPost._id} className="w-full mb-4">
                    <Card
                      className="bg-gray-900 border-gray-800 cursor-pointer hover:border-green-500/50 transition-all group overflow-hidden break-inside-avoid w-full"
                      onClick={() => {
                        if (isMobile) {
                          // On mobile, go to reel view
                          const postIndex = allPostsForReel.findIndex(
                            (p) => p._id === relatedPost._id
                          );
                          if (postIndex !== -1) {
                            setCurrentMobileIndex(postIndex);
                            setShowMobileReel(true);
                          }
                        } else {
                          router.push(`/dashboard/post/${relatedPost._id}`);
                        }
                      }}
                    >
                      {/* Media Section Only */}
                      {mediaUrl && (
                        <div className="relative overflow-hidden bg-gray-800 w-full">
                          {isVideo ? (
                            <video
                              src={mediaUrl}
                              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                              muted
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={mediaUrl}
                              alt={relatedPost.title}
                              className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          )}
                          
                          {/* Video indicator */}
                          {isVideo && (
                            <div className="absolute top-3 right-3 bg-black/70 rounded-full p-1.5">
                              <Video className="h-4 w-4 text-white" />
                            </div>
                          )}
                          
                          {/* Hover overlay with title only */}
                          <div className="absolute inset-0 bg-black/60 p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-white space-y-2">
                              <h3 className="font-bold text-sm line-clamp-2 leading-tight">
                                {relatedPost.title}
                              </h3>
                              <div className="flex justify-center mt-2">
                                <span className="text-white/80 text-xs">
                                  Click to view details
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </Masonry>
          </ResponsiveMasonry>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && (
        <EditPostModal
          post={post}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {/* Invite to Gig Modal */}
      <InviteToGigModal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setSelectedPostAuthor(null);
        }}
        freelancer={selectedPostAuthor}
        onInviteSent={() => {
          toast.success("Invitation sent successfully!");
          setShowInviteModal(false);
          setSelectedPostAuthor(null);
        }}
      />

      {/* Mobile Comment Modal */}
      {showCommentModal && (
        <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
          <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Comment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Write your comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
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
                  onClick={() => handleComment()}
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
    </div>
  );
}

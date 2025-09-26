"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Masonry from "react-masonry-css";
import { useRouter } from "next/navigation";
import { useFollowState } from "@/hooks/useFollowState";
import { useGoogleRoleCheck } from "@/hooks/useGoogleRoleCheck";
import WelcomePopup from "@/components/modals/welcome";
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
  ChevronDown,
  ExternalLink,
  ChevronUp,
  X,
  User,
  Send,
  MoreHorizontal,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Video,
  Edit,
  Trash2,
  Volume2,
  VolumeX,
  Briefcase,
  Users,
  MapPin,
  DollarSign,
  Clock,
} from "lucide-react";
import { InviteToGigModal } from "@/components/modals/InviteToGigModal";
import { PostModal } from "@/components/modals/post-modal";
import { usePostModalStore } from "@/lib/store";
import { SearchFilter } from "@/components/SearchFilter";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Check and update Google user role if needed
  useGoogleRoleCheck();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [expandedPostIndex, setExpandedPostIndex] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [currentMobileIndex, setCurrentMobileIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [commentsModalHeight, setCommentsModalHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const commentsModalRef = useRef(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  // Audio is ON by default

  // Invite to Gig modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPostAuthor, setSelectedPostAuthor] = useState(null);

  // Video refs for controlling playback
  const videoRefs = useRef({});
  const currentVideoRef = useRef(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [columnCount, setColumnCount] = useState(4);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Add these new state variables for horizontal swipe
  const [horizontalSwipeStartX, setHorizontalSwipeStartX] = useState(0);
  const [horizontalSwipeStartY, setHorizontalSwipeStartY] = useState(0);
  const [isHorizontalSwiping, setIsHorizontalSwiping] = useState(false);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const horizontalSwipeRef = useRef(false);

  const observerTarget = useRef(null);
  const isFetchingRef = useRef(false);

  // FIXED MOBILE SCROLLING REFS
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const isScrolling = useRef(false);
  const scrollCooldown = useRef(false);
  const mobileContainerRef = useRef(null);

  const [expandedPostId, setExpandedPostId] = useState(null);

  const { followingUsers, followLoading, handleFollow } = useFollowState();

  const isOpen = usePostModalStore((state) => state.isOpen);
  const closeModal = usePostModalStore((state) => state.close);

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

  useEffect(() => {
    const checkFirstVisit = () => {
      // Check for welcome parameter in URL
      const urlParams = new URLSearchParams(window.location.search);
      const isNewUser = urlParams.get("welcome") === "true";

      // Show welcome modal only for new users with the welcome parameter
      if (isNewUser && session?.user) {
        setShowWelcomeModal(true);

        // Clean up URL immediately after checking
        const url = new URL(window.location);
        url.searchParams.delete("welcome");
        window.history.replaceState({}, "", url);
      }
    };

    if (session?.user) {
      checkFirstVisit();
    }
  }, [session?.user]);

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

  const handleWelcomeClose = () => {
    setShowWelcomeModal(false);
    // Optional: Mark that user has seen welcome
    try {
      localStorage.setItem("hasSeenWelcome", "true");
    } catch (e) {
      // Handle localStorage errors gracefully
      console.log("Could not save welcome status to localStorage");
    }
  };

  useEffect(() => {
    const updateColumnCount = () => {
      const width = window.innerWidth;
      if (width < 640) setColumnCount(2);
      else if (width < 768) setColumnCount(2);
      else if (width < 1024) setColumnCount(3);
      else setColumnCount(4);
    };

    updateColumnCount();
    window.addEventListener("resize", updateColumnCount);
    return () => window.removeEventListener("resize", updateColumnCount);
  }, []);

  // Video control functions
  const pauseAllVideos = useCallback(() => {
    Object.values(videoRefs.current).forEach((video) => {
      if (video && !video.paused) {
        video.pause();
      }
    });
  }, []);

  const shouldShowInviteButton = (postAuthor) => {
    console.log("🔍 Debug invite button visibility:", {
      currentUserRole,
      postAuthorRole: postAuthor?.role,
      postAuthorId: postAuthor?._id,
      sessionUserId: session?.user?.id,
      shouldShow:
        currentUserRole === "hiring" &&
        postAuthor?.role === "freelancer" &&
        postAuthor?._id !== session?.user?.id,
    });

    return (
      currentUserRole === "hiring" &&
      postAuthor?.role === "freelancer" &&
      postAuthor?._id !== session?.user?.id
    );
  };

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

      // Update current playing video
      if (currentVideoRef.current) {
        currentVideoRef.current.muted = newMutedState;
      }

      // Update all video refs
      Object.values(videoRefs.current).forEach((video) => {
        if (video) {
          video.muted = newMutedState;
        }
      });

      return newMutedState;
    });
  }, []);

  const fetchPostsWithFilters = useCallback(
    async (filters, pageNum = 1, resetPosts = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (pageNum === 1 || resetPosts) setLoading(true);
      else setFetchingMore(true);

      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: "12",
        });

        const categoryFilter = filters.find((f) => f.type === "category");
        const subcategoryFilter = filters.find((f) => f.type === "subcategory");

        if (categoryFilter) {
          params.append("category", categoryFilter.value);
        }

        if (subcategoryFilter) {
          params.append("subCategory", subcategoryFilter.value);
        }

        const response = await fetch(`/api/posts?${params.toString()}`);
        const data = await response.json();

        if (response.ok) {
          setPosts((prevPosts) => {
            const newPosts = data.posts.filter(
              (newPost) =>
                !prevPosts.some(
                  (existingPost) => existingPost._id === newPost._id
                )
            );
            return pageNum === 1 || resetPosts
              ? data.posts
              : [...prevPosts, ...newPosts];
          });

          setHasMore(data.pagination.page < data.pagination.totalPages);
          setPage(pageNum);
        }
      } catch (error) {
        console.error("Network error fetching posts:", error);
      } finally {
        setLoading(false);
        setFetchingMore(false);
        isFetchingRef.current = false;
      }
    },
    []
  );

  const handleVideoLoad = () => {
    setVideoLoading(false);
  };

  const toggleDescription = (postId) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const fetchPosts = useCallback(
    async (pageNum = 1, resetPosts = false) => {
      return fetchPostsWithFilters(activeFilters, pageNum, resetPosts);
    },
    [activeFilters, fetchPostsWithFilters]
  );

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...posts];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.title?.toLowerCase().includes(query) ||
          post.description?.toLowerCase().includes(query) ||
          post.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          post.author?.name?.toLowerCase().includes(query)
      );
    }

    // Apply local filters (for non-backend filters like sorting)
    const sortFilter = activeFilters.find((f) => f.type === "sort");
    if (sortFilter) {
      switch (sortFilter.value) {
        case "latest":
          filtered.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          break;
        case "oldest":
          filtered.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
          break;
        case "likes":
          filtered.sort(
            (a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)
          );
          break;
        case "comments":
          filtered.sort(
            (a, b) => (b.comments?.length || 0) - (a.comments?.length || 0)
          );
          break;
        default:
          break;
      }
    }

    setFilteredPosts(filtered);
  }, [posts, searchQuery, activeFilters]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleFilter = (filters) => {
    setActiveFilters(filters);

    const categoryFilter = filters.find((f) => f.type === "category");
    const subcategoryFilter = filters.find((f) => f.type === "subcategory");

    // If category or subcategory filter is applied, fetch immediately
    if (categoryFilter || subcategoryFilter) {
      setPosts([]);
      setPage(1);
      setHasMore(true);
      fetchPostsWithFilters(filters, 1, true);
    } else if (filters.length === 0) {
      setPosts([]);
      setPage(1);
      setHasMore(true);
      fetchPostsWithFilters([], 1, true);
    }
  };

  // Handle post interactions
  const handleLike = async (postId) => {
    try {
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      });
      if (response.ok) {
        const { post } = await response.json();
        setPosts((prevPosts) =>
          prevPosts.map((p) => (p._id === postId ? post : p))
        );
        setFilteredPosts((prevPosts) =>
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

    console.log("🚀 Starting comment submission");
    console.log("📝 Post ID:", postId);
    console.log("💬 Comment text:", commentText);
    console.log("👤 Current expandedPost:", expandedPost);
    console.log("📊 Current expandedPost comments:", expandedPost?.comments);

    try {
      console.log("📡 Making API request to:", `/api/posts/${postId}/comment`);

      const response = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });

      console.log("📊 Response status:", response.status);
      console.log("📊 Response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Comment API response:", data);
        console.log("📄 Updated post from API:", data.post);
        console.log("💬 Comments in updated post:", data.post?.comments);
        console.log("🔢 Number of comments:", data.post?.comments?.length);

        // Log each comment structure
        if (data.post?.comments) {
          data.post.comments.forEach((comment, index) => {
            console.log(`Comment ${index}:`, comment);
            console.log(`Comment ${index} keys:`, Object.keys(comment));
            console.log(`Comment ${index} user:`, comment.user);
            console.log(`Comment ${index} text:`, comment.text);
            console.log(`Comment ${index} content:`, comment.content);
          });
        }

        // Use the post from the response
        const updatedPost = data.post;
        console.log("🔄 About to update state with:", updatedPost);

        setPosts((prevPosts) => {
          console.log("📚 Updating posts array");
          return prevPosts.map((p) => (p._id === postId ? updatedPost : p));
        });

        setFilteredPosts((prevPosts) => {
          console.log("🔍 Updating filtered posts array");
          return prevPosts.map((p) => (p._id === postId ? updatedPost : p));
        });

        if (expandedPost?._id === postId) {
          console.log("🎯 Updating expandedPost");
          console.log(
            "🎯 Old expandedPost comments:",
            expandedPost?.comments?.length
          );
          console.log(
            "🎯 New expandedPost comments:",
            updatedPost?.comments?.length
          );
          setExpandedPost(updatedPost);
        }

        setCommentText("");
        console.log("✅ Comment submission completed successfully");
        toast.success("Comment added!");
      } else {
        const errorData = await response.json();
        console.error("❌ Comment API error:", errorData);
        console.error("❌ Error status:", response.status);
        toast.error(errorData.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("❌ Network/parsing error:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Error stack:", error.stack);
      toast.error("Failed to add comment");
    }
  };

  // 2. SECOND - Add this debug useEffect to monitor expandedPost changes:
  useEffect(() => {
    console.log("🔍 ExpandedPost changed:", {
      expandedPost,
      comments: expandedPost?.comments,
      commentsLength: expandedPost?.comments?.length,
      showCommentModal,
    });

    if (expandedPost?.comments) {
      expandedPost.comments.forEach((comment, i) => {
        console.log(`Debug Comment ${i}:`, {
          comment,
          keys: Object.keys(comment),
          text: comment.text,
          content: comment.content,
          user: comment.user,
        });
      });
    }
  }, [expandedPost, showCommentModal]);

  const handleEmojiReaction = async (postId, emoji) => {
    try {
      const response = await fetch(`/api/posts/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: emoji }),
      });

      if (response.ok) {
        const { post } = await response.json();
        setPosts((prevPosts) =>
          prevPosts.map((p) => (p._id === postId ? post : p))
        );
        setFilteredPosts((prevPosts) =>
          prevPosts.map((p) => (p._id === postId ? post : p))
        );
        if (expandedPost?._id === postId) {
          setExpandedPost(post);
        }
        toast.success("Reaction added!");
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error("Failed to add reaction");
    }
  };

  const handleCommentsModalTouchStart = (e) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    setDragCurrentY(e.touches[0].clientY);
  };

  const handleCommentsModalTouchMove = (e) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY;

    // Only allow dragging down (closing)
    if (deltaY > 0) {
      setCommentsModalHeight(
        Math.max(0, 80 - (deltaY / window.innerHeight) * 100)
      );
    }

    setDragCurrentY(currentY);
  };

  const handleCommentsModalTouchEnd = () => {
    if (!isDragging) return;

    const deltaY = dragCurrentY - dragStartY;
    const threshold = window.innerHeight * 0.2; // 20% of screen height

    if (deltaY > threshold) {
      // Close modal
      setShowCommentModal(false);
      setCommentsModalHeight(0);
    } else {
      // Snap back to open
      setCommentsModalHeight(80);
    }

    setIsDragging(false);
    setDragStartY(0);
    setDragCurrentY(0);
  };

  // Update the useEffect for showing comment modal:
  useEffect(() => {
    if (showCommentModal && isMobile) {
      setCommentsModalHeight(80);
      document.body.style.overflow = "hidden";
    } else {
      setCommentsModalHeight(0);
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showCommentModal, isMobile]);

  const handleInviteToGig = (author, post) => {
    console.log("🎯 handleInviteToGig called with:", { author, post });

    // Add null safety checks
    if (!author || !post || !post.author) {
      console.error("Missing required data for invite:", { author, post });
      toast.error("Unable to send invitation - missing data");
      return;
    }

    // Create postData object from the post parameter
    const postData = {
      postId: post._id,
      postTitle: post.title,
      postOwnerId: post.author._id,
    };

    console.log("🎯 Setting modal state:", {
      selectedPostAuthor: author,
      showInviteModal: true,
      postData,
    });

    setSelectedPostAuthor({ ...author, postData });
    setShowInviteModal(true);
  };

  const isVerticalVideo = (videoElement) => {
    if (!videoElement) return false;
    return videoElement.videoHeight > videoElement.videoWidth;
  };

  // Add navigation function
  const navigateToProfile = (userId, e) => {
    if (e) e.stopPropagation();
    router.push(`/dashboard/profile/${userId}`);
  };

  const handleDelete = async (postId) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const response = await fetch(`/api/posts/${postId}/delete`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPosts((prevPosts) => prevPosts.filter((p) => p._id !== postId));
        setFilteredPosts((prevPosts) =>
          prevPosts.filter((p) => p._id !== postId)
        );
        setShowDesktopModal(false);
        setExpandedPost(null);
        toast.success("Post deleted successfully!");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const handlePostClick = (post, index) => {
    // Always navigate to post detail page for both mobile and desktop
    router.push(`/dashboard/post/${post._id}`);
  };

  // Mobile comment handler - navigate to post detail page
  const handleMobileCommentClick = (e, post) => {
    e.stopPropagation();
    router.push(`/dashboard/post/${post._id}`);
  };

  const postsToDisplay =
    searchQuery.trim() || activeFilters.some((f) => f.type === "sort")
      ? filteredPosts
      : posts;
  const filteredOutPosts = postsToDisplay.filter(
    (post) => !(post.category === "Portfolio" && post.subCategory === "Project")
  );

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
          ? Math.min(filteredOutPosts.length - 1, currentMobileIndex + 1)
          : Math.max(0, currentMobileIndex - 1);

      if (newIndex !== currentMobileIndex) {
        pauseAllVideos();

        setCurrentMobileIndex(newIndex);
        const newPost = filteredOutPosts[newIndex];
        setExpandedPost(newPost);

        setTimeout(() => {
          if (newPost.videos?.[0]) {
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
    [currentMobileIndex, filteredOutPosts, pauseAllVideos, playCurrentVideo]
  );

  // Enhanced touch handlers with horizontal swipe support
  const handleTouchStart = useCallback((e) => {
    if (isScrolling.current) {
      e.preventDefault();
      return;
    }

    // Prevent browser back gesture
    e.preventDefault();

    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchStartX.current = touch.clientX;
    touchStartTime.current = Date.now();

    // Reset horizontal swipe states
    setHorizontalSwipeStartX(touch.clientX);
    setHorizontalSwipeStartY(touch.clientY);
    setIsHorizontalSwiping(false);
    setSwipeDistance(0);
    horizontalSwipeRef.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      // Always prevent default to stop browser navigation
      e.preventDefault();

      if (isScrolling.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - horizontalSwipeStartX;
      const deltaY = touch.clientY - horizontalSwipeStartY;

      // Determine if this is a horizontal or vertical swipe
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // If we haven't determined the swipe direction yet
      if (!horizontalSwipeRef.current && !isScrolling.current) {
        // If horizontal movement is greater than vertical and exceeds threshold
        if (absDeltaX > 30 && absDeltaX > absDeltaY * 1.5) {
          horizontalSwipeRef.current = true;
          setIsHorizontalSwiping(true);
        }
        // If vertical movement is greater, it's a vertical scroll
        else if (absDeltaY > 30 && absDeltaY > absDeltaX * 1.5) {
          // This will be handled by vertical scroll logic
          return;
        }
      }

      // Handle horizontal swipe
      if (horizontalSwipeRef.current && isHorizontalSwiping) {
        setSwipeDistance(deltaX);

        // Visual feedback - you can add a subtle transform here if desired
        // For example, slightly moving the content or showing an indicator
      }
    },
    [horizontalSwipeStartX, horizontalSwipeStartY, isHorizontalSwiping]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      // Always prevent default
      e.preventDefault();

      if (isScrolling.current) {
        return;
      }

      const touch = e.changedTouches[0];
      const touchEndY = touch.clientY;
      const touchEndX = touch.clientX;
      const touchEndTime = Date.now();

      const deltaY = touchStartY.current - touchEndY;
      const deltaX = touchEndX - horizontalSwipeStartX;
      const deltaTime = touchEndTime - touchStartTime.current;

      // Handle horizontal swipe (left to right for invite modal)
      if (horizontalSwipeRef.current && isHorizontalSwiping) {
        const minHorizontalSwipeDistance = 100;
        const maxSwipeTime = 800;

        if (
          Math.abs(deltaX) > minHorizontalSwipeDistance &&
          deltaTime < maxSwipeTime
        ) {
          const currentPost = filteredOutPosts[currentMobileIndex];

          // Right swipe (deltaX > 0) - open invite modal
          if (deltaX > 0 && shouldShowInviteButton(currentPost?.author)) {
            handleInviteToGig(currentPost.author, currentPost);
          }
          // Left swipe (deltaX < 0) - you can add other actions here
          else if (deltaX < 0) {
            // Optional: Add other actions for left swipe
            // For example: share, bookmark, etc.
            console.log("Left swipe detected - you can add actions here");
          }
        }

        // Reset horizontal swipe states
        setIsHorizontalSwiping(false);
        setSwipeDistance(0);
        horizontalSwipeRef.current = false;
        return;
      }

      // Handle vertical swipe (existing logic)
      const absDeltaY = Math.abs(deltaY);
      const absDeltaX = Math.abs(deltaX);

      // Only process vertical swipes if it's primarily vertical movement
      const minSwipeDistance = 80;
      const maxSwipeTime = 500;
      const minSwipeTime = 100;

      if (
        absDeltaY > minSwipeDistance &&
        deltaTime > minSwipeTime &&
        deltaTime < maxSwipeTime &&
        absDeltaY > absDeltaX
      ) {
        const direction = deltaY > 0 ? "down" : "up";
        handleMobileScroll(direction);
      }

      // Reset all swipe states
      setIsHorizontalSwiping(false);
      setSwipeDistance(0);
      horizontalSwipeRef.current = false;
    },
    [
      handleMobileScroll,
      horizontalSwipeStartX,
      currentMobileIndex,
      filteredOutPosts,
      shouldShowInviteButton,
      handleInviteToGig,
    ]
  );

  const closeMobileView = () => {
    pauseAllVideos();
    setExpandedPost(null);
    setCurrentMobileIndex(0);
    currentVideoRef.current = null;
  };

  // Initial fetch and effects
  useEffect(() => {
    fetchPosts(1, true);
  }, []);

  // Prevent browser back navigation on mobile
  useEffect(() => {
    if (isMobile && expandedPost && !showCommentModal) {
      // Disable browser back gesture
      const preventDefault = (e) => {
        e.preventDefault();
      };

      // Add event listeners to prevent browser navigation
      document.addEventListener("touchstart", preventDefault, {
        passive: false,
      });
      document.addEventListener("touchmove", preventDefault, {
        passive: false,
      });

      // Push a dummy state to prevent back navigation
      window.history.pushState(null, "", window.location.href);

      const handlePopState = () => {
        // Instead of going back, close the reel view
        closeMobileView();
      };

      window.addEventListener("popstate", handlePopState);

      return () => {
        document.removeEventListener("touchstart", preventDefault);
        document.removeEventListener("touchmove", preventDefault);
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [isMobile, expandedPost, showCommentModal, closeMobileView]);

  useEffect(() => {
    const categoryFilter = activeFilters.find((f) => f.type === "category");
    const subcategoryFilter = activeFilters.find(
      (f) => f.type === "subcategory"
    );

    if (categoryFilter || subcategoryFilter) {
      setPosts([]);
      setPage(1);
      setHasMore(true);
      fetchPosts(1, true);
    }
  }, [
    activeFilters.find((f) => f.type === "category")?.value,
    activeFilters.find((f) => f.type === "subcategory")?.value,
  ]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  useEffect(() => {
    if (
      !hasMore ||
      searchQuery.trim() ||
      activeFilters.some((f) => f.type === "sort")
    )
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingRef.current) {
          fetchPosts(page + 1);
        }
      },
      { rootMargin: "0px 0px 200px 0px" }
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [fetchPosts, hasMore, page, searchQuery, activeFilters]);

  // Cleanup videos when component unmounts
  useEffect(() => {
    return () => {
      pauseAllVideos();
    };
  }, [pauseAllVideos]);

  // Sync follow status when returning to page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && session?.user?.id) {
        // Refresh follow status when page becomes visible
        const refreshFollowStatus = async () => {
          try {
            const response = await fetch(`/api/profile/${session.user.id}`);
            const data = await response.json();
            if (response.ok && data.user?.following) {
              setFollowingUsers(new Set(data.user.following));
            }
          } catch (error) {
            console.error("Error refreshing follow status:", error);
          }
        };
        refreshFollowStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [session?.user?.id]);

  const hasUserLiked = (post) => {
    return post?.likes?.some((l) => l?.user?._id === session?.user?.id);
  };

  const isOwnPost = (post) => {
    return post?.author?._id === session?.user?.id;
  };

  // Get all media for the expanded post
  const getAllMedia = (post) => {
    if (!post) return [];
    return [
      ...(post.videos || []).map((url) => ({ type: "video", url })),
      ...(post.images || []).map((url) => ({ type: "image", url })),
    ];
  };

  // FIXED MOBILE FULL-SCREEN REEL VIEW
  if (isMobile && expandedPost && !showCommentModal) {
    return (
      <>
        {" "}
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
            style={{
              touchAction: "none",
              overscrollBehavior: "none",
            }}
          >
            {filteredOutPosts.map((post, index) => {
              const mediaUrl = post.videos?.[0] || post.images?.[0];
              const isVideo = !!post.videos?.[0];
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
                        title="Go to Dashboard"
                      >
                        <ArrowLeft className="h-8 w-8" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 mt-12">
                      {/* Show Invite button for hiring users viewing freelancer posts */}
                      {shouldShowInviteButton(post.author) && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInviteToGig(post.author, post);
                          }}
                          size="sm"
                          className="bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 text-sm font-medium rounded-full"
                        >
                          <Briefcase className="h-4 w-4 mr-1" />
                          Invite
                        </Button>
                      )}

                      {/* Mute/Unmute Button */}
                      {isCurrentPost && isVideo && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleMute}
                          className="text-white hover:bg-white/20 bg-black/40 rounded-full"
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted ? (
                            <VolumeX className="h-6 w-6" />
                          ) : (
                            <Volume2 className="h-6 w-6" />
                          )}
                        </Button>
                      )}
                    </div>
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

                          {/* Swipe Indicator for Invite Feature */}
                          {/* {shouldShowInviteButton(post.author) && (
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                              <div
                                className={cn(
                                  "bg-black/60 rounded-full p-3 transition-all duration-300",
                                  isHorizontalSwiping && swipeDistance > 50
                                    ? "scale-110 bg-green-500/80"
                                    : "scale-100"
                                )}
                                style={{
                                  transform: `translateX(${Math.max(
                                    0,
                                    swipeDistance * 0.3
                                  )}px)`,
                                  opacity: isHorizontalSwiping ? 1 : 0.7,
                                }}
                              >
                                <Briefcase className="h-5 w-5 text-white" />
                              </div>
                              {!isHorizontalSwiping && (
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                                  <div className="text-white text-xs bg-black/60 rounded px-2 py-1 whitespace-nowrap">
                                    Swipe →
                                  </div>
                                </div>
                              )}
                            </div>
                          )} */}

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
                                onClick={(e) =>
                                  handleMobileCommentClick(e, post)
                                }
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

                                <div className="mb-2 font-medium">
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
                                      onClick={() =>
                                        toggleDescription(post._id)
                                      }
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
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <div className="pointer-events-auto">
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
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Search Filter Component */}
      <SearchFilter
        onSearch={handleSearch}
        onFilter={handleFilter}
        searchPlaceholder="Search posts by title, description, tags, or author..."
      />

      <div className="px-4 py-6">
        {loading && filteredOutPosts.length === 0 ? (
          <div className="text-center text-gray-500 col-span-full">
            Loading posts...
          </div>
        ) : filteredOutPosts.length === 0 && !loading ? (
          <div className="text-center text-gray-500 col-span-full">
            {searchQuery.trim() || activeFilters.length > 0
              ? "No posts found matching your search criteria."
              : "No posts found. Create one!"}
          </div>
        ) : (
          <div className="relative">
            {/* Masonry Layout */}
            <Masonry
              breakpointCols={{
                default: 4,
                1100: 3,
                768: 2,
                500: 2,
              }}
              className="my-masonry-grid"
              columnClassName="my-masonry-grid_column"
            >
              {filteredOutPosts.map((post, index) => {
                const mediaUrl = post.videos?.[0] || post.images?.[0];
                const isVideo = !!post.videos?.[0];
                const isOwnProfile = post.author?._id === session?.user?.id;

                if (!mediaUrl) return null;

                return (
                  <Card
                    key={post._id}
                    className="bg-gray-900 border border-gray-800 shadow-lg transition-all cursor-pointer overflow-hidden mb-4 hover:border-green-500/30 hover:scale-[1.02]"
                    onClick={() => handlePostClick(post, index)}
                  >
                    <CardContent className="p-0 relative group">
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

                        {/* Desktop Invite Button */}
                        {/* {!isMobile && !isOwnProfile && (
                          <div className="absolute top-2 left-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInviteToGig(post.author);
                              }}
                              size="sm"
                              className="bg-green-500 text-white hover:bg-green-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Briefcase className="h-4 w-4 mr-1" />
                              Invite to Gig
                            </Button>
                          </div>
                        )} */}

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
                                    router.push(`/dashboard/post/${post._id}`);
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
                                <Badge className="inline-block bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
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
                );
              })}
            </Masonry>
          </div>
        )}

        {/* Loading states */}
        {fetchingMore &&
          !searchQuery.trim() &&
          !activeFilters.some((f) => f.type === "sort") && (
            <div className="text-center text-gray-500 py-4">
              Loading more posts...
            </div>
          )}

        {!hasMore &&
          !loading &&
          !fetchingMore &&
          filteredOutPosts.length > 0 &&
          !searchQuery.trim() &&
          !activeFilters.some((f) => f.type === "sort") && (
            <div className="text-center text-gray-500 py-4">
              You've reached the end of the posts.
            </div>
          )}

        {/* Intersection observer target for infinite scroll */}
        {!searchQuery.trim() &&
          !activeFilters.some((f) => f.type === "sort") && (
            <div ref={observerTarget} className="h-1" />
          )}
      </div>

      {isMobile && showCommentModal && expandedPost && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300"
            style={{
              opacity: commentsModalHeight > 0 ? 1 : 0,
              pointerEvents: commentsModalHeight > 0 ? "auto" : "none",
            }}
            onClick={() => setShowCommentModal(false)}
          />

          {/* Comments Modal */}
          <div
            ref={commentsModalRef}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] transition-transform duration-300 ease-out shadow-2xl"
            style={{
              height: `${commentsModalHeight}vh`,
              transform: isDragging
                ? "none"
                : `translateY(${100 - commentsModalHeight}%)`,
              maxHeight: "80vh",
            }}
            onTouchStart={handleCommentsModalTouchStart}
            onTouchMove={handleCommentsModalTouchMove}
            onTouchEnd={handleCommentsModalTouchEnd}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3 bg-white rounded-t-3xl">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Comments
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {expandedPost.comments?.length || 0}
                  </span>
                  <button
                    onClick={() => setShowCommentModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white comments-scroll">
              <div className="px-4 py-3 space-y-4">
                {(() => {
                  console.log(
                    "Rendering comments section, expandedPost:",
                    expandedPost
                  );
                  console.log("Comments array:", expandedPost?.comments);

                  if (
                    !expandedPost?.comments ||
                    expandedPost.comments.length === 0
                  ) {
                    return (
                      <div className="text-center py-12">
                        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          No comments yet
                        </h4>
                        <p className="text-gray-500">
                          Be the first to share what you think!
                        </p>
                      </div>
                    );
                  }

                  return expandedPost.comments.map((comment, i) => {
                    console.log(`Rendering comment ${i}:`, comment);

                    // Handle multiple possible comment structures
                    const commentText = comment.content || comment.text || "";
                    const commentUser = comment.user || {};
                    const commentId =
                      comment._id || comment.id || `comment-${i}`;
                    const createdAt = comment.createdAt || new Date();

                    console.log(`Comment ${i} data:`, {
                      commentText,
                      commentUser,
                      commentId,
                      createdAt,
                    });

                    return (
                      <div
                        key={`${commentId}-${i}-${Date.now()}`}
                        className="flex gap-3"
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={commentUser.image} />
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                            {commentUser.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 rounded-2xl px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {commentUser.name || "Anonymous"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 break-words leading-relaxed">
                              {commentText || "[No comment text]"}
                            </p>
                          </div>

                          {/* Comment Actions */}
                          <div className="flex items-center gap-4 mt-2 px-3">
                            <button className="text-xs text-gray-500 font-medium hover:text-gray-700 transition-colors">
                              Like
                            </button>
                            <button className="text-xs text-gray-500 font-medium hover:text-gray-700 transition-colors">
                              Reply
                            </button>
                            <span className="text-xs text-gray-400">
                              {new Date(createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Comment Input - Fixed at bottom */}
            <div className="border-t border-gray-100 bg-white p-4 safe-area-pb mb-10">
              <div className="flex items-end gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={session?.user?.image} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    {session?.user?.name?.charAt(0) || (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 relative">
                  <Textarea
                    placeholder={`Reply to ${expandedPost.author?.name}...`}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full border border-gray-200 rounded-full px-4 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 placeholder-gray-500 pr-12 comments-textarea"
                    rows={1}
                    style={{
                      minHeight: "36px",
                      maxHeight: "100px",
                    }}
                    onInput={(e) => {
                      // Auto-resize textarea
                      e.target.style.height = "auto";
                      e.target.style.height =
                        Math.min(e.target.scrollHeight, 100) + "px";
                    }}
                    onKeyPress={(e) => {
                      // Send comment on Enter (but allow Shift+Enter for new line)
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (commentText.trim()) {
                          handleComment(expandedPost._id);
                        }
                      }
                    }}
                  />

                  {/* Send Button */}
                  <button
                    onClick={() => handleComment(expandedPost._id)}
                    disabled={!commentText.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full bg-blue-500 text-white disabled:bg-gray-300 disabled:text-gray-500 transition-all hover:bg-blue-600 disabled:hover:bg-gray-300"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quick Reactions */}
              <div className="flex items-center gap-4 mt-3 px-11">
                <button
                  onClick={() => handleEmojiReaction(expandedPost._id, "❤️")}
                  className="text-2xl hover:scale-110 transition-transform active:scale-95"
                >
                  ❤️
                </button>
                <button
                  onClick={() => handleEmojiReaction(expandedPost._id, "🔥")}
                  className="text-2xl hover:scale-110 transition-transform active:scale-95"
                >
                  🔥
                </button>
                <button
                  onClick={() => handleEmojiReaction(expandedPost._id, "👏")}
                  className="text-2xl hover:scale-110 transition-transform active:scale-95"
                >
                  👏
                </button>
                <button
                  onClick={() => handleEmojiReaction(expandedPost._id, "😍")}
                  className="text-2xl hover:scale-110 transition-transform active:scale-95"
                >
                  😍
                </button>
                <button
                  onClick={() => handleEmojiReaction(expandedPost._id, "💯")}
                  className="text-2xl hover:scale-110 transition-transform active:scale-95"
                >
                  💯
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Post Creation Modal */}
      {isOpen && (
        <PostModal
          onClose={closeModal}
          onSuccess={() => {
            setPosts([]);
            setPage(1);
            setHasMore(true);
            fetchPosts(1, true);
          }}
        />
      )}

      {showWelcomeModal && (
        <WelcomePopup
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}

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

      {/* Custom CSS */}
      <style jsx global>{`
        /* Masonry Grid Styles */
        .my-masonry-grid {
          display: flex;
          margin-left: -16px;
          width: auto;
        }
        .my-masonry-grid_column {
          padding-left: 16px;
          background-clip: padding-box;
        }

        .my-masonry-grid_column > div {
          margin-bottom: 16px;
        }

        /* Custom scrollbar for webkit browsers */
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .scrollbar-thumb-green-600\/30::-webkit-scrollbar-thumb {
          background-color: rgba(34, 197, 94, 0.3);
          border-radius: 3px;
        }
        .scrollbar-track-black\/50::-webkit-scrollbar-track {
          background-color: rgba(0, 0, 0, 0.5);
        }

        /* Smooth transitions for grid layout */
        .grid > * {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Prevent default touch behaviors on mobile reel view */
        .mobile-reel-container {
          touch-action: none;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: none;
        }

        /* Prevent pull-to-refresh and other browser behaviors */
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

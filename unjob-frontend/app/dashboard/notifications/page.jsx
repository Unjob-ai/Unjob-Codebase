"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, MessageSquare, ExternalLink } from "lucide-react";

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [summary, setSummary] = useState({});

  useEffect(() => {
    if (session?.user?.id) fetchNotifications();
    // eslint-disable-next-line
  }, [session]);

  // --- Fetch notifications from API ---
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url =
        activeTab === "unread"
          ? "/api/notifications?unreadOnly=true"
          : "/api/notifications";
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.success) {
        setNotifications(data.notifications || []);
        setSummary(data.summary || {});
      } else {
        toast.error(data.error || "Failed to fetch notifications");
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("An error occurred while fetching notifications.");
    } finally {
      setLoading(false);
    }
  };

  // --- Mark all as read ---
  const handleMarkAllRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("All notifications marked as read");
        fetchNotifications();
      } else {
        toast.error(data.error || "Failed to mark all as read");
      }
    } catch (err) {
      toast.error("Error marking notifications");
    }
  };

  // --- Filtering & tab logic ---
  useEffect(() => {
    if (session?.user?.id) fetchNotifications();
    // eslint-disable-next-line
  }, [activeTab]);

  const totalUnreadCount =
    summary.unread !== undefined
      ? summary.unread
      : notifications.reduce((sum, n) => (n.read ? sum : sum + 1), 0);

  // --- Search Filtering ---
  const filteredNotifications = notifications.filter((n) => {
    const displayText =
      n.title?.toLowerCase() +
      (n.message?.toLowerCase() ?? "") +
      (n.type?.toLowerCase() ?? "");
    return displayText.includes(searchQuery.toLowerCase());
  });

  // --- Time formatting ---
  const formatTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return `${minutes} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return notificationDate.toLocaleDateString();
    }
  };

  // --- Handle notification click (FIXED - Always same page navigation) ---
  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if unread
      if (!notification.read) {
        const response = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notification._id }),
        });

        if (response.ok) {
          // Update local state immediately for better UX
          setNotifications((prev) =>
            prev.map((n) =>
              n._id === notification._id ? { ...n, read: true } : n
            )
          );
        }
      }

      // Always navigate in the same page/tab
      if (notification.actionUrl) {
        // For external URLs, navigate to them in the same page
        if (notification.actionUrl.startsWith("http")) {
          // Use window.location.href for same-page external navigation
          window.location.href = notification.actionUrl;
        } else {
          // Internal path - use router (same page)
          router.push(notification.actionUrl);
        }
      } else {
        // Fallback navigation based on notification type
        const fallbackRoutes = {
          post_like: "/dashboard/posts",
          post_comment: "/dashboard/posts",
          post_gig_invitation: "/dashboard/posts",
          gig_application: "/dashboard/gigs",
          priority_gig_application: "/dashboard/gigs",
          gig_accepted: "/dashboard/applications",
          gig_rejected: "/dashboard/applications",
          project_submission: "/dashboard/projects",
          project_status_update: "/dashboard/projects",
          subscription_activated: "/dashboard/settings/subscription",
          subscription_reminder: "/dashboard/settings/subscription",
          subscription_expired: "/dashboard/settings/subscription",
          payment_completed: "/dashboard/payments",
          payment_failed: "/dashboard/payments",
          payment_request_submitted: "/dashboard/payments",
          payment_request_approved: "/dashboard/payments",
          message: "/dashboard/messages",
          welcome: "/dashboard/profile",
          profile_incomplete: "/dashboard/profile",
          invoice: "/dashboard/payments",
        };

        const fallbackRoute = fallbackRoutes[notification.type] || "/dashboard";
        router.push(fallbackRoute);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
      toast.error("Error processing notification");
    }
  };

  // --- Mark single notification as read ---
  const markAsRead = async (notificationId, e) => {
    e.stopPropagation(); // Prevent triggering the main click handler

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
        );
        toast.success("Marked as read");
      }
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Error marking as read");
    }
  };

  // --- Get notification icon based on type ---
  const getNotificationIcon = (type) => {
    const icons = {
      post_like: "❤️",
      post_comment: "💬",
      post_gig_invitation: "🎯",
      gig_application: "📄",
      priority_gig_application: "🔥",
      gig_accepted: "🎉",
      gig_rejected: "❌",
      project_submission: "📤",
      project_status_update: "📋",
      subscription_activated: "🚀",
      subscription_reminder: "⏰",
      subscription_expired: "❗",
      payment_completed: "💰",
      payment_failed: "❌",
      payment_request_submitted: "💳",
      payment_request_approved: "✅",
      message: "💬",
      welcome: "🎉",
      profile_incomplete: "📝",
      invoice: "📧",
    };
    return icons[type] || "🔔";
  };

  // --- Render Loading State ---
  if (loading) {
    return (
      <div className="flex h-screen bg-black">
        <div className="w-full md:w-1/2 flex items-center justify-center text-white border-r border-green-600/30">
          Loading Notifications...
        </div>
        <div className="hidden md:block w-1/2 bg-black"></div>
      </div>
    );
  }

  // --- Main Page JSX ---
  return (
    <div className="flex h-screen bg-black overflow-x-hidden">
      {/* Left Panel */}
      <div className="w-full md:w-1/2 flex flex-col text-white border-r border-green-600/30">
        {/* Header */}
        <div className="px-4 py-3 border-b border-green-600/30 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/messages")}
              className="text-green-400 hover:text-green-300 hover:bg-green-900/20 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-white">NOTIFICATIONS</h1>
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                className="text-green-400 hover:text-green-300 text-sm"
                onClick={handleMarkAllRead}
              >
                Mark all as read
              </Button>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex space-x-8 text-sm font-medium mb-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-2 border-b-2 transition-all ${
                activeTab === "all"
                  ? "text-green-400 border-green-400"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              All Notifications
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`pb-2 border-b-2 flex items-center gap-2 transition-all ${
                activeTab === "unread"
                  ? "text-green-400 border-green-400"
                  : "text-gray-400 border-transparent hover:text-white"
              }`}
            >
              Unread
              {totalUnreadCount > 0 && (
                <Badge className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {totalUnreadCount}
                </Badge>
              )}
            </button>
          </div>
          {/* Search Bar */}
          <div className="relative flex items-center rounded-full bg-gray-900 border border-gray-700 px-4 py-2">
            <Search className="text-gray-400 mr-3 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search notifications…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            />
          </div>
        </div>
        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {filteredNotifications.length > 0 ? (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`flex items-start gap-4 p-3 hover:bg-gray-900/50 rounded-lg cursor-pointer transition-colors relative group ${
                    notification.read ? "" : "bg-gray-900/40"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-12 h-12 ring-2 ring-green-400/20">
                      <AvatarImage
                        src={notification.avatar || "/placeholder.svg"}
                        alt={notification.title}
                      />
                      <AvatarFallback className="bg-gray-700 text-white text-sm">
                        {getNotificationIcon(notification.type)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-white font-medium text-sm truncate">
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {formatTime(notification.createdAt)}
                        </span>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {notification.message || "New notification"}
                    </p>
                    {notification.actionUrl && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-green-400">
                        <ExternalLink className="w-3 h-3" />
                        <span>Click to view</span>
                      </div>
                    )}
                  </div>
                  {/* Mark as read button for unread notifications */}
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-green-400 hover:text-green-300 p-1 h-auto"
                      onClick={(e) => markAsRead(notification._id, e)}
                    >
                      ✓
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <MessageSquare className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-white font-medium mb-2">
                {searchQuery
                  ? "No notifications found"
                  : "No new notifications"}
              </h3>
              <p className="text-gray-400 text-sm">
                {searchQuery
                  ? "Try a different search term."
                  : "New notifications will appear here."}
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Right Panel */}
      <div className="hidden md:block w-1/2 bg-black"></div>
    </div>
  );
}

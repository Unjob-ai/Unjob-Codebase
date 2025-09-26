
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ArrowLeft,
  Bell,
  MessageSquare,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export function ChatList({
  conversations = [],
  activeConversation,
  onConversationSelect,
  onBack,
  onlineUsers,
  isUserOnline,
  session,
  isMobile = false,
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({});

  useEffect(() => {
    if (showNotifications && session?.user?.id) {
      fetchNotifications();
    }
  }, [showNotifications, session, activeTab]);

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
        toast.success(`Marked ${data.updatedCount} notifications as read`);
        fetchNotifications(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to mark all as read");
      }
    } catch (err) {
      toast.error("Error marking notifications as read");
    }
  };

  // --- Clear all read notifications ---
  const handleClearReadNotifications = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all read notifications? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/notifications?deleteRead=true", {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Deleted ${data.deletedCount} read notifications`);
        fetchNotifications(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to clear read notifications");
      }
    } catch (err) {
      toast.error("Error clearing read notifications");
    }
  };

  // --- Delete specific notification ---
  const handleDeleteNotification = async (notificationId, event) => {
    event.stopPropagation(); // Prevent triggering the click handler

    try {
      const response = await fetch(
        `/api/notifications?notificationId=${notificationId}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Notification deleted");
        setNotifications((prev) =>
          prev.filter((n) => n._id !== notificationId)
        );
      } else {
        toast.error(data.error || "Failed to delete notification");
      }
    } catch (err) {
      toast.error("Error deleting notification");
    }
  };

  // --- Handle notification click with redirect ---
  const handleNotificationItemClick = async (notification) => {
    try {
      // Mark as read if unread
      if (!notification.read) {
        const response = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: notification._id }),
        });

        if (response.ok) {
          // Update local state
          setNotifications((prev) =>
            prev.map((n) =>
              n._id === notification._id ? { ...n, read: true } : n
            )
          );
        }
      }

      // Handle redirect based on notification type and actionUrl
      if (notification.actionUrl) {
        // Close notifications panel
        setShowNotifications(false);

        // Navigate to the action URL
        router.push(notification.actionUrl);
        toast.success("Redirecting...");
      } else {
        // Default redirects based on notification type
        switch (notification.type) {
          case "post_like":
          case "post_comment":
            if (notification.relatedId) {
              setShowNotifications(false);
              router.push(`/dashboard/post/${notification.relatedId}`);
            }
            break;

          case "gig_application":
          case "priority_gig_application":
            if (notification.relatedId) {
              setShowNotifications(false);
              router.push(
                `/dashboard/gigs/${notification.relatedId}/applications`
              );
            }
            break;

          case "gig_accepted":
          case "gig_rejected":
            setShowNotifications(false);
            router.push("/dashboard/settings/freelancer?view=projects");
            break;

          case "project_submission":
          case "project_status_update":
            if (notification.relatedId) {
              setShowNotifications(false);
              router.push(`/dashboard/projects/${notification.relatedId}`);
            }
            break;

          case "message":
            if (notification.relatedId) {
              setShowNotifications(false);
              router.push(`/dashboard/messages/${notification.relatedId}`);
            }
            break;

          case "payment_completed":
          case "payment_failed":
          case "payment_request_approved":
            setShowNotifications(false);
            router.push("/dashboard/payments");
            break;

          case "subscription_activated":
          case "subscription_reminder":
          case "subscription_expired":
            setShowNotifications(false);
            router.push("/dashboard/settings/subscription");
            break;

          case "welcome":
          case "profile_incomplete":
            setShowNotifications(false);
            router.push("/dashboard/profile");
            break;

          default:
            toast.info("Notification details viewed");
            break;
        }
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
      toast.error("Error processing notification");
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const icons = {
      post_like: "❤️",
      post_comment: "💬",
      gig_application: "📄",
      priority_gig_application: "🔥",
      gig_accepted: "🎉",
      gig_rejected: "❌",
      project_submission: "📤",
      project_status_update: "📋",
      message: "💬",
      payment_completed: "💰",
      payment_failed: "❌",
      payment_request_approved: "✅",
      subscription_activated: "🚀",
      subscription_reminder: "⏰",
      subscription_expired: "❗",
      welcome: "🎉",
      profile_incomplete: "📝",
    };
    return icons[type] || "🔔";
  };

  // Rest of your existing helper functions remain the same...
  const getOtherParticipant = (conversation) => {
    return conversation?.participants?.find((p) => p._id !== session?.user?.id);
  };

  const getUnreadCount = (conversation) => conversation.unreadCount || 0;

  const formatLastMessage = (message) => {
    if (!message) return "No messages yet";
    if (message.type === "file") return "📎 File attachment";
    if (message.type === "project_submission") return "📋 Project submitted";
    return message.content || "Message";
  };

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMs = now - messageDate;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return `${minutes} min ago`;
    } else if (diffInDays < 1) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  // Calculate total unread count
  const conversationUnreadCount = conversations.reduce(
    (sum, conv) => sum + getUnreadCount(conv),
    0
  );

  const notificationUnreadCount =
    summary.unread !== undefined
      ? summary.unread
      : notifications.reduce((sum, n) => (n.read ? sum : sum + 1), 0);

  const totalUnreadCount = showNotifications
    ? notificationUnreadCount
    : conversationUnreadCount;

  // Filtering logic remains the same...
  const filteredConversations = conversations.filter((conv) => {
    const otherParticipant = getOtherParticipant(conv);
    const matchesSearch = otherParticipant?.name
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (activeTab === "unread") {
      return matchesSearch && getUnreadCount(conv) > 0;
    }
    return matchesSearch;
  });

  const filteredNotifications = notifications.filter((n) => {
    const displayText =
      n.title?.toLowerCase() +
      (n.message?.toLowerCase() ?? "") +
      (n.type?.toLowerCase() ?? "");
    const matchesSearch = displayText.includes(searchQuery.toLowerCase());

    if (activeTab === "unread") {
      return matchesSearch && !n.read;
    }
    return matchesSearch;
  });

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setActiveTab("all");
      setSearchQuery("");
    }
  };

  const handleConversationSelect = (conversation) => {
    if (showNotifications) {
      setShowNotifications(false);
    }
    onConversationSelect(conversation);
  };

  // Section grouping remains the same...
  const todayConversations = filteredConversations.filter((conv) => {
    const today = new Date();
    const lastActivity = new Date(conv.lastActivity);
    return today.toDateString() === lastActivity.toDateString();
  });

  const yesterdayConversations = filteredConversations.filter((conv) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastActivity = new Date(conv.lastActivity);
    return yesterday.toDateString() === lastActivity.toDateString();
  });

  const olderConversations = filteredConversations.filter((conv) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const lastActivity = new Date(conv.lastActivity);
    return lastActivity < yesterday;
  });

  // Render conversation item remains the same...
  const renderConversationItem = (conversation) => {
    const otherParticipant = getOtherParticipant(conversation);
    const unreadCount = getUnreadCount(conversation);
    const isOnline = isUserOnline(otherParticipant?._id);

    return (
      <div
        key={conversation._id}
        onClick={() => handleConversationSelect(conversation)}
        className={`flex items-start gap-3 rounded-xl cursor-pointer mb-2 px-2 py-2 transition
          ${
            activeConversation?._id === conversation._id
              ? "bg-green-900/30 border-l-4 border-green-400"
              : "hover:bg-gray-900/30"
          }
        `}
      >
        <div className="relative">
          <Avatar className="w-12 h-12 ring-2 ring-green-400/10">
            <AvatarImage
              src={otherParticipant?.image || "/placeholder.svg"}
              alt={otherParticipant?.name}
            />
            <AvatarFallback className="bg-gray-700 text-white text-sm">
              {otherParticipant?.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${
              isOnline ? "bg-green-400" : "bg-gray-600"
            }`}
          ></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-medium text-sm truncate">
                {otherParticipant?.name}
              </h4>
              {isOnline && (
                <span className="text-xs text-green-400">Online</span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {formatTime(conversation.lastActivity)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-sm text-gray-400 leading-relaxed truncate max-w-[70%]">
              {formatLastMessage(conversation.lastMessage)}
            </p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </Badge>
              )}
              {conversation.lastMessage?.sender?._id === session?.user?.id && (
                <span className="ml-1 text-xs">
                  {conversation.lastMessage?.status === "sent" && (
                    <span className="text-gray-500">✓</span>
                  )}
                  {conversation.lastMessage?.status === "delivered" && (
                    <span className="text-gray-400">✓✓</span>
                  )}
                  {conversation.lastMessage?.status === "read" && (
                    <span className="text-green-400">✓✓</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`bg-black border-r border-green-600/30 flex flex-col h-full ${
        isMobile ? "w-full" : "w-80"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-green-600/30 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-green-400 hover:text-green-300 hover:bg-green-900/20 p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Title */}
          <h1 className="text-xl font-semibold text-white flex-1">
            {showNotifications ? "NOTIFICATIONS" : "Messages"}
          </h1>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {showNotifications && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-400 hover:text-green-300 text-sm"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Read All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 text-sm"
                  onClick={handleClearReadNotifications}
                  title="Clear all read notifications"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Read
                </Button>
              </>
            )}


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
            {showNotifications ? "All Notifications" : "All Chat"}
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

        {/* Search Box */}
        <div className="relative flex items-center rounded-full bg-gray-900 border border-gray-700 px-4 py-2">
          <Search className="text-gray-400 mr-3 h-4 w-4" />
          <Input
            type="text"
            placeholder={showNotifications ? "Search notifications…" : "Search"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {/* Loading State */}
        {showNotifications && loading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            Loading notifications...
          </div>
        )}

        {/* Notifications Mode */}
        {showNotifications && !loading && (
          <>
            {filteredNotifications.length > 0 ? (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`flex items-start gap-4 p-3 hover:bg-gray-900/50 rounded-lg cursor-pointer transition-colors group ${
                      notification.read ? "" : "bg-gray-900/40"
                    }`}
                    onClick={() => handleNotificationItemClick(notification)}
                  >
                    <div className="text-2xl flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="text-white font-medium text-sm leading-tight">
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs text-gray-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) =>
                              handleDeleteNotification(notification._id, e)
                            }
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-auto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                        {notification.message || "New notification"}
                      </p>
                      {notification.actionUrl && (
                        <p className="text-xs text-green-400 mt-1">
                          Click to view details →
                        </p>
                      )}
                    </div>
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
          </>
        )}

        {/* Chat Mode - remains the same */}
        {!showNotifications && (
          <>
            {/* Your existing chat rendering logic remains unchanged */}
            {todayConversations.length > 0 && (
              <>
                <div className="text-sm text-gray-400 mb-2 px-2">Today</div>
                {todayConversations.map((conversation) =>
                  renderConversationItem(conversation)
                )}
              </>
            )}

            {yesterdayConversations.length > 0 && (
              <>
                <div className="text-sm text-gray-400 mb-2 px-2 mt-5">
                  Yesterday
                </div>
                {yesterdayConversations.map((conversation) =>
                  renderConversationItem(conversation)
                )}
              </>
            )}

            {olderConversations.length > 0 && (
              <>
                <div className="text-sm text-gray-400 mb-2 px-2 mt-5">
                  Older
                </div>
                {olderConversations.map((conversation) =>
                  renderConversationItem(conversation)
                )}
              </>
            )}

            {filteredConversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                <MessageSquare className="w-16 h-16 text-gray-600 mb-4" />
                <div className="text-gray-500 mb-2">No conversations found</div>
                <div className="text-sm text-gray-600">
                  {searchQuery
                    ? "Try a different search term"
                    : "Start a new conversation"}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

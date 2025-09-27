"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, MessageSquare } from "lucide-react";
import { toast } from "react-hot-toast";

export function NotificationPanel({ session, onBack, onChatSelect }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (session?.user?.id) fetchConversations();
    // eslint-disable-next-line
  }, [session, activeTab]);

  // --- Fetch conversations from API ---
  const fetchConversations = async () => {
    setLoading(true);
    try {
      // You can change '/api/conversations' to '/api/notifications' for normal notifications!
      const url =
        activeTab === "unread"
          ? "/api/conversations?unreadOnly=true"
          : "/api/conversations";
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok && data.success && data.conversations) {
        setConversations(data.conversations);
      } else {
        toast.error(data.error || "Failed to fetch notifications");
      }
    } catch (error) {
      toast.error("An error occurred while fetching notifications.");
    } finally {
      setLoading(false);
    }
  };

  // --- Mark all as read ---
  const handleMarkAllRead = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("All notifications marked as read");
        fetchConversations();
      } else {
        toast.error(data.error || "Failed to mark all as read");
      }
    } catch (err) {
      toast.error("Error marking notifications");
    }
  };

  // --- Helpers ---
  const getOtherParticipant = (conversation) =>
    conversation?.participants?.find((p) => p._id !== session?.user?.id);

  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMs = now - messageDate;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return `${minutes} min ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const getUnreadCount = (conversation) => conversation.unreadCount || 0;
  const totalUnreadCount = conversations.reduce(
    (sum, conv) => sum + getUnreadCount(conv),
    0
  );

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

  // --- Time Sections ---
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = (date) =>
    new Date(date).toDateString() === today.toDateString();
  const isYesterday = (date) =>
    new Date(date).toDateString() === yesterday.toDateString();

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white bg-black">
        Loading Notifications...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-green-600/30">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-green-400 hover:text-green-300 hover:bg-green-900/20 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
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
            All Notification
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`pb-2 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "unread"
                ? "text-green-400 border-green-400"
                : "text-gray-400 border-transparent hover:text-white"
            }`}
          >
            Un read
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
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
          />
        </div>
      </div>

      {/* Notification Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Today Section */}
        <div className="px-4 py-4">
          <h3 className="text-white font-medium mb-4">Today</h3>
          {filteredConversations
            .filter((conv) => isToday(conv.lastActivity))
            .map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const unreadCount = getUnreadCount(conversation);
              return (
                <div
                  key={conversation._id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-900/50 rounded-lg cursor-pointer transition-colors mb-2"
                  onClick={() =>
                    onChatSelect ? onChatSelect(conversation) : undefined
                  }
                >
                  <Avatar className="w-12 h-12 ring-2 ring-green-400/20">
                    <AvatarImage
                      src={otherParticipant?.image || "/placeholder.svg"}
                      alt={otherParticipant?.name}
                    />
                    <AvatarFallback className="bg-gray-700 text-white text-sm">
                      {otherParticipant?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-white font-medium text-sm">
                        {otherParticipant?.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {formatTime(conversation.lastActivity)}
                        </span>
                        {unreadCount > 0 && (
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {conversation.lastMessage?.type === "project_submission"
                        ? `📋 Project submitted: ${
                            conversation.lastMessage?.content || "New project"
                          }`
                        : conversation.lastMessage?.type === "file"
                        ? "📎 File attachment"
                        : conversation.lastMessage?.content || "New message"}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
        {/* Yesterday Section */}
        <div className="px-4 py-4 border-t border-gray-800/50">
          <h3 className="text-white font-medium mb-4">Yesterday</h3>
          {filteredConversations
            .filter((conv) => isYesterday(conv.lastActivity))
            .map((conversation) => {
              const otherParticipant = getOtherParticipant(conversation);
              const unreadCount = getUnreadCount(conversation);
              return (
                <div
                  key={conversation._id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-900/50 rounded-lg cursor-pointer transition-colors mb-2"
                  onClick={() =>
                    onChatSelect ? onChatSelect(conversation) : undefined
                  }
                >
                  <Avatar className="w-12 h-12 ring-2 ring-green-400/20">
                    <AvatarImage
                      src={otherParticipant?.image || "/placeholder.svg"}
                      alt={otherParticipant?.name}
                    />
                    <AvatarFallback className="bg-gray-700 text-white text-sm">
                      {otherParticipant?.name?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-white font-medium text-sm">
                        {otherParticipant?.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {formatTime(conversation.lastActivity)}
                        </span>
                        {unreadCount > 0 && (
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-1">
                      {conversation.lastMessage?.content || "No messages yet"}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
        {/* Empty state */}
        {filteredConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 px-4">
            <MessageSquare className="w-16 h-16 text-gray-600 mb-4" />
            <h3 className="text-white font-medium mb-2">
              {activeTab === "unread"
                ? "No unread notifications"
                : "No notifications"}
            </h3>
            <p className="text-gray-400 text-sm text-center">
              {searchQuery
                ? "Try a different search term"
                : activeTab === "unread"
                ? "You're all caught up!"
                : "New notifications will appear here"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

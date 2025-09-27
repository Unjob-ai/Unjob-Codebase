// components/messages/MessagesLayout.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChatList } from "./ChatList";
import { MessagePanel } from "./MessagePanel";
import { NotificationPanel } from "./NotificationPanel"; // Import NotificationPanel
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";

export function MessagesLayout() {
  const { data: session } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [userStatuses, setUserStatuses] = useState({});

  // UPDATED STATE FOR MOBILE - Added 'notifications' view
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState("chats"); // 'chats', 'conversation', 'notifications'

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
    if (session?.user) {
      initializeSocket();
      fetchConversations();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [session]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation._id);
      // Join conversation room
      if (socketRef.current) {
        socketRef.current.emit("joinConversation", activeConversation._id);
      }
    }
  }, [activeConversation]);

  const initializeSocket = () => {
    socketRef.current = io("https://unjob-socket.onrender.com", {
      query: {
        userId: session.user.id,
      },
    });

    // Connection events
    socketRef.current.on("connect", () => {
      console.log("Connected to socket server");
    });

    // User status events
    socketRef.current.on("userOnline", (userId) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
      setUserStatuses((prev) => ({ ...prev, [userId]: "online" }));
    });

    socketRef.current.on("userOffline", (userId) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setUserStatuses((prev) => ({ ...prev, [userId]: "offline" }));
    });

    // Message events
    socketRef.current.on("newMessage", (message) => {
      setMessages((prev) => [...prev, message]);
      updateConversationLastMessage(message);
    });

    // Typing events
    socketRef.current.on("userTyping", ({ userId, isTyping }) => {
      if (isTyping) {
        setTypingUsers((prev) => new Set([...prev, userId]));
      } else {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    });

    // Message status events
    socketRef.current.on("messageDelivered", ({ messageId, userId }) => {
      updateMessageStatus(messageId, "delivered", userId);
    });

    socketRef.current.on("messageRead", ({ messageId, userId }) => {
      updateMessageStatus(messageId, "read", userId);
    });
  };

  const updateConversationLastMessage = (message) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv._id === message.conversationId
          ? { ...conv, lastMessage: message, lastActivity: new Date() }
          : conv
      )
    );
  };

  const updateMessageStatus = (messageId, status, userId) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id === messageId) {
          const readBy = msg.readBy || [];
          const existingIndex = readBy.findIndex((r) => r.user === userId);

          if (existingIndex >= 0) {
            readBy[existingIndex] = {
              user: userId,
              readAt: new Date(),
              status,
            };
          } else {
            readBy.push({ user: userId, readAt: new Date(), status });
          }

          return { ...msg, readBy, status };
        }
        return msg;
      })
    );
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      const data = await response.json();

      if (response.ok && data.success) {
        setConversations(data.conversations);
        // Don't auto-select conversation on mobile to show chat list first
        if (data.conversations.length > 0 && !activeConversation && !isMobile) {
          setActiveConversation(data.conversations[0]);
        }
      } else {
        toast.error("Failed to fetch conversations");
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to fetch conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setMessages(data.messages);
        // Mark messages as read
        markMessagesAsRead(conversationId);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      await fetch(`/api/messages/${conversationId}/read`, {
        method: "POST",
      });

      // Emit read event via socket
      if (socketRef.current) {
        socketRef.current.emit("markAsRead", { conversationId });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleConversationSelect = (conversation) => {
    // Leave previous conversation room
    if (activeConversation && socketRef.current) {
      socketRef.current.emit("leaveConversation", activeConversation._id);
    }

    setActiveConversation(conversation);

    // For mobile, switch to conversation view
    if (isMobile) {
      setActiveView("conversation");
    }
  };

  const handleSendMessage = async (content) => {
    if (!activeConversation) return;

    try {
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        conversationId: activeConversation._id,
        sender: {
          _id: session.user.id,
          name: session.user.name,
          image: session.user.image,
        },
        content,
        type: "text",
        createdAt: new Date(),
        status: "sending",
        readBy: [],
      };

      // Optimistically add message
      setMessages((prev) => [...prev, tempMessage]);

      const response = await fetch(`/api/messages/${activeConversation._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          type: "text",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Replace temp message with real message
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempMessage._id
              ? { ...data.message, status: "sent" }
              : msg
          )
        );

        // Emit message via socket
        if (socketRef.current) {
          socketRef.current.emit("sendMessage", {
            ...data.message,
            conversation: activeConversation,
          });
        }

        // Update conversation list
        updateConversationLastMessage(data.message);
      } else {
        // Remove temp message on error
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== tempMessage._id)
        );
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleTyping = (isTyping) => {
    if (!activeConversation || !socketRef.current) return;

    socketRef.current.emit("typing", {
      conversationId: activeConversation._id,
      isTyping,
    });

    if (isTyping) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("typing", {
          conversationId: activeConversation._id,
          isTyping: false,
        });
      }, 3000);
    }
  };

  const handleFileUpload = async (file) => {
    if (!activeConversation) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", activeConversation._id);

      const response = await fetch("/api/messages/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Send file message
        const fileMessage = {
          content: `📎 ${data.fileName}`,
          type: "file",
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
        };

        await handleSendMessage(JSON.stringify(fileMessage));
        toast.success("File uploaded successfully");
      } else {
        toast.error("Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    }
  };

  const handleProjectSubmit = async (projectData) => {
    if (!activeConversation) return;

    try {
      const formData = new FormData();
      formData.append("conversationId", activeConversation._id);
      formData.append("title", projectData.title);
      formData.append("description", projectData.description);

      projectData.files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/projects/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Project submitted successfully!");
        // Refresh messages to show project submission
        fetchMessages(activeConversation._id);
      } else {
        toast.error(data.error || "Failed to submit project");
      }
    } catch (error) {
      console.error("Error submitting project:", error);
      toast.error("Failed to submit project");
    }
  };

  // UPDATED handleBack function - Added notifications handling
  const handleBack = () => {
    if (isMobile) {
      if (activeView === "conversation") {
        setActiveView("chats");
        setActiveConversation(null); // Clear active conversation when going back to list
      } else if (activeView === "notifications") {
        setActiveView("chats"); // Go back to chats from notifications
      } else {
        // From chat list, go back to dashboard
        router.push("/dashboard");
      }
    } else {
      router.push("/dashboard");
    }
  };

  // NEW FUNCTION: Handle notification bell click (mobile only)
  const handleNotificationClick = () => {
    if (isMobile) {
      setActiveView("notifications");
    }
    // Do nothing on desktop - notifications should be handled elsewhere
  };

  // NEW FUNCTION: Handle selecting a chat from notifications
  const handleChatSelectFromNotifications = (conversation) => {
    setActiveConversation(conversation);
    setActiveView("conversation");
  };

  const getOtherParticipant = (conversation) => {
    return conversation?.participants?.find((p) => p._id !== session?.user?.id);
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId) || userStatuses[userId] === "online";
  };

  const isUserTyping = (userId) => {
    return typingUsers.has(userId);
  };

  if (loading) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <div className="text-white">Loading conversations...</div>
      </div>
    );
  }

  // MOBILE LAYOUT - Added notifications view
  if (isMobile) {
    if (activeView === "chats") {
      return (
        <ChatList
          conversations={conversations}
          activeConversation={activeConversation}
          onConversationSelect={handleConversationSelect}
          onBack={handleBack}
          onNotificationClick={handleNotificationClick} // Pass notification handler
          onlineUsers={onlineUsers}
          isUserOnline={isUserOnline}
          session={session}
          isMobile={isMobile}
        />
      );
    } else if (activeView === "conversation") {
      return (
        <MessagePanel
          activeConversation={activeConversation}
          messages={messages}
          onSendMessage={handleSendMessage}
          onFileUpload={handleFileUpload}
          onProjectSubmit={handleProjectSubmit}
          onTyping={handleTyping}
          isUserOnline={isUserOnline}
          isUserTyping={isUserTyping}
          getOtherParticipant={getOtherParticipant}
          session={session}
          isMobile={isMobile}
          onBack={handleBack}
        />
      );
    } else if (activeView === "notifications") {
      return (
        <NotificationPanel
          session={session}
          onBack={handleBack}
          onChatSelect={handleChatSelectFromNotifications}
        />
      );
    }
  }

  // DESKTOP LAYOUT - No notifications panel, handled elsewhere
  return (
    <div className="flex bg-black" style={{ height: "calc(100vh - 80px)" }}>
      <ChatList
        conversations={conversations}
        activeConversation={activeConversation}
        onConversationSelect={handleConversationSelect}
        onBack={handleBack}
        // Don't pass onNotificationClick on desktop
        onlineUsers={onlineUsers}
        isUserOnline={isUserOnline}
        session={session}
        isMobile={false}
      />
      <MessagePanel
        activeConversation={activeConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        onProjectSubmit={handleProjectSubmit}
        onTyping={handleTyping}
        isUserOnline={isUserOnline}
        isUserTyping={isUserTyping}
        getOtherParticipant={getOtherParticipant}
        session={session}
        isMobile={false}
      />
    </div>
  );
}

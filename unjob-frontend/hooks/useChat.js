"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";

export const useChat = (activeConversation) => {
  const { data: session } = useSession();
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // State managed by the hook
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [userStatuses, setUserStatuses] = useState({});

  // Main effect for initializing and cleaning up the socket connection
  useEffect(() => {
    if (session?.user) {
      initializeSocket();
    }

    // This is the cleanup function that runs when the component unmounts
    return () => {
      if (socketRef.current) {
        // Explicitly remove all event listeners to prevent memory leaks
        socketRef.current.off("connect");
        socketRef.current.off("userOnline");
        socketRef.current.off("userOffline");
        socketRef.current.off("newMessage");
        socketRef.current.off("userTyping");
        socketRef.current.off("messageDelivered");
        socketRef.current.off("messageRead");
        socketRef.current.disconnect();
      }
    };
  }, [session]);

  // Effect for handling logic when the active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation._id);
      if (socketRef.current) {
        socketRef.current.emit("joinConversation", activeConversation._id);
      }
    }
  }, [activeConversation]);

  const initializeSocket = () => {
    // ✅ CHANGED THIS LINE to connect to your Render server
    const SOCKET_URL = "https://unjob-socket.onrender.com";
    socketRef.current = io(SOCKET_URL, { query: { userId: session.user.id } });

    socketRef.current.on("connect", () =>
      console.log("Socket connected to server")
    );

    socketRef.current.on("userOnline", (userId) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
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

    socketRef.current.on("newMessage", (message) => {
      if (message.conversationId === activeConversation?._id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socketRef.current.on("userTyping", ({ userId, isTyping }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        isTyping ? newSet.add(userId) : newSet.delete(userId);
        return newSet;
      });
    });

    socketRef.current.on("messageDelivered", ({ messageId, userId }) =>
      updateMessageStatus(messageId, "delivered", userId)
    );

    socketRef.current.on("messageRead", ({ messageId, userId }) =>
      updateMessageStatus(messageId, "read", userId)
    );
  };

  const updateMessageStatus = (messageId, status, userId) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id === messageId) {
          const readBy = msg.readBy || [];
          const existingIndex = readBy.findIndex((r) => r.user === userId);
          if (existingIndex > -1) {
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

  const fetchMessages = async (conversationId) => {
    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.messages);
        markMessagesAsRead(conversationId);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      await fetch(`/api/messages/${conversationId}/read`, { method: "POST" });
      if (socketRef.current) {
        socketRef.current.emit("markAsRead", { conversationId });
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const handleSendMessage = async (content, type = "text") => {
    if (!activeConversation) return null;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      _id: tempId,
      conversationId: activeConversation._id,
      sender: {
        _id: session.user.id,
        name: session.user.name,
        image: session.user.image,
      },
      content,
      type,
      createdAt: new Date(),
      status: "sending",
      readBy: [],
    };
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await fetch(`/api/messages/${activeConversation._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempId ? { ...data.message, status: "sent" } : msg
          )
        );
        if (socketRef.current) {
          socketRef.current.emit("sendMessage", {
            ...data.message,
            conversation: activeConversation,
          });
        }
        return data.message;
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      return null;
    }
  };

  const handleTyping = (isTyping) => {
    if (!activeConversation || !socketRef.current) return;
    socketRef.current.emit("typing", {
      conversationId: activeConversation._id,
      isTyping,
    });

    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit("typing", {
          conversationId: activeConversation._id,
          isTyping: false,
        });
      }, 3000);
    }
  };

  // Return all the state and functions that the UI component will need
  return {
    messages,
    onlineUsers,
    typingUsers,
    userStatuses,
    handleSendMessage,
    handleTyping,
  };
};
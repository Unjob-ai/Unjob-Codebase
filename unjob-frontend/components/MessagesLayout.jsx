"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatList } from "./ChatList";
import { MessagePanel } from "./MessagePanel";
import { toast } from "react-hot-toast";

export function MessagesLayout() {
  const router = useRouter();
  const { data: session } = useSession();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchConversations();
    }
  }, [session]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation._id);
    }
  }, [activeConversation]);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations);
        // Auto-select first conversation if available
        if (data.conversations.length > 0 && !activeConversation) {
          setActiveConversation(data.conversations[0]);
        }
      } else {
        toast.error("Failed to load conversations");
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
      } else {
        toast.error("Failed to load messages");
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
      setMessages([]);
    }
  };

  const handleConversationSelect = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleSendMessage = async (content) => {
    if (!activeConversation || !content.trim()) return;

    // Optimistically add message to UI
    const tempMessage = {
      _id: Date.now().toString(),
      content,
      sender: {
        _id: session.user.id,
        name: session.user.name,
        image: session.user.image,
      },
      createdAt: new Date().toISOString(),
      type: "text",
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
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

      if (data.success) {
        // Replace temporary message with real one
        setMessages((prev) =>
          prev.map((msg) => (msg._id === tempMessage._id ? data.message : msg))
        );

        // Update conversation list with new last message
        setConversations((prev) =>
          prev.map((conv) =>
            conv._id === activeConversation._id
              ? { ...conv, lastMessage: data.message, lastActivity: new Date() }
              : conv
          )
        );
      } else {
        // Remove temp message on error
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== tempMessage._id)
        );
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove temp message on error
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessage._id));
      toast.error("Failed to send message");
    }
  };

  const handleFileUpload = async (file) => {
    if (!activeConversation || !file) return;

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);

      // Upload file first (you'll need to create this endpoint)
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (uploadData.success) {
        // Send message with file
        const response = await fetch(
          `/api/messages/${activeConversation._id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `Shared a file: ${file.name}`,
              type: "file",
              fileUrl: uploadData.url,
              fileName: file.name,
              fileSize: file.size,
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          setMessages((prev) => [...prev, data.message]);
          toast.success("File uploaded successfully");
        } else {
          toast.error("Failed to send file");
        }
      } else {
        toast.error("Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    }
  };

  const handleBack = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex h-full bg-black items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full bg-black items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please login to view messages</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black">
      <ChatList
        conversations={conversations}
        activeConversation={activeConversation}
        onConversationSelect={handleConversationSelect}
        onBack={handleBack}
      />
      <MessagePanel
        activeConversation={activeConversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
      />
    </div>
  );
}

// lib/socket-server.js
import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  // Store online users
  const onlineUsers = new Map();
  const userSockets = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle user joining
    const userId = socket.handshake.query.userId;
    if (userId) {
      onlineUsers.set(userId, {
        socketId: socket.id,
        lastSeen: new Date(),
        status: "online",
      });
      userSockets.set(socket.id, userId);
      
      // Join user to their personal room
      socket.join(`user_${userId}`);
      
      // Broadcast user online status
      socket.broadcast.emit("userOnline", userId);
      
      console.log(`User ${userId} is now online`);
    }

    // Handle joining conversation
    socket.on("joinConversation", (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`User joined conversation: ${conversationId}`);
    });

    // Handle leaving conversation
    socket.on("leaveConversation", (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`User left conversation: ${conversationId}`);
    });

    // Handle sending message
    socket.on("sendMessage", (message) => {
      // Broadcast to all users in the conversation except sender
      socket.to(`conversation_${message.conversationId}`).emit("newMessage", message);

      // Send to other participants' personal rooms for notifications
      if (message.conversation?.participants) {
        message.conversation.participants.forEach((participant) => {
          if (participant._id !== message.sender._id) {
            socket.to(`user_${participant._id}`).emit("newMessage", message);
          }
        });
      }

      console.log("Message sent to conversation:", message.conversationId);
    });

    // Handle typing indicators
    socket.on("typing", ({ conversationId, isTyping }) => {
      const userId = userSockets.get(socket.id);
      socket.to(`conversation_${conversationId}`).emit("userTyping", {
        userId,
        conversationId,
        isTyping,
      });
    });

    // Handle message read status
    socket.on("markAsRead", ({ conversationId }) => {
      const userId = userSockets.get(socket.id);
      socket.to(`conversation_${conversationId}`).emit("messageRead", {
        conversationId,
        userId,
        readAt: new Date(),
      });
    });

    // Handle message delivery status
    socket.on("messageDelivered", ({ messageId, conversationId }) => {
      const userId = userSockets.get(socket.id);
      socket.to(`conversation_${conversationId}`).emit("messageDelivered", {
        messageId,
        userId,
        deliveredAt: new Date(),
      });
    });

    // Handle user status updates
    socket.on("updateStatus", (status) => {
      const userId = userSockets.get(socket.id);
      if (userId && onlineUsers.has(userId)) {
        onlineUsers.get(userId).status = status;
        socket.broadcast.emit("userStatusUpdate", {
          userId,
          status,
          timestamp: new Date(),
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const userId = userSockets.get(socket.id);
      
      if (userId) {
        onlineUsers.delete(userId);
        userSockets.delete(socket.id);
        
        // Broadcast user offline status
        socket.broadcast.emit("userOffline", userId);
        
        console.log(`User ${userId} disconnected`);
      }
      
      console.log("User disconnected:", socket.id);
    });

    // Send current online users to new connection
    if (userId) {
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit("onlineUsers", onlineUserIds);
    }
  });

  return io;
};

export const getSocket = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

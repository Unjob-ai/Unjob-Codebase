import {handleUserDisconnection, handleUserConnection,broadcastOnlineUsers} from "./userTracking.js";
// import {io} from "../server.js";
// Track server start time and online users
 export const onlineUsers = new Map();
export const userSockets = new Map();

  // Socket.IO event handlers
  function socketEventHandlers(io) {
  io.on("connection", (socket) => {
    log("INFO", "Socket", `New client connected: ${socket.id}`);

    const userId = socket.handshake.query.userId;
    const userAgent = socket.handshake.headers["user-agent"];

    if (userId && typeof userId === "string") {
      handleUserConnection(socket, userId,io);
    } else {
      log("WARN", "Socket", `Connection without userId from ${socket.id}`);
    }

    // Join conversation room
    socket.on("joinConversation", (conversationId) => {
      if (!conversationId) return;
      socket.join(conversationId);
      log(
        "INFO",
        "Socket",
        `User ${userId} joined conversation: ${conversationId}`
      );
    });

    // Leave conversation room
    socket.on("leaveConversation", (conversationId) => {
      if (!conversationId) return;
      socket.leave(conversationId);
      log(
        "INFO",
        "Socket",
        `User ${userId} left conversation: ${conversationId}`
      );
    });

    // Send message
    socket.on("sendMessage", (message) => {
      const { conversationId } = message;
      if (!conversationId) {
        socket.emit("error", {
          message: "Message must have a conversationId.",
        });
        return;
      }

      // Add timestamp and sender info
      const messageWithMetadata = {
        ...message,
        timestamp: new Date(),
        socketId: socket.id,
      };

      socket.to(conversationId).emit("newMessage", messageWithMetadata);
      log("INFO", "Socket", `Message sent in conversation: ${conversationId}`);
    });

    // Message read status
    socket.on("messageRead", ({ conversationId, userId, messageIds }) => {
      if (!conversationId || !userId || !messageIds) return;

      socket.to(conversationId).emit("messageRead", {
        conversationId,
        userId,
        messageIds,
        readAt: new Date(),
      });
    });

    // Typing indicators
    socket.on("startTyping", ({ conversationId, userId }) => {
      if (!conversationId || !userId) return;
      socket.to(conversationId).emit("startTyping", {
        conversationId,
        userId,
        timestamp: new Date(),
      });
    });

    socket.on("stopTyping", ({ conversationId, userId }) => {
      if (!conversationId || !userId) return;
      socket.to(conversationId).emit("stopTyping", {
        conversationId,
        userId,
        timestamp: new Date(),
      });
    });

    // Online users request
    socket.on("request-online-users", () => {
      broadcastOnlineUsers(socket,io);
    });

    // WebRTC signaling for voice/video calls
    socket.on("call-user", (data) => {
      const { to, from, signal, callType = "audio" } = data;
      const recipient = onlineUsers.get(to);

      if (recipient) {
        io.to(recipient.socketId).emit("incoming-call", {
          from,
          signal,
          callType,
          timestamp: new Date(),
        });
        log("INFO", "WebRTC", `${callType} call from ${from} to ${to}`);
      } else {
        socket.emit("call-failed", { to, reason: "User not online" });
        log("WARN", "WebRTC", `Call to ${to} failed - user offline`);
      }
    });

    socket.on("answer-call", (data) => {
      const { to, from, signal } = data;
      const originalCaller = onlineUsers.get(to);

      if (originalCaller) {
        io.to(originalCaller.socketId).emit("call-accepted", {
          from,
          signal,
          timestamp: new Date(),
        });
        log("INFO", "WebRTC", `Call answered from ${from} to ${to}`);
      }
    });

    socket.on("reject-call", (data) => {
      const { to, from } = data;
      const originalCaller = onlineUsers.get(to);

      if (originalCaller) {
        io.to(originalCaller.socketId).emit("call-rejected", {
          from,
          timestamp: new Date(),
        });
        log("INFO", "WebRTC", `Call rejected from ${from} to ${to}`);
      }
    });

    socket.on("end-call", (data) => {
      const { to, from } = data;
      const otherUser = onlineUsers.get(to);

      if (otherUser) {
        io.to(otherUser.socketId).emit("call-ended", {
          from,
          timestamp: new Date(),
        });
        log("INFO", "WebRTC", `Call ended between ${from} and ${to}`);
      }
    });

    socket.on("ice-candidate", (data) => {
      const { to, candidate } = data;
      const recipient = onlineUsers.get(to);

      if (recipient) {
        io.to(recipient.socketId).emit("ice-candidate", {
          from: userSockets.get(socket.id),
          candidate,
        });
      }
    });

    // File sharing
    socket.on("file-share", (data) => {
      const { conversationId, fileData } = data;
      if (!conversationId) return;

      const fileWithMetadata = {
        ...fileData,
        timestamp: new Date(),
        sender: userSockets.get(socket.id),
      };

      socket.to(conversationId).emit("file-received", fileWithMetadata);
      log("INFO", "Socket", `File shared in conversation: ${conversationId}`);
    });

    // Project notifications
    socket.on("project-update", (data) => {
      const { projectId, update, recipients } = data;

      recipients.forEach((recipientId) => {
        const recipient = onlineUsers.get(recipientId);
        if (recipient) {
          io.to(recipient.socketId).emit("project-notification", {
            projectId,
            update,
            timestamp: new Date(),
          });
        }
      });

      log("INFO", "Socket", `Project update sent for: ${projectId}`);
    });

    // Notification events
    socket.on("notification-sent", (data) => {
      const { userId, notification } = data;
      const recipient = onlineUsers.get(userId);

      if (recipient) {
        io.to(recipient.socketId).emit("new-notification", {
          ...notification,
          timestamp: new Date(),
        });
      }
    });

    // User activity tracking
    socket.on("user-activity", () => {
      const userId = userSockets.get(socket.id);
      if (userId && onlineUsers.has(userId)) {
        const user = onlineUsers.get(userId);
        user.lastActivity = new Date();
        onlineUsers.set(userId, user);
      }
    });

    // Error handling
    socket.on("error", (err) => {
      log("ERROR", "Socket", `Socket error for ${socket.id}: ${err.message}`);
    });

    // Disconnection handling
    socket.on("disconnect", (reason) => {
      log(
        "INFO",
        "Socket",
        `Client disconnected: ${socket.id}. Reason: ${reason}`
      );
      handleUserDisconnection(socket,io);
    });

    socket.on("disconnecting", (reason) => {
      log(
        "INFO",
        "Socket",
        `Client disconnecting: ${socket.id}. Reason: ${reason}`
      );
    });
  });

  // Cleanup inactive users every 5 minutes
  setInterval(() => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    for (const [userId, userData] of onlineUsers.entries()) {
      if (userData.lastActivity < fiveMinutesAgo) {
        onlineUsers.delete(userId);
        userSockets.delete(userData.socketId);
        log("INFO", "Socket", `Cleaned up inactive user: ${userId}`);
      }
    }
  }, 5 * 60 * 1000);}

  export default socketEventHandlers;
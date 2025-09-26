// Sockets/index.js - Complete Socket Event Handlers
import jwt from "jsonwebtoken";
import { User } from "../models/UserModel.js";
import { Message } from "../models/MessageModel.js";
import { Conversation } from "../models/ConversationModel.js";
import { Notification } from "../models/NotificationModel.js";

// Online users tracking
export const onlineUsers = new Map();
export const userSockets = new Map();

// Colors for enhanced logging
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Enhanced logging function
const log = (level, context, message) => {
  const timestamp = new Date().toISOString();
  let levelColor = COLORS.reset;

  switch (level) {
    case "INFO":
      levelColor = COLORS.green;
      break;
    case "WARN":
      levelColor = COLORS.yellow;
      break;
    case "ERROR":
      levelColor = COLORS.red;
      break;
    case "DEBUG":
      levelColor = COLORS.magenta;
      break;
  }

  console.log(
    `${COLORS.blue}${timestamp}${COLORS.reset} ${levelColor}[${level}]${COLORS.reset} ${COLORS.cyan}[${context}]${COLORS.reset} - ${message}`
  );
};

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1] ||
      socket.handshake.query.token;

    if (!token) {
      log("WARN", "Socket", "No authentication token provided");
      return next(new Error("Authentication required"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");

    if (!user || !user.isActive) {
      log("WARN", "Socket", `Invalid or inactive user: ${decoded.userId}`);
      return next(new Error("Invalid user"));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();

    log(
      "INFO",
      "Socket",
      `Authentication successful for user: ${user.name} (${user._id})`
    );
    next();
  } catch (error) {
    log("ERROR", "Socket", `Authentication failed: ${error.message}`);
    next(new Error("Authentication failed"));
  }
};

// User connection handler
const handleUserConnection = (socket, userId, io) => {
  try {
    const user = socket.user;

    // Store user connection info
    const userData = {
      socketId: socket.id,
      userId: userId,
      name: user.name,
      image: user.image,
      role: user.role,
      status: "online",
      lastActivity: new Date(),
      connectedAt: new Date(),
    };

    // Update maps
    onlineUsers.set(userId, userData);
    userSockets.set(socket.id, userId);

    // Join user to their personal rooms
    socket.join(`user_${userId}`);
    socket.join(`user_conversations_${userId}`);
    socket.join(`user_notifications_${userId}`);

    // Broadcast user online status
    socket.broadcast.emit("userOnline", {
      userId,
      name: user.name,
      image: user.image,
      status: "online",
      timestamp: new Date(),
    });

    // Send current online users to the newly connected user
    const onlineUsersList = Array.from(onlineUsers.entries())
      .filter(([id]) => id !== userId)
      .map(([id, data]) => ({
        userId: id,
        name: data.name,
        image: data.image,
        status: data.status,
        lastActivity: data.lastActivity,
      }));

    socket.emit("onlineUsersList", onlineUsersList);

    log(
      "INFO",
      "Socket",
      `User ${user.name} (${userId}) connected successfully`
    );
    log("INFO", "Socket", `Total online users: ${onlineUsers.size}`);
  } catch (error) {
    log(
      "ERROR",
      "Socket",
      `Failed to handle user connection: ${error.message}`
    );
  }
};

// User disconnection handler
const handleUserDisconnection = (socket, io) => {
  try {
    const userId = userSockets.get(socket.id);

    if (userId) {
      const userData = onlineUsers.get(userId);

      // Remove from maps
      onlineUsers.delete(userId);
      userSockets.delete(socket.id);

      // Broadcast user offline status
      socket.broadcast.emit("userOffline", {
        userId,
        name: userData?.name,
        status: "offline",
        timestamp: new Date(),
      });

      log("INFO", "Socket", `User ${userData?.name} (${userId}) disconnected`);
      log("INFO", "Socket", `Total online users: ${onlineUsers.size}`);
    }
  } catch (error) {
    log(
      "ERROR",
      "Socket",
      `Failed to handle user disconnection: ${error.message}`
    );
  }
};

// Broadcast online users
const broadcastOnlineUsers = (socket, io) => {
  try {
    const onlineUsersList = Array.from(onlineUsers.entries()).map(
      ([id, data]) => ({
        userId: id,
        name: data.name,
        image: data.image,
        status: data.status,
        lastActivity: data.lastActivity,
      })
    );

    if (socket) {
      socket.emit("onlineUsersList", onlineUsersList);
    } else {
      io.emit("onlineUsersList", onlineUsersList);
    }
  } catch (error) {
    log(
      "ERROR",
      "Socket",
      `Failed to broadcast online users: ${error.message}`
    );
  }
};

// Message handlers
const setupMessageHandlers = (socket, io) => {
  // Send message
  socket.on("sendMessage", async (messageData) => {
    try {
      const { conversationId, content, type = "text", replyTo } = messageData;
      const userId = socket.userId;

      if (!conversationId || !content) {
        socket.emit("error", { message: "Missing required message data" });
        return;
      }

      // Verify user is part of conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        socket.emit("error", {
          message: "Conversation not found or access denied",
        });
        return;
      }

      // Create message in database
      const message = await Message.create({
        conversationId,
        sender: userId,
        content: content.trim(),
        type,
        replyTo,
      });

      // Populate sender info
      await message.populate("sender", "name image role");

      // Update conversation's last message and activity
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        lastActivity: new Date(),
      });

      // Emit to all conversation participants
      io.to(conversationId).emit("newMessage", message);

      // Send to conversation participants who are online
      const participants = conversation.participants.filter(
        (p) => p.toString() !== userId
      );
      participants.forEach((participantId) => {
        io.to(`user_${participantId}`).emit("conversationUpdate", {
          conversationId,
          lastMessage: message,
          unreadCount: 1, // This should be calculated properly
        });
      });

      log(
        "INFO",
        "Message",
        `Message sent in conversation ${conversationId} by ${userId}`
      );
    } catch (error) {
      log("ERROR", "Message", `Failed to send message: ${error.message}`);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Join conversation
  socket.on("joinConversation", (conversationId) => {
    if (!conversationId) return;

    socket.join(conversationId);
    log(
      "INFO",
      "Socket",
      `User ${socket.userId} joined conversation: ${conversationId}`
    );

    // Notify other participants that user joined
    socket.to(conversationId).emit("userJoinedConversation", {
      userId: socket.userId,
      timestamp: new Date(),
    });
  });

  // Leave conversation
  socket.on("leaveConversation", (conversationId) => {
    if (!conversationId) return;

    socket.leave(conversationId);
    log(
      "INFO",
      "Socket",
      `User ${socket.userId} left conversation: ${conversationId}`
    );

    // Notify other participants that user left
    socket.to(conversationId).emit("userLeftConversation", {
      userId: socket.userId,
      timestamp: new Date(),
    });
  });

  // Message read status
  socket.on("messageRead", async (data) => {
    try {
      const { conversationId, messageIds } = data;
      const userId = socket.userId;

      if (!conversationId || !messageIds || !Array.isArray(messageIds)) {
        return;
      }

      // Mark messages as read in database
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          conversationId,
          sender: { $ne: userId },
        },
        {
          $addToSet: {
            readBy: {
              user: userId,
              readAt: new Date(),
            },
          },
        }
      );

      // Notify other participants
      socket.to(conversationId).emit("messageRead", {
        conversationId,
        userId,
        messageIds,
        readAt: new Date(),
      });

      log(
        "INFO",
        "Message",
        `Messages marked as read in conversation ${conversationId}`
      );
    } catch (error) {
      log(
        "ERROR",
        "Message",
        `Failed to mark messages as read: ${error.message}`
      );
    }
  });

  // Typing indicators
  socket.on("startTyping", ({ conversationId }) => {
    if (!conversationId) return;

    socket.to(conversationId).emit("userStartTyping", {
      conversationId,
      userId: socket.userId,
      name: socket.user.name,
      timestamp: new Date(),
    });
  });

  socket.on("stopTyping", ({ conversationId }) => {
    if (!conversationId) return;

    socket.to(conversationId).emit("userStopTyping", {
      conversationId,
      userId: socket.userId,
      timestamp: new Date(),
    });
  });
};

// Main socket event handler
const socketEventHandlers = (io) => {
  // Store io globally for use in other modules
  global.io = io;

  // Authentication middleware
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const user = socket.user;
    const userId = socket.userId;

    log(
      "INFO",
      "Socket",
      `User connected: ${user.name} (${userId}) - Socket: ${socket.id}`
    );

    // Handle user connection
    handleUserConnection(socket, userId, io);

    // Setup message handlers
    setupMessageHandlers(socket, io);

    // =====================================
    // USER STATUS HANDLERS
    // =====================================

    // Update user's last activity
    socket.on("activity", async () => {
      try {
        const userOnlineData = onlineUsers.get(userId);
        if (userOnlineData) {
          userOnlineData.lastActivity = new Date();
          onlineUsers.set(userId, userOnlineData);
        }

        // Update user's last activity in database (throttled)
        await User.findByIdAndUpdate(userId, {
          lastActivity: new Date(),
        });
      } catch (error) {
        log(
          "ERROR",
          "Socket",
          `Failed to update user activity: ${error.message}`
        );
      }
    });

    // Handle user going away/back
    socket.on("userAway", () => {
      const userOnlineData = onlineUsers.get(userId);
      if (userOnlineData) {
        userOnlineData.status = "away";
        onlineUsers.set(userId, userOnlineData);

        socket.broadcast.emit("userStatusChanged", {
          userId,
          status: "away",
          timestamp: new Date(),
        });

        log("INFO", "Socket", `User ${userId} is away`);
      }
    });

    socket.on("userBack", () => {
      const userOnlineData = onlineUsers.get(userId);
      if (userOnlineData) {
        userOnlineData.status = "online";
        userOnlineData.lastActivity = new Date();
        onlineUsers.set(userId, userOnlineData);

        socket.broadcast.emit("userStatusChanged", {
          userId,
          status: "online",
          timestamp: new Date(),
        });

        log("INFO", "Socket", `User ${userId} is back online`);
      }
    });

    // =====================================
    // NOTIFICATION HANDLERS
    // =====================================

    // Send notification to specific user
    socket.on("sendNotification", async (data) => {
      try {
        const { targetUserId, notification } = data;

        if (targetUserId && notification) {
          // Save notification to database
          const savedNotification = await Notification.create({
            user: targetUserId,
            type: notification.type || "general",
            title: notification.title,
            message: notification.message,
            relatedId: notification.relatedId,
            relatedModel: notification.relatedModel,
            actionUrl: notification.actionUrl,
            metadata: notification.metadata,
            priority: notification.priority || "medium",
            senderName: user.name,
            avatar: user.image,
          });

          // Send to target user if online
          io.to(`user_notifications_${targetUserId}`).emit("newNotification", {
            ...savedNotification.toObject(),
            timestamp: new Date(),
            fromUser: {
              id: userId,
              name: user.name,
              image: user.image,
            },
          });

          log(
            "INFO",
            "Socket",
            `Notification sent from ${userId} to ${targetUserId}`
          );
        }
      } catch (error) {
        log("ERROR", "Socket", `Failed to send notification: ${error.message}`);
      }
    });

    // =====================================
    // ONLINE USERS HANDLERS
    // =====================================

    // Request online users list
    socket.on("getOnlineUsers", () => {
      broadcastOnlineUsers(socket, io);
    });

    // Check if specific user is online
    socket.on("checkUserOnline", (data) => {
      try {
        const { targetUserId } = data;
        const isOnline = onlineUsers.has(targetUserId);
        const userStatus = onlineUsers.get(targetUserId);

        socket.emit("userOnlineStatus", {
          userId: targetUserId,
          isOnline,
          status: userStatus?.status || "offline",
          lastActivity: userStatus?.lastActivity || null,
        });

        log(
          "DEBUG",
          "Socket",
          `User online status check: ${targetUserId} is ${
            isOnline ? "online" : "offline"
          }`
        );
      } catch (error) {
        log(
          "ERROR",
          "Socket",
          `Failed to check user online status: ${error.message}`
        );
      }
    });

    // =====================================
    // PROJECT & GIG HANDLERS
    // =====================================

    // Join project room for updates
    socket.on("joinProject", (data) => {
      try {
        const { projectId } = data;
        if (projectId) {
          socket.join(`project_${projectId}`);
          log("INFO", "Socket", `User ${userId} joined project ${projectId}`);
        }
      } catch (error) {
        log("ERROR", "Socket", `Failed to join project room: ${error.message}`);
      }
    });

    // Leave project room
    socket.on("leaveProject", (data) => {
      try {
        const { projectId } = data;
        if (projectId) {
          socket.leave(`project_${projectId}`);
          log("INFO", "Socket", `User ${userId} left project ${projectId}`);
        }
      } catch (error) {
        log(
          "ERROR",
          "Socket",
          `Failed to leave project room: ${error.message}`
        );
      }
    });

    // Project updates
    socket.on("projectUpdate", (data) => {
      try {
        const { projectId, update, recipients } = data;

        if (projectId && update) {
          // Send to project room
          io.to(`project_${projectId}`).emit("projectNotification", {
            projectId,
            update,
            timestamp: new Date(),
            fromUser: {
              id: userId,
              name: user.name,
              image: user.image,
            },
          });

          // Send to specific recipients if provided
          if (recipients && Array.isArray(recipients)) {
            recipients.forEach((recipientId) => {
              io.to(`user_${recipientId}`).emit("projectNotification", {
                projectId,
                update,
                timestamp: new Date(),
                fromUser: {
                  id: userId,
                  name: user.name,
                  image: user.image,
                },
              });
            });
          }

          log("INFO", "Socket", `Project update sent for: ${projectId}`);
        }
      } catch (error) {
        log(
          "ERROR",
          "Socket",
          `Failed to send project update: ${error.message}`
        );
      }
    });

    // =====================================
    // WEBRTC HANDLERS (Video/Audio Calls)
    // =====================================

    socket.on("callUser", (data) => {
      try {
        const { to, signal, callType = "audio" } = data;
        const recipient = onlineUsers.get(to);

        if (recipient) {
          io.to(recipient.socketId).emit("incomingCall", {
            from: userId,
            fromName: user.name,
            fromImage: user.image,
            signal,
            callType,
            timestamp: new Date(),
          });
          log("INFO", "WebRTC", `${callType} call from ${userId} to ${to}`);
        } else {
          socket.emit("callFailed", { to, reason: "User not online" });
          log("WARN", "WebRTC", `Call to ${to} failed - user offline`);
        }
      } catch (error) {
        log("ERROR", "WebRTC", `Failed to initiate call: ${error.message}`);
      }
    });

    socket.on("answerCall", (data) => {
      try {
        const { to, signal } = data;
        const originalCaller = onlineUsers.get(to);

        if (originalCaller) {
          io.to(originalCaller.socketId).emit("callAccepted", {
            from: userId,
            signal,
            timestamp: new Date(),
          });
          log("INFO", "WebRTC", `Call answered from ${userId} to ${to}`);
        }
      } catch (error) {
        log("ERROR", "WebRTC", `Failed to answer call: ${error.message}`);
      }
    });

    socket.on("rejectCall", (data) => {
      try {
        const { to } = data;
        const originalCaller = onlineUsers.get(to);

        if (originalCaller) {
          io.to(originalCaller.socketId).emit("callRejected", {
            from: userId,
            timestamp: new Date(),
          });
          log("INFO", "WebRTC", `Call rejected from ${userId} to ${to}`);
        }
      } catch (error) {
        log("ERROR", "WebRTC", `Failed to reject call: ${error.message}`);
      }
    });

    socket.on("endCall", (data) => {
      try {
        const { to } = data;
        const otherUser = onlineUsers.get(to);

        if (otherUser) {
          io.to(otherUser.socketId).emit("callEnded", {
            from: userId,
            timestamp: new Date(),
          });
          log("INFO", "WebRTC", `Call ended between ${userId} and ${to}`);
        }
      } catch (error) {
        log("ERROR", "WebRTC", `Failed to end call: ${error.message}`);
      }
    });

    socket.on("iceCandidate", (data) => {
      try {
        const { to, candidate } = data;
        const recipient = onlineUsers.get(to);

        if (recipient) {
          io.to(recipient.socketId).emit("iceCandidate", {
            from: userId,
            candidate,
          });
        }
      } catch (error) {
        log(
          "ERROR",
          "WebRTC",
          `Failed to send ICE candidate: ${error.message}`
        );
      }
    });

    // =====================================
    // FILE SHARING HANDLERS
    // =====================================

    socket.on("shareFile", (data) => {
      try {
        const { conversationId, fileData } = data;
        if (!conversationId || !fileData) return;

        const fileWithMetadata = {
          ...fileData,
          timestamp: new Date(),
          sender: {
            id: userId,
            name: user.name,
            image: user.image,
          },
        };

        socket.to(conversationId).emit("fileReceived", fileWithMetadata);
        log("INFO", "Socket", `File shared in conversation: ${conversationId}`);
      } catch (error) {
        log("ERROR", "Socket", `Failed to share file: ${error.message}`);
      }
    });

    // =====================================
    // ERROR HANDLING
    // =====================================

    socket.on("error", (err) => {
      log("ERROR", "Socket", `Socket error for ${socket.id}: ${err.message}`);
    });

    // =====================================
    // DISCONNECTION HANDLING
    // =====================================

    socket.on("disconnect", (reason) => {
      log(
        "INFO",
        "Socket",
        `Client disconnected: ${socket.id}. Reason: ${reason}`
      );
      handleUserDisconnection(socket, io);
    });

    socket.on("disconnecting", (reason) => {
      log(
        "INFO",
        "Socket",
        `Client disconnecting: ${socket.id}. Reason: ${reason}`
      );
    });
  });

  // =====================================
  // CLEANUP ROUTINES
  // =====================================

  // Cleanup inactive users every 5 minutes
  setInterval(() => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      let cleanupCount = 0;

      for (const [userId, userData] of onlineUsers.entries()) {
        if (userData.lastActivity < fiveMinutesAgo) {
          onlineUsers.delete(userId);
          userSockets.delete(userData.socketId);
          cleanupCount++;

          // Broadcast user offline
          io.emit("userOffline", {
            userId,
            name: userData.name,
            status: "offline",
            timestamp: new Date(),
          });
        }
      }

      if (cleanupCount > 0) {
        log("INFO", "Socket", `Cleaned up ${cleanupCount} inactive users`);
        log("INFO", "Socket", `Active online users: ${onlineUsers.size}`);
      }
    } catch (error) {
      log(
        "ERROR",
        "Socket",
        `Failed to cleanup inactive users: ${error.message}`
      );
    }
  }, 5 * 60 * 1000);

  // Log server statistics every 30 minutes
  setInterval(() => {
    log(
      "INFO",
      "Socket",
      `Server Statistics - Online Users: ${onlineUsers.size}, Active Connections: ${io.engine.clientsCount}`
    );
  }, 30 * 60 * 1000);
};

// Helper function to send notification to user (can be called from other parts of the app)
export const sendNotificationToUser = async (targetUserId, notification) => {
  try {
    if (global.io) {
      global.io
        .to(`user_notifications_${targetUserId}`)
        .emit("newNotification", {
          ...notification,
          timestamp: new Date(),
        });

      log(
        "INFO",
        "Socket",
        `External notification sent to user: ${targetUserId}`
      );
    }
  } catch (error) {
    log(
      "ERROR",
      "Socket",
      `Failed to send external notification: ${error.message}`
    );
  }
};

// Helper function to broadcast to all online users
export const broadcastToAllUsers = (event, data) => {
  try {
    if (global.io) {
      global.io.emit(event, {
        ...data,
        timestamp: new Date(),
      });

      log("INFO", "Socket", `Broadcast sent to all users: ${event}`);
    }
  } catch (error) {
    log(
      "ERROR",
      "Socket",
      `Failed to broadcast to all users: ${error.message}`
    );
  }
};

export default socketEventHandlers;

// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { platform, cpus } = require("os");
require("dotenv").config();

// Import configuration and middleware
const connectDB = require("./config/database");
const { corsMiddleware } = require("./middleware/cors");
const {
  globalErrorHandler,
  handleUnhandledRejection,
  handleUncaughtException,
} = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimit");

// Import all routes
const apiRoutes = require("./routes");

// Security middleware
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configuration
const CONFIG = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  ALLOWED_ORIGINS: [
    process.env.CLIENT_URL || "http://localhost:3000",
    process.env.ADMIN_URL || "http://localhost:3001",
    "https://unjob.ai",
    "https://www.unjob.ai",
    "http://unjob.ai",
    "http://www.unjob.ai",
  ],
};

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: CONFIG.ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Track server start time and online users
const startTime = new Date();
const onlineUsers = new Map();
const userSockets = new Map();

// Colors for enhanced logging
const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
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
    `${COLORS.dim}${timestamp}${COLORS.reset} ${levelColor}[${level}]${COLORS.reset} ${COLORS.cyan}[${context}]${COLORS.reset} - ${message}`
  );
};

// Initialize database connection
connectDB();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: [
          "'self'",
          "https://checkout.razorpay.com",
          "https://js.stripe.com",
        ],
        imgSrc: ["'self'", "data:", "https:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://api.razorpay.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'", "https://checkout.razorpay.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(compression());

// CORS configuration
app.use(corsMiddleware);

// Rate limiting
app.use("/api/", apiLimiter);

// Body parsing middleware
app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: 50000,
  })
);

// Logging middleware
if (CONFIG.NODE_ENV === "production") {
  app.use(morgan("combined"));
} else {
  app.use(morgan("dev"));
}

// Trust proxy (important for rate limiting and IP detection)
app.set("trust proxy", CONFIG.NODE_ENV === "production" ? 1 : false);

// Health check endpoint
app.get("/health", (req, res) => {
  const uptimeInSeconds = Math.floor((new Date() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();

  const healthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "unjob-api-server",
    version: "1.0.0",
    environment: CONFIG.NODE_ENV,
    uptime: `${uptimeInSeconds} seconds`,
    nodeVersion: process.version,
    platform: platform(),
    cpuCount: cpus().length,
    memory: {
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
    },
    socket: {
      connectedClients: io.engine.clientsCount,
      onlineUsers: onlineUsers.size,
    },
    database:
      require("mongoose").connection.readyState === 1
        ? "connected"
        : "disconnected",
  };

  res.status(200).json(healthStatus);
});

// Serve static files (for uploaded files)
app.use(
  "/uploads",
  express.static("uploads", {
    maxAge: "1d",
    etag: true,
  })
);

// API Routes
app.use("/api", apiRoutes);

// Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "UnJob API Server is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    status: "healthy",
    environment: CONFIG.NODE_ENV,
    documentation: "/api/docs",
    health: "/health",
  });
});

// Socket.IO connection handling
const broadcastOnlineUsers = (socket) => {
  const onlineUserIds = Array.from(onlineUsers.keys());
  (socket || io).emit("onlineUsersList", onlineUserIds);
};

const handleUserConnection = (socket, userId) => {
  onlineUsers.set(userId, {
    socketId: socket.id,
    status: "online",
    connectedAt: new Date(),
    lastActivity: new Date(),
  });
  userSockets.set(socket.id, userId);

  log(
    "INFO",
    "Socket",
    `User ${userId} connected. Total online: ${onlineUsers.size}`
  );
  socket.broadcast.emit("userOnline", userId);
  broadcastOnlineUsers();
};

const handleUserDisconnection = (socket) => {
  // Leave all rooms except the socket's own room
  for (const room of socket.rooms) {
    if (room !== socket.id) {
      socket.to(room).emit("user-left-room", {
        userId: userSockets.get(socket.id),
        room,
      });
    }
  }

  const disconnectedUserId = userSockets.get(socket.id);
  if (disconnectedUserId) {
    onlineUsers.delete(disconnectedUserId);
    userSockets.delete(socket.id);

    log(
      "INFO",
      "Socket",
      `User ${disconnectedUserId} disconnected. Total online: ${onlineUsers.size}`
    );
    socket.broadcast.emit("userOffline", disconnectedUserId);
    broadcastOnlineUsers();
  }
};

// Socket.IO event handlers
io.on("connection", (socket) => {
  log("INFO", "Socket", `New client connected: ${socket.id}`);

  const userId = socket.handshake.query.userId;
  const userAgent = socket.handshake.headers["user-agent"];

  if (userId && typeof userId === "string") {
    handleUserConnection(socket, userId);
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
      socket.emit("error", { message: "Message must have a conversationId." });
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
    broadcastOnlineUsers(socket);
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
    handleUserDisconnection(socket);
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
}, 5 * 60 * 1000);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    message: "The requested endpoint does not exist",
  });
});

// Global error handler
app.use(globalErrorHandler);

// Process error handlers
handleUnhandledRejection();
handleUncaughtException();

// Graceful shutdown
const shutdown = (signal) => {
  log("WARN", "Server", `Received ${signal}. Initiating graceful shutdown...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      log("ERROR", "Server", `Error closing HTTP server: ${err.message}`);
      return process.exit(1);
    }

    log("INFO", "Server", "HTTP server closed");

    // Close Socket.IO connections
    io.close(() => {
      log("INFO", "Server", "Socket.IO connections closed");

      // Close database connection
      require("mongoose").connection.close(() => {
        log("INFO", "Database", "MongoDB connection closed");
        process.exit(0);
      });
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    log("ERROR", "Server", "Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000);
};

// Start server
server.listen(CONFIG.PORT, () => {
  log("INFO", "Server", `🚀 Server running on port ${CONFIG.PORT}`);
  log("INFO", "Server", `📱 Environment: ${CONFIG.NODE_ENV}`);
  log(
    "INFO",
    "Server",
    `🌐 CORS origins: ${CONFIG.ALLOWED_ORIGINS.join(", ")}`
  );
  log("INFO", "Server", `📊 Socket.IO enabled`);
  log(
    "INFO",
    "Server",
    `💾 Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(
      2
    )} MB`
  );

  if (CONFIG.NODE_ENV === "development") {
    log(
      "INFO",
      "Server",
      `📖 API Docs: http://localhost:${CONFIG.PORT}/api/docs`
    );
    log(
      "INFO",
      "Server",
      `🏥 Health Check: http://localhost:${CONFIG.PORT}/health`
    );
  }
});

// Process event listeners
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Export for testing
module.exports = { app, server, io, onlineUsers, userSockets };

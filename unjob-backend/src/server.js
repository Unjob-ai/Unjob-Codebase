// server.js
import http from "http";
import { Server } from "socket.io";
// Import configuration and middleware
import connectDB from "./db/database.js";
import {
  globalErrorHandler,
  handleUnhandledRejection,
  handleUncaughtException,
} from "./middleware/errorHandler.js";
import app from "./app.js";
import mongoose from "mongoose";
import socketEventHandlers from "./Sockets/index.js";
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
  ],
};

// Socket.IO setup
 const io = new Server(server, {
  cors: {
    origin: CONFIG.ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});
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
      mongoose.connection.close(() => {
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

async function serverRunner() {
  await connectDB();

  socketEventHandlers(io);

  // Process error handlers
  handleUnhandledRejection();
  handleUncaughtException();
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
      `💾 Memory usage: ${(
        process.memoryUsage().heapUsed /
        1024 /
        1024
      ).toFixed(2)} MB`
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
}

serverRunner();

// Process event listeners
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Export for testing
export { server, io, log, COLORS };

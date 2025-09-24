// server.js - Fixed environment loading order
import dotenv from "dotenv";

// CRITICAL: Load environment variables FIRST before any other imports
dotenv.config();

// Now import everything else - this ensures all modules have access to env vars
import http from "http";
import { Server } from "socket.io";
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

// Validate critical environment variables
const validateEnvVars = () => {
  const required = ["JWT_SECRET", "MONGODB_URI", "BREVO_API_KEY", "FROM_EMAIL"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    log(
      "ERROR",
      "Config",
      `Missing required environment variables: ${missing.join(", ")}`
    );
    log(
      "ERROR",
      "Config",
      "Please check your .env file and restart the server"
    );
    
    // Log current env values for debugging (without sensitive data)
    log("DEBUG", "Config", `NODE_ENV: ${process.env.NODE_ENV}`);
    log("DEBUG", "Config", `PORT: ${process.env.PORT}`);
    log("DEBUG", "Config", `FROM_EMAIL: ${process.env.FROM_EMAIL ? 'SET' : 'NOT SET'}`);
    log("DEBUG", "Config", `BREVO_API_KEY: ${process.env.BREVO_API_KEY ? 'SET' : 'NOT SET'}`);
    
    process.exit(1);
  }

  log("INFO", "Config", "All required environment variables loaded successfully");
  
  // Debug log for email configuration
  log("INFO", "Email", `Email service configured with FROM_EMAIL: ${process.env.FROM_EMAIL}`);
  log("INFO", "Email", `Brevo API key configured: ${process.env.BREVO_API_KEY ? 'YES' : 'NO'}`);
};

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: CONFIG.ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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
      mongoose.connection.close((err) => {
        if (err) {
          log("ERROR", "Database", `Error closing MongoDB connection: ${err.message}`);
        } else {
          log("INFO", "Database", "MongoDB connection closed");
        }
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

// Main server function
async function serverRunner() {
  try {
    // Validate environment variables first
    validateEnvVars();

    // Connect to database
    await connectDB();
    log("INFO", "Database", "MongoDB connected successfully");

    // Initialize socket handlers
    socketEventHandlers(io);
    log("INFO", "Socket", "Socket event handlers initialized");

    // Setup process error handlers
    handleUnhandledRejection();
    handleUncaughtException();
    log("INFO", "Server", "Error handlers initialized");

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
      log("INFO", "Email", `📧 Email service status: ${process.env.BREVO_API_KEY ? 'ENABLED' : 'DISABLED'}`);
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
        log(
          "INFO",
          "Server",
          `🔧 Test Email: POST /api/auth/test-email (Admin only)`
        );
      }
    });
  } catch (error) {
    log("ERROR", "Server", `Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
serverRunner();

// Process event listeners
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Handle uncaught exceptions in production
process.on("uncaughtException", (err) => {
  log("ERROR", "Process", `Uncaught Exception: ${err.message}`);
  if (CONFIG.NODE_ENV === "production") {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason, promise) => {
  log(
    "ERROR",
    "Process",
    `Unhandled Rejection at: ${promise}, reason: ${reason}`
  );
  if (CONFIG.NODE_ENV === "production") {
    process.exit(1);
  }
});

// Export for testing
export { server, io, log, COLORS };
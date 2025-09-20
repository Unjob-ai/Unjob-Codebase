import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { apiLimiter } from "./middleware/rateLimitMiddleWare.js";
import { globalErrorHandler } from "./middleware/errorHandler.js";
import { corsMiddleware } from "./middleware/corsMiddleWare.js";
import { platform, cpus } from "os";
const startTime = new Date();
// Error handling for uncaught exceptions and unhandled promise rejections
import {
  handleUncaughtException,
  handleUnhandledRejection,
} from "./middleware/errorHandler.js";
handleUncaughtException();
handleUnhandledRejection();
// Import all routes
import apiRoutes from "./routes/index.js";
import errorHandler from "./middleware/errorHandlerMiddleware.js";
import { cookie } from "express-validator";
import cookieParser from "cookie-parser";
dotenv.config();
const app = express();
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
// Security Middleware
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
app.use(cookieParser());

// CORS configuration
app.use(corsMiddleware);
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
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
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
// Rate limiting
app.use("/api/", apiLimiter);
// API Routes
app.use("/api", apiRoutes);
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
app.use(errorHandler)
app.use(globalErrorHandler);
export default app;

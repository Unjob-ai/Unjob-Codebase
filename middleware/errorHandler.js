// middleware/errorHandler.js

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field} = '${value}'. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

const handleMulterError = (err) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError("File too large", 400);
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return new AppError("Too many files", 400);
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new AppError("Unexpected file field", 400);
  }
  return new AppError(err.message, 400);
};

const handleCloudinaryError = (err) => {
  if (err.error && err.error.message) {
    return new AppError(`File upload failed: ${err.error.message}`, 400);
  }
  return new AppError("File upload failed", 400);
};

const handleMongooseError = (err) => {
  if (err.name === "MongoNetworkError") {
    return new AppError("Database connection failed", 500);
  }
  if (err.name === "MongoTimeoutError") {
    return new AppError("Database operation timed out", 500);
  }
  return new AppError("Database error occurred", 500);
};

// Send error response for development
const sendErrorDev = (err, req, res) => {
  // Log error for debugging
  console.error("ERROR 💥", err);

  // API
  if (req.originalUrl.startsWith("/api")) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // RENDERED WEBSITE
  console.error("ERROR 💥", err);
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: err.message,
  });
};

// Send error response for production
const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith("/api")) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    // Programming or other unknown error: don't leak error details
    console.error("ERROR 💥", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }

  // RENDERED WEBSITE
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
    });
  }

  // Programming or other unknown error: don't leak error details
  console.error("ERROR 💥", err);
  return res.status(err.statusCode).render("error", {
    title: "Something went wrong!",
    msg: "Please try again later.",
  });
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === "CastError") error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === "ValidationError")
      error = handleValidationErrorDB(error);
    if (error.name === "JsonWebTokenError") error = handleJWTError();
    if (error.name === "TokenExpiredError") error = handleJWTExpiredError();
    if (error.name === "MulterError") error = handleMulterError(error);
    if (error.http_code) error = handleCloudinaryError(error);
    if (error.name && error.name.startsWith("Mongo"))
      error = handleMongooseError(error);

    sendErrorProd(error, req, res);
  }
};

// Async error handler wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler for undefined routes
const notFound = (req, res, next) => {
  const err = new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    404
  );
  next(err);
};

// Unhandled rejection handler
const handleUnhandledRejection = () => {
  process.on("unhandledRejection", (err, promise) => {
    console.log("UNHANDLED REJECTION! 💥 Shutting down...");
    console.log(err.name, err.message);

    // Close server gracefully
    process.exit(1);
  });
};

// Uncaught exception handler
const handleUncaughtException = () => {
  process.on("uncaughtException", (err) => {
    console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
    console.log(err.name, err.message);
    process.exit(1);
  });
};

// SIGTERM handler for graceful shutdown
const handleSigterm = (server) => {
  process.on("SIGTERM", () => {
    console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
    server.close(() => {
      console.log("💥 Process terminated!");
    });
  });
};

// Rate limit error handler
const handleRateLimitError = (req, res) => {
  res.status(429).json({
    status: "error",
    message: "Too many requests from this IP, please try again later.",
  });
};

// CORS error handler
const handleCorsError = (err, req, res, next) => {
  if (err && err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      status: "error",
      message: "CORS policy violation: This origin is not allowed",
    });
  }
  next(err);
};

// File upload error handler
const handleFileUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      status: "error",
      message: handleMulterError(err).message,
    });
  }
  next(err);
};

// Database connection error handler
const handleDbConnectionError = (err, req, res, next) => {
  if (err.name === "MongoNetworkError" || err.name === "MongoTimeoutError") {
    return res.status(500).json({
      status: "error",
      message: "Database connection failed. Please try again later.",
    });
  }
  next(err);
};

// Validation error formatter
const formatValidationErrors = (errors) => {
  return errors.reduce((acc, error) => {
    const field = error.param || error.path;
    if (!acc[field]) {
      acc[field] = [];
    }
    acc[field].push(error.msg || error.message);
    return acc;
  }, {});
};

// Custom error responses
const sendValidationError = (res, errors) => {
  return res.status(400).json({
    status: "fail",
    message: "Validation failed",
    errors: formatValidationErrors(errors),
  });
};

const sendUnauthorizedError = (res, message = "Authentication required") => {
  return res.status(401).json({
    status: "fail",
    message,
  });
};

const sendForbiddenError = (res, message = "Access denied") => {
  return res.status(403).json({
    status: "fail",
    message,
  });
};

const sendNotFoundError = (res, message = "Resource not found") => {
  return res.status(404).json({
    status: "fail",
    message,
  });
};

const sendConflictError = (res, message = "Resource conflict") => {
  return res.status(409).json({
    status: "fail",
    message,
  });
};

const sendServerError = (res, message = "Internal server error") => {
  return res.status(500).json({
    status: "error",
    message,
  });
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFound,
  handleUnhandledRejection,
  handleUncaughtException,
  handleSigterm,
  handleRateLimitError,
  handleCorsError,
  handleFileUploadError,
  handleDbConnectionError,

  // Error response helpers
  sendValidationError,
  sendUnauthorizedError,
  sendForbiddenError,
  sendNotFoundError,
  sendConflictError,
  sendServerError,
  formatValidationErrors,
};

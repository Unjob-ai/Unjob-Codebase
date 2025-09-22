// middleware/validation.js
import { body, param, query, validationResult } from "express-validator";
      import  isMongoId  from "validator"
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";

// Handle validation results
const handleValidationErrors = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // return res.status(400).json({
    //   error: "Validation Error",
    //   details: errors.array(),
    // });
    console.log("Validation errors:", errors.array());
    throw new apiError("Validation Error", 400, errors.array());
  }
  next();
})

// ============= USER VALIDATION =============

// User registration validation
const validateUserRegistration = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name should only contain letters and spaces"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("role")
    .isIn(["freelancer", "hiring"])
    .withMessage("Role must be either freelancer or hiring"),
  handleValidationErrors,
];

// User login validation
const validateUserLogin = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

// Profile update validation
const validateProfileUpdate = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("mobile")
    .optional()
    .isMobilePhone("en-IN")
    .withMessage("Please provide a valid Indian mobile number"),
  body("bio")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),
  body("hourlyRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Hourly rate must be a positive number"),
  body("skills")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Skills must be an array with at least one skill"),
  body("skills.*")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Each skill must not be empty"),
  body("location")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Location cannot exceed 100 characters"),
  body("website")
    .optional()
    .isURL()
    .withMessage("Please provide a valid website URL"),
  handleValidationErrors,
];

// ============= GIG VALIDATION =============

// Gig creation validation
const validateGigCreation = [
  body("title")
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage("Title must be between 5 and 100 characters"),
  body("description")
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage("Description must be between 20 and 2000 characters"),
  body("category").notEmpty().withMessage("Category is required"),
  body("subCategory")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Sub-category cannot exceed 50 characters"),
  body("budget")
    .isFloat({ min: 100 })
    .withMessage("Budget must be at least ₹100"),
  body("timeline")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Timeline cannot exceed 100 characters"),
  body("skills").optional().isArray().withMessage("Skills must be an array"),
  body("workType")
    .optional()
    .isIn(["remote", "onsite", "hybrid"])
    .withMessage("Work type must be remote, onsite, or hybrid"),
  body("experienceLevel")
    .optional()
    .isIn(["entry", "intermediate", "expert"])
    .withMessage("Experience level must be entry, intermediate, or expert"),
  handleValidationErrors,
];

// Gig application validation
const validateGigApplication = [
  body("proposedRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Proposed rate must be a positive number"),
  body("estimatedDuration")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Estimated duration cannot exceed 100 characters"),
  body("totalIterations")
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage("Total iterations must be between 1 and 20"),
  handleValidationErrors,
];

// ============= POST VALIDATION =============

// Post creation validation
const validatePostCreation = [
  body("title")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Description must be between 10 and 5000 characters"),
  body("category").notEmpty().withMessage("Category is required"),
  body("subCategory").notEmpty().withMessage("Sub-category is required"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Each tag must be between 1 and 30 characters"),
  body("postType")
    .optional()
    .isIn(["post", "portfolio"])
    .withMessage("Post type must be either post or portfolio"),
  handleValidationErrors,
];

// Comment validation
const validateComment = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment must be between 1 and 500 characters"),
  handleValidationErrors,
];

// ============= MESSAGE VALIDATION =============

// Message validation
const validateMessage = [
  body("conversationId")
    .isMongoId()
    .withMessage("Valid conversation ID is required"),
  body("content")
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Message content must be between 1 and 1000 characters"),
  body("type")
    .optional()
    .isIn(["text", "image", "file", "voice", "system"])
    .withMessage("Invalid message type"),
  handleValidationErrors,
];

// ============= PROJECT VALIDATION =============

// Project submission validation
const validateProjectSubmission = [
  body("title")
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Title must be between 5 and 200 characters"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),
  body("conversationId")
    .isMongoId()
    .withMessage("Valid conversation ID is required"),
  body("gigId").isMongoId().withMessage("Valid gig ID is required"),
  handleValidationErrors,
];

// Project status update validation
const validateProjectStatusUpdate = [
  body("status")
    .isIn([
      "submitted",
      "under_review",
      "revision_requested",
      "approved",
      "rejected",
    ])
    .withMessage("Invalid project status"),
  body("feedback")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Feedback cannot exceed 1000 characters"),
  handleValidationErrors,
];

// ============= PAYMENT VALIDATION =============

// Payment validation
const validatePayment = [
  body("amount")
    .isFloat({ min: 1 })
    .withMessage("Amount must be greater than 0"),
  body("type")
    .isIn(["subscription", "gig_payment", "gig_escrow", "milestone_payment"])
    .withMessage("Invalid payment type"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Description cannot exceed 200 characters"),
  handleValidationErrors,
];

// ============= PARAMETER VALIDATION =============

// ID parameter validation
const validateObjectId = (paramName = "id") => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];

// Multiple IDs validation
const validateObjectIds = (paramName = "ids") => [
  param(paramName)
    .custom((value) => {
      const ids = value.split(",");
      return ids.every((id) => isMongoId(id.trim()));
    })
    .withMessage(`All ${paramName} must be valid MongoDB IDs`),
  handleValidationErrors,
];

// ============= QUERY VALIDATION =============

// Pagination validation
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("sort")
    .optional()
    .isIn([
      "createdAt",
      "-createdAt",
      "updatedAt",
      "-updatedAt",
      "name",
      "-name",
    ])
    .withMessage("Invalid sort parameter"),
  handleValidationErrors,
];

// Search validation
const validateSearch = [
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),
  query("category")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Category must be between 1 and 50 characters"),
  query("location")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Location must be between 1 and 50 characters"),
  handleValidationErrors,
];

// Date range validation
const validateDateRange = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date")
    .custom((endDate, { req }) => {
      if (
        req.query.startDate &&
        new Date(endDate) <= new Date(req.query.startDate)
      ) {
        throw new Error("End date must be after start date");
      }
      return true;
    }),
  handleValidationErrors,
];

// ============= FILE VALIDATION =============

// File upload validation
const validateFileUpload = [
  body("fileType")
    .optional()
    .isIn(["image", "document", "video", "audio"])
    .withMessage("Invalid file type"),
  body("maxSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Max size must be a positive integer"),
  handleValidationErrors,
];

// ============= NOTIFICATION VALIDATION =============

// Notification validation
const validateNotification = [
  body("type")
    .isIn([
      "post_like",
      "post_comment",
      "gig_application",
      "project_submission",
      "payment",
      "message",
      "system",
    ])
    .withMessage("Invalid notification type"),
  body("title")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Title must be between 1 and 100 characters"),
  body("message")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Message must be between 1 and 200 characters"),
  handleValidationErrors,
];

// ============= EMAIL VALIDATION =============

// Email validation
const validateEmail = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  handleValidationErrors,
];

// ============= PASSWORD VALIDATION =============

// Password change validation
const validatePasswordChange = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long")
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error("Password confirmation does not match new password");
    }
    return true;
  }),
  handleValidationErrors,
];

export  {
  handleValidationErrors,

  // User validations
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,

  // Gig validations
  validateGigCreation,
  validateGigApplication,

  // Post validations
  validatePostCreation,
  validateComment,

  // Message validations
  validateMessage,

  // Project validations
  validateProjectSubmission,
  validateProjectStatusUpdate,

  // Payment validations
  validatePayment,

  // Parameter validations
  validateObjectId,
  validateObjectIds,

  // Query validations
  validatePagination,
  validateSearch,
  validateDateRange,

  // File validations
  validateFileUpload,

  // Notification validations
  validateNotification,

  // Email validations
  validateEmail,

  // Password validations
  validatePasswordChange,
};

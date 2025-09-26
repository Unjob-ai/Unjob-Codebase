// middleware/validationGigsMiddleware.js
import { body, param, query, validationResult } from "express-validator";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Handle validation results
const handleValidationErrors = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    const firstError = errorMessages[0];
    throw new apiError(firstError.message, 400);
  }
  next();
});

// Validate MongoDB ObjectId
const validateObjectId = (paramName) => {
  return param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`);
};

// Sanitize and validate text fields
const sanitizeText = (fieldName, minLength = 1, maxLength = 1000) => {
  return body(fieldName)
    .optional()
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(
      `${fieldName} must be between ${minLength} and ${maxLength} characters`
    )
    .escape(); // Escape HTML entities
};

// Validate email format
const validateEmail = (fieldName) => {
  return body(fieldName)
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage(`Please provide a valid ${fieldName}`);
};

// Validate URL format
const validateURL = (fieldName) => {
  return body(fieldName)
    .optional()
    .isURL()
    .withMessage(`Please provide a valid ${fieldName} URL`);
};

// Validate number ranges
const validateNumber = (fieldName, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  return body(fieldName)
    .optional()
    .isFloat({ min, max })
    .withMessage(`${fieldName} must be between ${min} and ${max}`)
    .toFloat();
};

// Validate array fields
const validateArray = (fieldName, maxItems = 50) => {
  return body(fieldName)
    .optional()
    .isArray({ max: maxItems })
    .withMessage(`${fieldName} must be an array with maximum ${maxItems} items`)
    .customSanitizer((value) => {
      // Remove empty strings and duplicates
      if (Array.isArray(value)) {
        return [...new Set(value.filter((item) => item && item.trim()))];
      }
      return value;
    });
};

// Custom validation for categories
const validateCategory = () => {
  const validCategories = [
    "web-development",
    "mobile-development",
    "design",
    "writing",
    "marketing",
    "video-editing",
    "data-entry",
    "virtual-assistant",
    "seo",
    "social-media",
    "translation",
    "programming",
    "consulting",
    "other",
  ];

  return body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(validCategories)
    .withMessage(`Category must be one of: ${validCategories.join(", ")}`);
};

// Custom validation for status
const validateStatus = () => {
  const validStatuses = [
    "draft",
    "published",
    "active",
    "paused",
    "completed",
    "cancelled",
    "closed",
  ];

  return body("status")
    .optional()
    .isIn(validStatuses)
    .withMessage(`Status must be one of: ${validStatuses.join(", ")}`);
};

// Custom validation for budget
const validateBudget = () => {
  return body("budget")
    .notEmpty()
    .withMessage("Budget is required")
    .isFloat({ min: 100, max: 10000000 })
    .withMessage("Budget must be between ₹100 and ₹1,00,00,000")
    .toFloat()
    .custom((value) => {
      // Ensure budget is in reasonable increments
      if (value < 1000 && value % 50 !== 0) {
        throw new Error("Budget under ₹1000 must be in increments of ₹50");
      }
      if (value >= 1000 && value < 10000 && value % 100 !== 0) {
        throw new Error(
          "Budget between ₹1000-₹10000 must be in increments of ₹100"
        );
      }
      if (value >= 10000 && value % 500 !== 0) {
        throw new Error("Budget above ₹10000 must be in increments of ₹500");
      }
      return true;
    });
};

// Custom validation for timeline
const validateTimeline = () => {
  return body("timeline")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Timeline must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-.,()]+$/)
    .withMessage("Timeline contains invalid characters");
};

// Custom validation for dates
const validateDateRange = () => {
  return [
    body("startDate")
      .optional()
      .isISO8601()
      .withMessage("Start date must be a valid date")
      .toDate()
      .custom((value) => {
        if (value && value < new Date()) {
          throw new Error("Start date cannot be in the past");
        }
        return true;
      }),

    body("endDate")
      .optional()
      .isISO8601()
      .withMessage("End date must be a valid date")
      .toDate()
      .custom((value, { req }) => {
        if (
          value &&
          req.body.startDate &&
          value <= new Date(req.body.startDate)
        ) {
          throw new Error("End date must be after start date");
        }
        if (value && value < new Date()) {
          throw new Error("End date cannot be in the past");
        }
        return true;
      }),
  ];
};

// Detect and prevent sensitive information
const preventSensitiveInfo = (fieldName) => {
  return body(fieldName)
    .optional()
    .custom((value) => {
      if (!value) return true;

      const text = value.toString().toLowerCase();

      // Email detection
      const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
      if (emailRegex.test(text)) {
        throw new Error(`${fieldName} cannot contain email addresses`);
      }

      // Phone number detection
      const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\d{3}[-.\s]?){2,}\d{3,}/;
      if (phoneRegex.test(text)) {
        throw new Error(`${fieldName} cannot contain phone numbers`);
      }

      // URL detection
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
      if (urlRegex.test(text)) {
        throw new Error(`${fieldName} cannot contain URLs or website links`);
      }

      // Social media handles
      const socialRegex = /@[A-Za-z0-9_]+/;
      if (socialRegex.test(text)) {
        throw new Error(`${fieldName} cannot contain social media handles`);
      }

      return true;
    });
};

// Validation for creating a gig
export const validateCreateGig = [
  // Required fields
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage("Title must be between 10 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-.,!?()]+$/)
    .withMessage("Title contains invalid characters"),

  validateCategory(),

  body("subCategory")
    .notEmpty()
    .withMessage("Sub-category is required")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Sub-category must be between 2 and 50 characters"),

  body("projectOverview")
    .notEmpty()
    .withMessage("Project overview is required")
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage("Project overview must be between 50 and 2000 characters"),

  validateBudget(),

  // Optional fields
  validateTimeline(),
  validateArray("tags", 20),
  validateArray("deliverables", 20),
  validateNumber("quantity", 1, 100),
  ...validateDateRange(),

  sanitizeText("assetDescription", 0, 500),

  // Prevent sensitive information
  preventSensitiveInfo("title"),
  preventSensitiveInfo("projectOverview"),
  preventSensitiveInfo("assetDescription"),

  // Custom validation for deliverables content
  body("deliverables.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Each deliverable must be between 1 and 200 characters"),

  // Custom validation for tags
  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Each tag must be between 1 and 30 characters")
    .matches(/^[a-zA-Z0-9\-\s]+$/)
    .withMessage("Tags can only contain letters, numbers, hyphens, and spaces"),

  handleValidationErrors,
];

// Validation for updating a gig
export const validateUpdateGig = [
  validateObjectId("id"),

  // All fields are optional for updates
  body("title")
    .optional()
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage("Title must be between 10 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-.,!?()]+$/)
    .withMessage("Title contains invalid characters"),

  body("category")
    .optional()
    .custom((value) => {
      const validCategories = [
        "web-development",
        "mobile-development",
        "design",
        "writing",
        "marketing",
        "video-editing",
        "data-entry",
        "virtual-assistant",
        "seo",
        "social-media",
        "translation",
        "programming",
        "consulting",
        "other",
      ];
      if (value && !validCategories.includes(value)) {
        throw new Error(
          `Category must be one of: ${validCategories.join(", ")}`
        );
      }
      return true;
    }),

  body("budget")
    .optional()
    .isFloat({ min: 100, max: 10000000 })
    .withMessage("Budget must be between ₹100 and ₹1,00,00,000")
    .toFloat(),

  body("projectOverview")
    .optional()
    .trim()
    .isLength({ min: 50, max: 2000 })
    .withMessage("Project overview must be between 50 and 2000 characters"),

  validateStatus(),
  validateTimeline(),
  validateArray("tags", 20),
  validateArray("deliverables", 20),
  validateNumber("quantity", 1, 100),
  ...validateDateRange(),

  sanitizeText("assetDescription", 0, 500),

  // Prevent sensitive information
  preventSensitiveInfo("title"),
  preventSensitiveInfo("projectOverview"),
  preventSensitiveInfo("assetDescription"),

  // Array item validation
  body("deliverables.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Each deliverable must be between 1 and 200 characters"),

  body("tags.*")
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage("Each tag must be between 1 and 30 characters"),

  handleValidationErrors,
];

// Validation for gig query parameters
export const validateGigQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),

  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum price must be a positive number")
    .toFloat(),

  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum price must be a positive number")
    .toFloat()
    .custom((value, { req }) => {
      if (
        value &&
        req.query.minPrice &&
        parseFloat(value) <= parseFloat(req.query.minPrice)
      ) {
        throw new Error("Maximum price must be greater than minimum price");
      }
      return true;
    }),

  query("sort")
    .optional()
    .isIn([
      "newest",
      "oldest",
      "price_low",
      "price_high",
      "featured",
      "relevance",
    ])
    .withMessage("Invalid sort parameter"),

  query("status")
    .optional()
    .isIn([
      "all",
      "active",
      "published",
      "draft",
      "paused",
      "completed",
      "cancelled",
    ])
    .withMessage("Invalid status filter"),

  query("category")
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Category must be between 1 and 50 characters"),

  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9\s\-.,!?()]+$/)
    .withMessage("Search query contains invalid characters"),

  handleValidationErrors,
];

// Validation for gig ID parameter
export const validateGigId = [validateObjectId("id"), handleValidationErrors];

// Validation for gig statistics
export const validateGigStatsQuery = [
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Date from must be a valid date")
    .toDate(),

  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("Date to must be a valid date")
    .toDate()
    .custom((value, { req }) => {
      if (
        value &&
        req.query.dateFrom &&
        value <= new Date(req.query.dateFrom)
      ) {
        throw new Error("Date to must be after date from");
      }
      return true;
    }),

  handleValidationErrors,
];

// Validation for bulk operations
export const validateBulkGigIds = [
  body("gigIds")
    .isArray({ min: 1, max: 50 })
    .withMessage("Must provide 1-50 gig IDs"),

  body("gigIds.*").isMongoId().withMessage("Each gig ID must be valid"),

  handleValidationErrors,
];

// Rate limiting validation
export const validateRateLimit = asyncHandler(async (req, res, next) => {
  // Check if user is making too many requests
  const userKey = `rate_limit_${req.user._id}`;
  // Add your rate limiting logic here using Redis or in-memory store

  next();
});

export default {
  validateCreateGig,
  validateUpdateGig,
  validateGigQuery,
  validateGigId,
  validateGigStatsQuery,
  validateBulkGigIds,
  validateRateLimit,
  handleValidationErrors,
};

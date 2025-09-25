// Additional validation functions to add to your existing validationMiddleWare.js

import { body, param, query, validationResult } from "express-validator";
import apiError from "../utils/apiError.js";

// Valid categories and subcategories
const VALID_CATEGORIES = {
  "Design & Creative": [
    "Logo Design",
    "Brand Identity",
    "Brochure/Flyer Design",
    "Business Cards",
    "Social Media Graphics",
    "Poster/Banner Design",
    "Web UI Design",
    "Mobile App Design",
    "Dashboard Design",
    "Design Systems",
    "Wireframing",
    "Prototyping (Figma/Adobe XD)",
    "Explainer Videos",
    "Kinetic Typography",
    "Logo Animation",
    "Reels & Shorts Animation",
    "3D Product Visualization",
    "Game Assets",
    "NFT Art",
    "Character Modeling",
    "Character Illustration",
    "Comic Art",
    "Children's Book Illustration",
    "Vector Art",
    "Acrylic Painting",
    "Watercolor Painting",
    "Oil Painting",
    "Canvas Art",
    "Pencil Sketches",
    "Charcoal Drawing",
    "Ink Illustration",
    "Line Art",
    "Hand-drawn Portraits",
    "Realistic Portraits",
    "Caricature Art",
    "Couple & Family Portraits",
    "Modern Calligraphy",
    "Custom Lettering",
    "Name Art",
    "Collage Art",
    "Texture Art",
    "Traditional + Digital Fusion",
    "Interior Wall Paintings",
    "Outdoor Murals",
    "Street Art Concepts",
  ],
  "Video & Animation": [
    "Reels & Shorts Editing",
    "YouTube Video Editing",
    "Wedding & Event Videos",
    "Cinematic Cuts",
    "2D Animation",
    "3D Animation",
    "Whiteboard Animation",
    "Explainer Videos",
    "Green Screen Editing",
    "Color Grading",
    "Rotoscoping",
  ],
  "Writing & Translation": [
    "Website Copy",
    "Landing Pages",
    "Ad Copy",
    "Sales Copy",
    "YouTube Scripts",
    "Instagram Reels",
    "Podcast Scripts",
    "Blog Posts",
    "Technical Writing",
    "Product Descriptions",
    "Ghostwriting",
    "Keyword Research",
    "On-page Optimization",
    "Meta Descriptions",
    "Document Translation",
    "Subtitling",
    "Voiceover Scripts",
  ],
  "Digital Marketing": [
    "Meta Ads",
    "Google Ads",
    "TikTok Ads",
    "Funnel Building",
    "Mailchimp/Klaviyo/HubSpot Campaigns",
    "Automated Sequences",
    "Cold Email Writing",
    "Content Calendars",
    "Community Engagement",
    "Brand Strategy",
    "Technical SEO",
    "Link Building",
    "Site Audits",
    "Influencer research",
    "UGC Scripts & Briefs",
  ],
  "Tech & Development": [
    "Full Stack Development",
    "Frontend (React, Next.js)",
    "Backend (Node.js, Django)",
    "WordPress/Shopify",
    "iOS/Android (Flutter, React Native)",
    "Progressive Web Apps (PWA)",
    "API Integration",
    "Webflow",
    "Bubble",
    "Softr",
    "Manual Testing",
    "Automation Testing",
    "Test Plan Creation",
    "AWS / GCP / Azure Setup",
    "CI/CD Pipelines",
    "Server Management",
  ],
  "AI & Automation": [
    "AI Blog Generation",
    "AI Voiceover & Dubbing",
    "AI Video Scripts",
    "Talking Head Videos",
    "Explainer Avatars",
    "Virtual Influencers",
    "ChatGPT/Claude Prompt Design",
    "Midjourney/DALLE Prompts",
    "Custom GPTs / API Workflows",
    "Vapi / AutoGPT Setup",
    "Zapier / Make Integrations",
    "Custom AI Workflows",
    "Assistant Building",
    "GPT App Development",
    "OpenAI API Integration",
    "AI-generated Product Renders",
    "Lifestyle Product Mockups",
    "Model-less Product Photography",
    "360° Product Spins (AI-generated)",
    "AI Backdrop Replacement",
    "Packaging Mockups (AI-enhanced)",
    "Virtual Try-On Assets",
    "Catalog Creation with AI Models",
    "Product UGC Simulation (AI Actors)",
  ],
  "Business & Legal": [
    "Invoicing & Reconciliation",
    "Monthly Financial Statements",
    "Tally / QuickBooks / Zoho Books",
    "Business Plans",
    "Startup Financial Decks",
    "Investor-Ready Models",
    "GST Filing (India)",
    "US/UK Tax Filing",
    "Company Registration Help",
    "NDA / Founder Agreements",
    "Employment Contracts",
    "SaaS Terms & Privacy Policies",
    "IP & Trademark Filing",
    "GST Registration",
    "Pitch Deck Design",
  ],
  Portfolio: ["Project"],
};

// Helper function to validate category and subcategory combination
function validateCategorySubcategory(category, subCategory) {
  if (!category || !subCategory) return false;
  const validSubcategories = VALID_CATEGORIES[category];
  if (!validSubcategories) return false;
  return validSubcategories.includes(subCategory);
}

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));
    throw new apiError("Validation failed", 400, errorMessages);
  }
  next();
};

// Post creation validation
export const validatePostCreation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .isIn(Object.keys(VALID_CATEGORIES))
    .withMessage("Invalid category"),

  body("subCategory")
    .notEmpty()
    .withMessage("SubCategory is required")
    .custom((value, { req }) => {
      const category = req.body.category;
      if (!validateCategorySubcategory(category, value)) {
        throw new Error("Invalid subcategory for the selected category");
      }
      return true;
    }),

  body("postType")
    .optional()
    .isIn(["post", "portfolio"])
    .withMessage("PostType must be either 'post' or 'portfolio'"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array")
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error("Maximum 10 tags allowed");
      }
      return true;
    }),

  body("images")
    .optional()
    .isArray()
    .withMessage("Images must be an array")
    .custom((images) => {
      if (images && images.length > 10) {
        throw new Error("Maximum 10 images allowed");
      }
      return true;
    }),

  body("videos")
    .optional()
    .isArray()
    .withMessage("Videos must be an array")
    .custom((videos) => {
      if (videos && videos.length > 3) {
        throw new Error("Maximum 3 videos allowed");
      }
      return true;
    }),

  body("project")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Project name cannot exceed 100 characters"),

  handleValidationErrors,
];

// Post update validation
export const validatePostUpdate = [
  body("title")
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters"),

  body("description")
    .optional()
    .isLength({ min: 10, max: 2000 })
    .withMessage("Description must be between 10 and 2000 characters"),

  body("category")
    .optional()
    .isIn(Object.keys(VALID_CATEGORIES))
    .withMessage("Invalid category"),

  body("subCategory")
    .optional()
    .custom((value, { req }) => {
      const category = req.body.category;
      if (category && value && !validateCategorySubcategory(category, value)) {
        throw new Error("Invalid subcategory for the selected category");
      }
      return true;
    }),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array")
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error("Maximum 10 tags allowed");
      }
      return true;
    }),

  body("project")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Project name cannot exceed 100 characters"),

  handleValidationErrors,
];

// Comment validation
export const validateComment = [
  body("content")
    .notEmpty()
    .withMessage("Comment content is required")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Comment must be between 1 and 1000 characters")
    .trim(),

  handleValidationErrors,
];

// Portfolio conversion validation
export const validatePortfolioConversion = [
  body("projectTitle")
    .notEmpty()
    .withMessage("Project title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Project title must be between 3 and 100 characters")
    .trim(),

  body("postIds")
    .isArray({ min: 1 })
    .withMessage("At least one post must be selected")
    .custom((postIds) => {
      if (postIds.length > 50) {
        throw new Error("Maximum 50 posts can be converted at once");
      }
      // Validate each postId is a valid ObjectId format
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      for (let postId of postIds) {
        if (!objectIdRegex.test(postId)) {
          throw new Error("Invalid post ID format");
        }
      }
      return true;
    }),

  handleValidationErrors,
];

// Report post validation
export const validateReportPost = [
  body("postId")
    .notEmpty()
    .withMessage("Post ID is required")
    .isMongoId()
    .withMessage("Invalid post ID format"),

  body("reason")
    .notEmpty()
    .withMessage("Reason is required")
    .isIn([
      "spam",
      "inappropriate",
      "harassment",
      "copyright",
      "fake",
      "violence",
      "hate_speech",
      "adult_content",
      "other",
    ])
    .withMessage("Invalid report reason"),

  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters")
    .trim(),

  handleValidationErrors,
];

// Search validation
export const validateSearch = [
  query("q")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters")
    .trim(),

  query("category")
    .optional()
    .isIn(Object.keys(VALID_CATEGORIES))
    .withMessage("Invalid category"),

  query("tags")
    .optional()
    .custom((tags) => {
      if (tags) {
        const tagsArray = tags.split(",");
        if (tagsArray.length > 5) {
          throw new Error("Maximum 5 tags allowed in search");
        }
      }
      return true;
    }),

  handleValidationErrors,
];

// Pagination validation (if not already exists)
export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Page must be a positive integer between 1 and 1000"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("sortBy")
    .optional()
    .isIn(["createdAt", "updatedAt", "likes", "views", "comments", "title"])
    .withMessage("Invalid sortBy field"),

  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("SortOrder must be 'asc' or 'desc'"),

  handleValidationErrors,
];

// ObjectId validation (if not already exists)
export const validateObjectId = (paramName = "id") => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`),

  handleValidationErrors,
];

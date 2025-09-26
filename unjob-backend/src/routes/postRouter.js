// routes/postRouter.js
import express from "express";
import {
  getAllPosts,
  createPost,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  addComment,
  deleteComment,
  convertToPortfolio,
  convertMultipleToPortfolio,
  getUserPosts,
  reportPost,
} from "../controllers/postsController.js";

import {
  validatePostCreation,
  validatePostUpdate,
  validateComment,
  validateObjectId,
  validatePagination,
  validatePortfolioConversion,
  validateReportPost,
} from "../middleware/validatePostMiddleware.js";

import {
  requireCompleteProfile,
  requireFreelancerOrHiring,
} from "../middleware/authMiddleware.js";

import { uploadConfigs } from "../middleware/uploadMiddleWare.js";

import {
  postLimiter,
  commentLimiter,
} from "../middleware/rateLimitMiddleWare.js";

const router = express.Router();

// Public routes - For viewing posts
router.get("/", validatePagination, getAllPosts);
router.get("/:id", validateObjectId(), getPostById);

// User-specific routes
router.get(
  "/user/:userId",
  validateObjectId("userId"),
  validatePagination,
  getUserPosts
);

// Protected routes
router.use(requireCompleteProfile);

// Post CRUD operations - using postImages for file uploads
router.post(
  "/",
  postLimiter,
  uploadConfigs.postImages,
  validatePostCreation,
  createPost
);

router.patch(
  "/:id",
  validateObjectId(),
  uploadConfigs.postImages,
  validatePostUpdate,
  updatePost
);

router.delete("/:id", validateObjectId(), deletePost);

// Post interactions
router.post("/:id/like", validateObjectId(), likePost);

router.post(
  "/:id/comments",
  commentLimiter,
  validateObjectId(),
  validateComment,
  addComment
);

router.delete("/:id/comments", validateObjectId(), deleteComment);

// Portfolio conversions
router.post(
  "/:id/convert-to-portfolio",
  validateObjectId(),
  validatePortfolioConversion,
  convertToPortfolio
);

router.post(
  "/convert-multiple-to-portfolio",
  validatePortfolioConversion,
  convertMultipleToPortfolio
);

// Report post
router.post("/report", validateReportPost, reportPost);

export default router;

// routes/posts.js
const express = require("express");
const {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike,
  addComment,
  deleteComment,
  getUserPosts,
  getPortfolioPosts,
  searchPosts,
  getTrendingPosts,
} = require("../controllers/postsController");

const {
  validatePostCreation,
  validateComment,
  validateObjectId,
  validatePagination,
  validateSearch,
} = require("../middleware/validation");

const { uploadConfigs } = require("../middleware/upload");
const { requireCompleteProfile } = require("../middleware/auth");
const { postLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Post CRUD operations
router.post(
  "/",
  postLimiter,
  requireCompleteProfile,
  uploadConfigs.postImages,
  validatePostCreation,
  createPost
);
router.get("/", validatePagination, getAllPosts);
router.get("/trending", validatePagination, getTrendingPosts);
router.get("/portfolio", validatePagination, getPortfolioPosts);
router.get("/search", validatePagination, validateSearch, searchPosts);
router.get(
  "/user/:userId",
  validateObjectId("userId"),
  validatePagination,
  getUserPosts
);
router.get("/:id", validateObjectId(), getPostById);
router.put(
  "/:id",
  requireCompleteProfile,
  uploadConfigs.postImages,
  validatePostCreation,
  validateObjectId(),
  updatePost
);
router.delete("/:id", requireCompleteProfile, validateObjectId(), deletePost);

// Post interactions
router.post(
  "/:id/like",
  requireCompleteProfile,
  validateObjectId(),
  toggleLike
);
router.post(
  "/:id/comments",
  requireCompleteProfile,
  validateComment,
  validateObjectId(),
  addComment
);
router.delete(
  "/:id/comments/:commentId",
  requireCompleteProfile,
  validateObjectId(),
  validateObjectId("commentId"),
  deleteComment
);

module.exports = router;

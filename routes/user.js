// routes/user.js
const express = require("express");
const {
  getProfile,
  completeProfile,
  updateProfile,
  getUserById,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  searchUsers,
  getUserStats,
  updateSettings,
  deactivateAccount,
} = require("../controllers/userController");

const {
  validateProfileUpdate,
  validateObjectId,
  validatePagination,
  validateSearch,
} = require("../middleware/validation");

const { uploadConfigs } = require("../middleware/upload");
const { requireCompleteProfile, requireActive } = require("../middleware/auth");

const router = express.Router();

// Profile routes
router.get("/profile", getProfile);
router.patch("/complete-profile", validateProfileUpdate, completeProfile);
router.put(
  "/profile",
  uploadConfigs.avatar,
  validateProfileUpdate,
  updateProfile
);

// User interaction routes
router.get("/search", validatePagination, validateSearch, searchUsers);
router.get("/:userId", validateObjectId("userId"), getUserById);
router.get(
  "/:userId/followers",
  validateObjectId("userId"),
  validatePagination,
  getUserFollowers
);
router.get(
  "/:userId/following",
  validateObjectId("userId"),
  validatePagination,
  getUserFollowing
);
router.get("/:userId/stats", validateObjectId("userId"), getUserStats);

// Follow/Unfollow routes (require complete profile)
router.post(
  "/:userId/follow",
  requireCompleteProfile,
  validateObjectId("userId"),
  followUser
);
router.delete(
  "/:userId/follow",
  requireCompleteProfile,
  validateObjectId("userId"),
  unfollowUser
);

// Settings and account management
router.put("/settings", updateSettings);
router.delete("/account", requireActive, deactivateAccount);

module.exports = router;

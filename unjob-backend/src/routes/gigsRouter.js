// routes/gigRoutes.js
import express from "express";
import {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  deleteGig,
  getGigForEdit,
  getGigApplications,
  getUserGigStats,
} from "../controllers/gigController.js";
import {
  authMiddleware as protect,
  requireHiring,
  optionalAuth,
} from "../middleware/authMiddleware.js";
import {
  uploadConfigs,
  validateFiles,
  processImages,
  handleUploadError,
  uploadToCloudMiddleware,
} from "../middleware/uploadMiddleWare.js";
import {
  validateCreateGig,
  validateUpdateGig,
  validateGigQuery,
  validateGigId,
} from "../middleware/validationGigsMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", ...validateGigQuery, optionalAuth, getGigs);
router.get("/:id", ...validateGigId, optionalAuth, getGigById);

// Protected routes - all routes below require authentication
router.use(protect);

// Gig management routes (hiring users only)
router.post(
  "/create",
  requireHiring,
  uploadConfigs.fields([
    { name: "bannerImage", maxCount: 1 },
    { name: "assetFiles", maxCount: 10 },
  ]),
  validateFiles(
    [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
    ],
    25 * 1024 * 1024 // 25MB max
  ),
  processImages,
  uploadToCloudMiddleware("gigs"),
  ...validateCreateGig,
  createGig,
  handleUploadError
);

router.get("/user-stats", requireHiring, getUserGigStats);

router.get("/:id/edit", ...validateGigId, requireHiring, getGigForEdit);

router.get("/:id/manage", ...validateGigId, requireHiring, getGigApplications);

router.put(
  "/:id",
  ...validateGigId,
  requireHiring, // <-- Changed
  uploadConfigs.fields([
    { name: "bannerImage", maxCount: 1 },
    { name: "newAssetFiles", maxCount: 10 },
  ]),
  validateFiles(
    [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
    ],
    25 * 1024 * 1024 // 25MB max
  ),
  processImages,
  uploadToCloudMiddleware("gigs"),
  ...validateUpdateGig,
  updateGig,
  handleUploadError
);

router.delete("/:id", ...validateGigId, requireHiring, deleteGig);

export default router;

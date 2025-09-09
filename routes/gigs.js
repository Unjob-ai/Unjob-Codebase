// routes/gigs.js
const express = require("express");
const {
  createGig,
  getAllGigs,
  getGigById,
  applyToGig,
  getGigApplications,
  updateApplicationStatus,
  updateGig,
  deleteGig,
  searchGigs,
  getCompanyGigs,
  getMyApplications,
  getGigCategories,
  getGigStats,
  getFeaturedGigs,
} = require("../controllers/gigController");

const {
  validateGigCreation,
  validateGigApplication,
  validateObjectId,
  validatePagination,
  validateSearch,
} = require("../middleware/validation");

const {
  requireCompleteProfile,
  requireHiring,
  requireFreelancer,
  requireFreelancerOrHiring,
} = require("../middleware/auth");

const { gigLimiter, applicationLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Public/General routes
router.get("/", validatePagination, getAllGigs);
router.get("/featured", validatePagination, getFeaturedGigs);
router.get("/categories", getGigCategories);
router.get("/stats", getGigStats);
router.get("/search", validatePagination, validateSearch, searchGigs);

// Company-specific routes (Hiring role required)
router.post(
  "/",
  gigLimiter,
  requireHiring,
  requireCompleteProfile,
  validateGigCreation,
  createGig
);
router.get("/company", requireHiring, validatePagination, getCompanyGigs);
router.get(
  "/:id/applications",
  requireHiring,
  validateObjectId(),
  validatePagination,
  getGigApplications
);
router.put(
  "/:id/applications/:applicationId",
  requireHiring,
  validateObjectId(),
  validateObjectId("applicationId"),
  updateApplicationStatus
);
router.put("/:id", requireHiring, validateObjectId(), updateGig);
router.delete("/:id", requireHiring, validateObjectId(), deleteGig);

// Freelancer-specific routes
router.post(
  "/:id/apply",
  applicationLimiter,
  requireFreelancer,
  requireCompleteProfile,
  validateGigApplication,
  validateObjectId(),
  applyToGig
);
router.get(
  "/my-applications",
  requireFreelancer,
  validatePagination,
  getMyApplications
);

// Routes accessible by both roles
router.get("/:id", requireFreelancerOrHiring, validateObjectId(), getGigById);

module.exports = router;

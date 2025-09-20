// routes/gigs.js
import  express  from "express"
import  {
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
} from "../controllers/gigController.js"

import  {
  validateGigCreation,
  validateGigApplication,
  validateObjectId,
  validatePagination,
  validateSearch,
}  from "../middleware/validationMiddleWare.js"

import  {
  requireCompleteProfile,
  requireHiring,
  requireFreelancer,
  requireFreelancerOrHiring,
}  from "../middleware/authMiddleware.js"

import  { gigLimiter, applicationLimiter } from "../middleware/rateLimitMiddleWare.js"

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

export default router;

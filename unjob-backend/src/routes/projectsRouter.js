// routes/projects.js
import  express  from "express"
import  {
  submitProject,
  getProjects,
  updateProjectStatus,
} from "../controllers/projectController.js"

import  {
  validateProjectSubmission,
  validateProjectStatusUpdate,
  validateObjectId,
  validatePagination,
} from "../middleware/validationMiddleWare.js"

import  { uploadConfigs } from "../middleware/uploadToS3Middleware.js"
import {
  requireCompleteProfile,
  requireFreelancer,
  requireHiring,
  requireFreelancerOrHiring,
} from "../middleware/authMiddleware.js"

const router = express.Router();

// Project routes
router.post(
  "/",
  uploadConfigs.projectFiles,
  requireFreelancer,
  requireCompleteProfile,
  validateProjectSubmission,
  submitProject
);
router.get(
  "/",
  requireFreelancerOrHiring,
  requireCompleteProfile,
  validatePagination,
  getProjects
);
router.put(
  "/:id/status",
  requireHiring,
  requireCompleteProfile,
  validateProjectStatusUpdate,
  validateObjectId(),
  updateProjectStatus
);

export default router;

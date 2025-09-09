// routes/projects.js
const express = require("express");
const {
  submitProject,
  getProjects,
  updateProjectStatus,
} = require("../controllers/projectController");

const {
  validateProjectSubmission,
  validateProjectStatusUpdate,
  validateObjectId,
  validatePagination,
} = require("../middleware/validation");

const { uploadConfigs } = require("../middleware/upload");
const {
  requireCompleteProfile,
  requireFreelancer,
  requireHiring,
  requireFreelancerOrHiring,
} = require("../middleware/auth");

const router = express.Router();

// Project routes
router.post(
  "/",
  requireFreelancer,
  requireCompleteProfile,
  uploadConfigs.projectFiles,
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

module.exports = router;

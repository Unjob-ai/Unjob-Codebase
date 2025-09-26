// routes/applicationRoutes.js
import express from "express";
import {
  createApplication,
  acceptApplication,
  rejectApplication,
  directAcceptApplication,
} from "../controllers/applicationController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// Application management routes
router.post("/create", authorize("freelancer"), createApplication);

// Hiring user routes for managing applications
router.post("/:gigId/accept", authorize("hiring"), acceptApplication);
router.post("/:gigId/reject", authorize("hiring"), rejectApplication);
router.post(
  "/:gigId/direct-accept",
  authorize("hiring"),
  directAcceptApplication
);

export default router;

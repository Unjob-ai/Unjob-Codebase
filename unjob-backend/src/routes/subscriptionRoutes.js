// routes/subscriptionRoutes.js
import express from "express";
import {
  getPlans,
  checkSubscriptionStatus,
  verifyPayment,
  getSubscriptionManagement,
  updateSubscriptionSettings,
  handleWebhook,
  createSubscription,
} from "../controllers/subscriptionController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/plans", getPlans);
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
); // Webhook should be public with raw body

// Protected routes - require authentication
router.use(authMiddleware); // All routes below this middleware require authentication

router.post("/create", createSubscription);
router.get("/status", checkSubscriptionStatus);
router.post("/verify-payment", verifyPayment);
router.get("/manage", getSubscriptionManagement);
router.patch("/manage", updateSubscriptionSettings);

export default router;

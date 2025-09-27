import mongoose from "mongoose";

const SupportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Allow anonymous submissions
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    issueType: {
      type: String,
      enum: [
        "payment_issue",
        "subscription_issue", 
        "account_issue",
        "technical_issue",
        "billing_question",
        "refund_request",
        "feature_request",
        "bug_report",
        "other"
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [{
      filename: String,
      url: String,
      size: Number,
      type: String,
    }],
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
    },
    responses: [{
      message: String,
      author: String,
      isStaff: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    }],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: Date,
    lastResponseAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
SupportTicketSchema.index({ userId: 1, createdAt: -1 });
SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ issueType: 1, createdAt: -1 });

export default mongoose.models.SupportTicket || mongoose.model("SupportTicket", SupportTicketSchema);

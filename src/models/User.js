const mongoose = require("mongoose");

const structuredSkillSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    subcategory: { type: String, required: true },
    years: { type: String, required: true },
  },
  { _id: false }
);

const bankDetailsSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    accountHolderName: { type: String, default: "" },
    bankName: { type: String, default: "" },
    upiId: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    images: [{ type: String }],
    technologies: [{ type: String }],
    liveUrl: { type: String },
    githubUrl: { type: String },
    category: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: ["freelancer", "hiring", "admin"],
      default: "freelancer",
    },
    image: { type: String },
    profile: {
      bio: { type: String, default: "" },
      location: { type: String, default: "" },
      website: { type: String, default: "" },
      phone: { type: String, default: "" },
      skills: [{ type: String }],
      structuredSkills: [structuredSkillSchema],
      experience: { type: String, default: "" },
      hourlyRate: { type: Number, default: 0 },
      availability: {
        type: String,
        enum: ["available", "busy", "unavailable"],
        default: "available",
      },
      portfolio: [portfolioSchema],
      bankDetails: bankDetailsSchema,
      completionScore: { type: Number, default: 0 },
      needsRoleSelection: { type: Boolean, default: true },
    },
    stats: {
      totalEarnings: { type: Number, default: 0 },
      availableEarnings: { type: Number, default: 0 },
      totalWithdrawn: { type: Number, default: 0 },
      completedProjects: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      reviewsCount: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ "profile.skills": 1 });

module.exports = mongoose.model("User", userSchema);

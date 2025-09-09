// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Embedded schema for structured skills
const structuredSkillSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subcategory: {
      type: String,
      required: true,
      trim: true,
    },
    skills: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
  },
  { _id: false }
);

// Bank details schema for freelancers
const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    upiId: {
      type: String,
      trim: true,
    },
    ifscCode: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// Portfolio item schema
const PortfolioItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    image: {
      type: String,
    },
    postsCount: {
      type: Number,
      default: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Profile schema
const profileSchema = new mongoose.Schema(
  {
    bio: {
      type: String,
      default: "",
    },
    skills: [{ type: String }], // Legacy skills
    structuredSkills: [structuredSkillSchema],
    hourlyRate: {
      type: Number,
      min: 0,
    },
    location: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    portfolio: [PortfolioItemSchema],
    experience: {
      type: Number,
      default: 0,
    },
    education: [
      {
        degree: String,
        institution: String,
        year: Number,
      },
    ],
    certifications: [
      {
        name: String,
        issuer: String,
        date: Date,
        url: String,
      },
    ],
    languages: [
      {
        language: String,
        proficiency: {
          type: String,
          enum: ["Beginner", "Intermediate", "Advanced", "Native"],
        },
      },
    ],
    // Company fields for hiring role
    companyName: {
      type: String,
      default: "",
    },
    companySize: {
      type: String,
      enum: [
        "",
        "1-10",
        "11-50",
        "51-200",
        "201-500",
        "500+",
        "1-10 employees",
        "11-50 employees",
        "51-200 employees",
        "201-500 employees",
        "501-1000 employees",
        "1000+ employees",
      ],
      default: "",
    },
    contactPersonName: {
      type: String,
      default: "",
    },
    businessEmail: {
      type: String,
      default: "",
    },
    industry: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    // Freelancer specific fields
    bankDetails: bankDetailsSchema,
    availability: {
      type: String,
      enum: ["Available", "Busy", "Not Available"],
      default: "Available",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  { _id: false }
);

// Stats schema
const statsSchema = new mongoose.Schema(
  {
    totalEarnings: {
      type: Number,
      default: 0,
    },
    completedProjects: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    followers: {
      type: Number,
      default: 0,
    },
    following: {
      type: Number,
      default: 0,
    },
    postsCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// Main User Schema
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
      required: function () {
        return this.profile && this.profile.isCompleted === true;
      },
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^\d{10}$/.test(v);
        },
        message: "Please enter a valid 10-digit mobile number",
      },
    },
    password: {
      type: String,
      required: function () {
        return this.provider !== "google";
      },
    },
    image: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["freelancer", "hiring", "admin"],
      required: true,
    },
    provider: {
      type: String,
      enum: ["email", "google"],
      default: "email",
    },
    googleId: {
      type: String,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    profile: profileSchema,
    stats: statsSchema,

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    lastLogin: Date,
    isActive: {
      type: Boolean,
      default: true,
    },

    fcmToken: String,
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Profile cleanup middleware
userSchema.pre("save", function (next) {
  // Handle mobile field requirement based on provider
  if (this.provider === "google") {
    this._required = false;
  }

  // Make sure OAuth users with googleId are considered verified
  if (this.provider === "google" && this.googleId) {
    this.verified = true;
    this.isVerified = true;
  }

  // Clean up role-specific fields
  if (
    this.isModified("role") ||
    this.isNew ||
    (this.profile && this.profile.isCompleted)
  ) {
    if (this.role === "freelancer" && this.profile) {
      // Remove company-specific fields for freelancers
      this.profile.companyName = undefined;
      this.profile.companySize = undefined;
      this.profile.industry = undefined;
      this.profile.description = undefined;

      // Set default availability for freelancers if missing
      if (!this.profile.availability) {
        this.profile.availability = "Available";
      }
    } else if (this.role === "hiring" && this.profile) {
      // Remove freelancer-specific fields for hiring managers
      this.profile.hourlyRate = undefined;
      this.profile.availability = undefined;
      this.profile.bankDetails = undefined;

      this.markModified("profile");
    }
  }
  next();
});

// Create wallet for freelancers
userSchema.post("save", async function (doc, next) {
  const isNew = this.createdAt.getTime() === this.updatedAt.getTime();
  if (isNew && this.role === "freelancer") {
    try {
      const Wallet = mongoose.model("Wallet");
      await Wallet.create({ userId: this._id });
    } catch (error) {
      console.error(
        `Failed to create wallet for freelancer ${this._id}:`,
        error
      );
    }
  }
  next();
});

// Methods
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isProfileComplete = function () {
  console.log(`Checking profile completion for user ${this._id}`);

  if (this.profile && this.profile.isCompleted === true) {
    console.log(`User ${this._id} has explicit isCompleted=true in profile`);
    return true;
  }

  if (!this.profile) {
    console.log(`User ${this._id} has no profile object`);
    return false;
  }

  const mobileValue = this.profile.mobile || this.mobile;
  const hasCommonInfo = mobileValue && String(mobileValue).trim().length > 0;
  const hasBio = this.profile.bio && this.profile.bio.trim().length >= 10;
  const hasSkills =
    (this.profile.skills && this.profile.skills.length >= 3) ||
    (this.profile.structuredSkills &&
      this.profile.structuredSkills.length >= 1);

  let roleSpecificComplete = false;

  if (this.role === "freelancer") {
    roleSpecificComplete =
      hasBio &&
      hasSkills &&
      this.profile.hourlyRate > 0 &&
      this.profile.availability;
  } else if (this.role === "hiring") {
    roleSpecificComplete =
      this.profile.companyName &&
      this.profile.companyName.trim().length > 0 &&
      this.profile.contactPersonName &&
      this.profile.contactPersonName.trim().length > 0 &&
      this.profile.businessEmail &&
      this.profile.businessEmail.trim().length > 0 &&
      this.profile.companySize &&
      this.profile.industry &&
      this.profile.industry.trim().length > 0;
  } else if (this.role === "admin") {
    roleSpecificComplete = true;
  }

  const result = hasCommonInfo && roleSpecificComplete;

  console.log(`Profile completion check for ${this._id}:`, {
    mobile: mobileValue,
    hasCommonInfo,
    hasBio,
    hasSkills,
    roleSpecificComplete,
    role: this.role,
    result,
    profileKeys: Object.keys(this.profile),
  });

  return result;
};

userSchema.methods.hasBankDetails = function () {
  if (this.role !== "freelancer" || !this.profile?.bankDetails) return false;

  const { accountHolderName, accountNumber, upiId, ifscCode } =
    this.profile.bankDetails;
  const hasName = accountHolderName && accountHolderName.trim().length > 0;
  const hasUpi = upiId && upiId.trim().length > 0;
  const hasFullBankDetails =
    accountNumber &&
    accountNumber.trim().length > 0 &&
    ifscCode &&
    ifscCode.trim().length > 0;

  return hasName && (hasUpi || hasFullBankDetails);
};

// Indexes
userSchema.index({ role: 1 });
userSchema.index({ "profile.skills": 1 });
userSchema.index({ "profile.structuredSkills.category": 1 });
userSchema.index({ "profile.structuredSkills.subcategory": 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);

// models/User.js - Complete User model with username fix
import mongoose from "mongoose";

// Embedded schema for bank details (freelancers only)
const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: {
      type: String,
      default: "",
    },
    accountNumber: {
      type: String,
      default: "",
    },
    upiId: {
      type: String,
      default: "",
    },
    ifscCode: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

// Updated industry enum in profileSchema
const profileSchema = new mongoose.Schema(
  {
    bio: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    structuredSkills: {
      type: [
        {
          category: String,
          subcategory: String,
          years: String,
        },
      ],
      default: [],
    },
    hourlyRate: {
      type: Number,
      default: null,
    },
    // Company-specific fields (hiring users)
    companyName: {
      type: String,
      default: "",
    },
    companySize: {
      type: String,
      enum: [
        "",
        "1-10 employees",
        "11-50 employees",
        "51-200 employees",
        "201-500 employees",
        "501-1000 employees",
        "1000+ employees",
      ],
      default: "",
    },
    industry: {
      type: String,
      enum: [
        "",
        "technology",
        "healthcare",
        "finance",
        "education",
        "e-commerce",
        "marketing",
        "manufacturing",
        "real-estate",
        "consulting",
        "entertainment",
        "fashion",
        "retail",
        "media",
        "automotive",
        "construction",
        "hospitality",
        "legal",
        "non-profit",
        "government",
        "agriculture",
        "logistics",
        "telecommunications",
        "food-beverage",
        "travel-tourism",
        "sports",
        "other",
      ],
      default: "",
      // Add case-insensitive transformation
      set: function (value) {
        return value ? value.toLowerCase().trim() : value;
      },
    },
    description: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    // Freelancer-specific fields
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

// Embedded schema for user statistics
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

// Email change history schema for security audit trail
const emailChangeHistorySchema = new mongoose.Schema(
  {
    oldEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    newEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    verificationMethod: {
      type: String,
      enum: ["email_verification", "admin_change"],
      default: "email_verification",
    },
  },
  { _id: true }
);

// Pending email change schema
const pendingEmailChangeSchema = new mongoose.Schema(
  {
    newEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
        },
        message: "Please provide a valid new email address.",
      },
    },
    verificationToken: {
      type: String,
      required: true,
    },
    tokenExpiry: {
      type: Date,
      required: true,
    },
    requested: {
      type: Date,
      default: Date.now,
    },
    requestIP: {
      type: String,
      default: null,
    },
    requestUserAgent: {
      type: String,
      default: null,
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

    // Username field - make it not required in schema to allow pre-save generation
    username: {
      type: String,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow null/undefined during creation
          return /^[a-zA-Z0-9_]+$/.test(v) && !/^\d+$/.test(v);
        },
        message:
          "Username must contain at least one letter and can only contain letters, numbers, and underscores",
      },
    },

    // Email field
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
        },
        message: "Please provide a valid email address.",
      },
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
          return /^\d{6,15}$/.test(v.replace(/\D/g, ""));
        },
        message: "Please enter a valid mobile number",
      },
    },

    // Country of Origin fields
    countryOfOrigin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 3,
      validate: {
        validator: function (v) {
          return /^[A-Z]{2,3}$/.test(v);
        },
        message: "Country code must be a valid ISO country code",
      },
    },

    countryName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    phoneCountryCode: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^\+\d{1,4}$/.test(v);
        },
        message: "Phone country code must be in format +XXX",
      },
    },

    password: {
      type: String,
      required: function () {
        return this.provider === "credentials";
      },
    },

    // OAuth related fields
    provider: {
      type: String,
      enum: ["credentials", "google", null],
      default: "credentials",
    },

    googleId: {
      type: String,
    },

    role: {
      type: String,
      enum: ["freelancer", "hiring", "admin"],
      required: true,
    },

    image: {
      type: String,
      default: null,
    },

    coverImage: {
      type: String,
      default: null,
    },

    profile: profileSchema,
    stats: statsSchema,

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Email verification fields
    isVerified: {
      type: Boolean,
      default: false,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verificationToken: {
      type: String,
      default: null,
    },

    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpiry: {
      type: Date,
      default: null,
    },

    // Email change management
    pendingEmailChange: pendingEmailChangeSchema,

    emailChangeHistory: [emailChangeHistorySchema],

    // User activity tracking
    lastLogin: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // Account security
    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    // Two-factor authentication
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    twoFactorSecret: {
      type: String,
      default: null,
    },

    // Backup codes for 2FA
    backupCodes: [
      {
        code: String,
        used: { type: Boolean, default: false },
        usedAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// --- MIDDLEWARE (HOOKS) ---

userSchema.pre("validate", function (next) {
  if (this.provider === "google") {
    this.schema.paths.password.options.required = false;
    if (!this.profile || !this.profile.isCompleted) {
      this.schema.paths.mobile.options.required = false;
    }
  }
  next();
});

// Helper function to generate unique username
async function generateUniqueUsername(baseUsername, excludeId = null) {
  let username = baseUsername;
  let counter = 1;

  while (true) {
    const query = { username: username };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingUser = await mongoose.models.User.findOne(query);
    if (!existingUser) {
      return username;
    }

    username = `${baseUsername}_${counter}`;
    counter++;

    // Safety check to prevent infinite loop
    if (counter > 1000) {
      username = `${baseUsername}_${Date.now()}`;
      break;
    }
  }

  return username;
}

userSchema.pre("save", async function (next) {
  // Always ensure username exists and is unique
  if (!this.username) {
    const emailPrefix = this.email.split("@")[0];
    let baseUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

    if (baseUsername.length < 3) {
      baseUsername = `user_${baseUsername}`;
    }
    if (baseUsername.length > 25) {
      baseUsername = baseUsername.substring(0, 25);
    }

    // Generate unique username
    this.username = await generateUniqueUsername(baseUsername, this._id);
  }

  if (this.provider === "google") {
    this._required = false;
  }

  if (this.provider === "google" && this.googleId) {
    this.verified = true;
    this.isVerified = true;
  }

  // Clean up expired email change requests before saving
  if (
    this.pendingEmailChange &&
    this.pendingEmailChange.tokenExpiry < new Date()
  ) {
    this.pendingEmailChange = undefined;
  }

  if (
    this.isModified("role") ||
    this.isNew ||
    (this.profile && this.profile.isCompleted)
  ) {
    if (this.role === "freelancer" && this.profile) {
      this.profile.companyName = undefined;
      this.profile.companySize = undefined;
      this.profile.industry = undefined;
      this.profile.description = undefined;

      if (!this.profile.availability) {
        this.profile.availability = "Available";
      }
    } else if (this.role === "hiring" && this.profile) {
      this.profile.hourlyRate = undefined;
      this.profile.availability = undefined;
      this.profile.bankDetails = undefined;
      this.markModified("profile");
    }
  }
  next();
});

userSchema.post("save", async function (doc, next) {
  if (this.isModified("image") && this.image && this.role === "hiring") {
    try {
      const Gig = mongoose.models.Gig || mongoose.model("Gig");
      const gigsToUpdate = await Gig.find({
        company: this._id,
        $or: [
          { bannerImage: { $exists: false } },
          { bannerImage: null },
          { bannerImage: "" },
          { bannerImage: { $regex: /\/profile\// } },
        ],
      });

      if (gigsToUpdate.length > 0) {
        await Gig.updateMany(
          { _id: { $in: gigsToUpdate.map((g) => g._id) } },
          { $set: { bannerImage: this.image } }
        );
      }
    } catch (error) {
      console.error(`[USER_MODEL] Error updating gig banners:`, error);
    }
  }

  const isNew = this.createdAt.getTime() === this.updatedAt.getTime();
  if (isNew && this.role === "freelancer") {
    try {
      const Wallet = mongoose.models.Wallet || mongoose.model("Wallet");
      const existingWallet = await Wallet.findOne({ user: this._id });
      if (!existingWallet) {
        await Wallet.create({
          user: this._id,
          balance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          transactions: [],
        });
      }
    } catch (walletError) {
      console.error(`[USER_MODEL] Failed to create wallet:`, walletError);
    }
  }

  next();
});

// --- METHODS ---

// Profile completion check
userSchema.methods.isProfileComplete = function () {
  if (!this.mobile || this.mobile.trim().length === 0) return false;

  const hasCommonInfo = this.name && this.name.trim().length > 0;
  let roleSpecificComplete = false;

  if (this.role === "freelancer") {
    const hasBio = this.profile?.bio && this.profile.bio.trim().length > 0;
    const hasSkills =
      this.profile?.structuredSkills &&
      this.profile.structuredSkills.length > 0;
    roleSpecificComplete = hasBio && hasSkills;
  } else if (this.role === "hiring") {
    roleSpecificComplete =
      this.profile?.companyName &&
      this.profile.companyName.trim().length > 0 &&
      this.profile.companySize &&
      this.profile.industry &&
      this.profile.industry.trim().length > 0;
  } else if (this.role === "admin") {
    roleSpecificComplete = true;
  }

  return hasCommonInfo && roleSpecificComplete;
};

// Bank details check (freelancers only)
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

// Country information getter
userSchema.methods.getCountryInfo = function () {
  return {
    code: this.countryOfOrigin,
    name: this.countryName,
    dialCode: this.phoneCountryCode,
  };
};

// Formatted mobile number
userSchema.methods.getFormattedMobile = function () {
  if (!this.mobile || !this.phoneCountryCode) return this.mobile;
  return `${this.phoneCountryCode} ${this.mobile}`;
};

// Email change management methods
userSchema.methods.hasPendingEmailChange = function () {
  return (
    this.pendingEmailChange &&
    this.pendingEmailChange.tokenExpiry &&
    this.pendingEmailChange.tokenExpiry > new Date()
  );
};

userSchema.methods.getEmailChangeTimeRemaining = function () {
  if (!this.hasPendingEmailChange()) {
    return 0;
  }
  return Math.max(0, this.pendingEmailChange.tokenExpiry - new Date());
};

userSchema.methods.addEmailChangeToHistory = function (
  oldEmail,
  newEmail,
  metadata = {}
) {
  this.emailChangeHistory.push({
    oldEmail,
    newEmail,
    changedAt: new Date(),
    ipAddress: metadata.ipAddress || null,
    userAgent: metadata.userAgent || null,
    verificationMethod: metadata.verificationMethod || "email_verification",
  });

  // Keep only last 10 email changes for security audit
  if (this.emailChangeHistory.length > 10) {
    this.emailChangeHistory = this.emailChangeHistory.slice(-10);
  }
};

// Account security methods
userSchema.methods.isAccountLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // If we have reached max attempts and it's not locked already, lock the account
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours

  if (this.loginAttempts + 1 >= maxAttempts && !this.isAccountLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Two-factor authentication methods
userSchema.methods.enableTwoFactor = function (secret, backupCodes) {
  this.twoFactorEnabled = true;
  this.twoFactorSecret = secret;
  this.backupCodes = backupCodes.map((code) => ({ code, used: false }));
};

userSchema.methods.disableTwoFactor = function () {
  this.twoFactorEnabled = false;
  this.twoFactorSecret = null;
  this.backupCodes = [];
};

userSchema.methods.useBackupCode = function (code) {
  const backupCode = this.backupCodes.find(
    (bc) => bc.code === code && !bc.used
  );
  if (backupCode) {
    backupCode.used = true;
    backupCode.usedAt = new Date();
    return true;
  }
  return false;
};

// --- STATIC METHODS ---

// Clean up expired email change requests
userSchema.statics.cleanupExpiredEmailChanges = async function () {
  const result = await this.updateMany(
    { "pendingEmailChange.tokenExpiry": { $lt: new Date() } },
    { $unset: { pendingEmailChange: "" } }
  );
  return result.modifiedCount;
};

// Find users by email (including pending changes)
userSchema.statics.findByEmailIncludingPending = async function (email) {
  return await this.find({
    $or: [
      { email: email.toLowerCase() },
      { "pendingEmailChange.newEmail": email.toLowerCase() },
    ],
  });
};

// Security audit - find recent email changes
userSchema.statics.getRecentEmailChanges = async function (days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.find({
    "emailChangeHistory.changedAt": { $gte: cutoffDate },
  })
    .select("name email emailChangeHistory")
    .lean();
};

// Fix existing users with null usernames
userSchema.statics.fixNullUsernames = async function () {
  const usersWithNullUsernames = await this.find({
    $or: [{ username: null }, { username: { $exists: false } }],
  });

  console.log(
    `Found ${usersWithNullUsernames.length} users with null usernames`
  );

  for (const user of usersWithNullUsernames) {
    const emailPrefix = user.email.split("@")[0];
    let baseUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

    if (baseUsername.length < 3) {
      baseUsername = `user_${baseUsername}`;
    }
    if (baseUsername.length > 25) {
      baseUsername = baseUsername.substring(0, 25);
    }

    const uniqueUsername = await generateUniqueUsername(baseUsername, user._id);

    await this.findByIdAndUpdate(user._id, { username: uniqueUsername });
    console.log(`Fixed username for user ${user.email}: ${uniqueUsername}`);
  }

  return usersWithNullUsernames.length;
};

// --- INDEXES ---
userSchema.index({ role: 1 });
userSchema.index({ username: 1 }, { unique: true, sparse: true }); // Make it sparse to handle nulls during creation
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ countryOfOrigin: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ "profile.skills": 1 });
userSchema.index({ "profile.structuredSkills.category": 1 });
userSchema.index({ "profile.structuredSkills.subcategory": 1 });
userSchema.index({ createdAt: -1 });

// Email change specific indexes
userSchema.index({
  "pendingEmailChange.verificationToken": 1,
  "pendingEmailChange.tokenExpiry": 1,
});
userSchema.index({ "pendingEmailChange.newEmail": 1 });
userSchema.index({ "emailChangeHistory.changedAt": -1 });

// Security indexes
userSchema.index({ lockUntil: 1 }, { sparse: true });
userSchema.index({ loginAttempts: 1 });
userSchema.index({ lastLogin: -1 });

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;

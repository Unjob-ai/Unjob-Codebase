// models/Post.js - Updated with portfolio integration
import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: {
      type: String,
      required: true,
    },

    // UPDATED: Enhanced project field
    project: {
      type: String,
      default: "",
    },

    // NEW: Post type to distinguish between regular posts and portfolio projects
    postType: {
      type: String,
      enum: ["post", "portfolio"],
      default: "post",
    },

    // NEW: Portfolio-specific fields
    portfolioData: {
      isPortfolioItem: {
        type: Boolean,
        default: false,
      },
      shortDescription: {
        type: String,
        maxLength: 200,
      },
      projectUrl: String,
      githubUrl: String,
      liveUrl: String,
      technologies: [String],
      duration: String, // e.g., "2 weeks", "1 month"
      clientName: String,
      completedDate: Date,
      featured: {
        type: Boolean,
        default: false,
      },
    },

    images: [String],
    videos: [String],
    tags: [String],

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    comments: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          content: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    likes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    views: {
      type: Number,
      default: 0,
    },

    postId: {
      type: String,
      unique: true,
    },

    // NEW: Visibility and status
    visibility: {
      type: String,
      enum: ["public", "private", "portfolio_only"],
      default: "public",
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published",
    },

    // NEW: Report system for content moderation
    reported: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
        description: String,
        createdAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "reviewed", "resolved"],
          default: "pending"
        }
      }
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate postId and handle portfolio logic
PostSchema.pre("save", function (next) {
  if (!this.postId) {
    this.postId = this._id.toString();
  }

  // Auto-set portfolio data based on postType
  if (this.postType === "portfolio") {
    this.portfolioData.isPortfolioItem = true;

    // Auto-generate short description if not provided
    if (!this.portfolioData.shortDescription && this.description) {
      this.portfolioData.shortDescription = this.description.substring(0, 200);
    }
  }

  next();
});

// Method to convert regular post to portfolio item
PostSchema.methods.convertToPortfolio = function (portfolioDetails = {}) {
  this.postType = "portfolio";
  this.portfolioData = {
    isPortfolioItem: true,
    shortDescription:
      portfolioDetails.shortDescription || this.description.substring(0, 200),
    projectUrl: portfolioDetails.projectUrl || "",
    githubUrl: portfolioDetails.githubUrl || "",
    liveUrl: portfolioDetails.liveUrl || "",
    technologies: portfolioDetails.technologies || [],
    duration: portfolioDetails.duration || "",
    clientName: portfolioDetails.clientName || "",
    completedDate: portfolioDetails.completedDate || this.createdAt,
    featured: portfolioDetails.featured || false,
  };

  return this.save();
};

// Method to get posts by category for portfolio
PostSchema.statics.getPortfolioByCategory = function (userId, category) {
  return this.find({
    author: userId,
    postType: "portfolio",
    category: category,
    status: "published",
  }).sort({ createdAt: -1 });
};

// Method to get all portfolio items for a user
PostSchema.statics.getUserPortfolio = function (userId) {
  return this.find({
    author: userId,
    postType: "portfolio",
    status: "published",
  })
    .sort({ "portfolioData.featured": -1, createdAt: -1 })
    .populate("author", "name image role profile");
};

// Virtual for portfolio item count
PostSchema.virtual("portfolioItemsCount").get(function () {
  if (this.postType === "portfolio") {
    return 1;
  }
  return 0;
});

// Index for better performance
PostSchema.index({ author: 1, postType: 1, category: 1 });
PostSchema.index({ postType: 1, status: 1, "portfolioData.featured": -1 });
PostSchema.index({ category: 1, subCategory: 1, postType: 1 });
PostSchema.index({ reported: 1, status: 1 }); // For reported posts queries

export default mongoose.models.Post || mongoose.model("Post", PostSchema);

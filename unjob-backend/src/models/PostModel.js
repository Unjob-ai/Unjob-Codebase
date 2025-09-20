// models/Post.js
import mongoose  from "mongoose"

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
    project: {
      type: String,
      default: "",
    },
    postType: {
      type: String,
      enum: ["post", "portfolio"],
      default: "post",
    },
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
      duration: String,
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
        likedAt: { type: Date, default: Date.now },
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    shares: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        platform: String,
        sharedAt: { type: Date, default: Date.now },
      },
    ],
    sharesCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Middleware to update counts
PostSchema.pre("save", function (next) {
  if (this.isModified("likes")) {
    this.likesCount = this.likes.length;
  }
  if (this.isModified("comments")) {
    this.commentsCount = this.comments.length;
  }
  if (this.isModified("shares")) {
    this.sharesCount = this.shares.length;
  }
  next();
});

// Instance methods
PostSchema.methods.addLike = function (userId) {
  const existingLike = this.likes.find(
    (like) => like.user.toString() === userId.toString()
  );
  if (!existingLike) {
    this.likes.push({ user: userId });
    this.likesCount = this.likes.length;
  }
  return this.save();
};

PostSchema.methods.removeLike = function (userId) {
  this.likes = this.likes.filter(
    (like) => like.user.toString() !== userId.toString()
  );
  this.likesCount = this.likes.length;
  return this.save();
};

PostSchema.methods.addComment = function (userId, content) {
  this.comments.push({ user: userId, content });
  this.commentsCount = this.comments.length;
  return this.save();
};

PostSchema.methods.incrementViews = function () {
  this.viewsCount += 1;
  return this.save();
};

// Indexes
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ category: 1, subCategory: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ likesCount: -1 });
PostSchema.index({ commentsCount: -1 });
PostSchema.index({ isActive: 1, isDeleted: 1 });

export const Post = mongoose.model("Post", PostSchema);

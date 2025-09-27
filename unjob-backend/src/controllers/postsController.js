// controllers/postController.js
import { Post } from "../models/PostModel.js";
import { User } from "../models/UserModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import {
  autoNotifyPostLike,
  autoNotifyPostComment,
} from "../utils/notificationHelpers.js";

// @desc    Get all posts with filtering and pagination
// @route   GET /api/posts
// @access  Private
export const getAllPosts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 50,
    category,
    subCategory,
    userId,
    postType = "post", // Default to "post" instead of undefined
    sort = "-createdAt",
  } = req.query;

  const skip = (page - 1) * limit;

  // Fixed query construction - removed strict postType filtering
  let query = {
    isActive: true,
    isDeleted: false,
  };

  // Only add postType filter if explicitly provided
  if (postType && postType !== "all") {
    query.postType = postType;
  }

  // Add other filters only if provided
  if (userId) query.author = userId;
  if (category) query.category = category;
  if (subCategory) query.subCategory = subCategory;

  console.log("Post Query:", query); // Debug log

  const posts = await Post.find(query)
    .populate("author", "name image role profile")
    .populate("comments.user", "name image")
    .populate("likes.user", "name image")
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const totalPosts = await Post.countDocuments(query);

  console.log("Found posts:", posts.length, "Total:", totalPosts); // Debug log

  // Add user interaction data if user is authenticated
  let postsWithInteractions = posts;
  if (req.user) {
    postsWithInteractions = posts.map((post) => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(
        (like) => like.user.toString() === req.user._id.toString()
      );
      return postObj;
    });
  }

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        posts: postsWithInteractions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalPosts / limit),
          totalPosts,
          hasNext: page < Math.ceil(totalPosts / limit),
          hasPrev: page > 1,
        },
        query: query, // Include query in response for debugging
      },
      "Posts fetched successfully"
    )
  );
});

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
export const createPost = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    category,
    subCategory,
    images,
    videos,
    tags,
    project,
    postType = "post",
    portfolioData,
  } = req.body;

  // Validate required fields
  if (!title || !description || !category || !subCategory) {
    throw new apiError(
      "Title, description, category, and subCategory are required",
      400
    );
  }

  // Handle uploaded images
  let finalImages = images || [];
  if (req.files && req.files.length > 0) {
    const uploadedImages = req.files.map(
      (file) => file.path || file.secure_url
    );
    finalImages = [...finalImages, ...uploadedImages];
  }

  const postData = {
    title,
    description,
    category,
    subCategory,
    images: finalImages,
    videos: videos || [],
    tags: tags || [],
    project: project || "",
    postType,
    author: req.user._id,
  };

  // Add portfolio data if it's a portfolio post
  if (postType === "portfolio" && portfolioData) {
    postData.portfolioData = {
      ...portfolioData,
      isPortfolioItem: true,
    };
  }

  const post = await Post.create(postData);

  // Update user's posts count
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { "stats.postsCount": 1 },
  });

  // Populate and return
  await post.populate("author", "name image role profile");

  res
    .status(201)
    .json(new apiResponse(201, true, post, "Post created successfully"));
});

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Private
export const getPostById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const post = await Post.findById(id)
    .populate("author", "name image role profile")
    .populate("likes.user", "name image")
    .populate("comments.user", "name image");

  if (!post || post.isDeleted || !post.isActive) {
    throw new apiError("Post not found", 404);
  }

  // Increment view count
  post.viewsCount = (post.viewsCount || 0) + 1;
  await post.save();

  // Check if user has liked the post
  let isLiked = false;
  if (req.user) {
    isLiked = post.likes.some(
      (like) => like.user._id.toString() === req.user._id.toString()
    );
  }

  const postData = {
    ...post.toObject(),
    isLiked,
  };

  res
    .status(200)
    .json(new apiResponse(200, true, postData, "Post fetched successfully"));
});

// @desc    Update post
// @route   PATCH /api/posts/:id
// @access  Private
export const updatePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  const post = await Post.findById(id);
  if (!post || post.isDeleted) {
    throw new apiError("Post not found", 404);
  }

  // Check authorization
  if (post.author.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to update this post", 403);
  }

  // Handle new uploaded images
  let newImages = [];
  if (req.files && req.files.length > 0) {
    newImages = req.files.map((file) => file.path || file.secure_url);
  }

  // Update allowed fields
  const allowedFields = [
    "title",
    "description",
    "category",
    "subCategory",
    "tags",
    "project",
    "portfolioData",
  ];
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) {
      post[field] = updates[field];
    }
  });

  // Add new images to existing ones
  if (newImages.length > 0) {
    post.images = [...(post.images || []), ...newImages];
  }

  // Update portfolio data if provided
  if (updates.portfolioData && post.postType === "portfolio") {
    post.portfolioData = {
      ...(post.portfolioData || {}),
      ...updates.portfolioData,
    };
  }

  await post.save();

  const updatedPost = await Post.findById(post._id).populate(
    "author",
    "name image role profile"
  );

  res
    .status(200)
    .json(new apiResponse(200, true, updatedPost, "Post updated successfully"));
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
export const deletePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const post = await Post.findById(id);
  if (!post || post.isDeleted) {
    throw new apiError("Post not found", 404);
  }

  // Check authorization
  const postAuthorId = post.author._id
    ? post.author._id.toString()
    : post.author.toString();
  if (postAuthorId !== req.user._id.toString()) {
    throw new apiError("Not authorized to delete this post", 403);
  }

  // Soft delete
  post.isDeleted = true;
  post.deletedAt = new Date();
  await post.save();

  // Update user stats
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { "stats.postsCount": -1 },
  });

  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Post deleted successfully"));
});

// @desc    Like/Unlike post - UPDATED with automatic notifications
// @route   POST /api/posts/:id/like
// @access  Private
export const likePost = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const post = await Post.findById(id)
    .populate("likes.user")
    .populate("author", "name image email");

  if (!post || post.isDeleted || !post.isActive) {
    throw new apiError("Post not found", 404);
  }

  const currentUser = await User.findById(req.user._id);
  if (!currentUser) {
    throw new apiError("User not found", 404);
  }

  const currentUserId = currentUser._id.toString();
  const existingLike = post.likes.find(
    (like) => like.user._id.toString() === currentUserId
  );

  let message;
  let isLiked;

  if (existingLike) {
    // Unlike the post
    post.likes = post.likes.filter(
      (like) => like.user._id.toString() !== currentUserId
    );
    message = "Post unliked successfully";
    isLiked = false;
  } else {
    // Like the post
    post.likes.push({ user: currentUserId });
    message = "Post liked successfully";
    isLiked = true;

    // AUTOMATIC NOTIFICATION - This runs automatically and safely!
    await autoNotifyPostLike(post, currentUser);
  }

  // Update likes count
  post.likesCount = post.likes.length;
  await post.save();

  // Re-populate the post
  const updatedPost = await Post.findById(post._id)
    .populate("author", "name image role profile")
    .populate("comments.user", "name image")
    .populate("likes.user", "name image");

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        liked: isLiked,
        post: updatedPost,
        message,
        likesCount: post.likesCount,
      },
      "Like status updated successfully"
    )
  );
});

// @desc    Add comment to post - UPDATED with automatic notifications
// @route   POST /api/posts/:id/comments
// @access  Private
export const addComment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    throw new apiError("Comment text is required", 400);
  }

  if (content.length > 1000) {
    throw new apiError("Comment is too long (max 1000 characters)", 400);
  }

  const post = await Post.findById(id).populate("author", "name image email");
  if (!post || post.isDeleted || !post.isActive) {
    throw new apiError("Post not found", 404);
  }

  const currentUser = await User.findById(req.user._id);
  if (!currentUser) {
    throw new apiError("User not found", 404);
  }

  // Create comment
  const newComment = {
    user: currentUser._id,
    content: content.trim(),
    createdAt: new Date(),
  };

  post.comments.push(newComment);
  post.commentsCount = post.comments.length;
  await post.save();

  // AUTOMATIC NOTIFICATION - This runs automatically and safely!
  await autoNotifyPostComment(post, newComment, currentUser);

  // Re-populate the post
  const updatedPost = await Post.findById(post._id)
    .populate("author", "name image role profile")
    .populate("comments.user", "name image")
    .populate("likes.user", "name image");

  res.status(201).json(
    new apiResponse(
      201,
      true,
      {
        post: updatedPost,
        comment: {
          ...newComment,
          user: {
            _id: currentUser._id,
            name: currentUser.name,
            image: currentUser.image,
          },
        },
      },
      "Comment added successfully"
    )
  );
});

// @desc    Delete comment
// @route   DELETE /api/posts/:id/comments
// @access  Private
export const deleteComment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { commentId } = req.query;

  if (!commentId) {
    throw new apiError("Comment ID is required", 400);
  }

  const post = await Post.findById(id);
  if (!post || post.isDeleted) {
    throw new apiError("Post not found", 404);
  }

  const currentUser = await User.findById(req.user._id);
  if (!currentUser) {
    throw new apiError("User not found", 404);
  }

  // Find the comment
  const commentIndex = post.comments.findIndex(
    (comment) => comment._id.toString() === commentId
  );

  if (commentIndex === -1) {
    throw new apiError("Comment not found", 404);
  }

  const comment = post.comments[commentIndex];

  // Check permissions - comment owner or post owner can delete
  const isCommentOwner = comment.user.toString() === currentUser._id.toString();
  const isPostOwner = post.author.toString() === currentUser._id.toString();

  if (!isCommentOwner && !isPostOwner) {
    throw new apiError(
      "You can only delete your own comments or comments on your posts",
      403
    );
  }

  // Remove the comment
  post.comments.splice(commentIndex, 1);
  post.commentsCount = post.comments.length;
  await post.save();

  // Re-populate the post
  const updatedPost = await Post.findById(post._id)
    .populate("author", "name image role profile")
    .populate("comments.user", "name image")
    .populate("likes.user", "name image");

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        { post: updatedPost },
        "Comment deleted successfully"
      )
    );
});

// @desc    Convert post to portfolio
// @route   POST /api/posts/:id/convert-to-portfolio
// @access  Private
export const convertToPortfolio = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { projectTitle, postIds } = req.body;

  if (!projectTitle || !projectTitle.trim()) {
    throw new apiError("Project title is required", 400);
  }

  if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
    throw new apiError("At least one post must be selected", 400);
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new apiError("User not found", 404);
  }

  // Find all selected posts
  const posts = await Post.find({
    _id: { $in: postIds },
    author: user._id,
    isDeleted: false,
  });

  if (posts.length !== postIds.length) {
    throw new apiError("Some posts not found or unauthorized", 404);
  }

  // Check if any posts are already portfolio items
  const alreadyPortfolio = posts.filter(
    (post) => post.postType === "portfolio"
  );
  if (alreadyPortfolio.length > 0) {
    throw new apiError(
      `${alreadyPortfolio.length} post(s) are already portfolio items`,
      400
    );
  }

  const convertedPosts = [];

  // Convert all posts to portfolio items
  for (let post of posts) {
    post.postType = "portfolio";
    post.project = projectTitle.trim();

    // Add portfolio-specific metadata
    if (!post.portfolioData) {
      post.portfolioData = {};
    }

    post.portfolioData.shortDescription =
      post.description?.substring(0, 200) || "";
    post.portfolioData.addedToPortfolioAt = new Date();

    await post.save();
    convertedPosts.push(post);
  }

  // Update user's profile portfolio array
  if (!user.profile) {
    user.profile = {};
  }
  if (!user.profile.portfolio) {
    user.profile.portfolio = [];
  }

  const existingProjectIndex = user.profile.portfolio.findIndex(
    (item) => item.title === projectTitle.trim()
  );

  if (existingProjectIndex >= 0) {
    // Project exists, increment count
    user.profile.portfolio[existingProjectIndex].postsCount =
      (user.profile.portfolio[existingProjectIndex].postsCount || 0) +
      posts.length;

    // Update with latest image
    const latestPostWithImage = posts.find(
      (post) => post.images && post.images.length > 0
    );
    if (latestPostWithImage) {
      user.profile.portfolio[existingProjectIndex].image =
        latestPostWithImage.images[0];
    }
  } else {
    // New project
    const firstPostWithImage = posts.find(
      (post) => post.images && post.images.length > 0
    );
    user.profile.portfolio.push({
      title: projectTitle.trim(),
      description: posts[0].portfolioData.shortDescription,
      image: firstPostWithImage?.images[0] || "",
      postsCount: posts.length,
      createdAt: new Date(),
    });
  }

  await user.save();

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        portfolioItems: convertedPosts,
        projectTitle: projectTitle.trim(),
        convertedCount: posts.length,
      },
      `${posts.length} post(s) converted to portfolio project successfully!`
    )
  );
});

// @desc    Convert multiple posts to portfolio
// @route   POST /api/posts/convert-multiple-to-portfolio
// @access  Private
export const convertMultipleToPortfolio = asyncHandler(
  async (req, res, next) => {
    const { projectTitle, postIds } = req.body;

    if (!projectTitle || !projectTitle.trim()) {
      throw new apiError("Project title is required", 400);
    }

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      throw new apiError("At least one post must be selected", 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new apiError("User not found", 404);
    }

    // Find all selected posts
    const posts = await Post.find({
      _id: { $in: postIds },
      author: user._id,
      isDeleted: false,
    });

    if (posts.length !== postIds.length) {
      throw new apiError("Some posts not found or unauthorized", 404);
    }

    // Check if any posts are already portfolio items
    const alreadyPortfolio = posts.filter(
      (post) => post.postType === "portfolio"
    );
    if (alreadyPortfolio.length > 0) {
      throw new apiError(
        `${alreadyPortfolio.length} post(s) are already portfolio items`,
        400
      );
    }

    const convertedPosts = [];

    // Convert all posts to portfolio items
    for (let post of posts) {
      post.postType = "portfolio";
      post.project = projectTitle.trim();

      if (!post.portfolioData) {
        post.portfolioData = {};
      }

      post.portfolioData.shortDescription =
        post.description?.substring(0, 200) || "";
      post.portfolioData.addedToPortfolioAt = new Date();

      await post.save();
      convertedPosts.push(post);
    }

    // Initialize user profile portfolio if needed
    if (!user.profile) {
      user.profile = {};
    }
    if (!user.profile.portfolio) {
      user.profile.portfolio = [];
    }

    const existingProjectIndex = user.profile.portfolio.findIndex(
      (item) => item.title === projectTitle.trim()
    );

    if (existingProjectIndex >= 0) {
      // Project exists, increment count
      user.profile.portfolio[existingProjectIndex].postsCount =
        (user.profile.portfolio[existingProjectIndex].postsCount || 0) +
        posts.length;

      // Update with latest image
      const latestPostWithImage = posts.find(
        (post) => post.images && post.images.length > 0
      );
      if (latestPostWithImage) {
        user.profile.portfolio[existingProjectIndex].image =
          latestPostWithImage.images[0];
      }
    } else {
      // New project
      const firstPostWithImage = posts.find(
        (post) => post.images && post.images.length > 0
      );
      const firstPost = posts[0];
      const description =
        firstPost.portfolioData?.shortDescription ||
        firstPost.description?.substring(0, 200) ||
        "Portfolio project";

      user.profile.portfolio.push({
        title: projectTitle.trim(),
        description: description,
        image: firstPostWithImage?.images[0] || "",
        postsCount: posts.length,
        createdAt: new Date(),
      });
    }

    await user.save();

    res.status(200).json(
      new apiResponse(
        200,
        true,
        {
          portfolioItems: convertedPosts,
          projectTitle: projectTitle.trim(),
          convertedCount: posts.length,
        },
        `${posts.length} post(s) converted to portfolio project successfully!`
      )
    );
  }
);

// @desc    Get user posts
// @route   GET /api/posts/user/:userId
// @access  Private
export const getUserPosts = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const {
    postType,
    category,
    subCategory,
    project,
    page = 1,
    limit = 12,
    sortBy = "createdAt",
    sortOrder = "desc",
    includeStats = false,
  } = req.query;

  const skip = (page - 1) * limit;

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new apiError("User not found", 404);
  }

  // Build query
  let query = {
    author: userId,
    isActive: true,
    isDeleted: false,
  };

  if (postType) query.postType = postType;
  if (category) query.category = category;
  if (subCategory) query.subCategory = subCategory;
  if (project) query.project = project;

  // Build sort object
  let sortObj = {};
  if (sortBy === "likes") {
    sortObj = { likesCount: sortOrder === "asc" ? 1 : -1 };
  } else if (sortBy === "views") {
    sortObj = { viewsCount: sortOrder === "asc" ? 1 : -1 };
  } else if (sortBy === "comments") {
    sortObj = { commentsCount: sortOrder === "asc" ? 1 : -1 };
  } else {
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;
  }

  // Fetch posts
  const posts = await Post.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit))
    .populate("author", "name image role profile stats")
    .populate("comments.user", "name image role")
    .populate("likes.user", "name image role");

  const totalPosts = await Post.countDocuments(query);

  // Add user interaction data
  let postsWithInteractions = posts;
  if (req.user) {
    postsWithInteractions = posts.map((post) => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes.some(
        (like) => like.user.toString() === req.user._id.toString()
      );
      return postObj;
    });
  }

  const response = {
    user: {
      _id: user._id,
      name: user.name,
      image: user.image,
      role: user.role,
      profile: user.profile,
      stats: user.stats,
    },
    posts: postsWithInteractions,
    pagination: {
      total: totalPosts,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalPosts / limit),
      hasNextPage: parseInt(page) < Math.ceil(totalPosts / limit),
      hasPrevPage: parseInt(page) > 1,
    },
    filters: {
      postType,
      category,
      subCategory,
      project,
      sortBy,
      sortOrder,
    },
  };

  // Get additional stats if requested
  if (includeStats === "true") {
    const statsAggregation = await Post.aggregate([
      { $match: { author: user._id, isActive: true, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: "$likesCount" },
          totalViews: { $sum: "$viewsCount" },
          totalComments: { $sum: "$commentsCount" },
          portfolioPosts: {
            $sum: { $cond: [{ $eq: ["$postType", "portfolio"] }, 1, 0] },
          },
          regularPosts: {
            $sum: { $cond: [{ $eq: ["$postType", "post"] }, 1, 0] },
          },
        },
      },
    ]);

    const userStats = statsAggregation[0] || {
      totalPosts: 0,
      totalLikes: 0,
      totalViews: 0,
      totalComments: 0,
      portfolioPosts: 0,
      regularPosts: 0,
    };

    // Get category breakdown
    const categoryStats = await Post.aggregate([
      { $match: { author: user._id, isActive: true, isDeleted: false } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalLikes: { $sum: "$likesCount" },
          totalViews: { $sum: "$viewsCount" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    userStats.categoryBreakdown = categoryStats;
    response.userStats = userStats;
  }

  // Get unique projects for portfolio items
  if (postType === "portfolio" || !postType) {
    const portfolioProjects = await Post.distinct("project", {
      author: userId,
      postType: "portfolio",
      project: { $exists: true, $ne: null },
      isDeleted: false,
    });

    if (portfolioProjects.length > 0) {
      response.portfolioProjects = portfolioProjects;
    }
  }

  res
    .status(200)
    .json(
      new apiResponse(200, true, response, "User posts fetched successfully")
    );
});

// @desc    Report post
// @route   POST /api/posts/report
// @access  Private
export const reportPost = asyncHandler(async (req, res, next) => {
  const { postId, reason, description } = req.body;

  if (!postId || !reason) {
    throw new apiError("Post ID and reason are required", 400);
  }

  const post = await Post.findById(postId);
  if (!post || post.isDeleted || !post.isActive) {
    throw new apiError("Post not found", 404);
  }

  // Initialize reported array if it doesn't exist
  if (!post.reported) {
    post.reported = [];
  }

  // Add report to the post
  post.reported.push({
    user: req.user?._id || "anonymous",
    reason,
    description: description || "",
    status: "pending",
    reportedAt: new Date(),
  });

  await post.save();

  res
    .status(200)
    .json(new apiResponse(200, true, {}, "Post reported successfully"));
});

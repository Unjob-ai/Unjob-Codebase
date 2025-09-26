// controllers/userController.js
import { User } from "../models/UserModel.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { deleteFileFromS3 } from "../middleware/uploadToS3Middleware.js";
// @desc    Get current user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req?.user?._id)
    .select("-password")
    .populate("followers", "name image role")
    .populate("following", "name image role");

  if (!user) {
    throw new apiError("User not found", 404);
  }

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        user,
        isProfileComplete: user?.isProfileComplete(),
      },
      "User profile fetched successfully"
    )
  );
});

// @desc    Complete user profile
// @route   PATCH /api/user/complete-profile
// @access  Private
const completeProfile = asyncHandler(async (req, res, next) => {
  const profileData = req?.body;
  const user = req.user;

  // Create the base profile object if it doesn't exist
  if (!user?.profile) user.profile = {};

  // Validation for common fields
  if (!profileData?.mobile || !profileData?.mobile.trim()) {
    throw new apiError("Mobile number is required", 400);
  }
  // Validate role-specific fields
  if (user?.role === "freelancer") {
    if (!profileData?.bio || profileData?.bio.trim().length < 10) {
      throw new apiError("Bio must be at least 10 characters long", 400);
    }

    if (!profileData?.skills || profileData?.skills.length < 3) {
      throw new apiError("At least 3 skills are required", 400);
    }

    if (!profileData?.hourlyRate || profileData?.hourlyRate <= 0) {
      throw new apiError("Valid hourly rate is required", 400);
    }
  } else if (user?.role === "hiring") {
    if (!profileData?.companyName || !profileData?.companyName.trim()) {
      throw new apiError("Company name is required", 400);
    }

    if (
      !profileData?.contactPersonName ||
      !profileData?.contactPersonName.trim()
    ) {
      throw new apiError("Contact person name is required", 400);
    }

    if (!profileData?.businessEmail || !profileData?.businessEmail.trim()) {
      throw new apiError("Business email is required", 400);
    }
  }
  // Update profile fields
  Object.assign(user.profile, profileData);
  user.profile.isCompleted = true;
  user.profile.completedAt = new Date();
  user.mobile = profileData.mobile;

  await user.save();

  console.log(`[API] Profile completed successfully for user ${user._id}`);

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        user.toObject(),
        "Profile completed successfully"
      )
    );
});

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res, next) => {
  try {
    const updates = req?.body;
    const user = req?.user;
    //--------------------------- Handle avatar upload---------------------//
    if (req.file && req?.file?.key) {
      updates.image =
        `https://${process.env.CLOUD_FRONT_DOMAIN_NAME}/${req?.file?.key}` ||
        "";
    }
    //-------------------- Update profile fields--------------------//
    if (!user.profile) user.profile = {};
    Object.assign(user.profile, updates);

    // -----------------Update top-level fields if provided---------------------//
    if ("name" in updates) user["name"] = updates["name"];
    if ("mobile" in updates) user["mobile"] = updates["mobile"];
    await user.save();
    res
      .status(200)
      .json(
        new apiResponse(
          200,
          true,
          user.toObject(),
          "Profile updated successfully"
        )
      );
  } catch (error) {
    if (req.file && req?.file?.key) {
      await deleteFileFromS3(req?.file?.key);
    }
    throw new apiError("failed to update profile", 400);
  }
});

// @desc    Get user by ID
// @route   GET /api/user/:userId
// @access  Private
const getUserById = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId)
    .select("-password -email -mobile -resetPasswordToken -verificationToken")
    .populate("followers", "name image role")
    .populate("following", "name image role");

  if (!user) {
    throw new apiError("User not found", 404);
  }

  // Check if current user is following this user
  const isFollowing = req.user.following.includes(userId);

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        ...user.toObject(),
        isFollowing,
        followersCount: user.followers.length,
        followingCount: user.following.length,
      },
      "User profile fetched successfully"
    )
  );
});

// @desc    Follow a user
// @route   POST /api/user/:userId/follow
// @access  Private
const followUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const currentUser = req.user;

  if (userId === currentUser._id.toString()) {
    throw new apiError("You cannot follow yourself", 400);
  }

  const userToFollow = await User.findById(userId);
  if (!userToFollow) {
    throw new apiError("User not found", 404);
  }

  // Check if already following
  if (currentUser.following.includes(userId)) {
    throw new apiError("You are already following this user", 400);
  }

  // Add to following/followers
  currentUser.following.push(userId);
  userToFollow.followers.push(currentUser._id);

  // Update stats
  if (!currentUser.stats) currentUser.stats = {};
  if (!userToFollow.stats) userToFollow.stats = {};

  currentUser.stats.following = currentUser.following.length;
  userToFollow.stats.followers = userToFollow.followers.length;

  await currentUser.save();
  await userToFollow.save();

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        { message: `You are now following ${userToFollow.name}` },
        "User followed successfully"
      )
    );
});

// @desc    Unfollow a user
// @route   DELETE /api/user/:userId/follow
// @access  Private
const unfollowUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const currentUser = req.user;

  if (userId === currentUser._id.toString()) {
    throw new apiError("You cannot unfollow yourself", 400);
  }

  const userToUnfollow = await User.findById(userId);
  if (!userToUnfollow) {
    throw new apiError("User not found", 404);
  }

  // Check if not following
  if (!currentUser.following.includes(userId)) {
    throw new apiError("You are not following this user", 400);
  }

  // Remove from following/followers
  currentUser.following = currentUser.following.filter(
    (id) => id.toString() !== userId
  );
  userToUnfollow.followers = userToUnfollow.followers.filter(
    (id) => id.toString() !== currentUser._id.toString()
  );

  // Update stats
  if (!currentUser.stats) currentUser.stats = {};
  if (!userToUnfollow.stats) userToUnfollow.stats = {};

  currentUser.stats.following = currentUser.following.length;
  userToUnfollow.stats.followers = userToUnfollow.followers.length;

  await currentUser.save();
  await userToUnfollow.save();

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        message: `You have unfollowed ${userToUnfollow.name}`,
      },
      "User unfollowed successfully"
    )
  );
});

// @desc    Get user's followers
// @route   GET /api/user/:userId/followers
// @access  Private
const getUserFollowers = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findById(userId).populate({
    path: "followers",
    select: "name image role profile.bio profile.companyName stats",
    options: {
      skip,
      limit: parseInt(limit),
      sort: { createdAt: -1 },
    },
  });

  if (!user) {
    throw new apiError("User not found", 404);
  }

  // Get current user's following list to show follow status
  const currentUser = await User.findById(req.user._id).select("following");

  const followersWithStatus = user.followers.map((follower) => ({
    ...follower.toObject(),
    isFollowing: currentUser.following.includes(follower._id.toString()),
    followersCount: follower.followers?.length || 0,
    followingCount: follower.following?.length || 0,
  }));

  const totalFollowers = user.followers?.length || 0;

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        followers: followersWithStatus,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFollowers / limit),
          totalFollowers,
          hasNext: page < Math.ceil(totalFollowers / limit),
          hasPrev: page > 1,
        },
      },
      "User followers fetched successfully"
    )
  );
});

// @desc    Get user's following
// @route   GET /api/user/:userId/following
// @access  Private
const getUserFollowing = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const user = await User.findById(userId).populate({
    path: "following",
    select: "name image role profile.bio profile.companyName stats",
    options: {
      skip,
      limit: parseInt(limit),
      sort: { createdAt: -1 },
    },
  });

  if (!user) {
    throw new apiError("User not found", 404);
  }

  // Get current user's following list to show follow status
  const currentUser = await User.findById(req.user._id).select("following");

  const followingWithStatus = user.following.map((followedUser) => ({
    ...followedUser.toObject(),
    isFollowing: currentUser.following.includes(followedUser._id.toString()),
    followersCount: followedUser.followers?.length || 0,
    followingCount: followedUser.following?.length || 0,
  }));

  const totalFollowing = user.following?.length || 0;

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        following: followingWithStatus,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalFollowing / limit),
          totalFollowing,
          hasNext: page < Math.ceil(totalFollowing / limit),
          hasPrev: page > 1,
        },
      },
      "User following fetched successfully"
    )
  );
});

// @desc    Search users
// @route   GET /api/user/search
// @access  Private
const searchUsers = asyncHandler(async (req, res, next) => {
  const { q, role, skills, location, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  // Build search query
  const searchQuery = {
    _id: { $ne: req.user._id }, // Exclude current user
    isActive: true,
  };

  if (q) {
    searchQuery.$or = [
      { name: { $regex: q, $options: "i" } },
      { "profile.bio": { $regex: q, $options: "i" } },
      { "profile.companyName": { $regex: q, $options: "i" } },
    ];
  }

  if (role) {
    searchQuery.role = role;
  }

  if (skills) {
    const skillsArray = skills.split(",");
    searchQuery["profile.skills"] = { $in: skillsArray };
  }

  if (location) {
    searchQuery["profile.location"] = { $regex: location, $options: "i" };
  }

  const users = await User.find(searchQuery)
    .select(
      "name image role profile.bio profile.companyName profile.location profile.skills stats"
    )
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const totalUsers = await User.countDocuments(searchQuery);

  // Get current user's following list to show follow status
  const currentUser = await User.findById(req.user._id).select("following");

  const usersWithStatus = users.map((user) => ({
    ...user.toObject(),
    isFollowing: currentUser.following.includes(user._id.toString()),
    followersCount: user.followers?.length || 0,
    followingCount: user.following?.length || 0,
  }));

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        users: usersWithStatus,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          hasNext: page < Math.ceil(totalUsers / limit),
          hasPrev: page > 1,
        },
      },
      "User search results fetched successfully"
    )
  );
});

// @desc    Get user stats
// @route   GET /api/user/:userId/stats
// @access  Private
const getUserStats = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select("stats role createdAt");
  if (!user) {
    throw new apiError("User not found", 404);
  }

  // TODO: Add more detailed stats based on user's activity
  const stats = {
    ...user?.stats?.toObject?.(),
    joinedDate: user.createdAt,
    profileViews: user.stats?.profileViews || 0,
    totalConnections:
      (user.stats?.followers || 0) + (user.stats?.following || 0),
  };

  res
    .status(200)
    .json(new apiResponse(200, true, stats, "User stats fetched successfully"));
});

// @desc    Update user settings
// @route   PUT /api/user/settings
// @access  Private
const updateSettings = asyncHandler(async (req, res, next) => {
  const { preferences, privacy } = req.body;
  const user = req.user;

  if (preferences) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  if (privacy) {
    user.privacy = { ...user.privacy, ...privacy };
  }

  await user.save();

  res.status(200).json(
    new apiResponse(
      200,
      true,
      {
        message: "Settings updated successfully",
        preferences: user.preferences,
        privacy: user.privacy,
      },
      "User settings updated successfully"
    )
  );
});

// @desc    Deactivate user account
// @route   DELETE /api/user/account
// @access  Private
const deactivateAccount = asyncHandler(async (req, res, next) => {
  const user = req.user;
  user.isActive = false;
  await user.save();
  res
    .status(200)
    .json(
      new apiResponse(
        200,
        true,
        { message: "Account deactivated successfully" },
        "User account deactivated successfully"
      )
    );
});
export {
  getProfile,
  completeProfile,
  updateProfile,
  getUserById,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  searchUsers,
  getUserStats,
  updateSettings,
  deactivateAccount,
};

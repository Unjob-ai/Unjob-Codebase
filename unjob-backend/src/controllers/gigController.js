// controllers/gigController.js
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import { Gig } from "../models/GigModel.js";
import { Subscription } from "../models/SubscriptionModel.js";
import { uploadToCloudinary } from "../config/cloudinaryConfig.js";

// ===== UTILITY FUNCTIONS =====

// Parse form data from request
const parseRequestData = async (req) => {
  const contentType = req.get("content-type");

  if (contentType?.includes("multipart/form-data")) {
    return {
      data: {
        title: req.body.title?.trim(),
        category: req.body.category,
        subCategory: req.body.subCategory,
        subcategory: req.body.subCategory,
        projectOverview: req.body.projectOverview?.trim(),
        tags: req.body.tags ? JSON.parse(req.body.tags) : [],
        budget: req.body.budget ? Number(req.body.budget) : 0,
        timeline: req.body.timeline,
        quantity: req.body.quantity ? Number(req.body.quantity) : 1,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        deliverables: req.body.deliverables
          ? JSON.parse(req.body.deliverables)
          : [],
        assetDescription: req.body.assetDescription?.trim(),
        status: req.body.status || "published",
      },
      bannerImage: req.files?.bannerImage?.[0],
      assetFiles: req.files?.assetFiles || [],
    };
  } else {
    return {
      data: {
        ...req.body,
        subcategory: req.body.subCategory || req.body.subcategory,
        status: req.body.status || "published",
      },
      bannerImage: null,
      assetFiles: [],
    };
  }
};

// Process timeline function
const processTimeline = (timeline) => {
  if (!timeline) return { days: 0, display: "Not specified" };

  const match = timeline.match(/(\d+)/);
  if (match) {
    const days = parseInt(match[1]);
    return {
      days: days,
      display: `${days} day${days !== 1 ? "s" : ""}`,
    };
  }

  return { days: 0, display: timeline };
};

// Process title function
const processTitle = (title) => {
  if (!title) return "I want ";

  const cleanTitle = title.trim();
  if (!cleanTitle.toLowerCase().startsWith("i want")) {
    return `I want ${cleanTitle}`;
  }

  return cleanTitle;
};

// Detect sensitive info
const detectSensitiveInfo = (text) => {
  if (!text) return null;

  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\d{3}[-.\s]?){2,}\d{3,}/;
  const linkRegex = /(https?:\/\/[^\s]+|@[A-Za-z0-9_]+)/i;

  if (emailRegex.test(text)) return { type: "email" };
  if (phoneRegex.test(text)) return { type: "phone number" };
  if (linkRegex.test(text)) return { type: "link or handle" };

  return null;
};

// Handle banner image upload
const handleBannerImage = async (bannerImageFile, user) => {
  if (bannerImageFile && bannerImageFile.size > 0) {
    if (bannerImageFile.size > 10 * 1024 * 1024) {
      throw new apiError("Banner image too large (max 10MB)", 400);
    }

    if (!bannerImageFile.mimetype.startsWith("image/")) {
      throw new apiError("Invalid file type. Please upload an image.", 400);
    }

    try {
      const uploadResult = await uploadToCloudinary(
        bannerImageFile.buffer,
        "unjob/gigs/banners",
        "image"
      );

      return {
        bannerImage: uploadResult,
        bannerSource: "uploaded",
        autoUpdate: false,
      };
    } catch (error) {
      console.error("Banner image upload failed:", error);
      throw new apiError("Failed to upload banner image", 500);
    }
  } else {
    return {
      bannerImage: user.image || null,
      bannerSource: user.image ? "profile_fallback" : "none",
      autoUpdate: user.image ? true : false,
    };
  }
};

// Upload asset files
const uploadAssetFiles = async (assetFiles) => {
  const assetUrls = [];
  for (const file of assetFiles) {
    if (file.size > 25 * 1024 * 1024) {
      throw new apiError(
        `Asset file ${file.originalname} is too large. Maximum size is 25MB.`,
        400
      );
    }

    try {
      let folder = "unjob/gigs/assets/documents";
      let resourceType = "raw";

      if (file.mimetype.startsWith("image/")) {
        folder = "unjob/gigs/assets/images";
        resourceType = "image";
      } else if (file.mimetype.startsWith("video/")) {
        folder = "unjob/gigs/assets/videos";
        resourceType = "video";
      }

      const assetUrl = await uploadToCloudinary(
        file.buffer,
        folder,
        resourceType
      );
      assetUrls.push(assetUrl);
    } catch (error) {
      console.error("Asset file upload failed:", error);
      throw new apiError(
        `Failed to upload asset file: ${file.originalname}`,
        500
      );
    }
  }
  return assetUrls;
};

// Time ago helper
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInMonths > 0) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  } else if (diffInWeeks > 0) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
};

// ===== CONTROLLER FUNCTIONS =====

// @desc    Create new gig
// @route   POST /api/gigs/create
// @access  Private (Hiring users only)
export const createGig = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (!user || user.role !== "hiring") {
    throw new apiError("Only hiring users can create gigs", 403);
  }

  // Parse form data
  const { data, bannerImage, assetFiles } = await parseRequestData(req);

  // Determine if this is a draft
  const isDraft = data.status === "draft";
  const isPartialSave = data.saveType === "partial";
  const isAutoSave = data.saveType === "auto";

  // FLEXIBLE VALIDATION based on save type
  if (!isDraft && !isPartialSave && !isAutoSave) {
    // Full validation for published gigs
    if (!data.title || !data.category || !data.subcategory) {
      throw new apiError(
        "Title, category, and subcategory are required for published gigs",
        400
      );
    }

    if (!data.projectOverview || data.projectOverview.length < 50) {
      throw new apiError(
        "Project overview must be at least 50 characters for published gigs",
        400
      );
    }

    if (!data.budget || data.budget < 100) {
      throw new apiError(
        "Budget is required and must be at least ₹100 for published gigs",
        400
      );
    }
  } else {
    // Minimal validation for drafts/partial saves
    if (!data.title || data.title.trim().length < 3) {
      throw new apiError("Title must be at least 3 characters", 400);
    }
  }

  // Validate sensitive content only if fields exist
  const fieldsToCheck = {};
  if (data.title) fieldsToCheck.title = data.title;
  if (data.projectOverview)
    fieldsToCheck.projectOverview = data.projectOverview;
  if (data.assetDescription)
    fieldsToCheck.assetDescription = data.assetDescription;
  if (data.deliverables && data.deliverables.length > 0) {
    fieldsToCheck.deliverables = data.deliverables.join(" ");
  }

  for (const [fieldName, fieldValue] of Object.entries(fieldsToCheck)) {
    const issue = detectSensitiveInfo(fieldValue);
    if (issue) {
      throw new apiError(
        `Your ${fieldName} contains a ${issue.type}. Please remove personal information like ${issue.type}s.`,
        400
      );
    }
  }

  // Check subscription (same logic as before)
  const existingGigsCount = await Gig.countDocuments({ company: user._id });
  const isFirstGig = existingGigsCount === 0;

  if (!isFirstGig) {
    const subscription = await Subscription.findOne({
      user: user._id,
      userRole: "hiring",
      status: "active",
    }).exec();

    if (!subscription) {
      throw new apiError(
        "You need an active subscription to post additional gigs",
        402
      );
    }

    const isActiveSubscription = subscription.status === "active";
    const isNotExpired =
      !subscription.endDate || subscription.endDate > new Date();
    const isLifetime = subscription.duration === "lifetime";
    const subscriptionValid =
      isActiveSubscription && (isNotExpired || isLifetime);

    if (!subscriptionValid) {
      throw new apiError("Your subscription has expired", 402);
    }

    const maxGigs = subscription.maxGigs || 0;
    const gigsPosted = subscription.gigsPosted || 0;
    const canPostGig = maxGigs === -1 || gigsPosted < maxGigs;

    if (!canPostGig && !isDraft) {
      throw new apiError(
        `You have reached your monthly limit of ${maxGigs} gigs (${gigsPosted}/${maxGigs})`,
        402
      );
    }
  }

  // Process data with fallbacks for drafts
  const processedTitle = data.title
    ? processTitle(data.title)
    : "Untitled Draft";
  const timelineData = data.timeline
    ? processTimeline(data.timeline)
    : { display: "To be determined", days: 0 };

  // Handle file uploads (optional for drafts)
  let bannerInfo = {
    bannerImage: null,
    bannerSource: "none",
    autoUpdate: false,
  };
  let assetUrls = [];

  try {
    if (bannerImage) {
      bannerInfo = await handleBannerImage(bannerImage, user);
    }
    if (assetFiles && assetFiles.length > 0) {
      assetUrls = await uploadAssetFiles(assetFiles);
    }
  } catch (uploadError) {
    if (!isDraft) {
      throw uploadError; // Only fail for published gigs
    }
    console.warn(
      "Upload failed for draft, continuing without files:",
      uploadError.message
    );
  }

  // Determine status
  let gigStatus = "draft";
  if (!isDraft && !isPartialSave && !isAutoSave) {
    gigStatus = "published";
  }

  // Create gig data with flexible fields
  const gigData = {
    title: processedTitle,
    category: data.category || "other",
    subcategory: data.subcategory || "general",
    tags: data.tags || [],
    description: data.projectOverview || "Draft in progress...",
    projectOverview: data.projectOverview || "Draft in progress...",
    company: user._id,
    status: gigStatus,
    budget: data.budget || 0,
    budgetType: "fixed",
    budgetRange: data.budget
      ? {
          min: Math.floor(data.budget * 0.8),
          max: Math.ceil(data.budget * 1.2),
        }
      : { min: 0, max: 0 },
    timeline: timelineData.display,
    timelineDays: timelineData.days,
    quantity: data.quantity || 1,
    StartDate: data.startDate ? new Date(data.startDate) : null,
    EndDate: data.endDate ? new Date(data.endDate) : null,
    deliverables: data.deliverables || [],
    bannerImage: bannerInfo.bannerImage,
    bannerSource: bannerInfo.bannerSource,
    autoUpdateBanner: bannerInfo.autoUpdate,
    uploadAssets: assetUrls,
    DerscribeAssets: data.assetDescription || "Project assets and references",
    skills: data.tags || [],
    negotiationAllowed:
      data.negotiationAllowed !== undefined ? data.negotiationAllowed : true,
    featured: false,
    paymentStatus: "not_required",
    metadata: {
      isFirstGig: isFirstGig,
      subscriptionRequired: !isFirstGig,
      createdWithSubscription: !isFirstGig,
      bannerAutoUpdate: bannerInfo.autoUpdate,
      userProfileImageAtCreation: user.image,
      saveType: data.saveType || "manual",
      isDraft: isDraft,
      lastSaved: new Date(),
    },
  };

  // Save gig
  const gig = new Gig(gigData);
  await gig.save();

  // Populate company info
  await gig.populate(
    "company",
    "name image profile.companyName isVerified username"
  );

  // Update subscription usage only for published gigs
  if (gigStatus === "published" && !isFirstGig) {
    try {
      await Subscription.findOneAndUpdate(
        { user: user._id, userRole: "hiring", status: "active" },
        { $inc: { gigsPosted: 1 } },
        { new: true }
      );
    } catch (subscriptionError) {
      console.error("Failed to update subscription usage:", subscriptionError);
    }
  } else if (isFirstGig && gigStatus === "published") {
    user.hasPostedFirstGig = true;
    await user.save();
  }

  // Response messages based on save type
  let message = "Gig saved successfully!";
  if (gigStatus === "published") {
    message = isFirstGig
      ? "First gig created and published successfully - no subscription required!"
      : "Gig created and published successfully!";
  } else if (isDraft) {
    message = "Gig saved as draft";
  } else if (isPartialSave) {
    message = "Progress saved";
  } else if (isAutoSave) {
    message = "Auto-saved";
  }

  const responseData = {
    success: true,
    gigId: gig._id,
    message: message,
    isFirstGig: isFirstGig,
    status: gigStatus,
    saveType: data.saveType || "manual",
    gigDetails: {
      _id: gig._id,
      title: gig.title,
      category: gig.category,
      subcategory: gig.subcategory,
      displayBudget: gig.displayBudget,
      timeline: gig.timeline,
      timelineDays: gig.timelineDays,
      quantity: gig.quantity,
      status: gig.status,
      featured: gig.featured,
      paymentStatus: gig.paymentStatus,
      bannerImage: bannerInfo.bannerImage,
      bannerSource: bannerInfo.bannerSource,
      autoUpdateBanner: bannerInfo.autoUpdate,
      negotiationAllowed: gig.negotiationAllowed,
      budgetRange: gig.budgetRange,
      metadata: gig.metadata,
    },
  };

  res.status(201).json(new apiResponse(201, responseData, message));
});

// @desc    Get all gigs with filtering
// @route   GET /api/gigs
// @access  Public
export const getGigs = asyncHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // Filter parameters
  const status = req.query.status || "published";
  const category = req.query.category;
  const subCategory = req.query.subCategory;
  const minPrice = req.query.minPrice;
  const maxPrice = req.query.maxPrice;
  const sort = req.query.sort || "newest";
  const search = req.query.search;
  const company = req.query.company;

  // Build query
  let query = {};

  // Handle status filtering
  if (company) {
    query.company = company;
    if (status && status !== "all") {
      if (status === "active") {
        query.status = "published";
      } else {
        query.status = status;
      }
    }
  } else if (status && status !== "all") {
    if (status === "active") {
      query.status = "published";
    } else if (status === "live") {
      query.status = { $in: ["published", "in_progress"] };
    } else {
      query.status = status;
    }
  }

  // If no specific status, show visible gigs
  if (!status || status === "all") {
    query.status = { $in: ["published", "in_progress", "paused"] };
  }

  // Category & subCategory filters
  if (category) query.category = category;
  if (subCategory) query.subCategory = subCategory;

  // Price range filter
  if (minPrice || maxPrice) {
    query.budget = {};
    if (minPrice) query.budget.$gte = parseInt(minPrice);
    if (maxPrice) query.budget.$lte = parseInt(maxPrice);
  }

  // Search filter
  if (search && search.trim() !== "") {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $in: [new RegExp(search, "i")] } },
    ];
  }

  // Build sort object
  let sortObject = {};
  switch (sort) {
    case "newest":
      sortObject = { createdAt: -1 };
      break;
    case "oldest":
      sortObject = { createdAt: 1 };
      break;
    case "price_low":
      sortObject = { budget: 1 };
      break;
    case "price_high":
      sortObject = { budget: -1 };
      break;
    case "featured":
      sortObject = { featured: -1, createdAt: -1 };
      break;
    default:
      sortObject = { createdAt: -1 };
  }

  // Fetch gigs with company info
  const gigs = await Gig.find(query)
    .populate({
      path: "company",
      select: "name image profile.companyName isVerified username",
    })
    .sort(sortObject)
    .skip(skip)
    .limit(limit)
    .lean();

  const totalGigs = await Gig.countDocuments(query);

  // Process gigs with banner image fallback
  const enrichedGigs = gigs.map((gig) => {
    let effectiveBannerImage = gig.bannerImage;
    let bannerSource = gig.bannerSource || "none";
    let autoUpdateEnabled = gig.autoUpdateBanner || false;

    // Apply profile image fallback logic
    if (!effectiveBannerImage || bannerSource === "profile_fallback") {
      if (gig.company && gig.company.image) {
        effectiveBannerImage = gig.company.image;
        bannerSource = "profile_fallback";
        autoUpdateEnabled = true;
      } else {
        effectiveBannerImage = null;
        bannerSource = "none";
        autoUpdateEnabled = false;
      }
    }

    return {
      ...gig,
      bannerImage: effectiveBannerImage,
      bannerSource: bannerSource,
      autoUpdateBanner: autoUpdateEnabled,
      postedAgo: getTimeAgo(gig.createdAt),
      applicationsCount: gig.applications?.length || 0,
      companyName:
        gig.company?.profile?.companyName ||
        gig.company?.name ||
        "Unknown Company",
      statusDisplay: gig.status,
      isLive: ["published", "in_progress"].includes(gig.status),
      negotiationEnabled: gig.negotiationAllowed || false,
      budgetRange: gig.budgetRange || null,
    };
  });

  const responseData = {
    success: true,
    gigs: enrichedGigs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalGigs / limit),
      totalGigs,
      hasNextPage: page < Math.ceil(totalGigs / limit),
      hasPrevPage: page > 1,
      limit,
    },
  };

  res
    .status(200)
    .json(new apiResponse(200, responseData, "Gigs fetched successfully"));
});

// @desc    Get single gig by ID
// @route   GET /api/gigs/:id
// @access  Public
export const getGigById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    throw new apiError("Gig ID is required", 400);
  }

  // Fetch gig with populated company data
  const gig = await Gig.findById(id)
    .populate({
      path: "company",
      select:
        "name image profile.companyName profile.bio profile.location profile.website isVerified username",
    })
    .lean();

  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Determine effective banner image
  let effectiveBannerImage = gig.bannerImage;
  let bannerSource = gig.bannerSource || "none";
  let autoUpdateEnabled = gig.autoUpdateBanner || false;

  // If no banner image or using profile fallback
  if (!effectiveBannerImage || bannerSource === "profile_fallback") {
    if (gig.company && gig.company.image) {
      effectiveBannerImage = gig.company.image;
      bannerSource = "profile_fallback";
      autoUpdateEnabled = true;
    } else {
      effectiveBannerImage = null;
      bannerSource = "none";
      autoUpdateEnabled = false;
    }
  }

  // Check user permissions if authenticated
  let hasApplied = false;
  let canApply = false;
  let isOwner = false;

  if (req.user) {
    const userId = req.user._id;

    // Check ownership
    isOwner = gig.company._id.toString() === userId.toString();

    // Check if user has applied
    if (gig.applications && gig.applications.length > 0) {
      hasApplied = gig.applications.some((app) => {
        const appUserId = app.user ? app.user.toString() : null;
        const appFreelancerId = app.freelancer
          ? app.freelancer.toString()
          : null;
        return (
          appUserId === userId.toString() ||
          appFreelancerId === userId.toString()
        );
      });
    }

    // Can apply if: not owner, hasn't applied, gig is published, and user is freelancer
    canApply =
      !isOwner &&
      !hasApplied &&
      gig.status === "published" &&
      req.user.role === "freelancer";
  }

  // Calculate additional fields
  const timeAgo = getTimeAgo(gig.createdAt);
  const applicationsCount = gig.applications ? gig.applications.length : 0;

  // Check if expired
  let isExpired = false;
  let daysLeft = null;

  if (gig.EndDate) {
    const endDate = new Date(gig.EndDate);
    const today = new Date();
    isExpired = endDate < today;

    if (!isExpired) {
      const timeDiff = endDate.getTime() - today.getTime();
      daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
  }

  // Construct enriched gig response
  const enrichedGig = {
    ...gig,
    bannerImage: effectiveBannerImage,
    bannerSource: bannerSource,
    autoUpdateBanner: autoUpdateEnabled,
    applicationsCount,
    timeAgo,
    companyName:
      gig.company?.profile?.companyName ||
      gig.company?.name ||
      "Unknown Company",
    companyBio: gig.company?.profile?.bio || "",
    companyLocation: gig.company?.profile?.location || "",
    companyWebsite: gig.company?.profile?.website || "",
    companyUsername: gig.company?.username || "",
    isExpired,
    daysLeft,
    hasApplied,
    canApply,
    isOwner,
  };

  res
    .status(200)
    .json(new apiResponse(200, enrichedGig, "Gig fetched successfully"));
});

// @desc    Update gig
// @route   PUT /api/gigs/:id
// @access  Private (Gig owner only)
export const updateGig = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    throw new apiError("Gig ID is required", 400);
  }

  const gig = await Gig.findById(id);
  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Verify ownership
  if (gig.company.toString() !== req.user._id.toString()) {
    throw new apiError("You are not authorized to modify this gig", 403);
  }

  // Parse request data
  const { data, bannerImage, newAssetFiles } = await parseRequestData(req);

  // Validation
  if (data.title !== undefined && !data.title?.trim()) {
    throw new apiError("Title cannot be empty", 400);
  }

  if (data.budget !== undefined && data.budget < 100) {
    throw new apiError("Minimum gig budget is ₹100", 400);
  }

  // Prepare update data
  const updateData = { updatedAt: new Date() };

  // Update text fields if provided
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.category !== undefined) updateData.category = data.category;
  if (data.subCategory !== undefined) updateData.subCategory = data.subCategory;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.projectOverview !== undefined) {
    updateData.projectOverview = data.projectOverview.trim();
    updateData.description = data.projectOverview.trim();
  }
  if (data.budget !== undefined) updateData.budget = data.budget;
  if (data.timeline !== undefined) updateData.timeline = data.timeline;
  if (data.startDate !== undefined) {
    updateData.StartDate = data.startDate ? new Date(data.startDate) : null;
  }
  if (data.endDate !== undefined) {
    updateData.EndDate = data.endDate ? new Date(data.endDate) : null;
  }
  if (data.deliverables !== undefined)
    updateData.deliverables = data.deliverables;
  if (data.assetDescription !== undefined)
    updateData.DerscribeAssets = data.assetDescription;

  // Handle status updates
  if (data.status !== undefined) {
    const validStatuses = [
      "draft",
      "active",
      "paused",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(data.status)) {
      throw new apiError(
        "Invalid status. Valid statuses are: " + validStatuses.join(", "),
        400
      );
    }

    updateData.status = data.status;

    // Add status-specific timestamps
    if (data.status === "completed" && gig.status !== "completed") {
      updateData.closedAt = new Date();
    }
  }

  // Handle banner image update
  if (data.updateBanner && bannerImage) {
    const bannerInfo = await handleBannerImage(bannerImage, req.user);
    if (bannerInfo.bannerImage) {
      updateData.bannerImage = bannerInfo.bannerImage;
      updateData.bannerSource = "uploaded";
    }
  }

  // Handle asset files update
  let currentAssets = [...(gig.uploadAssets || [])];

  // Remove assets marked for deletion
  if (data.removedAssets && data.removedAssets.length > 0) {
    currentAssets = currentAssets.filter(
      (asset) => !data.removedAssets.includes(asset)
    );
  }

  // Add new asset files
  if (newAssetFiles && newAssetFiles.length > 0) {
    const newAssetUrls = await uploadAssetFiles(newAssetFiles);
    currentAssets = [...currentAssets, ...newAssetUrls];
  }

  updateData.uploadAssets = currentAssets;

  // Update the gig
  const updatedGig = await Gig.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate(
    "company",
    "name image profile.companyName isVerified profile.bio profile.location profile.website username"
  );

  const response = {
    success: true,
    message: "Gig updated successfully",
    gig: updatedGig,
  };

  // Add status-specific messages
  if (data.status !== undefined && data.status !== gig.status) {
    const statusMessages = {
      draft: "Gig saved as draft",
      active: "Gig is now live and visible to freelancers",
      paused: "Gig has been paused and is no longer visible",
      completed: "Gig marked as completed",
      cancelled: "Gig has been cancelled",
    };

    response.statusUpdate = {
      from: gig.status,
      to: data.status,
      message: statusMessages[data.status] || "Status updated",
    };
  }

  res
    .status(200)
    .json(new apiResponse(200, response, "Gig updated successfully"));
});

// @desc    Delete gig
// @route   DELETE /api/gigs/:id
// @access  Private (Gig owner only)
export const deleteGig = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    throw new apiError("Gig ID is required", 400);
  }

  const gig = await Gig.findById(id);
  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Verify ownership
  if (gig.company.toString() !== req.user._id.toString()) {
    throw new apiError("You are not authorized to modify this gig", 403);
  }

  // Safety checks before deletion
  const safetyChecks = [];

  // Check for active applications
  if (gig.applications && gig.applications.length > 0) {
    const activeApplications = gig.applications.filter(
      (app) => app.status === "pending"
    );
    if (activeApplications.length > 0) {
      safetyChecks.push(`${activeApplications.length} pending application(s)`);
    }
  }

  // Check if gig is currently active
  if (gig.status === "active") {
    safetyChecks.push("gig is currently active");
  }

  const forceDelete = req.query.force === "true";

  if (safetyChecks.length > 0 && !forceDelete) {
    throw new apiError(
      "Cannot delete gig. Safety checks failed: " + safetyChecks.join(", "),
      400
    );
  }

  // Perform the deletion
  await Gig.findByIdAndDelete(id);

  const responseData = {
    success: true,
    message: forceDelete
      ? "Gig force deleted successfully"
      : "Gig deleted successfully",
    deletedGig: {
      id: gig._id,
      title: gig.title,
      status: gig.status,
      applicationsCount: gig.applications?.length || 0,
    },
  };

  res
    .status(200)
    .json(new apiResponse(200, responseData, "Gig deleted successfully"));
});

// @desc    Get gig for editing
// @route   GET /api/gigs/:id/edit
// @access  Private (Gig owner only)
export const getGigForEdit = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    throw new apiError("Gig ID is required", 400);
  }

  const gig = await Gig.findById(id).populate(
    "company",
    "name image profile.companyName isVerified username"
  );

  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Verify ownership
  if (gig.company._id.toString() !== req.user._id.toString()) {
    throw new apiError("You are not authorized to edit this gig", 403);
  }

  res
    .status(200)
    .json(new apiResponse(200, { gig }, "Gig fetched for editing"));
});

// @desc    Get gig applications (for gig owner)
// @route   GET /api/gigs/:id/manage
// @access  Private (Gig owner only)
export const getGigApplications = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    throw new apiError("Gig ID is required", 400);
  }

  if (req.user.role !== "hiring") {
    throw new apiError("Only hiring users can manage gigs", 403);
  }

  // Populate user data properly for display in manage interface
  const gig = await Gig.findById(id)
    .populate(
      "company",
      "name image profile.companyName isVerified profile.bio profile.location profile.website username"
    )
    .populate(
      "applications.user",
      "name image profile.skills profile.hourlyRate profile.location username profile.bio stats.rating stats.totalReviews isVerified"
    );

  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Verify ownership
  if (gig.company._id.toString() !== req.user._id.toString()) {
    throw new apiError("Unauthorized - You can only manage your own gigs", 403);
  }

  // Transform applications with full user data
  const transformedApplications = gig.applications.map((app) => {
    const appObj = app.toObject();
    const userInfo = appObj.user;

    return {
      _id: appObj._id,
      user: userInfo,
      freelancer: userInfo,
      name: userInfo?.name || appObj.name || "Unknown User",
      email: userInfo?.email || appObj.email || "",
      image: userInfo?.image || appObj.image || null,
      username: userInfo?.username || "user",
      location:
        userInfo?.profile?.location || appObj.location || "Not specified",
      skills: userInfo?.profile?.skills || appObj.skills || [],
      hourlyRate: userInfo?.profile?.hourlyRate || appObj.hourlyRate || 0,
      bio: userInfo?.profile?.bio || "",
      rating: userInfo?.stats?.rating || 0,
      totalReviews: userInfo?.stats?.totalReviews || 0,
      isVerified: userInfo?.isVerified || false,
      coverLetter: appObj.coverLetter || "",
      proposedRate: appObj.proposedRate || 0,
      estimatedDuration: appObj.estimatedDuration || "",
      totalIterations: appObj.totalIterations || 1,
      remainingIterations: appObj.remainingIterations || 1,
      status: appObj.status || appObj.applicationStatus || "pending",
      applicationStatus: appObj.status || appObj.applicationStatus || "pending",
      appliedAt: appObj.appliedAt || appObj.createdAt,
      acceptedAt: appObj.acceptedAt,
      rejectedAt: appObj.rejectedAt,
      rejectionReason: appObj.rejectionReason,
      isPriorityApplication: appObj.isPriorityApplication || false,
      hasVerifiedSkills: appObj.hasVerifiedSkills || false,
      hasPremiumBadge: appObj.hasPremiumBadge || false,
      projectSubmissions: appObj.projectSubmissions || [],
      currentProjectId: appObj.currentProjectId,
      projectStatus: appObj.projectStatus || "not_started",
      paymentDetails: appObj.paymentDetails || {},
      timeAgo: getTimeAgo(appObj.appliedAt || appObj.createdAt),
      userId: userInfo?._id || appObj.user,
      freelancerId: userInfo?._id || appObj.user,
    };
  });

  // Add extra fields for frontend
  const gigWithExtras = {
    ...gig.toObject(),
    applicationsCount: gig.applications?.length || 0,
    timeAgo: getTimeAgo(gig.createdAt),
    companyName:
      gig.company?.profile?.companyName ||
      gig.company?.name ||
      "Unknown Company",
    companyBio: gig.company?.profile?.bio || "",
    companyLocation: gig.company?.profile?.location || "",
    companyWebsite: gig.company?.profile?.website || "",
    isExpired: gig.EndDate ? new Date(gig.EndDate) < new Date() : false,
    daysLeft: gig.EndDate
      ? Math.max(
          0,
          Math.ceil(
            (new Date(gig.EndDate) - new Date()) / (1000 * 60 * 60 * 24)
          )
        )
      : null,
    applications: transformedApplications,
  };

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        { gig: gigWithExtras },
        "Gig applications fetched successfully"
      )
    );
});

// @desc    Get user gig stats
// @route   GET /api/gigs/user-stats
// @access  Private (Hiring users only)
export const getUserGigStats = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (!user) {
    throw new apiError("User not found", 404);
  }

  // Only allow hiring users to check their gig stats
  if (user.role !== "hiring") {
    throw new apiError("Only hiring users can access gig statistics", 403);
  }

  // Get gig statistics for the user
  const totalGigs = await Gig.countDocuments({ company: user._id });
  const activeGigs = await Gig.countDocuments({
    company: user._id,
    status: "active",
  });
  const completedGigs = await Gig.countDocuments({
    company: user._id,
    status: "completed",
  });
  const closedGigs = await Gig.countDocuments({
    company: user._id,
    status: "closed",
  });

  // Get recent gigs (last 5)
  const recentGigs = await Gig.find({ company: user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("title status budget createdAt applications")
    .lean();

  // Calculate additional stats
  const gigsWithApplications = await Gig.countDocuments({
    company: user._id,
    "applications.0": { $exists: true },
  });

  const totalApplicationsReceived = await Gig.aggregate([
    { $match: { company: user._id } },
    {
      $project: {
        applicationCount: { $size: { $ifNull: ["$applications", []] } },
      },
    },
    { $group: { _id: null, total: { $sum: "$applicationCount" } } },
  ]);

  const stats = {
    totalGigs,
    activeGigs,
    completedGigs,
    closedGigs,
    gigsWithApplications,
    totalApplicationsReceived: totalApplicationsReceived[0]?.total || 0,
    isFirstTime: totalGigs === 0,
    hasPostedFirstGig: user.hasPostedFirstGig || false,
    recentGigs: recentGigs.map((gig) => ({
      _id: gig._id,
      title: gig.title,
      status: gig.status,
      budget: gig.budget,
      createdAt: gig.createdAt,
      applicationCount: gig.applications?.length || 0,
    })),
  };

  const responseData = {
    success: true,
    stats,
    totalGigs,
    message:
      totalGigs === 0
        ? "No gigs posted yet - first gig is free!"
        : `Found ${totalGigs} gig(s)`,
  };

  res
    .status(200)
    .json(
      new apiResponse(200, responseData, "User statistics fetched successfully")
    );
});

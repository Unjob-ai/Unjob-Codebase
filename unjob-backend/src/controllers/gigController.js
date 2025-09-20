// controllers/gigController.js
import {Gig} from "../models/GigModel.js"
import {User} from "../models/UserModel.js" 
import { AppError, catchAsync }from "../middleware/errorHandler.js"
import asyncHandler from "../utils/asyncHandler.js"
import apiError from "../utils/apiError.js";
// @desc    Create a new gig
// @route   POST /api/gigs
// @access  Private (Hiring companies only)
const createGig = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "hiring") {
    throw new apiError("Only hiring companies can create gigs", 403);
  }

  const {
    title,
    description,
    category,
    subCategory,
    budget,
    timeline,
    requirements,
    deliverables,
    skills,
    experienceLevel,
    workType,
    location,
    projectOverview,
  } = req.body;

  // Calculate platform commission (example: 5% from company, 10% from freelancer)
  const companyCommission = budget * 0.05;
  const freelancerCommission = budget * 0.1;
  const totalCommission = companyCommission + freelancerCommission;

  const gigData = {
    title,
    description,
    category,
    subCategory,
    budget,
    displayBudget: budget,
    companyPayableAmount: budget + companyCommission,
    freelancerReceivableAmount: budget - freelancerCommission,
    platformCommission: {
      companyCommission,
      freelancerCommission,
      totalCommission,
    },
    timeline,
    requirements,
    deliverables: deliverables || [],
    skills: skills || [],
    experienceLevel: experienceLevel || "intermediate",
    workType: workType || "remote",
    location,
    projectOverview,
    company: req.user._id,
    postedAt: new Date(),
  };

  const gig = await Gig.create(gigData);

  // Populate company info
  await gig.populate(
    "company",
    "name image profile.companyName profile.companySize"
  );

  res.status(201).json({
    success: true,
    message: "Gig created successfully",
    gig,
  });
});

// @desc    Get all gigs with filters and pagination
// @route   GET /api/gigs
// @access  Private
const getAllGigs = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    category,
    subCategory,
    workType,
    experienceLevel,
    minBudget,
    maxBudget,
    location,
    skills,
    sort = "-postedAt",
  } = req.query;

  const skip = (page - 1) * limit;

  // Build filter query
  const filterQuery = {
    status: "active",
    isActive: true,
    isApproved: true,
  };

  if (category) filterQuery.category = category;
  if (subCategory) filterQuery.subCategory = subCategory;
  if (workType) filterQuery.workType = workType;
  if (experienceLevel) filterQuery.experienceLevel = experienceLevel;
  if (location) filterQuery.location = { $regex: location, $options: "i" };

  // Budget range filter
  if (minBudget || maxBudget) {
    filterQuery.budget = {};
    if (minBudget) filterQuery.budget.$gte = parseInt(minBudget);
    if (maxBudget) filterQuery.budget.$lte = parseInt(maxBudget);
  }

  // Skills filter
  if (skills) {
    const skillsArray = skills.split(",");
    filterQuery.skills = { $in: skillsArray };
  }

  // Exclude expired gigs
  filterQuery.$or = [
    { expiresAt: { $exists: false } },
    { expiresAt: { $gt: new Date() } },
  ];

  const gigs = await Gig.find(filterQuery)
    .populate(
      "company",
      "name image profile.companyName profile.companySize profile.location"
    )
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const totalGigs = await Gig.countDocuments(filterQuery);

  // Add application status for current user if freelancer
  let gigsWithStatus = gigs;
  if (req.user.role === "freelancer") {
    gigsWithStatus = gigs.map((gig) => {
      const gigObj = gig.toObject();
      const userApplication = gig.applications.find(
        (app) => app.freelancer.toString() === req.user._id.toString()
      );
      gigObj.hasApplied = !!userApplication;
      gigObj.applicationStatus = userApplication?.applicationStatus || null;
      return gigObj;
    });
  }

  res.status(200).json({
    success: true,
    gigs: gigsWithStatus,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalGigs / limit),
      totalGigs,
      hasNext: page < Math.ceil(totalGigs / limit),
      hasPrev: page > 1,
    },
  });
});

// @desc    Get gig by ID
// @route   GET /api/gigs/:id
// @access  Private
const getGigById = asyncHandler(async (req, res, next) => {
  const gig = await Gig.findById(req.params.id)
    .populate(
      "company",
      "name image profile.companyName profile.companySize profile.location profile.description"
    )
    .populate(
      "applications.freelancer",
      "name image profile.skills profile.hourlyRate profile.location"
    );

  if (!gig || gig.status !== "active" || !gig.isActive) {
    throw new apiError("Gig not found", 404);
  }

  // Increment view count
  await gig.incrementViews(req.user._id, req.ip);

  // Check if user has applied (for freelancers)
  let hasApplied = false;
  let applicationStatus = null;

  if (req.user.role === "freelancer") {
    const userApplication = gig.applications.find(
      (app) => app.freelancer._id.toString() === req.user._id.toString()
    );
    hasApplied = !!userApplication;
    applicationStatus = userApplication?.applicationStatus || null;
  }

  // Hide sensitive application data from non-owners
  let applicationsData = [];
  if (req.user._id.toString() === gig.company._id.toString()) {
    // Show all applications to gig owner
    applicationsData = gig.applications;
  } else if (req.user.role === "freelancer" && hasApplied) {
    // Show only user's own application to freelancer
    applicationsData = gig.applications.filter(
      (app) => app.freelancer._id.toString() === req.user._id.toString()
    );
  }

  res.status(200).json({
    success: true,
    gig: {
      ...gig.toObject(),
      applications: applicationsData,
      hasApplied,
      applicationStatus,
    },
  });
});

// @desc    Apply to a gig
// @route   POST /api/gigs/:id/apply
// @access  Private (Freelancers only)
const applyToGig = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "freelancer") {
    throw new apiError("Only freelancers can apply to gigs", 403);
  }

  const { proposedRate, estimatedDuration, totalIterations = 3 } = req.body;

  const gig = await Gig.findById(req.params.id);

  if (!gig || gig.status !== "active" || !gig.isActive) {
    throw new apiError("Gig not found or not available", 404);
  }

  // Check if user already applied
  const existingApplication = gig.applications.find(
    (app) => app.freelancer.toString() === req.user._id.toString()
  );

  if (existingApplication) {
    throw new apiError("You have already applied for this gig", 400);
  }

  // Check if gig accepts more applications
  if (gig.applications.length >= gig.maxApplications) {
    throw new apiError("This gig is no longer accepting applications", 400);
  }

  const applicationData = {
    freelancer: req.user._id,
    name: req.user.name,
    image: req.user.image,
    location: req.user.profile?.location,
    skills: req.user.profile?.skills || [],
    hourlyRate: req.user.profile?.hourlyRate,
    portfolio: req.user.profile?.portfolio || [],
    proposedRate: proposedRate || gig.budget,
    estimatedDuration,
    totalIterations,
    remainingIterations: totalIterations,
    appliedAt: new Date(),
  };

  await gig.addApplication(applicationData);

  res.status(201).json({
    success: true,
    message: "Application submitted successfully",
    applicationId: gig.applications[gig.applications.length - 1]._id,
  });
});

// @desc    Get gig applications (for gig owner)
// @route   GET /api/gigs/:id/applications
// @access  Private (Gig owner only)
const getGigApplications = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (page - 1) * limit;

  const gig = await Gig.findById(req.params.id).populate(
    "applications.freelancer",
    "name image profile.skills profile.hourlyRate profile.location profile.bio"
  );

  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Check if user owns the gig
  if (gig.company.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to view applications", 403);
  }

  let applications = gig.applications;

  // Filter by status if provided
  if (status) {
    applications = applications.filter(
      (app) => app.applicationStatus === status
    );
  }

  // Pagination
  const totalApplications = applications.length;
  const paginatedApplications = applications
    .sort((a, b) => b.appliedAt - a.appliedAt)
    .slice(skip, skip + parseInt(limit));

  res.status(200).json({
    success: true,
    applications: paginatedApplications,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalApplications / limit),
      totalApplications,
      hasNext: page < Math.ceil(totalApplications / limit),
      hasPrev: page > 1,
    },
  });
});

// @desc    Accept/Reject application
// @route   PUT /api/gigs/:id/applications/:applicationId
// @access  Private (Gig owner only)
const updateApplicationStatus = asyncHandler(async (req, res, next) => {
  const { status, notes } = req.body;
  const { id: gigId, applicationId } = req.params;

  if (!["accepted", "rejected"].includes(status)) {
    throw new apiError("Invalid status. Must be accepted or rejected", 400);
  }

  const gig = await Gig.findById(gigId);

  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Check if user owns the gig
  if (gig.company.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to update application", 403);
  }

  const application = gig.applications.id(applicationId);

  if (!application) {
    throw new apiError("Application not found", 404);
  }

  if (application.applicationStatus !== "pending") {
    throw new apiError("Application has already been processed", 400);
  }

  // Update application
  application.applicationStatus = status;
  application.reviewedAt = new Date();
  application.companyNotes = notes;

  if (status === "accepted") {
    application.acceptedAt = new Date();

    // Select this freelancer and update gig status
    await gig.selectFreelancer(applicationId);
  } else {
    application.rejectedAt = new Date();
  }

  await gig.save();

  // TODO: Send notification to freelancer
  // await sendNotification({
  //   user: application.freelancer,
  //   type: status === 'accepted' ? 'gig_accepted' : 'gig_rejected',
  //   title: `Application ${status}`,
  //   message: `Your application for "${gig.title}" has been ${status}`,
  //   relatedId: gig._id,
  //   relatedModel: 'Gig',
  // });

  res.status(200).json({
    success: true,
    message: `Application ${status} successfully`,
    application,
  });
});

// @desc    Update gig
// @route   PUT /api/gigs/:id
// @access  Private (Gig owner only)
const updateGig = asyncHandler(async (req, res, next) => {
  const gig = await Gig.findById(req.params.id);

  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Check if user owns the gig
  if (gig.company.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to update this gig", 403);
  }

  // Prevent updates if gig has accepted applications
  if (gig.selectedFreelancer) {
    throw new apiError("Cannot update gig with accepted applications", 400);
  }

  const allowedUpdates = [
    "title",
    "description",
    "requirements",
    "deliverables",
    "timeline",
    "workType",
    "location",
    "projectOverview",
  ];

  const updates = {};
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  Object.assign(gig, updates);
  await gig.save();

  await gig.populate("company", "name image profile.companyName");

  res.status(200).json({
    success: true,
    message: "Gig updated successfully",
    gig,
  });
});

// @desc    Delete gig
// @route   DELETE /api/gigs/:id
// @access  Private (Gig owner only)
const deleteGig = asyncHandler(async (req, res, next) => {
  const gig = await Gig.findById(req.params.id);

  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Check if user owns the gig
  if (gig.company.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to delete this gig", 403);
  }

  // Prevent deletion if gig has accepted applications
  if (gig.selectedFreelancer) {
    throw new apiError("Cannot delete gig with accepted applications", 400);
  }

  // Soft delete
  gig.status = "cancelled";
  gig.isActive = false;
  await gig.save();

  res.status(200).json({
    success: true,
    message: "Gig deleted successfully",
  });
});

// @desc    Search gigs
// @route   GET /api/gigs/search
// @access  Private
const searchGigs = asyncHandler(async (req, res, next) => {
  const {
    q,
    category,
    location,
    minBudget,
    maxBudget,
    page = 1,
    limit = 10,
  } = req.query;
  const skip = (page - 1) * limit;

  if (!q || q.trim().length === 0) {
    throw new apiError("Search query is required", 400);
  }

  const searchQuery = {
    status: "active",
    isActive: true,
    isApproved: true,
    $or: [
      { title: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
      { skills: { $in: [new RegExp(q, "i")] } },
      { requirements: { $regex: q, $options: "i" } },
    ],
  };

  if (category) searchQuery.category = category;
  if (location) searchQuery.location = { $regex: location, $options: "i" };

  // Budget range filter
  if (minBudget || maxBudget) {
    searchQuery.budget = {};
    if (minBudget) searchQuery.budget.$gte = parseInt(minBudget);
    if (maxBudget) searchQuery.budget.$lte = parseInt(maxBudget);
  }

  const gigs = await Gig.find(searchQuery)
    .populate("company", "name image profile.companyName")
    .sort("-postedAt")
    .skip(skip)
    .limit(parseInt(limit));

  const totalGigs = await Gig.countDocuments(searchQuery);

  // Add application status for freelancers
  let gigsWithStatus = gigs;
  if (req.user.role === "freelancer") {
    gigsWithStatus = gigs.map((gig) => {
      const gigObj = gig.toObject();
      const userApplication = gig.applications.find(
        (app) => app.freelancer.toString() === req.user._id.toString()
      );
      gigObj.hasApplied = !!userApplication;
      gigObj.applicationStatus = userApplication?.applicationStatus || null;
      return gigObj;
    });
  }

  res.status(200).json({
    success: true,
    gigs: gigsWithStatus,
    searchQuery: q,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalGigs / limit),
      totalGigs,
      hasNext: page < Math.ceil(totalGigs / limit),
      hasPrev: page > 1,
    },
  });
});

// @desc    Get company's gigs
// @route   GET /api/gigs/company
// @access  Private (Hiring companies only)
const getCompanyGigs = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "hiring") {
    throw new apiError("Only hiring companies can access this endpoint", 403);
  }

  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filterQuery = {
    company: req.user._id,
  };

  if (status) {
    filterQuery.status = status;
  }

  const gigs = await Gig.find(filterQuery)
    .populate("selectedFreelancer", "name image profile.skills")
    .sort("-postedAt")
    .skip(skip)
    .limit(parseInt(limit));

  const totalGigs = await Gig.countDocuments(filterQuery);

  // Add application counts
  const gigsWithCounts = gigs.map((gig) => ({
    ...gig.toObject(),
    totalApplications: gig.applications.length,
    pendingApplications: gig.applications.filter(
      (app) => app.applicationStatus === "pending"
    ).length,
    acceptedApplications: gig.applications.filter(
      (app) => app.applicationStatus === "accepted"
    ).length,
  }));

  res.status(200).json({
    success: true,
    gigs: gigsWithCounts,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalGigs / limit),
      totalGigs,
      hasNext: page < Math.ceil(totalGigs / limit),
      hasPrev: page > 1,
    },
  });
});

// @desc    Get freelancer's applications
// @route   GET /api/gigs/my-applications
// @access  Private (Freelancers only)
const getMyApplications = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "freelancer") {
    throw new apiError("Only freelancers can access this endpoint", 403);
  }

  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const matchQuery = {
    "applications.freelancer": req.user._id,
  };

  if (status) {
    matchQuery["applications.applicationStatus"] = status;
  }

  const gigs = await Gig.find(matchQuery)
    .populate("company", "name image profile.companyName")
    .sort("-applications.appliedAt")
    .skip(skip)
    .limit(parseInt(limit));

  // Filter to show only user's applications
  const applicationsWithGigs = [];

  gigs.forEach((gig) => {
    const userApplication = gig.applications.find(
      (app) => app.freelancer.toString() === req.user._id.toString()
    );

    if (userApplication) {
      applicationsWithGigs.push({
        application: userApplication,
        gig: {
          _id: gig._id,
          title: gig.title,
          description: gig.description,
          budget: gig.budget,
          category: gig.category,
          workType: gig.workType,
          status: gig.status,
          company: gig.company,
          postedAt: gig.postedAt,
        },
      });
    }
  });

  const totalApplications = await Gig.countDocuments(matchQuery);

  res.status(200).json({
    success: true,
    applications: applicationsWithGigs,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalApplications / limit),
      totalApplications,
      hasNext: page < Math.ceil(totalApplications / limit),
      hasPrev: page > 1,
    },
  });
});

// @desc    Get gig categories
// @route   GET /api/gigs/categories
// @access  Private
const getGigCategories = asyncHandler(async (req, res, next) => {
  const categories = await Gig.aggregate([
    {
      $match: {
        status: "active",
        isActive: true,
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        subCategories: { $addToSet: "$subCategory" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  res.status(200).json({
    success: true,
    categories,
  });
});

// @desc    Get gig statistics
// @route   GET /api/gigs/stats
// @access  Private
const getGigStats = asyncHandler(async (req, res, next) => {
  const stats = await Gig.aggregate([
    {
      $match: {
        status: "active",
        isActive: true,
        isApproved: true,
      },
    },
    {
      $group: {
        _id: null,
        totalGigs: { $sum: 1 },
        avgBudget: { $avg: "$budget" },
        minBudget: { $min: "$budget" },
        maxBudget: { $max: "$budget" },
        totalApplications: { $sum: { $size: "$applications" } },
      },
    },
  ]);

  const categoryStats = await Gig.aggregate([
    {
      $match: {
        status: "active",
        isActive: true,
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        avgBudget: { $avg: "$budget" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  res.status(200).json({
    success: true,
    stats: stats[0] || {
      totalGigs: 0,
      avgBudget: 0,
      minBudget: 0,
      maxBudget: 0,
      totalApplications: 0,
    },
    categoryStats,
  });
});

// @desc    Get featured/recommended gigs
// @route   GET /api/gigs/featured
// @access  Private
const getFeaturedGigs = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // For now, featured gigs are those with high budgets or priority
  const gigs = await Gig.find({
    status: "active",
    isActive: true,
    isApproved: true,
    $or: [
      { isPriority: true },
      { budget: { $gte: 50000 } }, // High budget gigs
    ],
  })
    .populate("company", "name image profile.companyName profile.companySize")
    .sort("-budget -postedAt")
    .skip(skip)
    .limit(parseInt(limit));

  const totalGigs = await Gig.countDocuments({
    status: "active",
    isActive: true,
    isApproved: true,
    $or: [{ isPriority: true }, { budget: { $gte: 50000 } }],
  });

  // Add application status for freelancers
  let gigsWithStatus = gigs;
  if (req.user.role === "freelancer") {
    gigsWithStatus = gigs.map((gig) => {
      const gigObj = gig.toObject();
      const userApplication = gig.applications.find(
        (app) => app.freelancer.toString() === req.user._id.toString()
      );
      gigObj.hasApplied = !!userApplication;
      gigObj.applicationStatus = userApplication?.applicationStatus || null;
      return gigObj;
    });
  }

  res.status(200).json({
    success: true,
    gigs: gigsWithStatus,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalGigs / limit),
      totalGigs,
      hasNext: page < Math.ceil(totalGigs / limit),
      hasPrev: page > 1,
    },
  });
});

export  {
  createGig,
  getAllGigs,
  getGigById,
  applyToGig,
  getGigApplications,
  updateApplicationStatus,
  updateGig,
  deleteGig,
  searchGigs,
  getCompanyGigs,
  getMyApplications,
  getGigCategories,
  getGigStats,
  getFeaturedGigs,
};

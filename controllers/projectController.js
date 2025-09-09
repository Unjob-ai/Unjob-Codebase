// controllers/projectController.js
const Project = require("../models/Project");
const Gig = require("../models/Gig");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const { AppError, catchAsync } = require("../middleware/errorHandler");

// @desc    Submit a project
// @route   POST /api/projects
// @access  Private (Freelancers only)
const submitProject = catchAsync(async (req, res, next) => {
  if (req.user.role !== "freelancer") {
    return next(new AppError("Only freelancers can submit projects", 403));
  }

  const { title, description, conversationId, gigId } = req.body;

  // Verify conversation and gig
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    return next(new AppError("Conversation not found", 404));
  }

  const gig = await Gig.findById(gigId);
  if (!gig) {
    return next(new AppError("Gig not found", 404));
  }

  // Handle file uploads
  let files = [];
  if (req.files && req.files.length > 0) {
    files = req.files.map((file) => ({
      name: file.originalname,
      url: file.path || file.secure_url,
      type: file.mimetype,
      size: file.size,
    }));
  }

  const projectData = {
    title,
    description,
    conversation: conversationId,
    gig: gigId,
    freelancer: req.user._id,
    company: gig.company,
    files,
    payment: {
      amount: gig.freelancerReceivableAmount,
      status: "pending",
    },
  };

  const project = await Project.create(projectData);

  await project.populate([
    { path: "freelancer", select: "name image role" },
    { path: "company", select: "name image profile.companyName" },
    { path: "gig", select: "title budget category" },
  ]);

  res.status(201).json({
    success: true,
    message: "Project submitted successfully",
    project,
  });
});

// @desc    Get projects (filtered by user role)
// @route   GET /api/projects
// @access  Private
const getProjects = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filterQuery = {
    isActive: true,
    isDeleted: false,
  };

  // Filter by user role
  if (req.user.role === "freelancer") {
    filterQuery.freelancer = req.user._id;
  } else if (req.user.role === "hiring") {
    filterQuery.company = req.user._id;
  }

  if (status) {
    filterQuery.status = status;
  }

  const projects = await Project.find(filterQuery)
    .populate("freelancer", "name image role profile.skills")
    .populate("company", "name image profile.companyName")
    .populate("gig", "title budget category")
    .sort("-createdAt")
    .skip(skip)
    .limit(parseInt(limit));

  const totalProjects = await Project.countDocuments(filterQuery);

  res.status(200).json({
    success: true,
    projects,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalProjects / limit),
      totalProjects,
      hasNext: page < Math.ceil(totalProjects / limit),
      hasPrev: page > 1,
    },
  });
});

// @desc    Update project status
// @route   PUT /api/projects/:id/status
// @access  Private (Company only)
const updateProjectStatus = catchAsync(async (req, res, next) => {
  const { status, feedback } = req.body;

  if (
    !["under_review", "revision_requested", "approved", "rejected"].includes(
      status
    )
  ) {
    return next(new AppError("Invalid status", 400));
  }

  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  // Check if user is the company owner
  if (project.company.toString() !== req.user._id.toString()) {
    return next(new AppError("Not authorized to update this project", 403));
  }

  await project.updateStatus(status, feedback);

  await project.populate([
    { path: "freelancer", select: "name image" },
    { path: "company", select: "name image profile.companyName" },
  ]);

  res.status(200).json({
    success: true,
    message: `Project status updated to ${status}`,
    project,
  });
});

module.exports = {
  submitProject,
  getProjects,
  updateProjectStatus,
};

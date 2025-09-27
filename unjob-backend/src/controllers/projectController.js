// controllers/projectController.js
import { Project } from "../models/ProjectModel.js";
import { Gig } from "../models/GigModel.js";
import { Conversation } from "../models/ConversationModel.js";
import { User } from "../models/UserModel.js";
import { AppError, catchAsync } from "../middleware/errorHandler.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";

// ADD THESE NOTIFICATION IMPORTS
import {
  autoNotifyProjectSubmission,
  autoNotifyProjectReview,
  autoNotifyProjectCompletion,
} from "../utils/notificationHelpers.js";

// @desc    Submit a project - UPDATED WITH NOTIFICATIONS
// @route   POST /api/projects
// @access  Private (Freelancers only)
const submitProject = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "freelancer") {
    throw new apiError("Only freelancers can submit projects", 403);
  }

  const { title, description, conversationId, gigId } = req.body;

  // Verify conversation and gig
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: req.user._id,
  });

  if (!conversation) {
    throw new apiError("Conversation not found", 404);
  }

  const gig = await Gig.findById(gigId).populate("company", "name email");
  if (!gig) {
    throw new apiError("Gig not found", 404);
  }

  // Handle file uploads
  let files = [];
  if (req.files && req.files.length > 0) {
    files = req.files.map((file) => ({
      name: file.originalname,
      url: `${process.env.CLOUD_FRONT_DOMAIN_NAME}/${file?.key}`|| null,
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
    company: gig.company._id,
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

  // AUTO-NOTIFY GIG OWNER ABOUT PROJECT SUBMISSION
  await autoNotifyProjectSubmission(project, gig, req.user);

  res
    .status(201)
    .json(new apiResponse(201, project, "Project submitted successfully"));
});

// @desc    Get projects (filtered by user role)
// @route   GET /api/projects
// @access  Private
const getProjects = asyncHandler(async (req, res, next) => {
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

  res.status(200).json(
    new apiResponse(
      200,
      {
        projects,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProjects / limit),
          totalProjects,
          hasNext: page < Math.ceil(totalProjects / limit),
          hasPrev: page > 1,
        },
      },
      "Projects fetched successfully"
    )
  );
});

// @desc    Update project status - UPDATED WITH NOTIFICATIONS
// @route   PUT /api/projects/:id/status
// @access  Private (Company only)
const updateProjectStatus = asyncHandler(async (req, res, next) => {
  const { status, feedback, rating } = req.body;

  if (
    ![
      "under_review",
      "revision_requested",
      "approved",
      "rejected",
      "completed",
    ].includes(status)
  ) {
    throw new apiError("Invalid status", 400);
  }

  const project = await Project.findById(req.params.id)
    .populate("freelancer", "name email")
    .populate("gig", "title");

  if (!project) {
    throw new apiError("Project not found", 404);
  }

  // Check if user is the company owner
  if (project.company.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to update this project", 403);
  }

  // Create review object if feedback or rating provided
  let review = null;
  if (feedback || rating) {
    review = {
      rating: rating || 0,
      content: feedback || "",
      feedback: feedback || "",
      reviewedAt: new Date(),
      reviewedBy: req.user._id,
    };
  }

  await project.updateStatus(status, feedback);

  await project.populate([
    { path: "freelancer", select: "name image email" },
    { path: "company", select: "name image profile.companyName" },
  ]);

  // AUTO-NOTIFY FREELANCER ABOUT PROJECT REVIEW/STATUS UPDATE
  if (review) {
    await autoNotifyProjectReview(review, project, project.gig);
  }

  // AUTO-NOTIFY ABOUT PROJECT COMPLETION
  if (status === "completed") {
    await autoNotifyProjectCompletion(
      project,
      project.gig,
      project.freelancer._id
    );
  }

  res
    .status(200)
    .json(new apiResponse(200, project, "Project status updated successfully"));
});

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate("freelancer", "name image role profile.skills")
    .populate("company", "name image profile.companyName")
    .populate("gig", "title budget category timeline");

  if (!project) {
    throw new apiError("Project not found", 404);
  }

  // Check authorization - only project participants can view
  const isFreelancer =
    project.freelancer._id.toString() === req.user._id.toString();
  const isCompany = project.company._id.toString() === req.user._id.toString();

  if (!isFreelancer && !isCompany) {
    throw new apiError("Not authorized to view this project", 403);
  }

  res
    .status(200)
    .json(new apiResponse(200, project, "Project fetched successfully"));
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Freelancer who owns the project)
const updateProject = asyncHandler(async (req, res, next) => {
  const { title, description } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new apiError("Project not found", 404);
  }

  // Only freelancer who created the project can update it
  if (project.freelancer.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to update this project", 403);
  }

  // Can only update if project is in draft or revision_requested status
  if (!["draft", "revision_requested"].includes(project.status)) {
    throw new apiError("Cannot update project in current status", 400);
  }

  // Handle new file uploads
  let newFiles = [];
  if (req.files && req.files.length > 0) {
    newFiles = req.files.map((file) => ({
      name: file.originalname,
      url: file.path || file.secure_url,
      type: file.mimetype,
      size: file.size,
    }));
  }

  // Update fields
  if (title) project.title = title;
  if (description) project.description = description;

  // Add new files to existing ones
  if (newFiles.length > 0) {
    project.files = [...project.files, ...newFiles];
  }

  project.updatedAt = new Date();

  await project.save();

  await project.populate([
    { path: "freelancer", select: "name image role" },
    { path: "company", select: "name image profile.companyName" },
    { path: "gig", select: "title budget category" },
  ]);

  res
    .status(200)
    .json(new apiResponse(200, project, "Project updated successfully"));
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Freelancer who owns the project)
const deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new apiError("Project not found", 404);
  }

  // Only freelancer who created the project can delete it
  if (project.freelancer.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to delete this project", 403);
  }

  // Can only delete if project is in draft status
  if (project.status !== "draft") {
    throw new apiError("Cannot delete project that has been submitted", 400);
  }

  // Soft delete
  project.isDeleted = true;
  project.deletedAt = new Date();
  await project.save();

  res
    .status(200)
    .json(new apiResponse(200, {}, "Project deleted successfully"));
});

// @desc    Approve project (shortcut for completed status)
// @route   POST /api/projects/:id/approve
// @access  Private (Company only)
const approveProject = asyncHandler(async (req, res, next) => {
  const { rating, feedback } = req.body;

  const project = await Project.findById(req.params.id)
    .populate("freelancer", "name email")
    .populate("gig", "title");

  if (!project) {
    throw new apiError("Project not found", 404);
  }

  // Check if user is the company owner
  if (project.company.toString() !== req.user._id.toString()) {
    throw new apiError("Not authorized to approve this project", 403);
  }

  if (project.status === "completed") {
    throw new apiError("Project already completed", 400);
  }

  // Create review
  const review = {
    rating: rating || 5,
    content: feedback || "Project approved",
    feedback: feedback || "Project approved",
    reviewedAt: new Date(),
    reviewedBy: req.user._id,
  };

  // Update project to completed status
  await project.updateStatus("completed", feedback);

  await project.populate([
    { path: "freelancer", select: "name image email" },
    { path: "company", select: "name image profile.companyName" },
  ]);

  // AUTO-NOTIFY FREELANCER ABOUT PROJECT APPROVAL/COMPLETION
  await autoNotifyProjectReview(review, project, project.gig);
  await autoNotifyProjectCompletion(
    project,
    project.gig,
    project.freelancer._id
  );

  res
    .status(200)
    .json(
      new apiResponse(
        200,
        project,
        "Project approved and completed successfully"
      )
    );
});

// @desc    Request revision
// @route   POST /api/projects/:id/request-revision
// @access  Private (Company only)
const requestRevision = asyncHandler(async (req, res, next) => {
  const { feedback } = req.body;

  if (!feedback || feedback.trim().length < 10) {
    throw new apiError(
      "Revision feedback must be at least 10 characters long",
      400
    );
  }

  const project = await Project.findById(req.params.id)
    .populate("freelancer", "name email")
    .populate("gig", "title");

  if (!project) {
    throw new apiError("Project not found", 404);
  }

  // Check if user is the company owner
  if (project.company.toString() !== req.user._id.toString()) {
    throw new apiError(
      "Not authorized to request revision for this project",
      403
    );
  }

  if (project.status === "completed") {
    throw new apiError("Cannot request revision for completed project", 400);
  }

  // Create review for revision request
  const review = {
    rating: 0,
    content: feedback,
    feedback: feedback,
    reviewedAt: new Date(),
    reviewedBy: req.user._id,
  };

  await project.updateStatus("revision_requested", feedback);

  await project.populate([
    { path: "freelancer", select: "name image email" },
    { path: "company", select: "name image profile.companyName" },
  ]);

  // AUTO-NOTIFY FREELANCER ABOUT REVISION REQUEST
  await autoNotifyProjectReview(review, project, project.gig);

  res
    .status(200)
    .json(new apiResponse(200, project, "Revision requested successfully"));
});

export {
  submitProject,
  getProjects,
  updateProjectStatus,
  getProjectById,
  updateProject,
  deleteProject,
  approveProject,
  requestRevision,
};

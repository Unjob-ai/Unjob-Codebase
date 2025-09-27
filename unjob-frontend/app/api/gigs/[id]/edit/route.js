// Enhanced gigs/[id]/edit/route.js with status management and delete functionality
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
import User from "@/models/User";
import { uploadToCloudinary } from "@/lib/cloudinary";

// Parse request data for both form-data and JSON
async function parseRequestData(req) {
  const contentType = req.headers.get("content-type");

  if (contentType?.includes("multipart/form-data")) {
    const formData = await req.formData();

    return {
      data: {
        title: formData.get("title"),
        category: formData.get("category"),
        subCategory: formData.get("subCategory"),
        projectOverview: formData.get("projectOverview"),
        tags: formData.get("tags")
          ? JSON.parse(formData.get("tags"))
          : undefined,
        budget: formData.get("budget")
          ? Number(formData.get("budget"))
          : undefined,
        timeline: formData.get("timeline"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        deliverables: formData.get("deliverables")
          ? JSON.parse(formData.get("deliverables"))
          : undefined,
        assetDescription: formData.get("assetDescription"),
        status: formData.get("status"), // NEW: Handle status updates
        updateBanner: formData.get("updateBanner") === "true",
        removedAssets: formData.get("removedAssets")
          ? JSON.parse(formData.get("removedAssets"))
          : [],
      },
      bannerImage: formData.get("bannerImage"),
      newAssetFiles: formData.getAll("newAssetFiles") || [],
    };
  } else {
    const jsonData = await req.json();
    return {
      data: jsonData,
      bannerImage: null,
      newAssetFiles: [],
    };
  }
}

// Upload banner image to Cloudinary
async function uploadBannerImage(bannerImageFile) {
  if (!bannerImageFile || bannerImageFile.size === 0) {
    return null;
  }

  if (bannerImageFile.size > 10 * 1024 * 1024) {
    throw new Error("Banner image too large (max 10MB)");
  }

  if (!bannerImageFile.type.startsWith("image/")) {
    throw new Error("Invalid file type. Please upload an image.");
  }

  try {
    const buffer = Buffer.from(await bannerImageFile.arrayBuffer());
    const url = await uploadToCloudinary(buffer, "unjob/gigs/banners", "image");
    return url;
  } catch (error) {
    console.error("Banner image upload failed:", error);
    throw error;
  }
}

// Upload asset files to Cloudinary
async function uploadAssetFiles(assetFiles) {
  const assetUrls = [];
  for (const file of assetFiles) {
    if (file.size > 0) {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Asset file too large (max 10MB)");
      }

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        let resourceType = "raw";
        if (file.type.startsWith("image/")) {
          resourceType = "image";
        } else if (file.type.startsWith("video/")) {
          resourceType = "video";
        }

        const assetUrl = await uploadToCloudinary(
          buffer,
          "unjob/gigs/assets",
          resourceType
        );
        assetUrls.push(assetUrl);
      } catch (error) {
        console.error("Asset file upload failed:", error);
        throw error;
      }
    }
  }
  return assetUrls;
}

// Helper function to verify gig ownership
async function verifyGigOwnership(gigId, userId) {
  const gig = await Gig.findById(gigId);
  if (!gig) {
    return { error: "Gig not found", status: 404 };
  }

  if (gig.company.toString() !== userId.toString()) {
    return { error: "You are not authorized to modify this gig", status: 403 };
  }

  return { gig };
}

// GET - Get gig for editing
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Gig ID is required" },
        { status: 400 }
      );
    }

    // Get current user
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    let currentUser = null;

    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
    }

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify ownership and get gig
    const ownership = await verifyGigOwnership(id, currentUser._id);
    if (ownership.error) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    // Populate the gig with company details
    const gig = await Gig.findById(id).populate(
      "company",
      "name image profile.companyName isVerified username"
    );

    return NextResponse.json({
      success: true,
      gig: gig,
    });
  } catch (error) {
    console.error("Get gig for edit error:", error);
    return NextResponse.json({ error: "Failed to fetch gig" }, { status: 500 });
  }
}

// PUT - Update gig with enhanced status management
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Gig ID is required" },
        { status: 400 }
      );
    }

    // Get current user
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    let currentUser = null;

    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
    }

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify ownership and get gig
    const ownership = await verifyGigOwnership(id, currentUser._id);
    if (ownership.error) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const gig = ownership.gig;

    // Parse request data
    const { data, bannerImage, newAssetFiles } = await parseRequestData(req);

    // Validation
    if (data.title !== undefined && !data.title?.trim()) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    if (data.budget !== undefined && data.budget < 100) {
      return NextResponse.json(
        { error: "Minimum gig budget is ₹100" },
        { status: 400 }
      );
    }

    // ENHANCED: Validate status changes
    if (data.status !== undefined) {
      const validStatuses = [
        "draft",
        "active",
        "paused",
        "completed",
        "cancelled",
      ];
      if (!validStatuses.includes(data.status)) {
        return NextResponse.json(
          {
            error:
              "Invalid status. Valid statuses are: " + validStatuses.join(", "),
          },
          { status: 400 }
        );
      }

      // Business logic for status changes
      if (data.status === "active" && gig.status === "draft") {
        // Validate required fields before making draft active
        if (!gig.title || !gig.category || !gig.budget) {
          return NextResponse.json(
            {
              error:
                "Cannot activate gig: Missing required fields (title, category, budget)",
            },
            { status: 400 }
          );
        }
      }

      if (data.status === "completed" && gig.applications?.length === 0) {
        return NextResponse.json(
          { error: "Cannot mark gig as completed: No applications received" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData = {
      updatedAt: new Date(),
    };

    // Update text fields if provided
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.category !== undefined) updateData.category = data.category;
    if (data.subCategory !== undefined)
      updateData.subCategory = data.subCategory;
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

    // ENHANCED: Handle status updates with timestamps
    if (data.status !== undefined) {
      updateData.status = data.status;

      // Add status-specific timestamps
      if (data.status === "completed" && gig.status !== "completed") {
        updateData.closedAt = new Date();
      }

      // Update banner source if needed
      if (
        data.status === "active" &&
        gig.bannerSource === "none" &&
        currentUser.image
      ) {
        updateData.bannerImage = currentUser.image;
        updateData.bannerSource = "profile_fallback";
      }
    }

    // Handle banner image update
    if (data.updateBanner && bannerImage) {
      console.log("Updating banner image...");
      const newBannerUrl = await uploadBannerImage(bannerImage);
      if (newBannerUrl) {
        updateData.bannerImage = newBannerUrl;
        updateData.bannerSource = "uploaded"; // Mark as custom uploaded banner
      }
    }

    // Handle asset files update
    let currentAssets = [...(gig.uploadAssets || [])];

    // Remove assets marked for deletion
    if (data.removedAssets && data.removedAssets.length > 0) {
      console.log("Removing assets:", data.removedAssets);
      currentAssets = currentAssets.filter(
        (asset) => !data.removedAssets.includes(asset)
      );
    }

    // Add new asset files
    if (newAssetFiles.length > 0) {
      console.log("Adding new asset files...");
      const newAssetUrls = await uploadAssetFiles(newAssetFiles);
      currentAssets = [...currentAssets, ...newAssetUrls];
    }

    // Update assets array
    updateData.uploadAssets = currentAssets;

    console.log("Update data:", updateData);

    // Update the gig
    const updatedGig = await Gig.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate(
      "company",
      "name image profile.companyName isVerified profile.bio profile.location profile.website username"
    );

    // Prepare response with status change information
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

    return NextResponse.json(response);
  } catch (error) {
    console.error("Update gig error:", error);

    if (
      error.message.includes("too large") ||
      error.message.includes("Invalid file type")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.message },
        { status: 400 }
      );
    }

    if (error.name === "CastError") {
      return NextResponse.json(
        { error: "Invalid gig ID format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update gig" },
      { status: 500 }
    );
  }
}

// DELETE - Delete gig with enhanced safety checks
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { error: "Gig ID is required" },
        { status: 400 }
      );
    }

    // Get current user
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    let currentUser = null;

    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
    }

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify ownership and get gig
    const ownership = await verifyGigOwnership(id, currentUser._id);
    if (ownership.error) {
      return NextResponse.json(
        { error: ownership.error },
        { status: ownership.status }
      );
    }

    const gig = ownership.gig;

    // ENHANCED: Safety checks before deletion
    const safetyChecks = [];

    // Check for active applications
    if (gig.applications && gig.applications.length > 0) {
      const activeApplications = gig.applications.filter(
        (app) => app.status === "pending"
      );
      if (activeApplications.length > 0) {
        safetyChecks.push(
          `${activeApplications.length} pending application(s)`
        );
      }
    }

    // Check if gig is currently active
    if (gig.status === "active") {
      safetyChecks.push("gig is currently active");
    }

    // Check if gig has been recently created (less than 1 hour ago)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isRecentlyCreated = gig.createdAt > oneHourAgo;

    // Parse query parameters for force deletion
    const { searchParams } = new URL(req.url);
    const forceDelete = searchParams.get("force") === "true";

    if (safetyChecks.length > 0 && !forceDelete) {
      return NextResponse.json(
        {
          error: "Cannot delete gig",
          reason: "Safety checks failed",
          issues: safetyChecks,
          suggestion: isRecentlyCreated
            ? "Consider setting the gig to draft instead, or use force=true to override."
            : "Please pause the gig and handle applications first, or use force=true to override.",
          canForceDelete: true,
        },
        { status: 400 }
      );
    }

    // Perform the deletion
    await Gig.findByIdAndDelete(id);

    console.log(`✅ Gig ${id} deleted by user ${currentUser._id}`);

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Delete gig error:", error);

    if (error.name === "CastError") {
      return NextResponse.json(
        { error: "Invalid gig ID format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete gig" },
      { status: 500 }
    );
  }
}

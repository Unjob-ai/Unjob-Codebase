// api/gigs/getGigs/route.js - Add GET method
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getServerSession } from "next-auth";

// GET - Fetch gigs with filtering and pagination
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;

    // Filter parameters
    const status = searchParams.get("status") || "active";
    const category = searchParams.get("category");
    const subCategory = searchParams.get("subCategory");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sort = searchParams.get("sort") || "newest";
    const search = searchParams.get("search");

    // Build query
    let query = { status };

    if (category) {
      query.category = category;
    }

    if (subCategory) {
      query.subCategory = subCategory;
    }

    if (minPrice || maxPrice) {
      query.budget = {};
      if (minPrice) query.budget.$gte = parseInt(minPrice);
      if (maxPrice) query.budget.$lte = parseInt(maxPrice);
    }

    if (search) {
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

    console.log("Gig query:", query);
    console.log("Sort:", sortObject);

    // Fetch gigs
    const gigs = await Gig.find(query)
      .populate("company", "name image profile.companyName isVerified")
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalGigs = await Gig.countDocuments(query);

    // Add additional computed fields
    const enrichedGigs = gigs.map((gig) => ({
      ...gig,
      timeAgo: getTimeAgo(gig.createdAt),
      applicationsCount: gig.applications?.length || 0,
      isExpired: gig.EndDate ? new Date(gig.EndDate) < new Date() : false,
      daysLeft: gig.EndDate
        ? Math.max(
            0,
            Math.ceil(
              (new Date(gig.EndDate) - new Date()) / (1000 * 60 * 60 * 24)
            )
          )
        : null,
      companyName:
        gig.company?.profile?.companyName ||
        gig.company?.name ||
        "Unknown Company",
    }));

    console.log(`Found ${gigs.length} gigs out of ${totalGigs} total`);

    return NextResponse.json({
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
      filters: {
        status,
        category,
        subCategory,
        minPrice,
        maxPrice,
        sort,
        search,
      },
    });
  } catch (error) {
    console.error("Get gigs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch gigs", details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to calculate time ago
function getTimeAgo(date) {
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
}

// Keep your existing POST and PATCH methods below...

async function parseRequestData(req) {
  const contentType = req.headers.get("content-type");
  if (contentType?.includes("multipart/form-data")) {
    const formData = await req.formData();

    console.log("FormData received:");
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(
          `${key}: File - ${value.name} (${value.size} bytes, ${value.type})`
        );
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    return {
      data: {
        title: formData.get("title")?.trim(),
        category: formData.get("category"),
        subCategory: formData.get("subCategory"),
        projectOverview: formData.get("projectOverview")?.trim(),
        tags: formData.get("tags")
          ? JSON.parse(formData.get("tags"))
          : undefined,
        budget: formData.get("budget")
          ? Number(formData.get("budget"))
          : undefined,
        timeline: formData.get("timeline"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        skillsRequired: formData.get("skillsRequired")
          ? JSON.parse(formData.get("skillsRequired"))
          : undefined,
        deliverables: formData.get("deliverables")
          ? JSON.parse(formData.get("deliverables"))
          : undefined,
        assetDescription: formData.get("assetDescription")?.trim(),
        status: formData.get("status") || "active",
      },
      bannerImage: formData.get("bannerImage"),
      assetFiles: formData.getAll("assetFiles") || [],
    };
  } else {
    const jsonData = await req.json();
    return {
      data: jsonData,
      bannerImage: null,
      assetFiles: [],
    };
  }
}

async function uploadBannerImage(bannerImageFile) {
  if (!bannerImageFile || bannerImageFile.size === 0) {
    console.log("No banner image provided");
    return "";
  }

  console.log(
    "Uploading banner image:",
    bannerImageFile.name,
    bannerImageFile.size,
    bannerImageFile.type
  );

  if (bannerImageFile.size > 10 * 1024 * 1024) {
    throw new Error("Banner image too large (max 10MB)");
  }

  if (!bannerImageFile.type.startsWith("image/")) {
    throw new Error("Invalid file type. Please upload an image.");
  }

  try {
    const buffer = Buffer.from(await bannerImageFile.arrayBuffer());
    console.log("Buffer created, size:", buffer.length);

    const url = await uploadToCloudinary(buffer, "unjob/gigs/banners", "image");
    console.log("Banner image uploaded successfully:", url);
    return url;
  } catch (error) {
    console.error("Banner image upload failed:", error);
    throw error;
  }
}

async function uploadAssetFiles(assetFiles) {
  const assetUrls = [];
  for (const file of assetFiles) {
    if (file.size > 0) {
      console.log("Uploading asset file:", file.name, file.size, file.type);

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
        console.log("Asset file uploaded successfully:", assetUrl);
        assetUrls.push(assetUrl);
      } catch (error) {
        console.error("Asset file upload failed:", error);
        throw error;
      }
    }
  }
  return assetUrls;
}

// POST - Create new gig with subscription check
export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    if (!user || user.role !== "hiring") {
      return NextResponse.json(
        { error: "Only hiring users can create gigs" },
        { status: 403 }
      );
    }

    // ✅ CHECK SUBSCRIPTION BEFORE CREATING GIG
    const subscription = await Subscription.findOne({
      user: user._id,
      status: "active",
      endDate: { $gt: new Date() },
    });

    if (!subscription) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_REQUIRED",
          message: "You need an active subscription to post gigs",
          redirectTo: "/subscription",
        },
        { status: 402 }
      );
    }

    if (!subscription.canPostGig()) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_LIMIT_REACHED",
          message: `You have reached your monthly limit of ${subscription.maxGigs} gigs`,
          redirectTo: "/subscription",
        },
        { status: 402 }
      );
    }

    const { data, bannerImage, assetFiles } = await parseRequestData(req);

    if (!data.title || !data.category) {
      return NextResponse.json(
        { error: "Title and category are required" },
        { status: 400 }
      );
    }

    // Handle file uploads
    console.log("Starting file uploads...");
    const bannerImageUrl = await uploadBannerImage(bannerImage);
    const assetUrls = await uploadAssetFiles(assetFiles);
    console.log(
      "File uploads completed. Banner:",
      bannerImageUrl,
      "Assets:",
      assetUrls
    );

    const gigData = {
      title: data.title,
      category: data.category,
      subCategory: data.subCategory,
      tags: data.tags || [],
      description: data.projectOverview,
      projectOverview: data.projectOverview,
      company: user._id,
      status: data.status || "active",
      budget: data.budget,
      timeline: data.timeline,
      StartDate: data.startDate ? new Date(data.startDate) : undefined,
      EndDate: data.endDate ? new Date(data.endDate) : undefined,
      skillsRequired: data.skillsRequired || [],
      deliverables: data.deliverables || [],
      budgetType: "fixed",
      bannerImage: bannerImageUrl,
      uploadAssets: assetUrls,
      DerscribeAssets: data.assetDescription || "Project assets and references",
      featured: subscription.features?.featuredGigs || false, // Premium feature
    };

    console.log("Creating gig with data:", {
      ...gigData,
      bannerImage: bannerImageUrl ? "URL_PROVIDED" : "NO_URL",
    });

    const gig = new Gig(gigData);
    await gig.save();
    await gig.populate("company", "name image profile.companyName isVerified");

    // ✅ INCREMENT GIGS POSTED COUNT AFTER SUCCESSFUL CREATION
    await subscription.incrementGigsPosted();

    return NextResponse.json({ success: true, gig }, { status: 201 });
  } catch (error) {
    console.error("Gig creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create gig" },
      { status: 500 }
    );
  }
}

// PATCH - Update existing gig
export async function PATCH(req) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    if (!user || user.role !== "hiring") {
      return NextResponse.json(
        { error: "Only hiring users can create gigs" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const gigId = searchParams.get("id");

    if (!gigId) {
      return NextResponse.json({ error: "Gig ID required" }, { status: 400 });
    }

    const existingGig = await Gig.findById(gigId);
    if (
      !existingGig ||
      existingGig.company.toString() !== user._id.toString()
    ) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    const { data, bannerImage, assetFiles } = await parseRequestData(req);

    const updateData = {
      ...(data.title?.trim() && { title: data.title.trim() }),
      ...(data.category && { category: data.category }),
      ...(data.subCategory && { subCategory: data.subCategory }),
      ...(data.projectOverview?.trim() && {
        projectOverview: data.projectOverview.trim(),
        description: data.projectOverview.trim(),
      }),
      ...(data.tags && Array.isArray(data.tags) && { tags: data.tags }),
      ...(data.skillsRequired &&
        Array.isArray(data.skillsRequired) && {
          skillsRequired: data.skillsRequired,
        }),
      ...(data.deliverables &&
        Array.isArray(data.deliverables) && {
          deliverables: data.deliverables,
        }),
      ...(data.budget &&
        typeof data.budget === "number" && { budget: data.budget }),
      ...(data.timeline && { timeline: data.timeline }),
      ...(data.startDate && { StartDate: new Date(data.startDate) }),
      ...(data.endDate && { EndDate: new Date(data.endDate) }),
      ...(data.assetDescription?.trim() && {
        DerscribeAssets: data.assetDescription.trim(),
      }),
      ...(data.status && { status: data.status }),
    };

    // Handle banner image upload
    if (bannerImage) {
      const bannerImageUrl = await uploadBannerImage(bannerImage);
      updateData.bannerImage = bannerImageUrl;
    }

    // Handle asset files upload
    if (assetFiles.length > 0) {
      const newAssets = await uploadAssetFiles(assetFiles);
      updateData.uploadAssets = [
        ...(existingGig.uploadAssets || []),
        ...newAssets,
      ];
    }

    const updatedGig = await Gig.findByIdAndUpdate(gigId, updateData, {
      new: true,
    }).populate("company", "name image profile.companyName isVerified");

    return NextResponse.json(
      { success: true, gig: updatedGig },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gig update error:", error);
    return NextResponse.json(
      { error: "Failed to update gig" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    let user = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    if (userId) {
      user = await User.findById(userId);
    }

    if (!user && session.user.email) {
      user = await User.findOne({ email: session.user.email });
    }

    if (!user || user.role !== "hiring") {
      return NextResponse.json(
        { error: "Only hiring users can delete gigs" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const gigId = searchParams.get("id");

    if (!gigId) {
      return NextResponse.json({ error: "Gig ID required" }, { status: 400 });
    }

    const gig = await Gig.findById(gigId);

    if (!gig || gig.company.toString() !== user._id.toString()) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    await Gig.findByIdAndDelete(gigId);

    return NextResponse.json(
      { success: true, message: "Gig deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Gig delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete gig" },
      { status: 500 }
    );
  }
}
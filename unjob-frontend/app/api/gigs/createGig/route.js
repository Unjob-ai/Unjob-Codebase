// api/gigs/createGig/route.js - Fixed version with manual subscription validation
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function parseRequestData(req) {
  const contentType = req.headers.get("content-type");
  if (contentType?.includes("multipart/form-data")) {
    const formData = await req.formData();

    return {
      data: {
        title: formData.get("title")?.trim(),
        category: formData.get("category"),
        subCategory: formData.get("subCategory"),
        projectOverview: formData.get("projectOverview")?.trim(),
        tags: formData.get("tags") ? JSON.parse(formData.get("tags")) : [],
        budget: formData.get("budget") ? Number(formData.get("budget")) : 0,
        timeline: formData.get("timeline"),
        quantity: formData.get("quantity")
          ? Number(formData.get("quantity"))
          : 1,
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        deliverables: formData.get("deliverables")
          ? JSON.parse(formData.get("deliverables"))
          : [],
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

function processTimeline(timeline) {
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
}

function processTitle(title) {
  if (!title) return "I want ";

  const cleanTitle = title.trim();
  if (!cleanTitle.toLowerCase().startsWith("i want")) {
    return `I want ${cleanTitle}`;
  }

  return cleanTitle;
}

//Helper Function to detect Sensitive info -

function detectSensitiveInfo(text) {
  if (!text) return null;

  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\d{3}[-.\s]?){2,}\d{3,}/;
  const linkRegex = /(https?:\/\/[^\s]+|@[A-Za-z0-9_]+)/i; // social/links

  if (emailRegex.test(text)) return { type: "email" };
  if (phoneRegex.test(text)) return { type: "phone number" };
  if (linkRegex.test(text)) return { type: "link or handle" };

  return null;
}


async function uploadBannerImage(bannerImageFile, user) {
  if (!bannerImageFile || bannerImageFile.size === 0) {
    console.log("No banner image provided - will use profile image fallback");
    return user.image || null;
  }

  if (bannerImageFile.size > 10 * 1024 * 1024) {
    throw new Error("Banner image too large (max 10MB)");
  }

  if (!bannerImageFile.type.startsWith("image/")) {
    throw new Error("Invalid file type. Please upload an image.");
  }

  try {
    const buffer = Buffer.from(await bannerImageFile.arrayBuffer());
    const uploadResult = await uploadToCloudinary(
      buffer,
      "unjob/gigs/banners",
      "image"
    );
    return uploadResult;
  } catch (error) {
    console.error("Banner image upload failed:", error);
    throw new Error("Failed to upload banner image");
  }
}

async function uploadAssetFiles(assetFiles) {
  const assetUrls = [];
  for (const file of assetFiles) {
    if (file.size > 25 * 1024 * 1024) {
      throw new Error(
        `Asset file ${file.name} is too large. Maximum size is 25MB.`
      );
    }

    try {
      let folder = "unjob/gigs/assets/documents";
      let resourceType = "raw";

      if (file.type.startsWith("image/")) {
        folder = "unjob/gigs/assets/images";
        resourceType = "image";
      } else if (file.type.startsWith("video/")) {
        folder = "unjob/gigs/assets/videos";
        resourceType = "video";
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const assetUrl = await uploadToCloudinary(buffer, folder, resourceType);
      console.log("Asset file uploaded successfully:", assetUrl);
      assetUrls.push(assetUrl);
    } catch (error) {
      console.error("Asset file upload failed:", error);
      throw new Error(`Failed to upload asset file: ${file.name}`);
    }
  }
  return assetUrls;
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get user
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

    // Parse form data
    const { data, bannerImage, assetFiles } = await parseRequestData(req);
// 🚨 Validate that free-text fields don't contain sensitive info
const fieldsToCheck = {
  title: data.title,
  projectOverview: data.projectOverview,
  assetDescription: data.assetDescription,
  deliverables: (data.deliverables || []).join(" "),
};


for (const [fieldName, fieldValue] of Object.entries(fieldsToCheck)) {
  const issue = detectSensitiveInfo(fieldValue);
  if (issue) {
    return NextResponse.json(
      {
        error: "Oops, That Looks Personal , Let’s Keep It  (Contact Info Not Allowed) ",
        field: fieldName,
        message: `Your ${fieldName} contains a ${issue.type}. Please remove personal information like ${issue.type}s.`,
      },
      { status: 400 }
    );
  }
}


    // Validate required fields
    if (!data.title || !data.category) {
      return NextResponse.json(
        { error: "Title and category are required" },
        { status: 400 }
      );
    }

    // Check if this is the user's first gig
    const existingGigsCount = await Gig.countDocuments({ company: user._id });
    const isFirstGig = existingGigsCount === 0;

    console.log(
      `User ${user._id} creating gig. Existing gigs: ${existingGigsCount}, Is first gig: ${isFirstGig}`
    );

    // If not first gig, check subscription manually
    if (!isFirstGig) {
      const subscription = await Subscription.findOne({
        user: user._id,
        userRole: "hiring",
        status: "active",
      }).exec();

      console.log("Subscription check for gig creation:", {
        found: !!subscription,
        status: subscription?.status,
        planType: subscription?.planType,
        gigsPosted: subscription?.gigsPosted,
        maxGigs: subscription?.maxGigs,
      });

      if (!subscription) {
        return NextResponse.json(
          {
            error: "SUBSCRIPTION_REQUIRED",
            message: "You need an active subscription to post additional gigs",
            redirectTo: "/dashboard/settings/hiring?view=subscription",
            isFirstGig: false,
          },
          { status: 402 }
        );
      }

      // Manual subscription validation for hiring users
      const isActiveSubscription = subscription.status === "active";
      const isNotExpired =
        !subscription.endDate || subscription.endDate > new Date();
      const isLifetime = subscription.duration === "lifetime";

      const subscriptionValid =
        isActiveSubscription && (isNotExpired || isLifetime);

      if (!subscriptionValid) {
        return NextResponse.json(
          {
            error: "SUBSCRIPTION_EXPIRED",
            message: "Your subscription has expired",
            redirectTo: "/dashboard/settings/hiring?view=subscription",
            isFirstGig: false,
          },
          { status: 402 }
        );
      }

      // Manual gig limit check
      const maxGigs = subscription.maxGigs || 0;
      const gigsPosted = subscription.gigsPosted || 0;

      const canPostGig = maxGigs === -1 || gigsPosted < maxGigs;

      if (!canPostGig) {
        return NextResponse.json(
          {
            error: "SUBSCRIPTION_LIMIT_REACHED",
            message: `You have reached your monthly limit of ${maxGigs} gigs (${gigsPosted}/${maxGigs})`,
            redirectTo: "/dashboard/settings/hiring?view=subscription",
            isFirstGig: false,
          },
          { status: 402 }
        );
      }
    }

    // Process form data
    const processedTitle = processTitle(data.title);
    const timelineData = processTimeline(data.timeline);

    // Handle file uploads
    console.log("Starting file uploads...");
    const finalBannerImage = await uploadBannerImage(bannerImage, user);
    const assetUrls = await uploadAssetFiles(assetFiles);

    console.log(
      "File uploads completed. Banner:",
      finalBannerImage,
      "Assets:",
      assetUrls
    );

    // Create gig data
    const gigData = {
      title: processedTitle,
      category: data.category,
      subCategory: data.subCategory,
      tags: data.tags || [],
      description: data.projectOverview,
      projectOverview: data.projectOverview,
      company: user._id,
      status: data.status || "active",
      budget: data.budget,
      timeline: timelineData.display,
      timelineDays: timelineData.days,
      quantity: data.quantity || 1,
      StartDate: data.startDate ? new Date(data.startDate) : undefined,
      EndDate: data.endDate ? new Date(data.endDate) : undefined,
      deliverables: data.deliverables || [],
      budgetType: "fixed",
      bannerImage: finalBannerImage,
      uploadAssets: assetUrls,
      DerscribeAssets: data.assetDescription || "Project assets and references",
      featured: false,
      paymentStatus: "not_required",

      // Track if this is a free first gig
      metadata: {
        isFirstGig: isFirstGig,
        subscriptionRequired: !isFirstGig,
        createdWithSubscription: !isFirstGig,
      },

      // Banner source tracking
      bannerSource:
        bannerImage && bannerImage.size > 0
          ? "uploaded"
          : user.image
          ? "profile_fallback"
          : "none",
    };

    console.log("Creating gig with budget:", data.budget);
    console.log("Title processed:", processedTitle);
    console.log("Timeline processed:", timelineData);

    const gig = new Gig(gigData);
    await gig.save();
    await gig.populate(
      "company",
      "name image profile.companyName isVerified username"
    );

    // Update subscription usage only if not first gig
    if (!isFirstGig) {
      try {
        // Manual update instead of method call
        const subscription = await Subscription.findByIdAndUpdate(
          { user: user._id, userRole: "hiring", status: "active" },
          { $inc: { gigsPosted: 1 } },
          { new: true }
        );

        console.log("Subscription usage updated manually:", {
          gigsPosted: subscription?.gigsPosted,
          maxGigs: subscription?.maxGigs,
        });
      } catch (subscriptionError) {
        console.error(
          "Failed to update subscription usage:",
          subscriptionError
        );
      }
    } else {
      // Mark user as having posted their first gig
      user.hasPostedFirstGig = true;
      await user.save();
      console.log("User marked as having posted first gig");
    }

    // Prepare response data
    const responseData = {
      success: true,
      gigId: gig._id,
      message: isFirstGig
        ? "First gig created successfully - no subscription required!"
        : "Gig created and activated successfully!",
      isFirstGig: isFirstGig,
      gigDetails: {
        _id: gig._id,
        title: gig.title,
        category: gig.category,
        displayBudget: gig.displayBudget,
        timeline: gig.timeline,
        timelineDays: gig.timelineDays,
        quantity: gig.quantity,
        status: gig.status,
        featured: gig.featured,
        paymentStatus: gig.paymentStatus,
        bannerImage: finalBannerImage,
        bannerSource: gigData.bannerSource,
      },
      bannerInfo: {
        source: gigData.bannerSource,
        message:
          bannerImage && bannerImage.size > 0
            ? "Custom banner image uploaded"
            : user.image
            ? "Using profile image as banner (will auto-update when profile image changes)"
            : "No banner image set",
        autoUpdateEnabled: !bannerImage && user.image ? true : false,
      },
      subscriptionInfo: !isFirstGig
        ? {
            planType: "active",
            message: "Subscription verified and usage updated",
          }
        : {
            planType: "first_gig_free",
            message:
              "First gig posted for free! Subscription required for additional gigs.",
          },
      nextSteps: {
        action: "manage_applications",
        message: "Your gig is now live! You can start receiving applications.",
        subscriptionReminder: isFirstGig
          ? "Remember: You'll need a subscription to post additional gigs."
          : null,
      },
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Gig creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create gig" },
      { status: 500 }
    );
  }
}

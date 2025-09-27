
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const category = searchParams.get("category");
    const subCategory = searchParams.get("subCategory");
    const minBudget = searchParams.get("minBudget");
    const maxBudget = searchParams.get("maxBudget");
    const skills = searchParams.get("skills");
    const featured = searchParams.get("featured") === "true";
    const sortBy = searchParams.get("sortBy") || "createdAt"; // createdAt, budget, views
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;

    let searchFilter = { status: "active" };

    // Text search
    if (query) {
      searchFilter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { projectOverview: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } }
      ];
    }

    // Category filter
    if (category) {
      searchFilter.category = category;
    }

    // Sub-category filter
    if (subCategory) {
      searchFilter.subCategory = subCategory;
    }

    // Budget filter
    if (minBudget || maxBudget) {
      searchFilter.budget = {};
      if (minBudget) searchFilter.budget.$gte = parseInt(minBudget);
      if (maxBudget) searchFilter.budget.$lte = parseInt(maxBudget);
    }

    // Skills filter
    if (skills) {
      const skillsArray = skills.split(",").map(s => s.trim());
      searchFilter.skillsRequired = { $in: skillsArray };
    }

    // Featured filter
    if (featured) {
      searchFilter.featured = true;
    }

    // Sort options
    let sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const gigs = await Gig.find(searchFilter)
      .populate("company", "name image profile.companyName isVerified")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalGigs = await Gig.countDocuments(searchFilter);

    // Add computed fields
    const gigsWithExtras = gigs.map(gig => ({
      ...gig.toObject(),
      applicationsCount: gig.applications?.length || 0,
      timeAgo: getTimeAgo(gig.createdAt),
      companyName: gig.company?.profile?.companyName || gig.company?.name || "Unknown Company",
      isExpired: gig.EndDate ? new Date(gig.EndDate) < new Date() : false,
      daysLeft: gig.EndDate ? Math.max(0, Math.ceil((new Date(gig.EndDate) - new Date()) / (1000 * 60 * 60 * 24))) : null
    }));

    return NextResponse.json({
      success: true,
      gigs: gigsWithExtras,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalGigs / limit),
        totalGigs,
        hasNext: page < Math.ceil(totalGigs / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Gig search error:", error);
    return NextResponse.json({ error: "Failed to search gigs" }, { status: 500 });
  }
}

function getTimeAgo(date) {
  const now = new Date();
  const diffInMs = now - new Date(date);
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInMonths > 0) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  } else if (diffInWeeks > 0) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}


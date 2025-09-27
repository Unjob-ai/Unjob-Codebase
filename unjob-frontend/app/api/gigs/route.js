import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";

export const dynamic = "force-dynamic";

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
    const company = searchParams.get("company");

    // console.log("Received query params:", {
    //   status,
    //   category,
    //   subCategory,
    //   minPrice,
    //   maxPrice,
    //   sort,
    //   search,
    //   company,
    //   page,
    //   limit,
    // });


  

// Build query
let query = {};

//  status & company
if (company) {
  query.company = company;
  if (status && status !== "all") {
    query.status = status;
  }
} else if (status && status !== "all") {
  query.status = status;
}

//  category & subCategory
if (category) {
  query.category = category;
}
if (subCategory) {
  query.subCategory = subCategory;
}

//  price range
if (minPrice || maxPrice) {
  query.budget = {};
  if (minPrice) query.budget.$gte = parseInt(minPrice);
  if (maxPrice) query.budget.$lte = parseInt(maxPrice);
}

// search
if (search && search.trim() !== "") {
  query.$or = [
    { title: { $regex: search, $options: "i" } },
    { description: { $regex: search, $options: "i" } },
    { tags: { $in: [new RegExp(search, "i")] } },
  ];
}


    // console.log("Query after search and price filters:", query);

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

    const gigs = await Gig.find(query)
      .populate("company", "name image profile.companyName isVerified")
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalGigs = await Gig.countDocuments(query);

    // MODIFIED: Simplified the enriched gigs object
    const enrichedGigs = gigs.map((gig) => ({
      ...gig,
      postedAgo: getTimeAgo(gig.createdAt), // Renamed for clarity
      applicationsCount: gig.applications?.length || 0,
      // REMOVED: isExpired and daysLeft logic as EndDate is no longer used
      companyName:
        gig.company?.profile?.companyName ||
        gig.company?.name ||
        "Unknown Company",
    }));
      // console.log("Gigs fetched successfully:", { totalGigs, page, limit });

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
    });
  } catch (error) {
    // Corrected syntax for the catch block
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

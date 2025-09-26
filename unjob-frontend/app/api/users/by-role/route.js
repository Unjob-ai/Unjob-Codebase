// File: app/api/users/by-role/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request) {
  try {
    // Connect to database
    await connectDB();
    console.log("💾 Database connected.");

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role"); // Optional: filter by specific role ('freelancer' or 'hiring')
    const limit = parseInt(searchParams.get("limit")) || 50; // Default limit of 50
    const page = parseInt(searchParams.get("page")) || 1; // Default page 1
    const search = searchParams.get("search") || ""; // Optional search term

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Base query to exclude admins and only get active users
    let baseQuery = {
      role: { $in: ["freelancer", "hiring"] },
      isActive: true,
    };

    // If specific role is requested, filter by that role
    if (role && ["freelancer", "hiring"].includes(role)) {
      baseQuery.role = role;
    }

    // Add search functionality if search term provided
    if (search) {
      baseQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "profile.companyName": { $regex: search, $options: "i" } },
        { "profile.skills": { $regex: search, $options: "i" } },
      ];
    }

    // Fields to select (exclude sensitive information)
    const selectFields = {
      name: 1,
      email: 1,
      role: 1,
      image: 1,
      coverImage: 1,
      "profile.bio": 1,
      "profile.companyName": 1,
      "profile.companySize": 1,
      "profile.industry": 1,
      "profile.skills": 1,
      "profile.structuredSkills": 1,
      "profile.hourlyRate": 1,
      "profile.location": 1,
      "profile.availability": 1,
      "profile.experience": 1,
      "stats.rating": 1,
      "stats.completedProjects": 1,
      "stats.totalReviews": 1,
      "stats.followers": 1,
      "stats.following": 1,
      isVerified: 1,
      createdAt: 1,
      lastLogin: 1,
    };

    // If we want both roles separately
    if (!role) {
      // Get freelancers and hiring managers separately, both in alphabetical order
      const [freelancers, hiringManagers, totalFreelancers, totalHiring] =
        await Promise.all([
          User.find({ ...baseQuery, role: "freelancer" })
            .select(selectFields)
            .sort({ name: 1 }) // Alphabetical order
            .skip(skip)
            .limit(limit)
            .lean(),

          User.find({ ...baseQuery, role: "hiring" })
            .select(selectFields)
            .sort({ name: 1 }) // Alphabetical order
            .skip(skip)
            .limit(limit)
            .lean(),

          User.countDocuments({ ...baseQuery, role: "freelancer" }),
          User.countDocuments({ ...baseQuery, role: "hiring" }),
        ]);

      console.log(
        `✅ Found ${freelancers.length} freelancers and ${hiringManagers.length} hiring managers`
      );

      return NextResponse.json(
        {
          success: true,
          data: {
            freelancers: {
              users: freelancers,
              total: totalFreelancers,
              page,
              limit,
              totalPages: Math.ceil(totalFreelancers / limit),
            },
            hiring: {
              users: hiringManagers,
              total: totalHiring,
              page,
              limit,
              totalPages: Math.ceil(totalHiring / limit),
            },
          },
          message: "Users fetched successfully",
        },
        { status: 200 }
      );
    } else {
      // Get users for specific role only
      const [users, total] = await Promise.all([
        User.find(baseQuery)
          .select(selectFields)
          .sort({ name: 1 }) // Alphabetical order
          .skip(skip)
          .limit(limit)
          .lean(),

        User.countDocuments(baseQuery),
      ]);

      console.log(`✅ Found ${users.length} ${role}s`);

      return NextResponse.json(
        {
          success: true,
          data: {
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            role,
          },
          message: `${
            role.charAt(0).toUpperCase() + role.slice(1)
          }s fetched successfully`,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("🔥 Error fetching users by role:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Failed to fetch users",
      },
      { status: 500 }
    );
  }
}

// Optional: Add POST method for advanced filtering
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      role,
      skills = [],
      location,
      minRating = 0,
      maxHourlyRate,
      minHourlyRate,
      companySize,
      industry,
      availability,
      limit = 50,
      page = 1,
    } = body;

    const skip = (page - 1) * limit;

    // Build dynamic query
    let query = {
      role: { $in: ["freelancer", "hiring"] },
      isActive: true,
    };

    if (role && ["freelancer", "hiring"].includes(role)) {
      query.role = role;
    }

    // Add skill-based filtering
    if (skills.length > 0) {
      query.$or = [
        { "profile.skills": { $in: skills } },
        { "profile.structuredSkills.subcategory": { $in: skills } },
      ];
    }

    // Add location filtering
    if (location) {
      query["profile.location"] = { $regex: location, $options: "i" };
    }

    // Add rating filtering
    if (minRating > 0) {
      query["stats.rating"] = { $gte: minRating };
    }

    // Freelancer-specific filters
    if (role === "freelancer") {
      if (minHourlyRate) {
        query["profile.hourlyRate"] = {
          ...query["profile.hourlyRate"],
          $gte: minHourlyRate,
        };
      }
      if (maxHourlyRate) {
        query["profile.hourlyRate"] = {
          ...query["profile.hourlyRate"],
          $lte: maxHourlyRate,
        };
      }
      if (availability) {
        query["profile.availability"] = availability;
      }
    }

    // Hiring manager-specific filters
    if (role === "hiring") {
      if (companySize) {
        query["profile.companySize"] = companySize;
      }
      if (industry) {
        query["profile.industry"] = { $regex: industry, $options: "i" };
      }
    }

    const selectFields = {
      name: 1,
      email: 1,
      role: 1,
      image: 1,
      coverImage: 1,
      "profile.bio": 1,
      "profile.companyName": 1,
      "profile.companySize": 1,
      "profile.industry": 1,
      "profile.skills": 1,
      "profile.structuredSkills": 1,
      "profile.hourlyRate": 1,
      "profile.location": 1,
      "profile.availability": 1,
      "profile.experience": 1,
      "stats.rating": 1,
      "stats.completedProjects": 1,
      "stats.totalReviews": 1,
      isVerified: 1,
      createdAt: 1,
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .select(selectFields)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          users,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          filters: body,
        },
        message: "Filtered users fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("🔥 Error in advanced user filtering:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Failed to filter users",
      },
      { status: 500 }
    );
  }
}

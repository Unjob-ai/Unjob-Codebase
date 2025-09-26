import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    console.log("Admin posts API called");
    
    // Check for admin authentication cookie
    const adminCookie = req.cookies.get("admin_auth")?.value;
    console.log("Admin cookie value:", adminCookie);
    
    if (adminCookie !== "true") {
      console.log("Admin authentication failed, cookie value:", adminCookie);
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }
    
    console.log("Admin authentication successful");

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status');
    const reported = searchParams.get('reported') === 'true';
    const search = searchParams.get('search');
    const author = searchParams.get('author');

    // Build filter object
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (reported) {
      filter.reported = { $exists: true, $ne: [] };
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (author && author !== 'all') {
      filter.author = author;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const totalPosts = await Post.countDocuments(filter);
    const totalPages = Math.ceil(totalPosts / limit);

    // Fetch posts with pagination and populate author info
    const posts = await Post.find(filter)
      .populate('author', 'name email image role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get unique authors for filter dropdown
    const authors = await User.distinct('_id', { role: { $in: ['freelancer', 'client'] } });

    return NextResponse.json({
      success: true,
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      filters: {
        status: status || 'all',
        reported,
        search: search || '',
        author: author || 'all'
      },
      authors
    });

  } catch (error) {
    console.error("Admin posts fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch posts",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    // Check for admin authentication cookie
    const adminCookie = req.cookies.get("admin_auth")?.value;
    
    if (adminCookie !== "true") {
      return NextResponse.json(
        { error: "Admin authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { action, postIds, status, reason } = await req.json();

    if (!action || !postIds || !Array.isArray(postIds)) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    let updateData = {};
    let message = "";

    switch (action) {
      case 'approve':
        updateData = { 
          status: 'published',
          $unset: { reported: 1 }
        };
        message = "Posts approved successfully";
        break;
      
      case 'reject':
        updateData = { 
          status: 'archived',
          $unset: { reported: 1 }
        };
        message = "Posts rejected successfully";
        break;
      
      case 'delete':
        await Post.deleteMany({ _id: { $in: postIds } });
        return NextResponse.json({
          success: true,
          message: "Posts deleted successfully"
        });
      
      case 'updateStatus':
        if (!status) {
          return NextResponse.json(
            { error: "Status is required" },
            { status: 400 }
          );
        }
        updateData = { status };
        message = `Posts status updated to ${status}`;
        break;
      
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    const result = await Post.updateMany(
      { _id: { $in: postIds } },
      updateData
    );

    return NextResponse.json({
      success: true,
      message,
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Admin posts action error:", error);
    return NextResponse.json(
      {
        error: "Failed to perform action",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

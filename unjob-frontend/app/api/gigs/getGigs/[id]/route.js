import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Gig from "@/models/Gig";
import User from "@/models/User";
import { getServerSession } from "next-auth"; // ✅ Add this!
import { authOptions } from "@/lib/auth";

export async function GET(req, { params }) {
    try {
            const session = await getServerSession()
        if (!session || !session.user) {
          return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }
        await connectDB();

        // const user = { _id: "6883b999f25d84ce0da05fa1", role: "hiring" };
            let user = null
        const userId = session.user.userId || session.user.id || session.user._id || session.user.sub
        if (userId) {
          user = await User.findById(userId)
        }
        if (!user && session.user.email) {
          user = await User.findOne({ email: session.user.email })
        }
        if (!user || user.role !== "hiring") {
          return NextResponse.json({ error: "Only hiring users can create gigs" }, { status: 403 })
        }

        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: "Gig ID is required" }, { status: 400 });
        }

        const gig = await Gig.findById(id)
            .populate("company", "name image profile.companyName isVerified profile.bio profile.location profile.website")
            .populate("applications.freelancer", "name image profile.skills profile.hourlyRate profile.location");

        if (!gig) {
            return NextResponse.json({ error: "Gig not found" }, { status: 404 });
        }

        // Increment view count
        await Gig.findByIdAndUpdate(id, { $inc: { views: 1 } });

        // Add extra fields for frontend
        const gigWithExtras = {
            ...gig.toObject(),
            applicationsCount: gig.applications?.length || 0,
            timeAgo: getTimeAgo(gig.createdAt),
            companyName: gig.company?.profile?.companyName || gig.company?.name || "Unknown Company",
            companyBio: gig.company?.profile?.bio || "",
            companyLocation: gig.company?.profile?.location || "",
            companyWebsite: gig.company?.profile?.website || "",
            isExpired: gig.EndDate ? new Date(gig.EndDate) < new Date() : false,
            daysLeft: gig.EndDate ? Math.max(0, Math.ceil((new Date(gig.EndDate) - new Date()) / (1000 * 60 * 60 * 24))) : null
        };

        return NextResponse.json({
            success: true,
            gig: gigWithExtras
        });

    } catch (error) {
        console.error("Get gig by ID error:", error);
        
        // Handle invalid ObjectId
        if (error.name === 'CastError') {
            return NextResponse.json({ error: "Invalid gig ID format" }, { status: 400 });
        }
        
        return NextResponse.json({ error: "Failed to fetch gig" }, { status: 500 });
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
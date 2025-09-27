import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";

const VALID_CATEGORIES = {
  "Design & Creative": [
    "Logo Design",
    "Brand Identity",
    "Brochure/Flyer Design",
    "Business Cards",
    "Social Media Graphics",
    "Poster/Banner Design",
    "Web UI Design",
    "Mobile App Design",
    "Dashboard Design",
    "Design Systems",
    "Wireframing",
    "Prototyping (Figma/Adobe XD)",
    "Explainer Videos",
    "Kinetic Typography",
    "Logo Animation",
    "Reels & Shorts Animation",
    "3D Product Visualization",
    "Game Assets",
    "NFT Art",
    "Character Modeling",
    "Character Illustration",
    "Comic Art",
    "Children's Book Illustration",
    "Vector Art",
    "Acrylic Painting",
    "Watercolor Painting",
    "Oil Painting",
    "Canvas Art",
    "Pencil Sketches",
    "Charcoal Drawing",
    "Ink Illustration",
    "Line Art",
    "Hand-drawn Portraits",
    "Realistic Portraits",
    "Caricature Art",
    "Couple & Family Portraits",
    "Modern Calligraphy",
    "Custom Lettering",
    "Name Art",
    "Collage Art",
    "Texture Art",
    "Traditional + Digital Fusion",
    "Interior Wall Paintings",
    "Outdoor Murals",
    "Street Art Concepts",
  ],
  "Video & Animation": [
    "Reels & Shorts Editing",
    "YouTube Video Editing",
    "Wedding & Event Videos",
    "Cinematic Cuts",
    "2D Animation",
    "3D Animation",
    "Whiteboard Animation",
    "Explainer Videos",
    "Green Screen Editing",
    "Color Grading",
    "Rotoscoping",
  ],
  "Writing & Translation": [
    "Website Copy",
    "Landing Pages",
    "Ad Copy",
    "Sales Copy",
    "YouTube Scripts",
    "Instagram Reels",
    "Podcast Scripts",
    "Blog Posts",
    "Technical Writing",
    "Product Descriptions",
    "Ghostwriting",
    "Keyword Research",
    "On-page Optimization",
    "Meta Descriptions",
    "Document Translation",
    "Subtitling",
    "Voiceover Scripts",
  ],
  "Digital Marketing": [
    "Meta Ads",
    "Google Ads",
    "TikTok Ads",
    "Funnel Building",
    "Mailchimp/Klaviyo/HubSpot Campaigns",
    "Automated Sequences",
    "Cold Email Writing",
    "Content Calendars",
    "Community Engagement",
    "Brand Strategy",
    "Technical SEO",
    "Link Building",
    "Site Audits",
    "Influencer research",
    "UGC Scripts & Briefs",
  ],
  "Tech & Development": [
    "Full Stack Development",
    "Frontend (React, Next.js)",
    "Backend (Node.js, Django)",
    "WordPress/Shopify",
    "iOS/Android (Flutter, React Native)",
    "Progressive Web Apps (PWA)",
    "API Integration",
    "Webflow",
    "Bubble",
    "Softr",
    "Manual Testing",
    "Automation Testing",
    "Test Plan Creation",
    "AWS / GCP / Azure Setup",
    "CI/CD Pipelines",
    "Server Management",
  ],
  "AI & Automation": [
    "AI Blog Generation",
    "AI Voiceover & Dubbing",
    "AI Video Scripts",
    "Talking Head Videos",
    "Explainer Avatars",
    "Virtual Influencers",
    "ChatGPT/Claude Prompt Design",
    "Midjourney/DALLE Prompts",
    "Custom GPTs / API Workflows",
    "Vapi / AutoGPT Setup",
    "Zapier / Make Integrations",
    "Custom AI Workflows",
    "Assistant Building",
    "GPT App Development",
    "OpenAI API Integration",
    "AI-generated Product Renders",
    "Lifestyle Product Mockups",
    "Model-less Product Photography",
    "360° Product Spins (AI-generated)",
    "AI Backdrop Replacement",
    "Packaging Mockups (AI-enhanced)",
    "Virtual Try-On Assets",
    "Catalog Creation with AI Models",
    "Product UGC Simulation (AI Actors)",
  ],
  "Business & Legal": [
    "Invoicing & Reconciliation",
    "Monthly Financial Statements",
    "Tally / QuickBooks / Zoho Books",
    "Business Plans",
    "Startup Financial Decks",
    "Investor-Ready Models",
    "GST Filing (India)",
    "US/UK Tax Filing",
    "Company Registration Help",
    "NDA / Founder Agreements",
    "Employment Contracts",
    "SaaS Terms & Privacy Policies",
    "IP & Trademark Filing",
    "GST Registration",
    "Pitch Deck Design",
  ],
  Portfolio: ["Project"],
};

function validateCategorySubcategory(category, subCategory) {
  if (!category || !subCategory) return false;
  const validSubcategories = VALID_CATEGORIES[category];
  if (!validSubcategories) return false;
  return validSubcategories.includes(subCategory);
}

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const category = searchParams.get("category");
    const subCategory = searchParams.get("subCategory");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;

    let query = { 
      postType: "post",
      status: "published" // Only show published posts on profiles
    };

    if (userId) query.author = userId;
    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name image role profile")
      .populate("comments.user", "name image")
      .populate("likes.user", "name image")
      .lean();

    const totalPosts = await Post.countDocuments(query);

    return NextResponse.json(
      {
        posts,
        pagination: {
          total: totalPosts,
          page,
          limit,
          totalPages: Math.ceil(totalPosts / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Posts fetch error:", error);
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
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const postData = await req.json();

    postData.author = user._id;

    if (
      !postData.title ||
      !postData.description ||
      !postData.category ||
      !postData.subCategory
    ) {
      return NextResponse.json(
        { error: "Title, description, category, and subCategory are required" },
        { status: 400 }
      );
    }

    if (!validateCategorySubcategory(postData.category, postData.subCategory)) {
      return NextResponse.json(
        { error: "Invalid category and subcategory combination" },
        { status: 400 }
      );
    }

    const newPost = new Post(postData);
    await newPost.save();

    const populatedPost = await Post.findById(newPost._id)
      .populate("author", "name image role profile")
      .lean();

    await User.findByIdAndUpdate(user._id, { $inc: { "stats.postsCount": 1 } });

    return NextResponse.json({ post: populatedPost }, { status: 201 });
  } catch (error) {
    console.error("Post creation error:", error);
    if (error.name === "ValidationError") {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: Object.values(error.errors).map((e) => e.message),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create post", details: error.message },
      { status: 500 }
    );
  }
}

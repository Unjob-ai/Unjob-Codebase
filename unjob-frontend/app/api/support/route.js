import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
import { uploadToCloudinary } from "@/lib/cloudinary";

// Helper function to send notifications
async function sendSupportNotification(ticket) {
  // Implement email notification logic here (optional)
  console.log("New support ticket created:", ticket._id);
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    await connectDB();

    // Parse form data for file uploads
    const formData = await req.formData();

    const ticketData = {
      name: formData.get("name")?.trim(),
      email: formData.get("email")?.trim(),
      contactNumber: formData.get("contactNumber")?.trim(),
      issueType: formData.get("issueType"),
      priority: formData.get("priority") || "medium",
      subject: formData.get("subject")?.trim(),
      description: formData.get("description")?.trim(),
      customFields: formData.get("customFields")
        ? JSON.parse(formData.get("customFields"))
        : {},
    };

    // Validate required fields
    if (
      !ticketData.name ||
      !ticketData.email ||
      !ticketData.subject ||
      !ticketData.description
    ) {
      return NextResponse.json(
        { error: "Name, email, subject, and description are required" },
        { status: 400 }
      );
    }

    // Handle file uploads properly as array of objects
    const attachments = [];
    const files = formData.getAll("attachments");
    for (const file of files) {
      if (file && file.size > 0) {
        console.log("Uploading support attachment:", file.name, file.size);

        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json(
            { error: `File ${file.name} is too large. Maximum size is 10MB.` },
            { status: 400 }
          );
        }

        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const url = await uploadToCloudinary(
            buffer,
            "unjob/support",
            file.type.startsWith("image/") ? "image" : "raw"
          );

          attachments.push({
            filename: String(file.name),
            url: String(url),
            size: Number(file.size),
            type: String(file.type),
          });

          console.log("Cloudinary upload success:", url);
        } catch (uploadError) {
          console.error("File upload failed:", uploadError);
          return NextResponse.json(
            { error: `Failed to upload ${file.name}` },
            { status: 500 }
          );
        }
      }
    }

    // Create support ticket with attachments as array of objects
    const supportTicket = await SupportTicket.create({
      ...ticketData,
      userId: session?.user?.id || null,
      attachments,
      status: "open",
      createdAt: new Date(),
    });

    // Send notification email to support team (optional)
    try {
      await sendSupportNotification(supportTicket);
    } catch (emailError) {
      console.error("Failed to send support notification:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        success: true,
        ticketId: supportTicket._id,
        message: "Support ticket created successfully",
        ticket: {
          id: supportTicket._id,
          subject: supportTicket.subject,
          status: supportTicket.status,
          createdAt: supportTicket.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Support ticket creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create support ticket",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const status = searchParams.get("status");

    const filter = { userId: session.user.id };
    if (status) filter.status = status;

    const tickets = await SupportTicket.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalCount = await SupportTicket.countDocuments(filter);

    return NextResponse.json({
      success: true,
      tickets,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Support tickets fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

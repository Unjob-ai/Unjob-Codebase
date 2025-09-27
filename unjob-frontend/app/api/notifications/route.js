// /api/notifications/route.js - Complete notifications API
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";

// GET - Fetch notifications for the current user
export async function GET(req) {
  console.log("🔔 Notifications GET API called");

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    console.log("❌ No session found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit")) || 50;
    const page = parseInt(searchParams.get("page")) || 1;
    const skip = (page - 1) * limit;

    console.log("📋 Query params:", { unreadOnly, limit, page });

    // Find the current user
    let currentUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
    }

    if (!currentUser) {
      console.log("❌ User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ Current user found:", currentUser._id);

    // Build query
    const query = { user: currentUser._id };
    if (unreadOnly) {
      query.read = false;
    }

    // Fetch notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get summary statistics
    const totalCount = await Notification.countDocuments({
      user: currentUser._id,
    });
    const unreadCount = await Notification.countDocuments({
      user: currentUser._id,
      read: false,
    });

    console.log("📊 Summary:", {
      totalCount,
      unreadCount,
      fetched: notifications.length,
    });

    const summary = {
      total: totalCount,
      unread: unreadCount,
      read: totalCount - unreadCount,
    };

    return NextResponse.json({
      success: true,
      notifications,
      summary,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + notifications.length < totalCount,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH - Mark notifications as read
export async function PATCH(req) {
  console.log("🔔 Notifications PATCH API called");

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    console.log("❌ No session found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const requestBody = await req.json();
    console.log("📝 Request body:", requestBody);

    const { notificationId, markAllRead } = requestBody;

    // Find the current user
    let currentUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
    }

    if (!currentUser) {
      console.log("❌ User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ Current user found:", currentUser._id);

    if (markAllRead) {
      // Mark all notifications as read for this user
      console.log("📝 Marking all notifications as read");

      const result = await Notification.updateMany(
        { user: currentUser._id, read: false },
        { read: true }
      );

      console.log("✅ Updated notifications:", result.modifiedCount);

      return NextResponse.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`,
        updatedCount: result.modifiedCount,
      });
    } else if (notificationId) {
      // Mark specific notification as read
      console.log("📝 Marking specific notification as read:", notificationId);

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: currentUser._id },
        { read: true },
        { new: true }
      );

      if (!notification) {
        console.log("❌ Notification not found:", notificationId);
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      console.log("✅ Notification marked as read");

      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
        notification,
      });
    } else {
      return NextResponse.json(
        { error: "Either notificationId or markAllRead must be provided" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("❌ Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

// POST - Create a new notification (for system use or admin)
export async function POST(req) {
  console.log("🔔 Notifications POST API called");

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    console.log("❌ No session found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const requestBody = await req.json();
    console.log("📝 Request body:", requestBody);

    const {
      userId,
      type,
      title,
      message,
      relatedId,
      relatedModel,
      actionUrl,
      metadata,
      priority,
      avatar,
      senderName,
    } = requestBody;

    // Validation
    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "userId, type, title, and message are required" },
        { status: 400 }
      );
    }

    // Verify the target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Create the notification
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      relatedId,
      relatedModel,
      actionUrl,
      metadata,
      priority: priority || "medium",
      avatar,
      senderName,
    });

    await notification.save();
    console.log("✅ Notification created:", notification._id);

    return NextResponse.json(
      {
        success: true,
        message: "Notification created successfully",
        notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error creating notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

// DELETE - Delete notifications
export async function DELETE(req) {
  console.log("🔔 Notifications DELETE API called");

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    console.log("❌ No session found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  try {
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get("notificationId");
    const deleteAll = searchParams.get("deleteAll") === "true";
    const deleteRead = searchParams.get("deleteRead") === "true";

    // Find the current user
    let currentUser = null;
    const userId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    if (userId) {
      currentUser = await User.findById(userId);
    }

    if (!currentUser && session.user.email) {
      currentUser = await User.findOne({ email: session.user.email });
    }

    if (!currentUser) {
      console.log("❌ User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ Current user found:", currentUser._id);

    if (deleteAll) {
      // Delete all notifications for this user
      console.log("🗑️ Deleting all notifications");

      const result = await Notification.deleteMany({ user: currentUser._id });

      console.log("✅ Deleted notifications:", result.deletedCount);

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} notifications`,
        deletedCount: result.deletedCount,
      });
    } else if (deleteRead) {
      // Delete only read notifications
      console.log("🗑️ Deleting read notifications");

      const result = await Notification.deleteMany({
        user: currentUser._id,
        read: true,
      });

      console.log("✅ Deleted read notifications:", result.deletedCount);

      return NextResponse.json({
        success: true,
        message: `Deleted ${result.deletedCount} read notifications`,
        deletedCount: result.deletedCount,
      });
    } else if (notificationId) {
      // Delete specific notification
      console.log("🗑️ Deleting specific notification:", notificationId);

      const result = await Notification.deleteOne({
        _id: notificationId,
        user: currentUser._id,
      });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      console.log("✅ Notification deleted");

      return NextResponse.json({
        success: true,
        message: "Notification deleted successfully",
      });
    } else {
      return NextResponse.json(
        {
          error:
            "Either notificationId, deleteAll, or deleteRead parameter is required",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("❌ Error deleting notifications:", error);
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 }
    );
  }
}

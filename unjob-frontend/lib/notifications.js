// lib/notifications.js - Notification helper functions
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";

/**
 * Create a notification for new gig
 */
export async function createNewGigNotification(gigData, hirerId) {
  try {
    await connectDB();

    // Get all freelancers who might be interested
    // You can filter by categories, skills, location, etc.
    const freelancers = await User.find({
      role: "freelancer",
      _id: { $ne: hirerId }, // Exclude the gig creator
      // Add more filters based on gig category, skills, etc.
    }).select("_id");

    const notifications = freelancers.map((freelancer) => ({
      user: freelancer._id,
      type: "gig_application",
      title: "New Gig Available",
      message: `New gig "${gigData.title}" posted in ${gigData.category}. Budget: ₹${gigData.budget}`,
      relatedId: gigData._id,
      actionUrl: `/gigs/${gigData._id}`,
    }));

    // Bulk insert notifications
    await Notification.insertMany(notifications);

   
    return notifications.length;
  } catch (error) {
    console.error("Create gig notification error:", error);
    throw error;
  }
}

/**
 * Create notification for post comment
 */
export async function createPostCommentNotification(
  postData,
  commentData,
  commenterId
) {
  try {
    await connectDB();

    const postAuthorId = postData.author._id || postData.author;

    // Don't notify if commenting on own post
    if (postAuthorId.toString() === commenterId.toString()) {
      return;
    }

    const commenter = await User.findById(commenterId).select("name");

    const notification = new Notification({
      user: postAuthorId,
      type: "message", // Using message type for comments
      title: "New Comment on Your Post",
      message: `${
        commenter?.name || "Someone"
      } commented on your post: "${commentData.content.substring(0, 50)}${
        commentData.content.length > 50 ? "..." : ""
      }"`,
      relatedId: postData._id,
      actionUrl: `/dashboard/posts/${postData._id}`,
    });

    await notification.save();
   
    return notification;
  } catch (error) {
    console.error("Create comment notification error:", error);
    throw error;
  }
}

/**
 * Create notification for post like
 */
export async function createPostLikeNotification(postData, likerId) {
  try {
    await connectDB();

    const postAuthorId = postData.author._id || postData.author;

    // Don't notify if liking own post
    if (postAuthorId.toString() === likerId.toString()) {
      return;
    }

    const liker = await User.findById(likerId).select("name");

    const notification = new Notification({
      user: postAuthorId,
      type: "message",
      title: "Someone Liked Your Post",
      message: `${liker?.name || "Someone"} liked your post`,
      relatedId: postData._id,
      actionUrl: `/dashboard/posts/${postData._id}`,
    });

    await notification.save();
   
    return notification;
  } catch (error) {
    console.error("Create like notification error:", error);
    throw error;
  }
}

/**
 * Create notification for gig application
 */
export async function createGigApplicationNotification(
  gigData,
  applicationData,
  freelancerId
) {
  try {
    await connectDB();

    const hirerId = gigData.company._id || gigData.company;
    const freelancer = await User.findById(freelancerId).select("name");

    const notification = new Notification({
      user: hirerId,
      type: "gig_application",
      title: "New Application Received",
      message: `${freelancer?.name || "Someone"} applied to your gig "${
        gigData.title
      }" with proposal: ₹${applicationData.proposedRate}`,
      relatedId: gigData._id,
      actionUrl: `/dashboard/gigs/${gigData._id}/applications`,
    });

    await notification.save();
   
    return notification;
  } catch (error) {
    console.error("Create application notification error:", error);
    throw error;
  }
}

/**
 * Create notification for gig application status update
 */
export async function createGigApplicationStatusNotification(
  gigData,
  applicationData,
  freelancerId,
  status
) {
  try {
    await connectDB();

    let title, message;

    switch (status) {
      case "accepted":
        title = "Application Accepted!";
        message = `Your application for "${gigData.title}" has been accepted!`;
        break;
      case "rejected":
        title = "Application Update";
        message = `Your application for "${gigData.title}" status has been updated.`;
        break;
      default:
        title = "Application Status Update";
        message = `Your application for "${gigData.title}" has been updated.`;
    }

    const notification = new Notification({
      user: freelancerId,
      type: status === "accepted" ? "gig_accepted" : "gig_rejected",
      title,
      message,
      relatedId: gigData._id,
      actionUrl: `/gigs/${gigData._id}`,
    });

    await notification.save();
   
    return notification;
  } catch (error) {
    console.error("Create application status notification error:", error);
    throw error;
  }
}

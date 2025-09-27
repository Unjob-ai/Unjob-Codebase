// utils/notificationHelpers.js
import { enhancedNotificationService } from "../services/enhancedNotificationService.js";
import { User } from "../models/UserModel.js";

// Helper function to safely send notifications without breaking main functionality
const safeNotify = async (notificationFunction, data, description) => {
  try {
    await notificationFunction(data);
    console.log(`✅ ${description} notification sent successfully`);
  } catch (error) {
    console.error(`❌ Failed to send ${description} notification:`, error);
    // Don't throw error - notification failure shouldn't break main functionality
  }
};

// =============================================================================
// POST INTERACTIONS
// =============================================================================

// Auto-notify when someone likes a post
export const autoNotifyPostLike = async (post, liker) => {
  // Don't notify if user liked their own post
  if (post.author.toString() === liker._id.toString()) {
    return;
  }

  const postOwner = await User.findById(post.author);
  if (!postOwner) return;

  await safeNotify(
    () =>
      enhancedNotificationService.notifyPostLike({
        postOwnerId: postOwner._id,
        postOwnerEmail: postOwner.email,
        postOwnerName: postOwner.name,
        likerName: liker.name,
        likerAvatar: liker.avatar || liker.image,
        postTitle: post.title || "",
        postContent: post.content || "",
        postId: post._id,
      }),
    null,
    "Post like"
  );
};

// Auto-notify when someone comments on a post
export const autoNotifyPostComment = async (post, comment, commenter) => {
  // Don't notify if user commented on their own post
  if (post.author.toString() === commenter._id.toString()) {
    return;
  }

  const postOwner = await User.findById(post.author);
  if (!postOwner) return;

  await safeNotify(
    () =>
      enhancedNotificationService.notifyCommentAdded({
        postOwnerId: postOwner._id,
        postOwnerEmail: postOwner.email,
        postOwnerName: postOwner.name,
        commenterName: commenter.name,
        commentContent: comment.content || comment.text,
        postTitle: post.title || "Post",
        postId: post._id,
      }),
    null,
    "Post comment"
  );
};

// =============================================================================
// FOLLOW SYSTEM
// =============================================================================

// Auto-notify when someone follows a user
export const autoNotifyNewFollower = async (followedUser, follower) => {
  // Don't notify if user follows themselves
  if (followedUser._id.toString() === follower._id.toString()) {
    return;
  }

  await safeNotify(
    () =>
      enhancedNotificationService.notifyNewFollower({
        followedUserId: followedUser._id,
        followedUserEmail: followedUser.email,
        followedUserName: followedUser.name,
        followerName: follower.name,
        followerAvatar: follower.avatar || follower.image,
        followerBio: follower.profile?.bio || follower.profile?.description,
        followerSkills: follower.profile?.skills || [],
        followerId: follower._id,
      }),
    null,
    "New follower"
  );
};

// =============================================================================
// GIG SYSTEM
// =============================================================================

// Auto-notify when someone applies to a gig
export const autoNotifyGigApplication = async (gig, application, applicant) => {
  const gigOwner = await User.findById(
    gig.postedBy || gig.author || gig.createdBy
  );
  if (!gigOwner) return;

  // Don't notify if owner applies to their own gig
  if (gigOwner._id.toString() === applicant._id.toString()) {
    return;
  }

  await safeNotify(
    () =>
      enhancedNotificationService.notifyGigApplication({
        gigOwnerId: gigOwner._id,
        gigOwnerEmail: gigOwner.email,
        gigOwnerName: gigOwner.name,
        applicantName: applicant.name,
        gigTitle: gig.title,
        gigId: gig._id,
        applicationId: application._id,
      }),
    null,
    "Gig application"
  );
};

// Auto-notify when someone sends a gig invitation
export const autoNotifyGigInvitation = async (
  gig,
  invitation,
  inviter,
  invitee
) => {
  await safeNotify(
    () =>
      enhancedNotificationService.notifyGigInvitation({
        inviteeId: invitee._id,
        inviteeEmail: invitee.email,
        inviteeName: invitee.name,
        inviterName: inviter.name,
        gigTitle: gig.title,
        gigId: gig._id,
        invitationId: invitation._id,
      }),
    null,
    "Gig invitation"
  );
};

// Auto-notify when application status changes
export const autoNotifyApplicationStatusUpdate = async (
  application,
  gig,
  newStatus
) => {
  const applicant = await User.findById(
    application.user || application.freelancer
  );
  if (!applicant) return;

  await safeNotify(
    () =>
      enhancedNotificationService.notifyApplicationStatusUpdate({
        applicantId: applicant._id,
        applicantEmail: applicant.email,
        applicantName: applicant.name,
        gigTitle: gig.title,
        newStatus,
        gigId: gig._id,
        applicationId: application._id,
      }),
    null,
    "Application status update"
  );
};

// =============================================================================
// PROJECT SYSTEM
// =============================================================================

// Auto-notify when project is submitted
export const autoNotifyProjectSubmission = async (project, gig, freelancer) => {
  const gigOwner = await User.findById(
    gig.postedBy || gig.author || gig.createdBy
  );
  if (!gigOwner) return;

  await safeNotify(
    () =>
      enhancedNotificationService.notifyProjectSubmission({
        gigOwnerId: gigOwner._id,
        gigOwnerEmail: gigOwner.email,
        gigOwnerName: gigOwner.name,
        freelancerName: freelancer.name,
        projectTitle: project.title || gig.title,
        gigId: gig._id,
        projectId: project._id,
      }),
    null,
    "Project submission"
  );
};

// Auto-notify when project receives a review
export const autoNotifyProjectReview = async (review, project, gig) => {
  // Find the freelancer who submitted the project
  const application = gig.applications?.find(
    (app) =>
      app.projectSubmissions?.some(
        (sub) => sub.projectId?.toString() === project._id.toString()
      ) || app.currentProjectId?.toString() === project._id.toString()
  );

  if (!application) return;

  const freelancer = await User.findById(
    application.user || application.freelancer
  );
  if (!freelancer) return;

  await safeNotify(
    () =>
      enhancedNotificationService.notifyProjectReview({
        freelancerId: freelancer._id,
        freelancerEmail: freelancer.email,
        freelancerName: freelancer.name,
        reviewContent: review.content || review.feedback || review.comment,
        projectTitle: project.title || gig.title,
        rating: review.rating,
        projectId: project._id,
      }),
    null,
    "Project review"
  );
};

// Auto-notify when project is completed
export const autoNotifyProjectCompletion = async (
  project,
  gig,
  freelancerId
) => {
  const [freelancer, gigOwner] = await Promise.all([
    User.findById(freelancerId),
    User.findById(gig.postedBy || gig.author || gig.createdBy),
  ]);

  if (!freelancer || !gigOwner) return;

  await safeNotify(
    () =>
      enhancedNotificationService.notifyProjectCompletion({
        freelancerId: freelancer._id,
        freelancerEmail: freelancer.email,
        freelancerName: freelancer.name,
        gigOwnerId: gigOwner._id,
        gigOwnerEmail: gigOwner.email,
        gigOwnerName: gigOwner.name,
        projectTitle: project.title || gig.title,
        projectId: project._id,
      }),
    null,
    "Project completion"
  );
};

// =============================================================================
// PAYMENT SYSTEM
// =============================================================================

// Auto-notify when payment is processed
export const autoNotifyPayment = async (payment, user) => {
  await safeNotify(
    () =>
      enhancedNotificationService.notifyPayment({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        amount: payment.amount,
        paymentType: payment.type,
        transactionId: payment.razorpayPaymentId || payment.transactionId,
        paymentId: payment._id,
      }),
    null,
    "Payment confirmation"
  );
};

// =============================================================================
// SUBSCRIPTION SYSTEM
// =============================================================================

// Auto-notify when subscription is created
export const autoNotifySubscriptionCreated = async (
  subscription,
  user,
  paymentDetails
) => {
  const invoiceData = {
    date: new Date().toLocaleDateString(),
    transactionId:
      paymentDetails?.transactionId ||
      paymentDetails?.razorpayPaymentId ||
      "N/A",
    planDuration: subscription.duration,
  };

  await safeNotify(
    () =>
      enhancedNotificationService.notifySubscriptionCreated({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        planType: subscription.planType,
        amount: subscription.price,
        subscriptionId: subscription._id,
        invoiceData,
      }),
    null,
    "Subscription creation"
  );
};

// Auto-notify for subscription renewal reminders
export const autoNotifySubscriptionRenewal = async (subscription, user) => {
  await safeNotify(
    () =>
      enhancedNotificationService.notifySubscriptionRenewal({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        planType: subscription.planType,
        renewalDate: new Date(subscription.renewalDate).toLocaleDateString(),
        subscriptionId: subscription._id,
      }),
    null,
    "Subscription renewal reminder"
  );
};

// =============================================================================
// USER LIFECYCLE
// =============================================================================

// Auto-notify for welcome emails
export const autoNotifyWelcome = async (user) => {
  await safeNotify(
    () =>
      enhancedNotificationService.notifyWelcome({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
      }),
    null,
    "Welcome email"
  );
};

// Auto-notify for password reset
export const autoNotifyPasswordReset = async (user, resetToken) => {
  await safeNotify(
    () =>
      enhancedNotificationService.notifyPasswordReset({
        userEmail: user.email,
        userName: user.name,
        resetToken,
      }),
    null,
    "Password reset"
  );
};

// Auto-notify for email verification
export const autoNotifyEmailVerification = async (user, verificationToken) => {
  await safeNotify(
    () =>
      enhancedNotificationService.notifyEmailVerification({
        userEmail: user.email,
        userName: user.name,
        verificationToken,
      }),
    null,
    "Email verification"
  );
};

// =============================================================================
// DEADLINE REMINDERS
// =============================================================================

// Auto-notify for deadline reminders
export const autoNotifyDeadlineReminder = async (gig, user) => {
  await safeNotify(
    () =>
      enhancedNotificationService.notifyDeadlineReminder({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        gigTitle: gig.title,
        deadline: new Date(
          gig.deadline || gig.projectDeadline
        ).toLocaleDateString(),
        gigId: gig._id,
      }),
    null,
    "Deadline reminder"
  );
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Check if user should receive notifications
export const shouldNotifyUser = async (userId, notificationType = "email") => {
  try {
    const user = await User.findById(userId).select(
      "notificationPreferences isActive"
    );

    if (!user || !user.isActive) {
      return false;
    }

    // Default to true if no preferences set
    if (!user.notificationPreferences) {
      return true;
    }

    const preferences = user.notificationPreferences[notificationType];
    return preferences !== false;
  } catch (error) {
    console.error("Error checking notification preferences:", error);
    return true; // Default to sending on error
  }
};

// Bulk notification helper
export const sendBulkNotifications = async (
  userIds,
  notificationData,
  emailTemplateName,
  emailSubject,
  emailTemplateData
) => {
  const users = await User.find({ _id: { $in: userIds } }).select("name email");

  const recipients = users.map((user) => ({
    userId: user._id,
    email: user.email,
    name: user.name,
  }));

  return await enhancedNotificationService.sendBulkNotifications(
    recipients,
    notificationData,
    emailTemplateName,
    emailSubject,
    emailTemplateData
  );
};

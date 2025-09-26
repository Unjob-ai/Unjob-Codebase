// Fixed app/api/profile/[userId]/route.js with username and country support
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Gig from "@/models/Gig";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // Fixed import path
import { uploadToCloudinary } from "@/lib/cloudinary";

function removeEmptyStrings(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== "") {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const cleanedNested = removeEmptyStrings(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

function cleanProfileDataForRole(profileData, userRole) {
  if (!profileData) return profileData;

  let cleaned = removeEmptyStrings(profileData);

  if (userRole === "freelancer") {
    delete cleaned.companyName;
    delete cleaned.companySize;
    delete cleaned.industry;
    delete cleaned.description;
  } else if (userRole === "hiring") {
    delete cleaned.hourlyRate;
    delete cleaned.bankDetails;
    delete cleaned.availability;
  }

  return cleaned;
}

// Function to update gig banners when profile image changes
async function updateGigBannersForUser(userId, newProfileImage) {
  try {
    console.log(
      `[PROFILE_UPDATE] Updating gig banners for user ${userId} with new profile image`
    );

    const gigsToUpdate = await Gig.find({
      company: userId,
      $or: [
        { bannerImage: { $exists: false } },
        { bannerImage: null },
        { bannerImage: "" },
        { bannerImage: { $regex: /\/profiles\// } },
        { bannerImage: { $regex: /\/profile\// } },
      ],
    });

    console.log(
      `[PROFILE_UPDATE] Found ${gigsToUpdate.length} gigs to update for user ${userId}`
    );

    if (gigsToUpdate.length > 0) {
      const updateResult = await Gig.updateMany(
        {
          _id: { $in: gigsToUpdate.map((g) => g._id) },
        },
        {
          $set: { bannerImage: newProfileImage },
        }
      );

      console.log(
        `[PROFILE_UPDATE] Updated ${updateResult.modifiedCount} gig banners for user ${userId}`
      );

      return {
        success: true,
        updatedGigs: updateResult.modifiedCount,
        totalGigs: gigsToUpdate.length,
      };
    }

    return {
      success: true,
      updatedGigs: 0,
      totalGigs: 0,
    };
  } catch (error) {
    console.error(
      `[PROFILE_UPDATE] Error updating gig banners for user ${userId}:`,
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
}

// Username validation function
function validateUsername(username, currentUsername = null) {
  if (!username) return { isValid: false, message: "Username is required" };

  const trimmedUsername = username.trim().toLowerCase();

  if (trimmedUsername === currentUsername) {
    return { isValid: true }; // Same username, no change needed
  }

  if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
    return {
      isValid: false,
      message: "Username must be between 3 and 30 characters",
    };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
    return {
      isValid: false,
      message: "Username can only contain letters, numbers, and underscores",
    };
  }

  if (/^\d+$/.test(trimmedUsername)) {
    return {
      isValid: false,
      message: "Username must contain at least one letter",
    };
  }

  return { isValid: true };
}

// Country validation function
function validateCountry(countryCode) {
  const validCountries = [
    "AF",
    "AL",
    "DZ",
    "AR",
    "AM",
    "AU",
    "AT",
    "BD",
    "BE",
    "BR",
    "CA",
    "CN",
    "DK",
    "EG",
    "FI",
    "FR",
    "DE",
    "GH",
    "GR",
    "IN",
    "ID",
    "IR",
    "IQ",
    "IE",
    "IL",
    "IT",
    "JP",
    "JO",
    "KE",
    "KW",
    "MY",
    "MX",
    "NL",
    "NG",
    "NO",
    "PK",
    "PH",
    "PL",
    "PT",
    "QA",
    "RU",
    "SA",
    "SG",
    "ZA",
    "KR",
    "ES",
    "LK",
    "SE",
    "CH",
    "TH",
    "TR",
    "UA",
    "AE",
    "GB",
    "US",
    "VN",
  ];

  return validCountries.includes(countryCode);
}

// GET - Fetch user profile by userId
export async function GET(request, { params }) {
  try {
    console.log("🔍 Fetching profile for userId:", params.userId);

    await connectDB();

    // Validate userId format
    if (!params.userId || params.userId.length !== 24) {
      console.error("❌ Invalid userId format:", params.userId);
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    // Find user by ID
    const user = await User.findById(params.userId)
      .select("-password -resetPasswordToken -verificationToken")
      .lean();

    if (!user) {
      console.error("❌ User not found:", params.userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ Profile fetched successfully for:", user.username);

    // Add country info to response
    const userWithCountry = {
      ...user,
      country: {
        code: user.countryOfOrigin,
        name: user.countryName,
        dialCode: user.phoneCountryCode,
      },
      formattedMobile: user.phoneCountryCode
        ? `${user.phoneCountryCode} ${user.mobile}`
        : user.mobile,
    };

    return NextResponse.json({
      success: true,
      user: userWithCountry,
    });
  } catch (error) {
    console.error("🔥 Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update user profile with username and country support
export async function PUT(request, { params }) {
  try {
    console.log("📝 Updating profile for userId:", params.userId);

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error("❌ Unauthorized profile update attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID from session with all possible fields
    const sessionUserId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    console.log("🔍 Session user ID:", sessionUserId);
    console.log("🔍 Target user ID:", params.userId);
    console.log("🔍 User role:", session.user.role);

    // Check if user is updating their own profile or is admin
    if (sessionUserId !== params.userId && session.user.role !== "admin") {
      console.error("❌ Forbidden profile update attempt");
      console.error("Session ID:", sessionUserId, "Target ID:", params.userId);
      return NextResponse.json(
        { error: "Forbidden - You can only update your own profile" },
        { status: 403 }
      );
    }

    await connectDB();

    // Validate userId format
    if (!params.userId || params.userId.length !== 24) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    const currentUser = await User.findById(params.userId);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type");
    let updateData = {};
    let profileImageUpdated = false;
    let newProfileImageUrl = null;

    if (contentType?.includes("application/json")) {
      // Handle JSON data
      const body = await request.json();
      console.log("📋 Update data received:", Object.keys(body));

      // Remove sensitive fields that shouldn't be updated via this route
      const {
        password,
        email,
        role,
        googleId,
        provider,
        verificationToken,
        resetPasswordToken,
        _id,
        createdAt,
        updatedAt,
        ...allowedUpdates
      } = body;

      updateData = Object.fromEntries(
        Object.entries(allowedUpdates).filter(
          ([key, value]) => value !== null && value !== undefined
        )
      );

      // Handle username validation
      if (body.username !== undefined) {
        const usernameValidation = validateUsername(
          body.username,
          currentUser.username
        );
        if (!usernameValidation.isValid) {
          return NextResponse.json(
            { error: usernameValidation.message },
            { status: 400 }
          );
        }

        // Check if username is already taken (if it's different from current)
        if (body.username.trim().toLowerCase() !== currentUser.username) {
          const existingUser = await User.findOne({
            username: body.username.trim().toLowerCase(),
            _id: { $ne: params.userId },
          });

          if (existingUser) {
            return NextResponse.json(
              { error: "Username is already taken" },
              { status: 400 }
            );
          }

          updateData.username = body.username.trim().toLowerCase();
        }
      }

      // Handle country validation
      if (body.countryOfOrigin && !validateCountry(body.countryOfOrigin)) {
        return NextResponse.json(
          { error: "Invalid country code" },
          { status: 400 }
        );
      }

      // Track if profile image is being updated
      if (body.image && body.image !== currentUser.image) {
        profileImageUpdated = true;
        newProfileImageUrl = body.image;
      }

      if (body.profile) {
        const baseProfile =
          currentUser.profile?.toObject?.() || currentUser.profile || {};

        const cleanedProfileUpdate = cleanProfileDataForRole(
          body.profile,
          currentUser.role
        );

        if (Object.keys(cleanedProfileUpdate).length > 0) {
          updateData.profile = {
            ...baseProfile,
            ...cleanedProfileUpdate,
          };
        } else {
          delete updateData.profile;
        }
      }
    } else if (contentType?.includes("multipart/form-data")) {
      // Handle form data (for file uploads)
      const formData = await request.formData();
      const name = formData.get("name");
      const username = formData.get("username");
      const profileData = formData.get("profile");
      const countryOfOrigin = formData.get("countryOfOrigin");
      const countryName = formData.get("countryName");
      const phoneCountryCode = formData.get("phoneCountryCode");

      if (name && name.trim()) {
        updateData.name = name.trim();
      }

      // Handle username validation
      if (username !== null) {
        const usernameValidation = validateUsername(
          username,
          currentUser.username
        );
        if (!usernameValidation.isValid) {
          return NextResponse.json(
            { error: usernameValidation.message },
            { status: 400 }
          );
        }

        // Check if username is already taken (if it's different from current)
        if (username.trim().toLowerCase() !== currentUser.username) {
          const existingUser = await User.findOne({
            username: username.trim().toLowerCase(),
            _id: { $ne: params.userId },
          });

          if (existingUser) {
            return NextResponse.json(
              { error: "Username is already taken" },
              { status: 400 }
            );
          }

          updateData.username = username.trim().toLowerCase();
        }
      }

      // Handle country data
      if (countryOfOrigin && validateCountry(countryOfOrigin)) {
        updateData.countryOfOrigin = countryOfOrigin;
        if (countryName) updateData.countryName = countryName;
        if (phoneCountryCode) updateData.phoneCountryCode = phoneCountryCode;
      }

      if (profileData) {
        try {
          const parsedProfile = JSON.parse(profileData);
          const baseProfile =
            currentUser.profile?.toObject?.() || currentUser.profile || {};

          const cleanedProfileUpdate = cleanProfileDataForRole(
            parsedProfile,
            currentUser.role
          );

          if (Object.keys(cleanedProfileUpdate).length > 0) {
            updateData.profile = {
              ...baseProfile,
              ...cleanedProfileUpdate,
            };
          }
        } catch (e) {
          console.error("Profile data parsing error:", e);
        }
      }

      // Handle image upload
      const imageFile = formData.get("image");
      if (imageFile && imageFile.size > 0) {
        try {
          if (imageFile.size > 10 * 1024 * 1024) {
            return NextResponse.json(
              { error: "File too large. Maximum size is 10MB." },
              { status: 400 }
            );
          }

          if (!imageFile.type.startsWith("image/")) {
            return NextResponse.json(
              { error: "Invalid file type. Please upload an image." },
              { status: 400 }
            );
          }

          const buffer = Buffer.from(await imageFile.arrayBuffer());
          const imageUrl = await uploadToCloudinary(buffer, "unjob/profiles");
          updateData.image = imageUrl;

          // Track profile image update
          profileImageUpdated = true;
          newProfileImageUrl = imageUrl;
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          return NextResponse.json(
            { error: "Failed to upload image" },
            { status: 500 }
          );
        }
      }
    }

    console.log("📋 Allowed updates:", Object.keys(updateData));

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid data to update" },
        { status: 400 }
      );
    }

    // Find and update user
    const updatedUser = await User.findByIdAndUpdate(
      params.userId,
      {
        ...updateData,
        updatedAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password -resetPasswordToken -verificationToken");

    if (!updatedUser) {
      console.error("❌ User not found for update:", params.userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let gigUpdateResult = null;

    // Auto-update gig banners if profile image was updated and user is hiring
    if (
      profileImageUpdated &&
      updatedUser.role === "hiring" &&
      newProfileImageUrl
    ) {
      console.log(
        `[PROFILE_UPDATE] Profile image updated for hiring user ${params.userId}, updating gig banners`
      );
      gigUpdateResult = await updateGigBannersForUser(
        params.userId,
        newProfileImageUrl
      );
    }

    console.log("✅ Profile updated successfully for:", updatedUser.username);

    // Add country info to response
    const userWithCountry = {
      ...updatedUser.toObject(),
      country: {
        code: updatedUser.countryOfOrigin,
        name: updatedUser.countryName,
        dialCode: updatedUser.phoneCountryCode,
      },
      formattedMobile: updatedUser.phoneCountryCode
        ? `${updatedUser.phoneCountryCode} ${updatedUser.mobile}`
        : updatedUser.mobile,
    };

    // Prepare response
    const response = {
      success: true,
      message: "Profile updated successfully",
      user: userWithCountry,
    };

    // Add gig update info to response if applicable
    if (gigUpdateResult) {
      response.gigBannerUpdate = {
        success: gigUpdateResult.success,
        updatedGigs: gigUpdateResult.updatedGigs,
        totalGigs: gigUpdateResult.totalGigs,
        message: gigUpdateResult.success
          ? `Updated ${gigUpdateResult.updatedGigs} gig banners automatically`
          : `Failed to update gig banners: ${gigUpdateResult.error}`,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("🔥 Error updating profile:", error);

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (e) => e.message
      );
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      // Handle duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      let fieldName = field;
      if (field === "username") fieldName = "username";
      else if (field === "email") fieldName = "email";
      else if (field === "mobile") fieldName = "mobile number";

      return NextResponse.json(
        {
          error: `User already exists with this ${fieldName}.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete user profile (admin only or own profile)
export async function DELETE(request, { params }) {
  try {
    console.log("🗑️ Deleting profile for userId:", params.userId);

    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.error("❌ Unauthorized profile deletion attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID from session with all possible fields
    const sessionUserId =
      session.user.userId ||
      session.user.id ||
      session.user._id ||
      session.user.sub;

    // Check if user is deleting their own profile or is admin
    if (sessionUserId !== params.userId && session.user.role !== "admin") {
      console.error("❌ Forbidden profile deletion attempt");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Validate userId format
    if (!params.userId || params.userId.length !== 24) {
      return NextResponse.json(
        { error: "Invalid user ID format" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findById(params.userId);
    if (!user) {
      console.error("❌ User not found for deletion:", params.userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Soft delete - mark as inactive instead of actual deletion
    await User.findByIdAndUpdate(params.userId, {
      isActive: false,
      deletedAt: new Date(),
    });

    console.log("✅ Profile soft deleted successfully:", user.username);

    return NextResponse.json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    console.error("🔥 Error deleting profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

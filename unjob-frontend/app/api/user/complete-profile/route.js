import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

// Enhanced mobile number validation (matches frontend exactly)
const validateMobileNumber = (mobile, countryCode) => {
  if (!mobile) return false;
  const cleanMobile = mobile.replace(/\D/g, "");

  switch (countryCode) {
    case "IN":
      return /^[6-9]\d{9}$/.test(cleanMobile);
    case "US":
    case "CA":
      return /^\d{10}$/.test(cleanMobile);
    case "GB":
      return /^\d{10,11}$/.test(cleanMobile);
    case "AU":
      return /^\d{9,10}$/.test(cleanMobile);
    case "DE":
      return /^\d{10,12}$/.test(cleanMobile);
    case "FR":
      return /^\d{10}$/.test(cleanMobile);
    case "JP":
      return /^\d{10,11}$/.test(cleanMobile);
    case "BR":
      return /^\d{10,11}$/.test(cleanMobile);
    case "RU":
      return /^\d{10}$/.test(cleanMobile);
    case "CN":
      return /^\d{11}$/.test(cleanMobile);
    default:
      return /^\d{6,15}$/.test(cleanMobile);
  }
};

// Country validation
const validateCountryCode = (countryCode) => {
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
};

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Validation helper function
const validateProfileData = (data, userRole) => {
  const errors = {};

  // Common field validations
  if (!data.name?.trim()) {
    errors.name = "Full name is required";
  } else if (data.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters long";
  } else if (data.name.trim().length > 100) {
    errors.name = "Name must be less than 100 characters";
  }

  if (!data.mobile?.trim()) {
    errors.mobile = "Mobile number is required";
  } else if (!validateMobileNumber(data.mobile.trim(), data.countryOfOrigin)) {
    errors.mobile = "Please enter a valid mobile number for your country";
  }

  if (!data.countryOfOrigin) {
    errors.countryOfOrigin = "Country of origin is required";
  } else if (!validateCountryCode(data.countryOfOrigin)) {
    errors.countryOfOrigin = "Invalid country code selected";
  }

  if (!data.countryName?.trim()) {
    errors.countryName = "Country name is required";
  } else if (data.countryName.trim().length > 100) {
    errors.countryName = "Country name is too long";
  }

  if (!data.phoneCountryCode?.trim()) {
    errors.phoneCountryCode = "Phone country code is required";
  } else if (!/^\+\d{1,4}$/.test(data.phoneCountryCode)) {
    errors.phoneCountryCode = "Invalid phone country code format";
  }

  // Role-specific validations
  if (userRole === "hiring") {
    if (!data.companyName?.trim()) {
      errors.companyName = "Company name is required";
    } else if (data.companyName.trim().length < 2) {
      errors.companyName = "Company name must be at least 2 characters long";
    } else if (data.companyName.trim().length > 100) {
      errors.companyName = "Company name must be less than 100 characters";
    }

    if (!data.contactPersonName?.trim()) {
      errors.contactPersonName = "Contact person name is required";
    } else if (data.contactPersonName.trim().length < 2) {
      errors.contactPersonName =
        "Contact person name must be at least 2 characters long";
    }

    if (!data.businessEmail?.trim()) {
      errors.businessEmail = "Business email is required";
    } else if (!validateEmail(data.businessEmail)) {
      errors.businessEmail = "Please enter a valid business email address";
    }

    const validCompanySizes = [
      "1-10 employees",
      "11-50 employees",
      "51-200 employees",
      "201-500 employees",
      "501-1000 employees",
      "1000+ employees",
    ];
    if (!data.companySize) {
      errors.companySize = "Company size is required";
    } else if (!validCompanySizes.includes(data.companySize)) {
      errors.companySize = "Invalid company size selected";
    }

    const validIndustries = [
      "Technology",
      "Healthcare",
      "Finance",
      "Education",
      "E-commerce",
      "Marketing",
      "Manufacturing",
      "Real Estate",
      "Consulting",
      "Entertainment",
      "Other",
    ];
    if (!data.industry) {
      errors.industry = "Industry is required";
    } else if (!validIndustries.includes(data.industry)) {
      errors.industry = "Invalid industry selected";
    }

    if (!data.description?.trim()) {
      errors.description = "Company description is required";
    } else if (data.description.trim().length < 20) {
      errors.description = "Description must be at least 20 characters long";
    } else if (data.description.trim().length > 1000) {
      errors.description = "Description must be less than 1000 characters";
    }
  }

  return errors;
};

export async function PATCH(request) {
  try {
    console.log("[API] Profile completion request received");

    // Get the user session
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.log("[API] Unauthorized: No valid session found");
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "You must be logged in to complete your profile",
        },
        { status: 401 }
      );
    }

    // Connect to the database
    await connectDB();

    // Parse the request body
    let profileData;
    try {
      profileData = await request.json();
    } catch (parseError) {
      console.error("[API] Invalid JSON in request body:", parseError);
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Request body must contain valid JSON",
        },
        { status: 400 }
      );
    }

    console.log(
      `[API] Processing profile completion for user ${session.user.id}`
    );
    console.log("[API] Received data:", {
      ...profileData,
      // Don't log sensitive data in production
      mobile: profileData.mobile
        ? `${profileData.mobile.substring(0, 3)}***`
        : null,
    });

    // Get user from database
    const userId = session.user.id;
    const user = await User.findById(userId);

    if (!user) {
      console.log(`[API] User not found: ${userId}`);
      return NextResponse.json(
        {
          error: "User not found",
          message: "Your user account could not be found",
        },
        { status: 404 }
      );
    }

    // Validate the profile data
    const validationErrors = validateProfileData(profileData, user.role);

    if (Object.keys(validationErrors).length > 0) {
      console.log("[API] Validation failed:", validationErrors);
      return NextResponse.json(
        {
          error: "Validation failed",
          message: "Please fix the following errors",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    // Create the base profile object if it doesn't exist
    if (!user.profile) user.profile = {};

    console.log(`[API] Validation passed, updating user ${userId} profile`);

    try {
      // Prepare update data based on role
      const baseUpdateData = {
        name: profileData.name.trim(),
        mobile: profileData.mobile.trim(),
        countryOfOrigin: profileData.countryOfOrigin,
        countryName: profileData.countryName.trim(),
        phoneCountryCode: profileData.phoneCountryCode,
        "profile.isCompleted": true,
        "profile.completedAt": new Date(),
      };

      // Add role-specific data for hiring users
      if (user.role === "hiring") {
        baseUpdateData["profile.companyName"] = profileData.companyName.trim();
        baseUpdateData["profile.companySize"] = profileData.companySize;
        baseUpdateData["profile.industry"] = profileData.industry;
        baseUpdateData["profile.contactPersonName"] =
          profileData.contactPersonName.trim();
        baseUpdateData["profile.businessEmail"] =
          profileData.businessEmail.trim();
        baseUpdateData["profile.description"] = profileData.description.trim();
      }

      // Update the user
      const updateResult = await User.findByIdAndUpdate(
        userId,
        baseUpdateData,
        {
          new: true,
          runValidators: false, // We've already validated manually
          select: "-password -resetPasswordToken -verificationToken", // Exclude sensitive fields
        }
      );

      if (!updateResult) {
        throw new Error("Failed to update user profile");
      }

      console.log(
        `[API] User profile updated successfully, isCompleted=${updateResult?.profile?.isCompleted}`
      );

      // Return success response with updated user data
      return NextResponse.json(
        {
          success: true,
          message: "Profile completed successfully",
          user: {
            id: updateResult._id,
            name: updateResult.name,
            email: updateResult.email,
            role: updateResult.role,
            isCompleted: updateResult.profile?.isCompleted || false,
            profile: updateResult.profile,
            country: {
              code: updateResult.countryOfOrigin,
              name: updateResult.countryName,
              dialCode: updateResult.phoneCountryCode,
            },
            formattedMobile: updateResult.phoneCountryCode
              ? `${updateResult.phoneCountryCode} ${updateResult.mobile}`
              : updateResult.mobile,
          },
        },
        { status: 200 }
      );
    } catch (updateError) {
      console.error(`[API] Error updating user profile for user ${userId}:`, {
        error: updateError.message,
        stack: updateError.stack,
        userId: userId,
        role: user?.role,
      });

      return NextResponse.json(
        {
          error: "Update failed",
          message: "Failed to update profile in database",
          details: updateError.message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(
      `[API] Unexpected error in profile completion for user ${
        session?.user?.id || "unknown"
      }:`,
      {
        error: error.message,
        stack: error.stack,
        userId: session?.user?.id,
        sessionExists: !!session,
        userExists: !!session?.user,
      }
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred while completing your profile",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "GET method is not supported for this endpoint",
    },
    { status: 405 }
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "POST method is not supported for this endpoint",
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "PUT method is not supported for this endpoint",
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: "Method not allowed",
      message: "DELETE method is not supported for this endpoint",
    },
    { status: 405 }
  );
}

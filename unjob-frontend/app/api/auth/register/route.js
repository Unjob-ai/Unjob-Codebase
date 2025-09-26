// Updated auth/register/route.js with country support
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

// Country data for validation and storage
const countries = [
  { name: "Afghanistan", code: "AF", dialCode: "+93" },
  { name: "Albania", code: "AL", dialCode: "+355" },
  { name: "Algeria", code: "DZ", dialCode: "+213" },
  { name: "Argentina", code: "AR", dialCode: "+54" },
  { name: "Armenia", code: "AM", dialCode: "+374" },
  { name: "Australia", code: "AU", dialCode: "+61" },
  { name: "Austria", code: "AT", dialCode: "+43" },
  { name: "Bangladesh", code: "BD", dialCode: "+880" },
  { name: "Belgium", code: "BE", dialCode: "+32" },
  { name: "Brazil", code: "BR", dialCode: "+55" },
  { name: "Canada", code: "CA", dialCode: "+1" },
  { name: "China", code: "CN", dialCode: "+86" },
  { name: "Denmark", code: "DK", dialCode: "+45" },
  { name: "Egypt", code: "EG", dialCode: "+20" },
  { name: "Finland", code: "FI", dialCode: "+358" },
  { name: "France", code: "FR", dialCode: "+33" },
  { name: "Germany", code: "DE", dialCode: "+49" },
  { name: "Ghana", code: "GH", dialCode: "+233" },
  { name: "Greece", code: "GR", dialCode: "+30" },
  { name: "India", code: "IN", dialCode: "+91" },
  { name: "Indonesia", code: "ID", dialCode: "+62" },
  { name: "Iran", code: "IR", dialCode: "+98" },
  { name: "Iraq", code: "IQ", dialCode: "+964" },
  { name: "Ireland", code: "IE", dialCode: "+353" },
  { name: "Israel", code: "IL", dialCode: "+972" },
  { name: "Italy", code: "IT", dialCode: "+39" },
  { name: "Japan", code: "JP", dialCode: "+81" },
  { name: "Jordan", code: "JO", dialCode: "+962" },
  { name: "Kenya", code: "KE", dialCode: "+254" },
  { name: "Kuwait", code: "KW", dialCode: "+965" },
  { name: "Malaysia", code: "MY", dialCode: "+60" },
  { name: "Mexico", code: "MX", dialCode: "+52" },
  { name: "Netherlands", code: "NL", dialCode: "+31" },
  { name: "Nigeria", code: "NG", dialCode: "+234" },
  { name: "Norway", code: "NO", dialCode: "+47" },
  { name: "Pakistan", code: "PK", dialCode: "+92" },
  { name: "Philippines", code: "PH", dialCode: "+63" },
  { name: "Poland", code: "PL", dialCode: "+48" },
  { name: "Portugal", code: "PT", dialCode: "+351" },
  { name: "Qatar", code: "QA", dialCode: "+974" },
  { name: "Russia", code: "RU", dialCode: "+7" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966" },
  { name: "Singapore", code: "SG", dialCode: "+65" },
  { name: "South Africa", code: "ZA", dialCode: "+27" },
  { name: "South Korea", code: "KR", dialCode: "+82" },
  { name: "Spain", code: "ES", dialCode: "+34" },
  { name: "Sri Lanka", code: "LK", dialCode: "+94" },
  { name: "Sweden", code: "SE", dialCode: "+46" },
  { name: "Switzerland", code: "CH", dialCode: "+41" },
  { name: "Thailand", code: "TH", dialCode: "+66" },
  { name: "Turkey", code: "TR", dialCode: "+90" },
  { name: "Ukraine", code: "UA", dialCode: "+380" },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971" },
  { name: "United Kingdom", code: "GB", dialCode: "+44" },
  { name: "United States", code: "US", dialCode: "+1" },
  { name: "Vietnam", code: "VN", dialCode: "+84" },
];

// Mobile number validation by country
const validateMobileNumber = (mobile, countryCode) => {
  if (!mobile) return false;

  // Remove any non-digit characters for validation
  const cleanMobile = mobile.replace(/\D/g, "");

  // Basic validation based on country
  switch (countryCode) {
    case "IN": // India
      return /^[6-9]\d{9}$/.test(cleanMobile);
    case "US":
    case "CA": // US/Canada
      return /^\d{10}$/.test(cleanMobile);
    case "GB": // UK
      return /^\d{10,11}$/.test(cleanMobile);
    case "AU": // Australia
      return /^\d{9,10}$/.test(cleanMobile);
    case "DE": // Germany
      return /^\d{10,12}$/.test(cleanMobile);
    case "FR": // France
      return /^\d{10}$/.test(cleanMobile);
    case "JP": // Japan
      return /^\d{10,11}$/.test(cleanMobile);
    case "BR": // Brazil
      return /^\d{10,11}$/.test(cleanMobile);
    case "RU": // Russia
      return /^\d{10}$/.test(cleanMobile);
    case "CN": // China
      return /^\d{11}$/.test(cleanMobile);
    default:
      // Generic validation for other countries (6-15 digits)
      return /^\d{6,15}$/.test(cleanMobile);
  }
};

export async function POST(req) {
  try {
    console.log("🚀 Registration process started.");

    const {
      name,
      username,
      email,
      mobile,
      country, // NEW: country code
      password,
      role,
      companyName,
      companySize,
      industry,
    } = await req.json();

    console.log("📋 Registration data received:", {
      name,
      username,
      email,
      mobile: mobile
        ? `${mobile.substring(0, 3)}***${mobile.substring(7)}`
        : null,
      country,
      role,
      companyName,
    });

    // Basic validation
    if (!name || !email || !password || !role) {
      console.error("❌ Validation Failed: Missing required fields.");
      return NextResponse.json(
        { error: "Name, email, password, and role are required" },
        { status: 400 }
      );
    }

    // Username validation
    if (!username) {
      console.error("❌ Validation Failed: Username is required.");
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 30) {
      console.error("❌ Validation Failed: Username length invalid.");
      return NextResponse.json(
        { error: "Username must be between 3 and 30 characters" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      console.error(
        "❌ Validation Failed: Username contains invalid characters."
      );
      return NextResponse.json(
        {
          error: "Username can only contain letters, numbers, and underscores",
        },
        { status: 400 }
      );
    }

    if (/^\d+$/.test(username)) {
      console.error("❌ Validation Failed: Username cannot be only numbers.");
      return NextResponse.json(
        { error: "Username must contain at least one letter" },
        { status: 400 }
      );
    }

    // NEW: Country validation
    if (!country) {
      console.error("❌ Validation Failed: Country is required.");
      return NextResponse.json(
        { error: "Country is required" },
        { status: 400 }
      );
    }

    const selectedCountry = countries.find((c) => c.code === country);
    if (!selectedCountry) {
      console.error("❌ Validation Failed: Invalid country selected.");
      return NextResponse.json(
        { error: "Invalid country selected" },
        { status: 400 }
      );
    }

    // Mobile validation
    if (!mobile) {
      console.error("❌ Validation Failed: Mobile number is required.");
      return NextResponse.json(
        { error: "Mobile number is required" },
        { status: 400 }
      );
    }

    if (!validateMobileNumber(mobile, country)) {
      console.error("❌ Validation Failed: Invalid mobile number for country.");
      return NextResponse.json(
        { error: "Please enter a valid mobile number for your country" },
        { status: 400 }
      );
    }

    // Role validation
    if (!["freelancer", "hiring"].includes(role)) {
      console.error("❌ Validation Failed: Invalid role.");
      return NextResponse.json(
        { error: "Role must be either 'freelancer' or 'hiring'" },
        { status: 400 }
      );
    }

    // Password validation
    if (password.length < 6) {
      console.error("❌ Validation Failed: Password is too short.");
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      console.error("❌ Validation Failed: Invalid email format.");
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Role-specific validation for hiring
    if (role === "hiring") {
      if (!companyName?.trim()) {
        console.error(
          "❌ Validation Failed: Company name required for hiring."
        );
        return NextResponse.json(
          { error: "Company name is required for hiring accounts" },
          { status: 400 }
        );
      }
      if (!companySize) {
        console.error(
          "❌ Validation Failed: Company size required for hiring."
        );
        return NextResponse.json(
          { error: "Company size is required for hiring accounts" },
          { status: 400 }
        );
      }
      if (!industry) {
        console.error("❌ Validation Failed: Industry required for hiring.");
        return NextResponse.json(
          { error: "Industry is required for hiring accounts" },
          { status: 400 }
        );
      }
    }

    console.log("✅ Basic validation passed.");

    await connectDB();
    console.log("💾 Database connected.");

    // Check for existing user by email, mobile, OR username
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      let field = "email";
      if (existingUser.email === email) field = "email";
      else if (existingUser.mobile === mobile) field = "mobile number";
      else if (existingUser.username === username.toLowerCase())
        field = "username";

      console.error(`❌ Validation Failed: User with ${field} already exists.`);
      return NextResponse.json(
        { error: `User already exists with this ${field}` },
        { status: 400 }
      );
    }
    console.log("✅ Email, mobile, and username are unique.");

    const hashedPassword = bcrypt.hashSync(password, 12);

    // NEW: Prepare user data with country information
    const userData = {
      name,
      username: username.toLowerCase(),
      email,
      mobile,
      password: hashedPassword,
      role,
      // NEW: Country fields
      countryOfOrigin: selectedCountry.code,
      countryName: selectedCountry.name,
      phoneCountryCode: selectedCountry.dialCode,
      profile: {
        ...(role === "hiring"
          ? {
              companyName,
              companySize: companySize || null,
              industry: industry || null,
            }
          : {}),
      },
      stats: {},
    };

    console.log("👤 Creating user with data:", {
      ...userData,
      password: "[HIDDEN]",
    });

    const user = await User.create(userData);
    console.log("✅ User created successfully in database!");

    const { password: _, ...userResponse } = user.toObject();

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          ...userResponse,
          country: {
            code: userResponse.countryOfOrigin,
            name: userResponse.countryName,
            dialCode: userResponse.phoneCountryCode,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("🔥 An error occurred in the registration process:", error);

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

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

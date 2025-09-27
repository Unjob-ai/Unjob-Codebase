// Proxy registration to backend API so user creation lives in the backend
import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_URL || "http://localhost:3001";

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
    const body = await req.json();
    const res = await fetch(`${BACKEND_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({ message: "Invalid JSON" }));
    // Pass through status and body from backend (normalize error shape for frontend)
    if (!res.ok) {
      const error = data?.message || data?.error || "Registration failed";
      return NextResponse.json({ error }, { status: res.status });
    }
    // Return backend payload directly
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reach backend for registration" },
      { status: 502 }
    );
  }
}

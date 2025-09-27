"use client";

import {
  useState,
  useEffect,
  useTransition,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  ExclamationTriangle,
} from "lucide-react";
import { useGoogleRoleCheck } from "@/hooks/useGoogleRoleCheck";

// Move FormField component OUTSIDE of the main component to prevent re-creation
const FormField = ({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  readonly = false,
  children,
  hint,
  errors,
  touchedFields,
  formData,
  handleChange,
  handleBlur,
}) => {
  const hasError = errors[name];
  const isTouched = touchedFields[name];

  return (
    <div className="space-y-2">
      <Label
        htmlFor={name}
        className="text-sm text-white flex items-center gap-1"
      >
        {label}
        {required && <span className="text-red-400">*</span>}
      </Label>

      {children || (
        <Input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={formData[name] || ""}
          onChange={handleChange}
          onBlur={handleBlur}
          readOnly={readonly}
          className={`bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 transition-colors ${
            hasError
              ? "border-red-500/50 focus:ring-red-400"
              : isTouched && !hasError && formData[name]?.trim()
              ? "border-green-500/50 focus:ring-green-400"
              : "border-white/10 focus:ring-green-400"
          }`}
        />
      )}

      {hint && !hasError && formData[name] && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          {hint}
        </p>
      )}

      {hasError && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {hasError}
        </p>
      )}
    </div>
  );
};

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check and update Google user role if needed
  useGoogleRoleCheck();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    country: "",
    companyName: "",
    contactPersonName: "",
    businessEmail: "",
    companySize: "",
    industry: "",
    description: "",
  });

  const [touchedFields, setTouchedFields] = useState({});

  // Memoize countries array to prevent re-renders
  const countries = useMemo(
    () => [
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
    ],
    []
  );

  const companySizes = useMemo(
    () => [
      "1-10 employees",
      "11-50 employees",
      "51-200 employees",
      "201-500 employees",
      "501-1000 employees",
      "1000+ employees",
    ],
    []
  );

  const industries = useMemo(
    () => [
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
    ],
    []
  );

  const userRole = session?.user?.role || "freelancer";

  // Memoize selected country to avoid recalculation
  const selectedCountry = useMemo(
    () => countries.find((c) => c.code === formData.country),
    [countries, formData.country]
  );

  // Pre-fill form with session data when available
  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        name: session.user.name || "",
        email: session.user.email || "",
        contactPersonName: session.user.name || "",
        businessEmail: session.user.email || "",
      }));
    }
  }, [session]);

  // Mobile validation function (same as backend)
  const validateMobileNumber = useCallback((mobile, countryCode) => {
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
  }, []);

  // Validation function - memoized to prevent re-creation
  const validateField = useCallback(
    (field, value) => {
      let error = "";

      switch (field) {
        case "name":
          if (!value.trim()) {
            error = "Full name is required";
          } else if (value.trim().length < 2) {
            error = "Name must be at least 2 characters";
          } else if (value.trim().length > 100) {
            error = "Name must be less than 100 characters";
          }
          break;

        case "email":
          if (!value.trim()) {
            error = "Email is required";
          } else if (
            !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
          ) {
            error = "Please enter a valid email address";
          }
          break;

        case "mobile":
          if (!value.trim()) {
            error = "Mobile number is required";
          } else if (
            formData.country &&
            !validateMobileNumber(value.trim(), formData.country)
          ) {
            error = getMobileFormatHint(formData.country);
          }
          break;

        case "country":
          if (!value) {
            error = "Please select your country of origin";
          }
          break;

        case "companyName":
          if (userRole === "hiring") {
            if (!value.trim()) {
              error = "Company name is required";
            } else if (value.trim().length < 2) {
              error = "Company name must be at least 2 characters";
            } else if (value.trim().length > 100) {
              error = "Company name must be less than 100 characters";
            }
          }
          break;

        case "contactPersonName":
          if (userRole === "hiring" && !value.trim()) {
            error = "Contact person name is required";
          }
          break;

        case "businessEmail":
          if (userRole === "hiring") {
            if (!value.trim()) {
              error = "Business email is required";
            } else if (
              !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
            ) {
              error = "Please enter a valid business email address";
            }
          }
          break;

        case "companySize":
          if (userRole === "hiring" && !value) {
            error = "Please select company size";
          }
          break;

        case "industry":
          if (userRole === "hiring" && !value) {
            error = "Please select your industry";
          }
          break;

        case "description":
          if (userRole === "hiring") {
            if (!value.trim()) {
              error = "Company description is required";
            } else if (value.trim().length < 20) {
              error = "Description must be at least 20 characters";
            } else if (value.trim().length > 1000) {
              error = "Description must be less than 1000 characters";
            }
          }
          break;
      }

      return error;
    },
    [userRole, formData.country, validateMobileNumber]
  );

  const getMobileFormatHint = useCallback((countryCode) => {
    const hints = {
      IN: "Enter 10 digits starting with 6, 7, 8, or 9",
      US: "Enter 10 digits (e.g., 2345678901)",
      CA: "Enter 10 digits (e.g., 2345678901)",
      GB: "Enter 10-11 digits",
      AU: "Enter 9-10 digits",
      DE: "Enter 10-12 digits",
      FR: "Enter 10 digits",
      JP: "Enter 10-11 digits",
      BR: "Enter 10-11 digits",
      RU: "Enter 10 digits",
      CN: "Enter 11 digits",
    };
    return hints[countryCode] || "Please enter a valid mobile number";
  }, []);

  // Optimized handler for form field changes - reduced re-renders
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      // Single state update combining all changes
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Clear global error when user starts typing
      if (globalError) {
        setGlobalError("");
      }
    },
    [globalError]
  );

  // Separate handler for field blur to handle validation and touched state
  const handleBlur = useCallback(
    (e) => {
      const { name, value } = e.target;

      setTouchedFields((prev) => ({ ...prev, [name]: true }));

      // Validate only on blur to reduce re-renders
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    },
    [validateField]
  );

  // Handler for select fields
  const handleSelectChange = useCallback(
    (name, value) => {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setTouchedFields((prev) => ({ ...prev, [name]: true }));

      if (name === "country") {
        // Clear mobile error and value when country changes
        setErrors((prev) => ({ ...prev, mobile: "" }));
        setFormData((prev) => ({ ...prev, mobile: "" }));
      }

      // Validate the field
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));

      // Clear global error
      if (globalError) {
        setGlobalError("");
      }
    },
    [validateField, globalError]
  );

  // Validate all fields before submission
  const validateAllFields = useCallback(() => {
    const newErrors = {};
    const requiredFields = ["name", "email", "mobile", "country"];

    if (userRole === "hiring") {
      requiredFields.push(
        "companyName",
        "contactPersonName",
        "businessEmail",
        "companySize",
        "industry",
        "description"
      );
    }

    requiredFields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [userRole, formData, validateField]);

  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    setSuccessMessage("");

    // Mark all fields as touched
    const allFields = ["name", "email", "mobile", "country"];
    if (userRole === "hiring") {
      allFields.push(
        "companyName",
        "contactPersonName",
        "businessEmail",
        "companySize",
        "industry",
        "description"
      );
    }

    setTouchedFields(
      Object.fromEntries(allFields.map((field) => [field, true]))
    );

    // Validate all fields
    if (!validateAllFields()) {
      setGlobalError("Please fix the errors above before submitting");
      return;
    }

    setIsLoading(true);

    try {
      const selectedCountryData = countries.find(
        (c) => c.code === formData.country
      );

      if (!selectedCountryData) {
        throw new Error("Invalid country selected");
      }

      // Prepare the data exactly as backend expects
      const submitData = {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        countryOfOrigin: formData.country,
        countryName: selectedCountryData.name,
        phoneCountryCode: selectedCountryData.dialCode,
      };

      // Add role-specific data for hiring users
      if (userRole === "hiring") {
        submitData.companyName = formData.companyName.trim();
        submitData.companySize = formData.companySize;
        submitData.industry = formData.industry;
        submitData.description = formData.description.trim();
        submitData.contactPersonName =
          formData.contactPersonName.trim() || formData.name.trim();
        submitData.businessEmail =
          formData.businessEmail.trim() || formData.email.trim();
      }

      console.log("Submitting profile data:", submitData);

      const response = await fetch("/api/user/complete-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from backend
        if (data.details && typeof data.details === "object") {
          setErrors(data.details);
          throw new Error(data.message || "Please fix the validation errors");
        }
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      console.log("Profile API response:", data);
      setSuccessMessage(
        "Profile completed successfully! Redirecting to dashboard..."
      );

      // Update session and redirect
      startTransition(async () => {
        try {
          await update({
            user: {
              ...session?.user,
              isCompleted: true,
            },
          });

          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        } catch (error) {
          console.error("Error updating session:", error);
          window.location.href = "/dashboard";
        }
      });
    } catch (err) {
      console.error("Profile completion error:", err);
      setGlobalError(
        err.message || "Failed to complete profile. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-black to-green-900/30 z-0" />
      <div
        className="absolute top-[-800px] left-1/2 transform -translate-x-1/2 w-[1500px] h-[1500px] bg-no-repeat bg-top bg-contain pointer-events-none z-0"
        style={{
          backgroundImage:
            "url('/4fead141e6838d415e5b083de8afdbddb8332763.png')",
        }}
      />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-2xl rounded-[30px] border border-white/10 backdrop-blur-xl bg-white/5 px-8 py-10 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Complete Your Profile
            </h1>
            <p className="text-gray-400 text-sm">
              Please fill in the required information to complete your profile
              and access the platform.
            </p>
          </div>

          {/* Global Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50/10 border border-green-500/20 text-green-300 p-4 rounded-xl flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {successMessage}
            </div>
          )}

          {/* Global Error Message */}
          {globalError && (
            <div className="mb-6 bg-red-50/10 border border-red-500/20 text-red-300 p-4 rounded-xl flex items-start gap-2">
              <ExclamationTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error completing profile</p>
                <p className="text-sm mt-1">{globalError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Full Name"
                  name="name"
                  placeholder="Your full name"
                  required
                  readonly={!!session?.user?.name}
                  errors={errors}
                  touchedFields={touchedFields}
                  formData={formData}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                />

                <FormField
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="Your email address"
                  required
                  readonly={!!session?.user?.email}
                  errors={errors}
                  touchedFields={touchedFields}
                  formData={formData}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                />
              </div>

              <FormField
                label="Country of Origin"
                name="country"
                required
                errors={errors}
                touchedFields={touchedFields}
                formData={formData}
                handleChange={handleChange}
                handleBlur={handleBlur}
              >
                <Select
                  value={formData.country}
                  onValueChange={(value) =>
                    handleSelectChange("country", value)
                  }
                >
                  <SelectTrigger
                    className={`bg-white/10 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 transition-colors ${
                      errors.country
                        ? "border-red-500/50 focus:ring-red-400"
                        : touchedFields.country &&
                          !errors.country &&
                          formData.country
                        ? "border-green-500/50 focus:ring-green-400"
                        : "border-white/10 focus:ring-green-400"
                    }`}
                  >
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900/95 border-gray-700 backdrop-blur-xl max-h-60">
                    {countries.map((country) => (
                      <SelectItem
                        key={country.code}
                        value={country.code}
                        className="text-white hover:bg-white/10"
                      >
                        <div className="flex items-center gap-2">
                          <span>{country.name}</span>
                          <span className="text-gray-400 text-xs">
                            {country.dialCode}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Mobile Number"
                name="mobile"
                type="tel"
                required
                hint={
                  selectedCountry
                    ? `Format: ${selectedCountry.dialCode} followed by local number`
                    : undefined
                }
                errors={errors}
                touchedFields={touchedFields}
                formData={formData}
                handleChange={handleChange}
                handleBlur={handleBlur}
              >
                <div className="flex gap-2">
                  <div className="flex items-center bg-white/10 border border-white/10 rounded-xl px-3 py-3 text-white text-sm min-w-[80px]">
                    {selectedCountry ? selectedCountry.dialCode : "+1"}
                  </div>
                  <Input
                    name="mobile"
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={formData.mobile}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`flex-1 bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 transition-colors ${
                      errors.mobile
                        ? "border-red-500/50 focus:ring-red-400"
                        : touchedFields.mobile &&
                          !errors.mobile &&
                          formData.mobile?.trim()
                        ? "border-green-500/50 focus:ring-green-400"
                        : "border-white/10 focus:ring-green-400"
                    }`}
                  />
                </div>
                {selectedCountry && formData.country && !errors.mobile && (
                  <p className="text-xs text-gray-400">
                    {getMobileFormatHint(formData.country)}
                  </p>
                )}
              </FormField>
            </div>

            {/* Company Information (only for hiring role) */}
            {userRole === "hiring" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">
                  Company Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Company Name"
                    name="companyName"
                    placeholder="Your company name"
                    required
                    errors={errors}
                    touchedFields={touchedFields}
                    formData={formData}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                  />

                  <FormField
                    label="Contact Person Name"
                    name="contactPersonName"
                    placeholder="Contact person's full name"
                    required
                    errors={errors}
                    touchedFields={touchedFields}
                    formData={formData}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                  />
                </div>

                <FormField
                  label="Business Email"
                  name="businessEmail"
                  type="email"
                  placeholder="Business email address"
                  required
                  errors={errors}
                  touchedFields={touchedFields}
                  formData={formData}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Company Size"
                    name="companySize"
                    required
                    errors={errors}
                    touchedFields={touchedFields}
                    formData={formData}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                  >
                    <Select
                      value={formData.companySize}
                      onValueChange={(value) =>
                        handleSelectChange("companySize", value)
                      }
                    >
                      <SelectTrigger
                        className={`bg-white/10 border rounded-xl text-white ${
                          errors.companySize
                            ? "border-red-500/50 focus:ring-red-400"
                            : touchedFields.companySize &&
                              !errors.companySize &&
                              formData.companySize
                            ? "border-green-500/50 focus:ring-green-400"
                            : "border-white/10 focus:ring-green-400"
                        }`}
                      >
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900/95 border-gray-700">
                        {companySizes.map((size) => (
                          <SelectItem
                            key={size}
                            value={size}
                            className="text-white hover:bg-white/10"
                          >
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>

                  <FormField
                    label="Industry"
                    name="industry"
                    required
                    errors={errors}
                    touchedFields={touchedFields}
                    formData={formData}
                    handleChange={handleChange}
                    handleBlur={handleBlur}
                  >
                    <Select
                      value={formData.industry}
                      onValueChange={(value) =>
                        handleSelectChange("industry", value)
                      }
                    >
                      <SelectTrigger
                        className={`bg-white/10 border rounded-xl text-white ${
                          errors.industry
                            ? "border-red-500/50 focus:ring-red-400"
                            : touchedFields.industry &&
                              !errors.industry &&
                              formData.industry
                            ? "border-green-500/50 focus:ring-green-400"
                            : "border-white/10 focus:ring-green-400"
                        }`}
                      >
                        <SelectValue placeholder="Select your industry" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900/95 border-gray-700">
                        {industries.map((industry) => (
                          <SelectItem
                            key={industry}
                            value={industry}
                            className="text-white hover:bg-white/10"
                          >
                            {industry}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>

                <FormField
                  label="Company Description"
                  name="description"
                  required
                  hint="Tell us about your company and what you do (minimum 20 characters)"
                  errors={errors}
                  touchedFields={touchedFields}
                  formData={formData}
                  handleChange={handleChange}
                  handleBlur={handleBlur}
                >
                  <Textarea
                    name="description"
                    placeholder="Describe your company and what you do"
                    value={formData.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`min-h-[120px] bg-white/10 border rounded-xl px-4 py-3 placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 transition-colors ${
                      errors.description
                        ? "border-red-500/50 focus:ring-red-400"
                        : touchedFields.description &&
                          !errors.description &&
                          formData.description?.trim()
                        ? "border-green-500/50 focus:ring-green-400"
                        : "border-white/10 focus:ring-green-400"
                    }`}
                  />
                  {formData.description && (
                    <div className="text-xs text-gray-400">
                      {formData.description.length}/1000 characters
                    </div>
                  )}
                </FormField>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || isPending}
              className="w-full bg-gradient-to-r from-green-400 via-green-500 to-green-600 hover:from-green-500 hover:via-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Completing Profile...
                </div>
              ) : (
                "Complete Profile"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

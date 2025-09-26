"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Building,
  User,
  MapPin,
  Users,
  Briefcase,
  Camera,
} from "lucide-react";
import { toast } from "react-hot-toast";

// Required fields for hiring managers
const HIRING_REQUIRED_FIELDS = {
  basic: [
    { field: "name", label: "Full Name", icon: User },
    { field: "image", label: "Profile Picture", icon: Camera },
  ],
  profile: [
    { field: "location", label: "Location", icon: MapPin },
    { field: "companyName", label: "Company Name", icon: Building },
    { field: "companySize", label: "Company Size", icon: Users },
    { field: "industry", label: "Industry", icon: Briefcase },
  ],
};

export function HiringProfileValidator({
  session,
  onProfileComplete,
  onProfileIncomplete,
  children,
}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [showProfileCheck, setShowProfileCheck] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [checkComplete, setCheckComplete] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchAndValidateProfile();
    }
  }, [session?.user?.id]);

  const fetchAndValidateProfile = async () => {
    try {
      setProfileLoading(true);
      console.log("🔍 Fetching hiring manager profile...");

      const response = await fetch(`/api/profile/${session.user.id}`);
      const data = await response.json();

      if (response.ok && data.user) {
        setUser(data.user);
        const missing = checkProfileCompleteness(data.user);

        if (missing.length === 0) {
          console.log("✅ Profile complete - allowing gig creation");
          setCheckComplete(true);
          onProfileComplete?.(data.user);
        } else {
          console.log("❌ Profile incomplete:", missing);
          setMissingFields(missing);
          setShowProfileCheck(true);
          onProfileIncomplete?.(missing);
        }
      } else {
        toast.error("Failed to load profile");
        onProfileIncomplete?.([{ field: "profile", label: "Profile Data" }]);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
      onProfileIncomplete?.([{ field: "profile", label: "Profile Data" }]);
    } finally {
      setProfileLoading(false);
    }
  };

  const checkProfileCompleteness = (userData) => {
    if (!userData || userData.role !== "hiring") return [];

    const missing = [];

    // Check basic fields
    HIRING_REQUIRED_FIELDS.basic.forEach(({ field, label, icon }) => {
      if (
        !userData[field] ||
        (typeof userData[field] === "string" && !userData[field].trim())
      ) {
        missing.push({ field, label, type: "basic", icon });
      }
    });

    // Check profile fields
    const profile = userData.profile || {};
    HIRING_REQUIRED_FIELDS.profile.forEach(({ field, label, icon }) => {
      if (
        !profile[field] ||
        (typeof profile[field] === "string" && !profile[field].trim())
      ) {
        missing.push({ field, label, type: "profile", icon });
      }
    });

    return missing;
  };

  const handleProfileRedirect = () => {
    toast("Redirecting to complete your profile...", { icon: "📝" });
    router.push("/dashboard/profile");
  };

  const handleRetryCheck = async () => {
    setShowProfileCheck(false);
    await fetchAndValidateProfile();
  };

  // Show loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Validating your profile...</p>
          <p className="text-gray-500 text-sm mt-2">
            Ensuring you have all required information to create gigs
          </p>
        </div>
      </div>
    );
  }

  // Show profile completion modal if needed
  if (showProfileCheck && missingFields.length > 0) {
    return (
      <Dialog open onOpenChange={() => {}}>
        <DialogContent className="bg-white border-2 border-gray-200 text-black max-w-3xl shadow-2xl">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold text-black flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 border-2 border-blue-200">
                <AlertCircle className="h-6 w-6 text-blue-600" />
              </div>
              Complete Your Hiring Profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Profile Status Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-blue-500 shadow-lg">
                    <Building className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-black text-lg mb-2">
                      Hiring Manager Profile Setup Required
                    </h3>
                    <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                      To post gigs and connect with freelancers on Un-job,
                      please complete the following required fields in your
                      profile. This helps freelancers understand your company
                      and builds trust.
                    </p>

                    {/* Missing Fields List */}
                    <div className="space-y-3 bg-white rounded-xl p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-700 text-sm mb-3">
                        Required Fields ({missingFields.length}):
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {missingFields.map((field, index) => {
                          const IconComponent = field.icon || AlertCircle;
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
                            >
                              <div className="p-2 bg-blue-100 rounded-full">
                                <IconComponent className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <span className="text-black font-medium text-sm">
                                  {field.label}
                                </span>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {field.type === "basic"
                                      ? "Basic Info"
                                      : "Company Info"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-yellow-800 text-sm font-medium">
                          Profile Completion:{" "}
                          {Math.max(0, 100 - missingFields.length * 15)}%
                        </span>
                      </div>
                    </div>

                    {/* Why This Matters */}
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <h5 className="font-semibold text-green-800 text-sm mb-2">
                        Why complete your profile?
                      </h5>
                      <ul className="text-green-700 text-xs space-y-1">
                        <li>• Build trust with freelancers</li>
                        <li>• Get higher quality applications</li>
                        <li>• Show your company's professionalism</li>
                        <li>• Required for posting gigs on Un-job</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-2">
              <Button
                onClick={handleProfileRedirect}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 h-12 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                <Building className="h-4 w-4 mr-2" />
                Complete Profile Now
              </Button>
              <Button
                onClick={handleRetryCheck}
                variant="outline"
                className="bg-gray-100 border-2 border-gray-200 text-gray-700 hover:bg-gray-200 hover:border-gray-300 h-12 rounded-xl px-6 font-medium"
              >
                Recheck Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show children if profile is complete
  if (checkComplete) {
    return children;
  }

  // Fallback loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

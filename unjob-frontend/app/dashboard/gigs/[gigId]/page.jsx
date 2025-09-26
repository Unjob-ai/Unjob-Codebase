"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  X,
  Send,
  Hand,
  User,
  Eye,
  Clock,
  CheckCircle,
  TrendingUp,
  Zap,
  Plus,
  Loader2,
  Edit3,
  AlertCircle,
  ArrowLeft,
  Star,
  Trash2,
  MoreHorizontal,
  Calendar,
  MapPin,
  Briefcase,
  Share2,
  Copy,
  Check,
  Link as LinkIcon,
  UserPlus,
} from "lucide-react";
import { toast } from "react-hot-toast";
import EditGigModal from "@/components/modals/gig-edit-modal";
import { useFollowState } from "@/hooks/useFollowState";

export default function GigDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const gigId = params.gigId;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedGigs, setRelatedGigs] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applicationData, setApplicationData] = useState({
    iterations: 1,
  });
  const [showMinPostsModal, setShowMinPostsModal] = useState(false);
  const [userPostsCount, setUserPostsCount] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { followingUsers, followLoading, handleFollow } = useFollowState();

  useEffect(() => {
    if (gigId) {
      fetchGigDetails();
    }
  }, [gigId]);

  useEffect(() => {
    if (gig) {
      fetchRelatedGigs();
    }
  }, [gig]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (status === "authenticated" && session?.user) {
        try {
          setRoleLoading(true);

          // Use the session user role if available
          if (session.user.role) {
            setUserRole(session.user.role);
            console.log("User role from session:", session.user.role);
          } else {
            // Fallback to API call only if role is missing from session
            console.log("Role not found in session, fetching from API...");
            const response = await fetch("/api/profile/cover");

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.user?.role) {
                setUserRole(data.user.role);
                console.log("User role from API:", data.user.role);
              } else {
                // Default to 'freelancer' if we can't determine role
                setUserRole("freelancer");
                console.log("Defaulting to freelancer role");
              }
            } else {
              console.log("API call failed, defaulting to freelancer role");
              setUserRole("freelancer");
            }
          }
        } catch (error) {
          console.error("Failed to fetch user role:", error);
          setUserRole("freelancer"); // Safe default
        } finally {
          setRoleLoading(false);
        }
      } else if (status === "unauthenticated") {
        setRoleLoading(false);
        setUserRole(null);
      }
    };

    fetchUserRole();
  }, [status, session?.user?.id, session?.user?.role]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserPostsCount();
    }
  }, [session?.user?.id]);

  console.log("Current userRole:", userRole);
  console.log("Role loading:", roleLoading);
  console.log("Session user:", session?.user);

  const fetchGigDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gigs/${gigId}`);
      const data = await response.json();
      if (data.success) {
        setGig(data.gig);
      } else {
        toast.error("Gig not found");
        router.push("/dashboard/gigs");
      }
    } catch (error) {
      console.error("Error fetching gig details:", error);
      toast.error("Failed to load gig details");
      router.push("/dashboard/gigs");
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedGigs = async () => {
    try {
      const response = await fetch(
        `/api/gigs?category=${gig.category}&limit=3`
      );
      const data = await response.json();
      if (data.success) {
        const filtered = data.gigs.filter((g) => g._id !== gig._id).slice(0, 3);
        setRelatedGigs(filtered);
      }
    } catch (error) {
      console.error("Error fetching related gigs:", error);
    }
  };

  const fetchUserPostsCount = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/posts/users/${session.user.id}`);
      const data = await response.json();
      if (data.success && data.pagination) {
        setUserPostsCount(data.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching user posts count:", error);
    }
  };

  const handleViewApplications = () => {
    router.push(`/dashboard/gigs/${gig._id}/applications`);
  };

  const handleApplyClick = () => {
    if (!session) {
      toast.error("Please login to apply for gigs");
      return;
    }

    // Check if user has at least 5 posts
    if (userPostsCount < 5) {
      setShowMinPostsModal(true);
      return;
    }

    setShowApplicationForm(true);
  };

  const handleApplicationSubmit = async () => {
    if (
      !applicationData.iterations ||
      applicationData.iterations < 1 ||
      applicationData.iterations > 20
    ) {
      toast.error("Please enter a number between 1 and 20");
      return;
    }

    setIsApplying(true);

    try {
      const response = await fetch("/api/applications/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gigId: gig._id,
          iterations: applicationData.iterations,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Application submitted successfully!");
        setShowApplicationForm(false);
        setShowSuccessModal(true);
        setApplicationData({
          iterations: 1,
        });

        if (result.application?.isPriority) {
          toast.success("🚀 Your application has priority placement!", {
            duration: 4000,
          });
        }
      } else {
        if (result.error === "PROFILE_INCOMPLETE") {
          toast.error(result.message);
        } else if (result.error === "SUBSCRIPTION_REQUIRED") {
          toast.error(result.message);
          if (result.redirectTo) {
            setTimeout(() => router.push(result.redirectTo), 2000);
          }
        } else if (result.error === "SUBSCRIPTION_LIMIT_REACHED") {
          toast.error(result.message);
          if (result.redirectTo) {
            setTimeout(() => router.push(result.redirectTo), 2000);
          }
        } else {
          toast.error(
            result.message || result.error || "Failed to submit application"
          );
        }
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const downloadAsset = async (assetUrl, index) => {
    try {
      const response = await fetch(assetUrl);
      const blob = await response.blob();
      const urlParts = assetUrl.split("/");
      const filename =
        urlParts[urlParts.length - 1].split("?")[0] || `asset-${index + 1}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading asset:", error);
      toast.error("Failed to download asset");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateDuration = () => {
    if (gig?.StartDate && gig?.EndDate) {
      const start = new Date(gig.StartDate);
      const end = new Date(gig.EndDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} days`;
    }
    return gig?.timeline || "4 days";
  };

  const hasUserApplied = () => {
    if (!session || !gig?.applications) return false;
    return gig.applications.some((app) => app.freelancer === session.user.id);
  };

  const isGigOwner = () => {
    if (!session || !gig?.company) return false;
    return (
      gig.company._id === session.user.id || gig.company === session.user.id
    );
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    router.push("/dashboard/settings/freelancer");
  };
  const handleGigUpdated = (updatedGig) => {
    setGig(updatedGig);
    toast.success("Gig updated successfully!");
  };

  const handleGigDeleted = (deletedGigId) => {
    toast.success("Gig deleted successfully!");
    router.push("/dashboard/gigs");
  };
  const handleBackToGigs = () => {
    router.push("/dashboard/gigs");
  };

  const publicShareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/gigs/${gigId}` : "";
  const shareUrl = publicShareUrl;
  const shareText = gig?.title
    ? `${gig.title} on Unjob`
    : "Check out this gig on Unjob";
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error("Copy failed", e);
      toast.error("Failed to copy link");
    }
  };

  // Show loading if still fetching user role or gig details
  if (loading || status === "loading" || roleLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-white text-lg">Loading gig details...</p>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg">Gig not found</p>
          <Button
            onClick={handleBackToGigs}
            className="mt-4 bg-emerald-500 hover:bg-emerald-600 text-black"
          >
            Back to Gigs
          </Button>
        </div>
      </div>
    );
  }

  const shouldShowApplyButton = () => {
    console.log(
      "Role check - userRole:",
      userRole,
      "roleLoading:",
      roleLoading
    );

    // Don't show if still loading role
    if (roleLoading) return false;

    // Don't show if gig is not active
    if (gig.status !== "active") return false;

    // Don't show if user is the gig owner
    if (isGigOwner()) return false;

    // ONLY show for freelancers
    if (userRole !== "freelancer") return false;

    return true;
  };

  // Similar Gigs Component (extracted for reuse)
  const SimilarGigsSection = () => (
    <>
      {relatedGigs.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-white">SIMILAR GIGS</h3>
            <Button
              variant="ghost"
              className="text-emerald-400 hover:text-emerald-300"
              onClick={() => router.push("/dashboard/gigs")}
            >
              View all
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedGigs.map((relatedGig) => {
              // Check if current user owns this gig
              const isRelatedGigOwner =
                session &&
                relatedGig.company &&
                (relatedGig.company._id === session.user.id ||
                  relatedGig.company === session.user.id);

              // Check if user has already applied to this gig
              const hasAppliedToRelatedGig =
                session &&
                relatedGig.applications &&
                relatedGig.applications.some(
                  (app) => app.freelancer === session.user.id
                );

              return (
                <Card
                  key={relatedGig._id}
                  className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/30 transition-colors cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/gigs/${relatedGig._id}`)
                  }
                >
                  <CardContent className="p-6 space-y-4">
                    {/* Hero Image */}
                    <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl overflow-hidden">
                      {relatedGig.bannerImage ? (
                        <img
                          src={relatedGig.bannerImage}
                          alt={relatedGig.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "/api/placeholder/400/200";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Briefcase className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* Company Info */}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={relatedGig.company?.image}
                          alt={relatedGig.company?.name}
                        />
                        <AvatarFallback
                          className="text-white text-sm font-bold"
                          style={{
                            background:
                              "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                          }}
                        >
                          {typeof relatedGig.company?.name === 'string' ? relatedGig.company.name.charAt(0).toUpperCase() : "C"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-white text-sm truncate block">
                          {relatedGig.company?.profile?.companyName ||
                            relatedGig.company?.name ||
                            "Company"}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {relatedGig.timeAgo || "2h ago"}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-white font-medium leading-tight line-clamp-2 min-h-[3rem]">
                      {relatedGig.title}
                    </h4>

                    {/* Budget and Timeline */}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-emerald-400">
                        ₹{relatedGig.budget?.toLocaleString() || "0"}
                      </span>
                      <div className="flex items-center gap-1 text-gray-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{relatedGig.timeline || "4 days"}</span>
                      </div>
                    </div>

                    {/* Role-based Action Button */}
                    {!roleLoading && (
                      <>
                        {/* Show Apply button ONLY for freelancers who don't own the gig and haven't applied */}
                        {userRole === "freelancer" &&
                        !isRelatedGigOwner &&
                        !hasAppliedToRelatedGig &&
                        relatedGig.status === "active" ? (
                          <Button
                            className="w-full text-white font-medium rounded-xl hover:scale-105 transition-transform"
                            style={{
                              background:
                                "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/gigs/${relatedGig._id}`);
                            }}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Apply Now
                          </Button>
                        ) : userRole === "freelancer" &&
                          hasAppliedToRelatedGig ? (
                          /* Show Already Applied for freelancers who have applied */
                          <Button
                            disabled
                            className="w-full text-gray-300 font-medium rounded-xl bg-gray-600 cursor-not-allowed"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Already Applied
                          </Button>
                        ) : isRelatedGigOwner ? (
                          /* Show Manage button for gig owners */
                          <Button
                            className="w-full text-white font-medium rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/gigs/${relatedGig._id}`);
                            }}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Manage Gig
                          </Button>
                        ) : (
                          /* Show View Details for non-freelancers and other cases */
                          <Button
                            className="w-full text-gray-300 font-medium rounded-xl bg-gray-700 hover:bg-gray-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/gigs/${relatedGig._id}`);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        )}
                      </>
                    )}

                    {/* Status indicator */}
                    {relatedGig.status !== "active" && (
                      <div className="text-center">
                        <Badge
                          variant="outline"
                          className="text-xs text-gray-400 border-gray-600"
                        >
                          {relatedGig.status || "Inactive"}
                        </Badge>
                      </div>
                    )}

                    {/* Application count for gig owners */}
                    {isRelatedGigOwner &&
                      relatedGig.applications &&
                      relatedGig.applications.length > 0 && (
                        <div className="text-center text-xs text-gray-400 border-t border-gray-800 pt-2">
                          {relatedGig.applications.length} application
                          {relatedGig.applications.length !== 1 ? "s" : ""}
                        </div>
                      )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="bg-black border-b border-gray-800 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Button
                onClick={handleBackToGigs}
                variant="ghost"
                className="text-white hover:text-emerald-400 hover:bg-gray-800"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Gigs
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
            {/* Left Column - Main Content (75% width) */}
            <div className="lg:col-span-4 space-y-8">
              {/* Hero Image Section */}
              {gig.bannerImage && (
                <div className="aspect-video bg-gray-900 rounded-2xl overflow-hidden">
                  <img
                    src={gig.bannerImage}
                    alt={gig.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "/api/placeholder/800/400";
                    }}
                  />
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl font-bold text-white leading-tight">
                {gig.title}
              </h1>

              {/* Company Info */}
              <div
                className="flex items-center gap-4 p-6 bg-gray-900/50 rounded-2xl border border-gray-800 cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => {
                  const companyId =
                    gig.company?._id || (typeof gig.company === "string" ? gig.company : null);
                  if (companyId) {
                    router.push(`/dashboard/profile/${companyId}`);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    const companyId =
                      gig.company?._id || (typeof gig.company === "string" ? gig.company : null);
                    if (companyId) {
                      router.push(`/dashboard/profile/${companyId}`);
                    }
                  }
                }}
              >
                <Avatar className="h-16 w-16 ring-2 ring-emerald-500/20">
                  <AvatarImage
                    src={gig.company?.image}
                    alt={gig.company?.name}
                  />
                  <AvatarFallback
                    className="text-white text-xl font-bold"
                    style={{
                      background:
                        "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                    }}
                  >
                    {typeof gig.company?.name === 'string' ? gig.company.name.charAt(0).toUpperCase() : "C"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-white font-semibold text-xl">
                      {gig.company?.profile?.companyName || gig.company?.name}
                    </h3>
                    {gig.company?.isVerified && (
                      <Badge
                        className="text-white text-xs border-0"
                        style={{
                          background:
                            "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                        }}
                      >
                        ✓ Verified
                      </Badge>
                    )}
                    {/* Follow Button */}
                    {session?.user?.id && gig.company?._id !== session.user.id && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollow(gig.company._id);
                        }}
                        disabled={followLoading.has(gig.company._id)}
                        size="sm"
                        className={
                          followingUsers.has(gig.company._id)
                            ? "bg-transparent border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 text-xs px-3 py-1.5"
                            : "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 text-xs px-3 py-1.5"
                        }
                      >
                        {followLoading.has(gig.company._id) ? (
                          <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3 mr-1" />
                            {followingUsers.has(gig.company._id) ? "Following" : "Follow"}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Project Overview
                </h2>
                <div className="text-gray-300 text-lg leading-relaxed">
                  {gig.projectOverview ||
                    gig.description ||
                    "We are building a modern, clean, and responsive landing page for a SaaS product targeting startup founders. The page should include product highlights, testimonials, CTAs, and pricing sections."}
                </div>
              </div>

              {/* Tags */}
              {(gig.tags || gig.skillsRequired) && (
                <div className="flex flex-wrap gap-3">
                  {(gig.tags || gig.skillsRequired)?.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-800/50 text-emerald-400 px-4 py-2 rounded-xl text-sm border border-gray-700/50 hover:border-emerald-500/30 transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Deliverables */}
              {gig.deliverables && gig.deliverables.length > 0 && (
                <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Zap className="w-6 h-6 text-emerald-400" />
                    DELIVERABLES
                  </h3>
                  <div className="space-y-4">
                    {gig.deliverables.map((deliverable, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{
                            background:
                              "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                          }}
                        >
                          →
                        </div>
                        <span className="text-white text-lg">
                          {deliverable}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reference Files */}
              <div className="bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-emerald-400" />
                  REFERENCE FILES
                </h3>
                {gig.DerscribeAssets && (
                  <p className="text-gray-400 text-sm mb-4">
                    {gig.DerscribeAssets}
                  </p>
                )}
                <div className="space-y-3">
                  {gig.uploadAssets && gig.uploadAssets.length > 0 ? (
                    gig.uploadAssets.map((assetUrl, index) => {
                      const urlParts = assetUrl.split("/");
                      const filename =
                        urlParts[urlParts.length - 1].split("?")[0] ||
                        `Asset ${index + 1}`;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center"
                              style={{
                                background:
                                  "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                              }}
                            >
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-white text-lg">
                              {filename}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadAsset(assetUrl, index)}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          >
                            <Download className="w-5 h-5" />
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500 text-center py-8 bg-gray-800/30 rounded-xl">
                      No reference files uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* Similar Gigs - Desktop Only (hidden on mobile) */}
              <div className="hidden lg:block">
                <SimilarGigsSection />
              </div>
            </div>

            {/* Right Sidebar (25% width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Budget Card */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-6">
                  <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    BUDGET & PAYMENTS
                  </h3>
                  <div>
                    <p className="text-gray-400 mb-2">Fixed Budget</p>
                    <p className="text-3xl font-bold text-emerald-400">
                      ₹{gig.budget?.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline Card */}
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-6">
                  <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    TIMELINE & DEADLINE
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Start Date:</span>
                      <span className="text-white text-right">
                        {gig.StartDate
                          ? formatDate(gig.StartDate)
                          : "Within 2 days"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Duration:</span>
                      <span className="text-white text-right">
                        {calculateDuration()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Applications Count */}
              {gig.applications && gig.applications.length > 0 && (
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <User className="h-4 w-4" />
                        <span>
                          {gig.applications.length} applications received
                        </span>
                      </div>
                      {isGigOwner() && (
                        <Button
                          onClick={handleViewApplications}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View All
                        </Button>
                      )}
                    </div>

                    {isGigOwner() && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold text-yellow-400">
                              {
                                gig.applications.filter(
                                  (app) => app.applicationStatus === "pending"
                                ).length
                              }
                            </div>
                            <div className="text-xs text-gray-400">Pending</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-emerald-400">
                              {
                                gig.applications.filter(
                                  (app) => app.applicationStatus === "accepted"
                                ).length
                              }
                            </div>
                            <div className="text-xs text-gray-400">
                              Accepted
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-400">
                              {
                                gig.applications.filter(
                                  (app) => app.applicationStatus === "rejected"
                                ).length
                              }
                            </div>
                            <div className="text-xs text-gray-400">
                              Rejected
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {/* Apply Button - Only show for freelancers */}
              {shouldShowApplyButton() && (
                <div className="space-y-4">
                  {hasUserApplied() ? (
                    <Button
                      disabled
                      className="w-full py-4 text-lg bg-gray-600 text-gray-300 rounded-xl cursor-not-allowed"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Already Applied
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleApplyClick}
                        className="w-full py-4 text-lg text-black font-bold rounded-xl transform hover:scale-105 transition-all duration-200"
                        style={{
                          background:
                            "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                        }}
                      >
                        APPLY FOR THIS GIG
                      </Button>

                      {/* Posts count indicator - only show when user has less than 5 posts */}
                      {userPostsCount < 5 && (
                        <div className="text-center text-sm text-gray-400">
                          <span>
                            Your Posts: {userPostsCount}/5 minimum required
                          </span>
                          <div className="mt-1 text-red-400">
                            Need {5 - userPostsCount} more posts to apply
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Manage Gig Button - Only for gig owner */}
              {isGigOwner() && (
                <div className="space-y-4">
                  {/* Desktop Actions */}
                  <div className="hidden md:block space-y-3">
                    <Button
                      onClick={() => setIsEditModalOpen(true)}
                      className="w-full py-4 text-lg bg-green-600 hover:bg-green-700 text-white rounded-xl"
                    >
                      <Edit3 className="h-5 w-5 mr-2" />
                      EDIT GIG
                    </Button>
                    <Button
                      onClick={handleViewApplications}
                      className="w-full py-4 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      MANAGE APPLICATIONS
                    </Button>
                  </div>

                  {/* Mobile Actions */}
                  <div className="md:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-full py-4 text-lg bg-gray-800 hover:bg-gray-700 text-white rounded-xl">
                          <MoreHorizontal className="h-5 w-5 mr-2" />
                          MANAGE GIG
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 bg-gray-900 border-gray-700"
                      >
                        <DropdownMenuItem
                          onClick={() => setIsEditModalOpen(true)}
                          className="text-white hover:bg-green-600/20 hover:text-green-400 cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Gig
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleViewApplications}
                          className="text-white hover:bg-blue-600/20 hover:text-blue-400 cursor-pointer"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Applications
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}

              {/* Share Gig Button - Visible for everyone */}
              <div className="space-y-4">
                <Button
                  onClick={() => setShowShareModal(true)}
                  variant="outline"
                  className="w-full py-4 text-lg rounded-xl border-emerald-600 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  Share this Gig
                </Button>
              </div>
            </div>
          </div>

          {/* Similar Gigs - Mobile Only (shown at bottom on mobile) */}
          <div className="lg:hidden mt-8">
            <SimilarGigsSection />
          </div>
        </div>
      </div>

      {/* Application Form Modal */}
      <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
        <DialogContent className="bg-white text-black max-w-2xl w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-black">
              APPLY FOR THIS GIG
            </DialogTitle>
            <p className="text-gray-600 text-sm mt-2">
              Select or enter the number of iterations you want to provide for
              this project.
            </p>
          </DialogHeader>

          <div className="p-4 space-y-5">
            <div>
              <Label className="text-black font-medium text-base mb-3 block">
                Number of Iterations *
              </Label>
              <div className="space-y-3">
                <div>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    placeholder="Type any number between 1-20"
                    value={
                      applicationData.iterations !== null &&
                      applicationData.iterations !== undefined
                        ? applicationData.iterations
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      let numValue = Number(value);
                      if (isNaN(numValue) || value === "") {
                        setApplicationData({
                          ...applicationData,
                          iterations: null,
                        });
                      } else {
                        numValue = Math.max(1, Math.min(20, numValue));
                        setApplicationData({
                          ...applicationData,
                          iterations: numValue,
                        });
                      }
                    }}
                    className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                  />

                  <p className="text-xs text-gray-500 mt-1">
                    You can type any number between 1 and 20 iterations
                  </p>
                </div>
              </div>

              {applicationData.iterations && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-700 text-sm font-medium">
                    ✓ Selected: {applicationData.iterations} iteration
                    {applicationData.iterations > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleApplicationSubmit}
                disabled={isApplying || !applicationData.iterations}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-full h-10 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application{" "}
                    {applicationData.iterations
                      ? `(${applicationData.iterations} iteration${
                          applicationData.iterations > 1 ? "s" : ""
                        })`
                      : ""}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowApplicationForm(false)}
                className="flex-1 border-green-500 text-green-500 hover:bg-green-50 rounded-full h-10 text-sm font-medium bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-white text-black max-w-md w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>

            <DialogTitle className="text-xl font-bold text-black mb-3">
              Application Submitted Successfully!
            </DialogTitle>
            <p className="text-gray-600 mb-6 leading-relaxed text-sm">
              Your application has been sent to the client. They will review
              your proposal and contact you if you're selected for the project.
            </p>

            <Button
              onClick={handleCloseSuccess}
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-10 text-sm font-medium"
            >
              Go to Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Minimum Posts Required Modal */}
      <Dialog open={showMinPostsModal} onOpenChange={setShowMinPostsModal}>
        <DialogContent className="bg-white text-black max-w-md w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
          <div className="p-6 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <DialogTitle className="text-xl font-bold text-black mb-3">
              Minimum Posts Required
            </DialogTitle>
            <div className="text-gray-600 mb-6 leading-relaxed text-sm space-y-2">
              <p>
                You need to have at least <strong>5 posts</strong> to apply for
                gigs.
              </p>
              <p>
                You currently have{" "}
                <strong>
                  {userPostsCount} post{userPostsCount !== 1 ? "s" : ""}
                </strong>
                .
              </p>
              <p>
                Create {5 - userPostsCount} more post
                {5 - userPostsCount !== 1 ? "s" : ""} to unlock gig
                applications.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  setShowMinPostsModal(false);
                  router.push("/dashboard/profile");
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-10 text-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Posts
              </Button>
              <Button
                onClick={() => setShowMinPostsModal(false)}
                variant="outline"
                className="bg-white w-full border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-black rounded-full h-10 text-sm font-medium"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Gig Modal */}
      {isGigOwner() && (
        <EditGigModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          gig={gig}
          onGigUpdated={handleGigUpdated}
          onGigDeleted={handleGigDeleted}
        />
      )}

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="bg-white text-black max-w-md w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader className="p-0 mb-4">
              <DialogTitle className="text-xl font-bold text-black flex items-center">
                <Share2 className="h-5 w-5 mr-2" /> Share this Gig
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <LinkIcon className="h-4 w-4 text-gray-500 shrink-0" />
                  <Input
                    readOnly
                    value={shareUrl}
                    className="bg-transparent border-0 text-black focus-visible:ring-0 truncate"
                  />
                </div>
                <Button
                  onClick={handleCopyLink}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </>
                  )}
                </Button>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-3">Share via</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <a
                    href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white">WhatsApp</Button>
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-black hover:bg-gray-900 text-white">X / Twitter</Button>
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">LinkedIn</Button>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">Facebook</Button>
                  </a>
                  <a
                    href={`mailto:?subject=${encodedText}&body=${encodedUrl}`}
                    className="block"
                  >
                    <Button className="w-full bg-gray-700 hover:bg-gray-800 text-white">Email</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

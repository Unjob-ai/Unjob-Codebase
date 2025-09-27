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
  Loader2,
  AlertCircle,
  ArrowLeft,
  Star,
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
import { useFollowState } from "@/hooks/useFollowState";

export default function PublicGigDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const gigId = params.gigId;

  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedGigs, setRelatedGigs] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applicationData, setApplicationData] = useState({
    iterations: 1,
  });
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
      if (status === "authenticated" && session?.user?.id) {
        try {
          setRoleLoading(true);

          let response = await fetch("/api/profile/cover");
          let data = await response.json();

          if (data.success && data.user?.role) {
            setUserRole(data.user.role);
          } else {
            response = await fetch("/api/profile");
            data = await response.json();
            if (data.success && data.user?.role) {
              setUserRole(data.user.role);
            } else if (data.profile?.role) {
              setUserRole(data.profile.role);
            } else {
              response = await fetch("/api/user");
              data = await response.json();
              if (data.success && data.user?.role) {
                setUserRole(data.user.role);
              } else {
                setUserRole("freelancer");
              }
            }
          }
        } catch (error) {
          setUserRole("freelancer");
        } finally {
          setRoleLoading(false);
        }
      } else {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [status, session?.user?.id]);

  const fetchGigDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gigs/${gigId}`);
      const data = await response.json();
      if (data.success) {
        setGig(data.gig);
      } else {
        toast.error("Gig not found");
        router.push("/");
      }
    } catch (error) {
      toast.error("Failed to load gig details");
      router.push("/");
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
    } catch (error) {}
  };



  const handleApplyClick = () => {
    if (!session) {
      const callbackUrl = encodeURIComponent(window.location.href);
      router.push(`/login?callbackUrl=${callbackUrl}`);
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
      toast.error("Failed to submit application. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const downloadAsset = async (assetUrl, index) => {
    try {
      if (!session) {
        const callbackUrl = encodeURIComponent(window.location.href);
        router.push(`/login?callbackUrl=${callbackUrl}`);
        return;
      }
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

  const handleBackToGigs = () => {
    router.push("/");
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
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
      toast.error("Failed to copy link");
    }
  };

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
            Back
          </Button>
        </div>
      </div>
    );
  }

  const shouldShowApplyButton = () => {
    if (gig.status !== "active") return false;
    if (isGigOwner()) return false;
    if (userRole === "hiring") return false;
    return true;
  };



  return (
    <>
      <div className="min-h-screen bg-black text-white">
       
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-8">
            <div className="lg:col-span-4 space-y-8">
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

              <h1 className="text-4xl font-bold text-white leading-tight">
                {gig.title}
              </h1>

              <div  className="flex items-center cursor-pointer gap-4 p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
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



                
                <div  className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3   onClick={() => {
                  const companyId =
                    gig.company?._id || (typeof gig.company === "string" ? gig.company : null);
                  if (companyId) {
                    router.push(`/dashboard/profile/${companyId}`);
                  }
                }} className="text-white font-semibold text-xl">
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
                        onClick={() => handleFollow(gig.company._id)}
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

             
            </div>

            <div className="lg:col-span-2 space-y-6">
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
                     
                    </div>
                  </CardContent>
                </Card>
              )}

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
                  )}
                </div>
              )}

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

         
        </div>
      </div>

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
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-green-500 hover:bg-green-600 text-white rounded-full h-10 text-sm font-medium"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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



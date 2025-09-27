"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function GigDetailsModal({
  gig,
  isOpen,
  onClose,
  userRole,
  onApply,
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [relatedGigs, setRelatedGigs] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [applicationData, setApplicationData] = useState({
    coverLetter: "",
  });

  useEffect(() => {
    if (isOpen && gig) {
      fetchRelatedGigs();
    }
  }, [isOpen, gig]);

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

  const handleViewApplications = () => {
    onClose();
    router.push(`/dashboard/gigs/${gig._id}/applications`);
  };

  const handleApplyClick = () => {
    if (!session) {
      toast.error("Please login to apply for gigs");
      return;
    }
    setShowApplicationForm(true);
  };

  const handleApplicationSubmit = async () => {
    if (!coverLetterValid()) {
      toast.error("Please write at least 1000 characters in your cover letter");
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
          coverLetter: applicationData.coverLetter,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Application submitted successfully!");
        setShowApplicationForm(false);
        setShowSuccessModal(true);
        setApplicationData({
          coverLetter: "",
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

  const getWordCount = (text) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  const getCharacterCount = (text) => {
    return text.trim().length;
  };

  const coverLetterValid = () => {
    return getCharacterCount(applicationData.coverLetter) >= 1000;
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    onClose();
  };

  if (!isOpen || !gig) return null;

  return (
    <>
      {/* Main Gig Details Modal */}
      <Dialog
        open={isOpen && !showApplicationForm && !showSuccessModal}
        onOpenChange={onClose}
      >
        <DialogContent className="bg-[#0B0F0E] text-white max-w-7xl w-[95vw] h-[95vh] mx-auto rounded-2xl border border-gray-800/50 p-0 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/2 to-transparent pointer-events-none rounded-2xl" />

          {/* Content */}
          <div className="relative overflow-y-auto h-full">
            <div className="grid grid-cols-1 lg:grid-cols-4 h-full">
              {/* Left Column - Main Content (75% width) */}
              <div className="lg:col-span-3 p-6 space-y-6 overflow-y-auto">
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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                  {gig.title}
                </h1>

                {/* Company Info */}
                <div
                  className="flex items-center gap-4 cursor-pointer"
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
                  <Avatar className="h-12 w-12 ring-2 ring-emerald-500/20">
                    <AvatarImage
                      src={gig.company?.image}
                      alt={gig.company?.name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-500 text-white text-lg font-bold">
                      {typeof gig.company?.name === 'string' ? gig.company.name.charAt(0).toUpperCase() : "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-lg">
                        {gig.company?.profile?.companyName || gig.company?.name}
                      </p>
                      {gig.company?.isVerified && (
                        <Badge className="bg-blue-500/20 text-blue-400 text-xs border-0">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                      <span>Posted {gig.timeAgo || "2h ago"}</span>
                      <span>•</span>
                      <span className="text-emerald-400">Remote</span>
                      <span>•</span>
                      <span>{gig.category}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="text-gray-300 text-lg leading-relaxed">
                  {gig.projectOverview ||
                    gig.description ||
                    "We are building a modern, clean, and responsive landing page for a SaaS product targeting startup founders. The page should include product highlights, testimonials, CTAs, and pricing sections."}
                </div>

                {/* Tags */}
                {(gig.tags || gig.skillsRequired) && (
                  <div className="flex flex-wrap gap-3">
                    {(gig.tags || gig.skillsRequired)?.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-800/50 text-emerald-400 px-4 py-2 rounded-lg text-sm border border-gray-700/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Deliverables */}
                {gig.deliverables && gig.deliverables.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Zap className="w-6 h-6 text-emerald-400" />
                      DELIVERABLES
                    </h3>
                    <div className="space-y-3">
                      {gig.deliverables.map((deliverable, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <span className="text-emerald-400 text-lg">→</span>
                          <span className="text-white text-lg">
                            {deliverable}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reference Files */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
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
                            className="flex items-center justify-between bg-gray-800/30 p-4 rounded-lg border border-gray-700/50 hover:bg-gray-600/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-emerald-400" />
                              </div>
                              <span className="text-white text-lg">
                                {filename}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadAsset(assetUrl, index)}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              <Download className="w-5 h-5" />
                            </Button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-gray-500 text-center py-8">
                        No reference files uploaded
                      </div>
                    )}
                  </div>
                </div>

                {/* Similar Gigs */}
                {relatedGigs.length > 0 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-white">
                        SIMILAR GIGS
                      </h3>
                      <Button
                        variant="ghost"
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        View all
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {relatedGigs.map((relatedGig) => (
                        <Card
                          key={relatedGig._id}
                          className="bg-gray-800/30 border-gray-700/50 hover:border-emerald-500/30 transition-colors"
                        >
                          <CardContent className="p-6 space-y-4">
                            <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg"></div>

                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-blue-500 text-white text-sm">
                                  {typeof relatedGig.company?.name === 'string' ? relatedGig.company.name.charAt(0) : "C"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-white text-sm">
                                {relatedGig.company?.name}
                              </span>
                            </div>

                            <h4 className="text-white font-medium leading-tight">
                              {relatedGig.title}
                            </h4>

                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-emerald-400">
                                ₹{relatedGig.budget?.toLocaleString()}
                              </span>
                              <div className="flex items-center gap-1 text-gray-400 text-sm">
                                <Clock className="w-4 h-4" />4 days
                              </div>
                            </div>

                            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium rounded-lg">
                              Apply 📤
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar (25% width) */}
              <div className="lg:col-span-1 bg-gray-900/50 p-6 space-y-6 border-l border-gray-800/50">
                {/* Budget Card */}
                <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border-gray-700/50">
                  <CardContent className="p-6">
                    <h3 className="text-white font-bold text-md mb-6 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      BUDGET & PAYMENTS
                    </h3>
                    <div>
                      <p className="text-gray-400 mb-2">Fixed Budget</p>
                      <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                        ₹{gig.budget?.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline Card */}
                <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border-gray-700/50">
                  <CardContent className="p-6">
                    <h3 className="text-white font-bold text-md mb-6 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-emerald-400" />
                      TIMELINE & DEADLINE
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-emerald-400">Start Date :</span>
                        <span className="text-white text-right">
                          {gig.StartDate
                            ? formatDate(gig.StartDate)
                            : "Within 2 days"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-400">
                          Expected Duration :
                        </span>
                        <span className="text-white text-right">
                          {calculateDuration()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-400">Deadline :</span>
                        <span className="text-white text-right">
                          {gig.EndDate
                            ? formatDate(gig.EndDate)
                            : "July 27, 2025"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Applications Count */}
                {gig.applications && gig.applications.length > 0 && (
                  <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border-gray-700/50">
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
                        <div className="mt-4 pt-4 border-t border-gray-700/50">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-yellow-400">
                                {
                                  gig.applications.filter(
                                    (app) => app.applicationStatus === "pending"
                                  ).length
                                }
                              </div>
                              <div className="text-xs text-gray-400">
                                Pending
                              </div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-emerald-400">
                                {
                                  gig.applications.filter(
                                    (app) =>
                                      app.applicationStatus === "accepted"
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
                                    (app) =>
                                      app.applicationStatus === "rejected"
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

                {/* Apply Button */}
                {(userRole === "freelancer" || !userRole) &&
                  gig.status === "active" &&
                  !isGigOwner() && (
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
                          className="w-full py-4 text-lg bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-black font-bold rounded-xl transform hover:scale-105 transition-all duration-200"
                        >
                          APPLY FOR THIS GIG
                        </Button>
                      )}
                    </div>
                  )}

                {/* Manage Gig Button - Only for gig owner */}
                {isGigOwner() && (
                  <div className="space-y-4">
                    <Button
                      onClick={handleViewApplications}
                      className="w-full py-4 text-lg bg-blue-600 hover:bg-blue-700 rounded-xl"
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      MANAGE APPLICATIONS
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Application Form Modal */}
      <Dialog open={showApplicationForm} onOpenChange={setShowApplicationForm}>
        <DialogContent className="bg-[#0B0F0E] text-white max-w-3xl w-[95vw] mx-auto rounded-2xl border border-gray-800/50">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/2 to-transparent pointer-events-none rounded-2xl" />
          <DialogHeader className="relative border-b border-gray-800/50 pb-4">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Apply for this Gig
            </DialogTitle>
            <p className="text-gray-400 text-sm mt-2">
              Write a compelling cover letter explaining why you're the perfect
              fit for this project.
            </p>
          </DialogHeader>

          <div className="space-y-6 relative pt-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-white font-medium">Cover Letter *</Label>
                <div className="text-xs text-gray-400">
                  Minimum 1000 characters required
                </div>
              </div>

              <Textarea
                value={applicationData.coverLetter}
                onChange={(e) =>
                  setApplicationData({
                    ...applicationData,
                    coverLetter: e.target.value,
                  })
                }
                placeholder="Dear Hiring Manager,

I am excited to apply for this project because...

Here's why I'm the perfect fit:
• [Your relevant experience]
• [Your skills that match this project]
• [Your approach to this specific project]

I understand your requirements and propose to...

Looking forward to discussing this project further.

Best regards,
[Your name]"
                className={`bg-gray-800/50 border-gray-700/50 text-white min-h-[300px] mt-2 backdrop-blur-sm resize-none transition-colors ${
                  !coverLetterValid() && applicationData.coverLetter.length > 0
                    ? "border-red-500/50 focus:border-red-500"
                    : coverLetterValid()
                    ? "border-emerald-500/50 focus:border-emerald-500"
                    : ""
                }`}
                maxLength={5000}
              />

              <div className="flex items-center justify-between mt-2 text-xs">
                <div className="flex items-center gap-4">
                  <span
                    className={`${
                      getCharacterCount(applicationData.coverLetter) >= 1000
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {getCharacterCount(applicationData.coverLetter)}/1000
                    characters
                  </span>
                  <span className="text-gray-500">
                    {getWordCount(applicationData.coverLetter)} words
                  </span>
                </div>
                <span className="text-gray-400">
                  {5000 - getCharacterCount(applicationData.coverLetter)}{" "}
                  characters remaining
                </span>
              </div>

              {applicationData.coverLetter.length > 0 &&
                !coverLetterValid() && (
                  <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      You need{" "}
                      {1000 - getCharacterCount(applicationData.coverLetter)}{" "}
                      more characters to meet the minimum requirement
                    </span>
                  </div>
                )}

              {coverLetterValid() && (
                <div className="flex items-center gap-2 mt-2 text-emerald-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>
                    Great! Your cover letter meets the minimum requirement
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                variant="outline"
                onClick={() => setShowApplicationForm(false)}
                className="flex-1 border-gray-700/50 text-white hover:bg-gray-800/50 bg-transparent backdrop-blur-sm py-3 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplicationSubmit}
                disabled={isApplying || !coverLetterValid()}
                className={`flex-1 font-medium py-3 rounded-xl transition-all duration-300 ${
                  coverLetterValid()
                    ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-black"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="bg-[#0B0F0E] text-white border border-gray-800/50 max-w-md">
          <div className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>

            <DialogTitle className="text-2xl font-bold text-white mb-4">
              Application Submitted Successfully!
            </DialogTitle>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Your application has been sent to the client. They will review
              your proposal and contact you if you're selected for the project.
            </p>

            <Button
              onClick={handleCloseSuccess}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-black font-medium py-3 rounded-xl"
            >
              Perfect, Thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

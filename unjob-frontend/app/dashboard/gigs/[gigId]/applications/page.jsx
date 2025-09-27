"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "next-auth/react";
import {
  CheckCircle,
  XCircle,
  User,
  Search,
  Loader2,
  ChevronLeft,
  ArrowLeft,
  Check,
  CreditCard,
  IndianRupee,
  Shield,
  Clock,
  MoreVertical,
} from "lucide-react";
import { toast } from "react-hot-toast";

const ReviewApplicantsPage = () => {
  const { gigId } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [gig, setGig] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("Applications");

  // Helper function to get user ID from application - FIXED with safe property access
  const getUserId = (application) => {
    if (!application) {
      console.warn("getUserId: application is null or undefined");
      return null;
    }

    try {
      // Try different possible field names for the user ID with safe access
      const possibleIds = [
        application.user?._id,
        application.user,
        application.freelancer?._id,
        application.freelancer,
        application.userId,
        application.freelancerId,
      ];

      for (const id of possibleIds) {
        if (id) {
          const stringId =
            typeof id === "object" && id._id
              ? id._id.toString()
              : id.toString();
          console.log("getUserId: Found ID:", stringId);
          return stringId;
        }
      }

      console.warn("getUserId: No valid ID found in application:", application);
      return null;
    } catch (error) {
      console.error("getUserId: Error extracting user ID:", error, application);
      return null;
    }
  };

  // Helper function to check if application is pending
  const isPending = (application) => {
    if (!application) return false;
    const status =
      application.status || application.applicationStatus || "pending";
    return status.toLowerCase() === "pending";
  };

  // Helper function to get status display
  const getStatusDisplay = (application) => {
    if (!application) return "pending";
    const status =
      application.status || application.applicationStatus || "pending";
    return status.toLowerCase();
  };

  useEffect(() => {
    if (gigId) {
      fetchGigDetails();
    }
  }, [gigId]);

  useEffect(() => {
    // Filter applications based on search term
    let filtered = applications;

    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          (app.name &&
            app.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (app.username &&
            app.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (app.coverLetter &&
            app.coverLetter.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (app.skills &&
            app.skills.some((skill) =>
              skill.toLowerCase().includes(searchTerm.toLowerCase())
            ))
      );
    }

    setFilteredApplications(filtered);
  }, [applications, searchTerm]);

  const fetchGigDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gigs/manage/${gigId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch gig details");
      }

      const data = await response.json();
      console.log("🔍 Full API Response:", data);
      console.log("🎯 Gig data:", data.gig);
      console.log("📋 Applications:", data.gig.applications);

      if (data.gig.applications && data.gig.applications.length > 0) {
        console.log(
          "🔍 First application structure:",
          data.gig.applications[0]
        );
        console.log("👤 User data in first application:", {
          name: data.gig.applications[0].name,
          username: data.gig.applications[0].username,
          userId: data.gig.applications[0].userId,
          freelancerId: data.gig.applications[0].freelancerId,
          hasUser: !!data.gig.applications[0].user,
          extractedId: getUserId(data.gig.applications[0]),
        });
      }

      setGig(data.gig);
      setApplications(data.gig.applications || []);
    } catch (error) {
      console.error("Error fetching gig:", error);
      toast.error("Failed to load gig details");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptApplication = async (applicationData) => {
    try {
      const targetUserId = getUserId(applicationData);

      if (!targetUserId) {
        console.error(
          "Unable to extract user ID from application:",
          applicationData
        );
        toast.error("Unable to identify user for this application");
        return;
      }

      console.log("🎯 Accepting application for user:", targetUserId);
      console.log("📝 Application data:", applicationData);

      setActionLoading(targetUserId);

      const response = await fetch(`/api/applications/${gigId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          freelancerId: targetUserId,
          userId: targetUserId, // Send both for compatibility
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept application");
      }

      const data = await response.json();
      console.log("✅ Accept response:", data);

      if (data.requiresPayment) {
        setPaymentData(data);
        setSelectedApplication(targetUserId);
        setShowPaymentDialog(true);
        setActionLoading(null);
        return;
      }

      toast.success("Application accepted successfully!");
      await fetchGigDetails();

      if (data.conversationId) {
        setTimeout(() => {
          router.push(`/dashboard/messages`);
        }, 2000);
      }
    } catch (error) {
      console.error("Error accepting application:", error);
      toast.error(error.message || "Failed to accept application");
    } finally {
      setActionLoading(null);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    try {
      setPaymentProcessing(true);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const gigBudget = gig.budget || 0;
      const platformCommission = Math.round(gigBudget * 0); // Temporarily disabled commission
      const totalPayableByCompany = gigBudget + platformCommission;

      const options = {
        key: paymentData.keyId,
        amount: totalPayableByCompany * 100,
        currency: paymentData.currency,
        name: "UnJob Platform",
        description: `Accept application for ${paymentData.gigDetails.title}`,
        order_id: paymentData.orderId,
        handler: async function (response) {
          try {
            const verifyResponse = await fetch(
              `/api/applications/${gigId}/accept`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                  freelancerId: selectedApplication,
                  userId: selectedApplication,
                  action: "verify_payment",
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success("🎉 Payment successful! Application accepted.");
              setShowPaymentDialog(false);
              await fetchGigDetails();

              setTimeout(() => {
                router.push(`/dashboard/messages`);
              }, 2000);
            } else {
              toast.error("Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        theme: {
          color: "#10b981",
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment initiation error:", error);
      toast.error("Failed to initiate payment");
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleRejectApplication = async (applicationData) => {
    try {
      const targetUserId = getUserId(applicationData);

      if (!targetUserId) {
        console.error(
          "Unable to extract user ID from application:",
          applicationData
        );
        toast.error("Unable to identify user for this application");
        return;
      }

      setActionLoading(targetUserId);

      const response = await fetch(`/api/applications/${gigId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          freelancerId: targetUserId,
          userId: targetUserId,
          reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject application");
      }

      toast.success("Application rejected successfully");
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedApplication(null);
      await fetchGigDetails();
    } catch (error) {
      console.error("Error rejecting application:", error);
      toast.error("Failed to reject application");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-gray-400">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Gig not found</p>
          <Button
            onClick={() => router.push("/dashboard/gigs")}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Gigs
          </Button>
        </div>
      </div>
    );
  }

  const gigBudget = gig.budget || 0;
  const platformCommission = Math.round(gigBudget * 0); // Temporarily disabled commission
  const totalPayableByCompany = gigBudget + platformCommission;

  return (
    <div className="min-h-screen text-white bg-[#0A0F0D]">
      {/* Main Content */}
      <div className="w-full">
        {/* Header Section */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-8 lg:mb-12">
            REVIEW APPLICANTS
          </h1>

          {/* Navigation Tabs */}
          <div className="mb-6 lg:mb-8">
            <div className="flex space-x-8 lg:space-x-12 border-b border-[#2D3A35] overflow-x-auto">
              {["Applications"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 lg:py-4 px-2 text-base lg:text-lg font-medium transition-colors relative whitespace-nowrap ${
                    activeTab === tab
                      ? "text-emerald-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar - Mobile */}
          <div className="mb-6 lg:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#1A1F1D] border-[#2D3A35] text-white focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Applications Section */}
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="bg-[#1A1F1D] rounded-2xl overflow-hidden border border-[#2D3A35]">
              {/* Search Bar - Desktop */}
              <div className="px-8 py-6 border-b border-[#2D3A35]">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-[#2D3A35] text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-10 gap-6 px-8 py-6 bg-[#151A18] border-b border-[#2D3A35]">
                <div className="col-span-3 text-gray-300 font-medium text-lg">
                  Username
                </div>
                <div className="col-span-2 text-gray-300 font-medium text-lg">
                  Name
                </div>
                <div className="col-span-2 text-gray-300 font-medium text-lg">
                  Project name
                </div>
                <div className="col-span-1 text-center text-gray-300 font-medium text-lg">
                  Iterations
                </div>
                <div className="col-span-2 text-center text-gray-300 font-medium text-lg">
                  Actions
                </div>
              </div>

              {/* Table Body */}
              {filteredApplications.length === 0 ? (
                <div className="px-8 py-16 text-center text-gray-400">
                  <User className="w-16 h-16 mx-auto mb-6 opacity-50" />
                  <p className="text-xl">No applications found</p>
                </div>
              ) : (
                filteredApplications.map((application, index) => {
                  const userId = getUserId(application);
                  return (
                    <div
                      key={application._id || index}
                      className="grid grid-cols-10 gap-6 px-8 py-6 border-b border-[#2D3A35] hover:bg-[#1F2522] transition-colors"
                    >
                      {/* Username column */}
                      <div className="col-span-3 flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={application.image}
                            alt={application.name || "User"}
                          />
                          <AvatarFallback className="bg-emerald-600 text-white text-lg font-semibold">
                            {application.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          onClick={() => {
                            if (userId) {
                              router.push(`/dashboard/profile/${userId}`);
                            }
                          }}
                          className={`text-white text-lg font-medium transition-colors ${
                            userId
                              ? "cursor-pointer hover:text-emerald-400"
                              : "cursor-default"
                          }`}
                        >
                          @{application.username || "user"}
                        </span>
                      </div>

                      {/* Name column */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-white text-lg">
                          {application.name || "Unknown User"}
                        </span>
                      </div>

                      {/* Project name column */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-gray-300 text-lg">
                          {gig.title}
                        </span>
                      </div>

                      {/* Iterations column */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-white text-lg font-semibold">
                          {application.totalIterations || "N/A"}
                        </span>
                      </div>

                      {/* Actions column */}
                      <div className="col-span-2 flex items-center justify-center gap-3">
                        {isPending(application) ? (
                          <>
                            {/* Accept Button */}
                            <Button
                              size="sm"
                              onClick={() =>
                                handleAcceptApplication(application)
                              }
                              disabled={actionLoading === userId || !userId}
                              className="w-10 h-8 p-0 bg-emerald-500 hover:bg-emerald-600 rounded-full border-0 transition-all duration-200 hover:scale-105 disabled:opacity-50"
                            >
                              {actionLoading === userId ? (
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                              ) : (
                                <Check className="w-6 h-6 text-white" />
                              )}
                            </Button>

                            {/* Reject Button */}
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedApplication(application);
                                setShowRejectDialog(true);
                              }}
                              disabled={!userId}
                              className="w-10 h-8 p-0 bg-red-500 hover:bg-red-600 rounded-full border-0 transition-all duration-200 hover:scale-105 disabled:opacity-50"
                            >
                              <XCircle className="w-6 h-6 text-white" />
                            </Button>
                          </>
                        ) : (
                          <Badge
                            className={`px-4 py-2 text-sm font-medium rounded-full ${
                              getStatusDisplay(application) === "accepted"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {getStatusDisplay(application).toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredApplications.length === 0 ? (
              <div className="bg-[#1A1F1D] rounded-2xl p-8 text-center text-gray-400 border border-[#2D3A35]">
                <User className="w-16 h-16 mx-auto mb-6 opacity-50" />
                <p className="text-lg">No applications found</p>
              </div>
            ) : (
              filteredApplications.map((application, index) => {
                const userId = getUserId(application);
                return (
                  <Card
                    key={application._id || index}
                    className="bg-[#1A1F1D] border-[#2D3A35] hover:bg-[#1F2522] transition-colors"
                  >
                    <CardContent className="p-6">
                      {/* Header with Avatar and Name */}
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage
                            src={application.image}
                            alt={application.name || "User"}
                          />
                          <AvatarFallback className="bg-emerald-600 text-white text-lg font-semibold">
                            {application.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p
                            onClick={() => {
                              if (userId) {
                                router.push(`/dashboard/profile/${userId}`);
                              }
                            }}
                            className={`text-white font-medium transition-colors ${
                              userId
                                ? "cursor-pointer hover:text-emerald-400"
                                : "cursor-default"
                            }`}
                          >
                            @{application.username || "user"}
                          </p>
                          <p className="text-gray-300">
                            {application.name || "Unknown User"}
                          </p>
                        </div>
                      </div>

                      {/* Project Name */}
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-1">Project</p>
                        <p className="text-white">{gig.title}</p>
                      </div>

                      {/* Iterations */}
                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-1">
                          Iterations Proposed
                        </p>
                        <p className="text-white font-semibold">
                          {application.totalIterations || "N/A"}
                        </p>
                      </div>

                      {/* Cover Letter Preview */}
                      {application.coverLetter && (
                        <div className="mb-4">
                          <p className="text-gray-400 text-sm mb-1">
                            Cover Letter
                          </p>
                          <p className="text-gray-300 text-sm line-clamp-2">
                            {application.coverLetter}
                          </p>
                        </div>
                      )}

                      {/* Skills */}
                      {application.skills && application.skills.length > 0 && (
                        <div className="mb-4">
                          <p className="text-gray-400 text-sm mb-2">Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {application.skills
                              .slice(0, 3)
                              .map((skill, idx) => (
                                <Badge
                                  key={idx}
                                  className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            {application.skills.length > 3 && (
                              <Badge className="bg-gray-500/20 text-gray-400 border border-gray-500/30 text-xs">
                                +{application.skills.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Rating and Reviews */}
                      {(application.rating > 0 ||
                        application.totalReviews > 0) && (
                        <div className="mb-4">
                          <p className="text-gray-400 text-sm mb-1">Rating</p>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400">★</span>
                            <span className="text-white">
                              {application.rating?.toFixed(1) || "0.0"}
                            </span>
                            <span className="text-gray-400 text-sm">
                              ({application.totalReviews || 0} reviews)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4 border-t border-[#2D3A35]">
                        {isPending(application) ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                handleAcceptApplication(application)
                              }
                              disabled={actionLoading === userId || !userId}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                            >
                              {actionLoading === userId ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Accept
                                </>
                              )}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedApplication(application);
                                setShowRejectDialog(true);
                              }}
                              disabled={!userId}
                              className="flex-1 border-red-500 text-red-400 hover:bg-red-500 hover:text-white disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Badge
                            className={`w-full justify-center py-2 text-sm font-medium ${
                              getStatusDisplay(application) === "accepted"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}
                          >
                            {getStatusDisplay(application).toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent
          className="
    bg-white border-0 text-gray-900
    w-[95%] sm:w-[85%] md:w-[65%] lg:w-[50%] xl:w-[40%] max-w-[500px]
    mx-auto rounded-[25px] shadow-2xl
    p-5 sm:p-6
  "
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-wide">
                CHECK OUT
              </h2>
            </div>
            {/* Project Title */}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
              {paymentData?.gigDetails?.title || gig?.title}
            </h3>

            {/* Banner Image */}
            {paymentData?.gigDetails?.bannerImage && (
              <div className="w-full rounded-2xl overflow-hidden">
                <img
                  src={paymentData.gigDetails.bannerImage}
                  alt="Gig Banner"
                  className="w-full h-30 sm:h-30 md:h-20 lg:h-30 object-cover rounded-xl"
                />
              </div>
            )}

            {/* Assign To */}
            <div>
              <h4 className="text-gray-900 font-semibold text-base mb-3">
                Assign to:
              </h4>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                  <AvatarImage src={paymentData?.freelancerDetails?.image} />
                  <AvatarFallback className="bg-gray-200 text-gray-600">
                    {paymentData?.freelancerDetails?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold text-base sm:text-lg">
                    {paymentData?.freelancerDetails?.name || "User"}
                  </p>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    @{paymentData?.freelancerDetails?.username || "user"}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-gray-900 font-semibold text-base mb-3">
                Timeline:
              </h4>
              <p className="text-gray-600 font-medium text-sm sm:text-base">
                {paymentData?.gigDetails?.timeline ||
                  gig?.timeline ||
                  "Not specified"}
              </p>
            </div>

            {/* Amount Breakdown */}
            <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 space-y-4">
              <h4 className="text-gray-900 font-bold text-lg sm:text-xl">
                Amount Breakdown
              </h4>

              <div className="flex justify-between items-center">
                <span className="text-emerald-500 font-semibold text-sm sm:text-base">
                  Gig Amount
                </span>
                <span className="text-gray-900 font-bold text-sm sm:text-base">
                  ₹{gigBudget?.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-emerald-500 font-semibold text-sm sm:text-base">
                  Platform Fee (5% - 5% (early bird discount))
                </span>
                <span className="text-gray-900 font-bold text-sm sm:text-base">
                  ₹{platformCommission?.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-400 font-semibold text-base sm:text-lg">
                  Total Amount
                </span>
                <span className="text-emerald-500 font-bold text-lg sm:text-xl">
                  ₹{totalPayableByCompany?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handlePayment}
              disabled={paymentProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 sm:py-4 rounded-2xl text-base sm:text-lg h-12 sm:h-14"
            >
              {paymentProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing Payment...
                </>
              ) : (
                "Proceed to Pay"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-white border-0 text-gray-900 max-w-md mx-4 rounded-3xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-emerald-600 text-xl font-bold">
              Reject Application
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Please provide a reason for rejecting this application.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for rejection (optional)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 rounded-xl focus:border-emerald-500 focus:ring-emerald-500"
              rows={3}
            />

            <div className="flex gap-3">
              {/* Cancel Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                  setSelectedApplication(null);
                }}
                className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-100 bg-white rounded-xl"
              >
                Cancel
              </Button>

              {/* Reject Button */}
              <Button
                onClick={() => handleRejectApplication(selectedApplication)}
                disabled={actionLoading === getUserId(selectedApplication)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl"
              >
                {actionLoading === getUserId(selectedApplication) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Rejecting...
                  </>
                ) : (
                  "Reject"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewApplicantsPage;

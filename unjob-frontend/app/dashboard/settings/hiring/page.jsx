"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle,
  X,
  CreditCard,
  Crown,
  AlertCircle,
  Loader2,
  Calendar,
  Shield,
  Eye,
  RefreshCw,
  FileText,
  MessageCircle,
  AlertTriangle,
  CircleHelp,
  Award,
  Briefcase,
  ChevronRight,
  Settings,
  Clock,
  ChevronDown,
  ArrowLeft,
  Package,
  BarChart3,
  Search,
  Download,
  DollarSign,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Custom hook to get window size
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
};

const ProjectsTab = ({ currentSubscription, setActiveTab }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProject, setExpandedProject] = useState(null);
  const [reviewingProject, setReviewingProject] = useState(null);
  const [reviewForm, setReviewForm] = useState({ decision: "", feedback: "" });
  const [subscriptionError, setSubscriptionError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setSubscriptionError(null);

      // Check if subscription exists and is active
      if (!currentSubscription) {
        setSubscriptionError({
          type: "no_subscription",
          message: "You need an active subscription to view projects.",
        });
        setProjects([]);
        setLoading(false);
        return;
      }

      // Manual subscription validation (avoid method calls)
      const isActiveSubscription = currentSubscription.status === "active";
      const isNotExpired =
        !currentSubscription.endDate ||
        new Date(currentSubscription.endDate) > new Date();
      const isLifetime = currentSubscription.duration === "lifetime";

      const subscriptionValid =
        isActiveSubscription && (isNotExpired || isLifetime);

      if (!subscriptionValid) {
        setSubscriptionError({
          type: "subscription_expired",
          message:
            "Your subscription has expired. Renew to view your projects.",
        });
        setProjects([]);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/projects/company");
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects);
      } else {
        console.error("Failed to fetch projects:", data.error);
        toast.error("Failed to load projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Error loading projects");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (projectId, decision, feedback) => {
    try {
      // Check subscription before allowing review
      if (!currentSubscription) {
        toast.error("Active subscription required to review projects");
        setActiveTab("subscription");
        return;
      }

      const isActiveSubscription = currentSubscription.status === "active";
      const isNotExpired =
        !currentSubscription.endDate ||
        new Date(currentSubscription.endDate) > new Date();
      const isLifetime = currentSubscription.duration === "lifetime";

      const subscriptionValid =
        isActiveSubscription && (isNotExpired || isLifetime);

      if (!subscriptionValid) {
        toast.error(
          "Your subscription has expired. Please renew to review projects."
        );
        setActiveTab("subscription");
        return;
      }

      const response = await fetch(`/api/projects/${projectId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          feedback: feedback.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProjects((prev) =>
          prev.map((p) =>
            p._id === projectId
              ? {
                  ...p,
                  status: decision === "approve" ? "approved" : "rejected",
                  companyFeedback: feedback,
                }
              : p
          )
        );

        setReviewingProject(null);
        setReviewForm({ decision: "", feedback: "" });

        toast.success(
          `Project ${
            decision === "approve" ? "approved" : "rejected"
          } successfully!`
        );
      } else {
        toast.error(`Failed to ${decision} project: ${data.error}`);
      }
    } catch (error) {
      console.error("Error reviewing project:", error);
      toast.error("An error occurred while reviewing the project");
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesFilter = filter === "all" || project.status === filter;
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.freelancer?.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      project.gig?.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "submitted":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "under_review":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "approved":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "revision_requested":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "submitted":
        return <Clock className="h-3 w-3" />;
      case "under_review":
        return <Eye className="h-3 w-3" />;
      case "approved":
        return <CheckCircle className="h-3 w-3" />;
      case "rejected":
        return <X className="h-3 w-3" />;
      case "revision_requested":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4 sm:p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-400" />
        </div>
      </div>
    );
  }

  // Show subscription error states
  if (subscriptionError) {
    return (
      <div className="min-h-screen bg-black text-white p-4 sm:p-6">
        <div className="bg-gray-900/50 backdrop-blur-sm border border-red-500/30 rounded-lg text-center py-12">
          {subscriptionError.type === "subscription_expired" ? (
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          ) : (
            <Briefcase className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          )}
          <h3 className="text-xl font-semibold text-white mb-2">
            {subscriptionError.type === "subscription_expired"
              ? "Subscription Expired"
              : "No Active Subscription"}
          </h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {subscriptionError.message}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setActiveTab("subscription")}
              className="bg-green-500 hover:bg-green-600 text-black font-semibold"
              style={{
                background: "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
              }}
            >
              {subscriptionError.type === "subscription_expired"
                ? "Renew Subscription"
                : "Subscribe Now"}
            </Button>
            <Button
              onClick={fetchProjects}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Rest of your existing component code for displaying projects...
  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      {/* Header Section with Gradient Background */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-medium">Project Management</h1>
            <p className="text-gray-400 mt-1">
              Review and manage submitted projects from freelancers
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Total Projects",
              value: projects.length.toString(),
              subtitle: "Total Iterations",
              icon: <Briefcase />,
              color: "text-green-400",
            },
            {
              title: "Pending Review",
              value: projects
                .filter((p) => p.status === "submitted")
                .length.toString(),
              subtitle: "Awaiting approval",
              icon: <Clock />,
              color: "text-green-400",
            },
            {
              title: "Approved",
              value: projects
                .filter((p) => p.status === "approved")
                .length.toString(),
              subtitle: "Successfully completed",
              icon: <CheckCircle />,
              color: "text-green-400",
            },
            {
              title: "Need Changes",
              value: projects
                .filter((p) => p.status === "rejected")
                .length.toString(),
              subtitle: "Revision requested",
              icon: <AlertTriangle />,
              color: "text-green-400",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-[#1A2D25]/30 backdrop-blur-sm border border-green-500/20 rounded-lg p-4 flex items-center gap-4"
            >
              <div className="p-3 rounded-full bg-[#1F3C30]">
                {React.cloneElement(stat.icon, {
                  className: `h-6 w-6 ${stat.color}`,
                })}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Section */}
      <Card className="mb-8">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search projects, freelancers, or gigs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-600 rounded-lg">
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="submitted">Pending Review</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Need Changes</SelectItem>
                  <SelectItem value="revision_requested">
                    Revision Requested
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Project Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProjects.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No projects found
              </h3>
              <p className="text-gray-500 mb-6">
                {filter === "all"
                  ? "No projects have been submitted yet"
                  : `No projects with status "${filter}" found. Try a different filter.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <div
                  key={project._id}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 sm:p-6"
                >
                  {/* Project Header */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {project.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-xs font-bold text-black">
                            {project.freelancer?.name?.charAt(0) || "F"}
                          </div>
                          <span>{project.freelancer?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Submitted {formatDate(project.submittedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full sm:w-auto items-center gap-3">
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusIcon(project.status)}
                        <span className="ml-2">
                          {project.status.replace("_", " ").toUpperCase()}
                        </span>
                      </Badge>
                      <Button
                        onClick={() =>
                          setExpandedProject(
                            expandedProject === project._id ? null : project._id
                          )
                        }
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        {expandedProject === project._id ? "Hide" : "View"}
                        <ChevronDown
                          className={`h-4 w-4 ml-1 transition-transform ${
                            expandedProject === project._id ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </div>
                  </div>

                  {/* Action Buttons for Pending Projects */}
                  {project.status === "submitted" && (
                    <div className="flex gap-2 mb-4 border-t border-gray-700/50 pt-4">
                      <Button
                        onClick={() => {
                          setReviewingProject(project._id);
                          setReviewForm({ decision: "approve", feedback: "" });
                        }}
                        className="bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          setReviewingProject(project._id);
                          setReviewForm({ decision: "reject", feedback: "" });
                        }}
                        className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Request Changes
                      </Button>
                    </div>
                  )}

                  {/* Expanded Project Details */}
                  {expandedProject === project._id && (
                    <div className="border-t border-gray-700/50 pt-6 mt-4 animate-in fade-in duration-300">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-white">
                            Project Details
                          </h4>
                          <p className="text-gray-300 text-sm bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                            {project.description}
                          </p>
                          {project.companyFeedback && (
                            <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                              <span className="text-gray-400 block mb-1 text-sm">
                                Previous Feedback:
                              </span>
                              <p className="text-white text-sm">
                                {project.companyFeedback}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <h4 className="font-semibold text-white">
                            Submitted Files
                          </h4>
                          {project.files?.length > 0 ? (
                            <div className="space-y-2">
                              {project.files.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                                >
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                    <div className="truncate">
                                      <p className="text-white text-sm font-medium truncate">
                                        {file.name}
                                      </p>
                                      <p className="text-gray-400 text-xs">
                                        {formatFileSize(file.size)}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    onClick={() =>
                                      window.open(file.url, "_blank")
                                    }
                                    size="sm"
                                    className="bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 flex-shrink-0"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 text-center text-gray-500 bg-gray-800/50 rounded-lg border border-gray-700/50">
                              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No files were uploaded.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review Form */}
                  {reviewingProject === project._id && (
                    <div className="border-t border-gray-700/50 pt-6 mt-4 animate-in fade-in duration-300">
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                          {reviewForm.decision === "approve"
                            ? "✅ Approve Project"
                            : "🔄 Request Changes"}
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Feedback{" "}
                              {reviewForm.decision === "reject" ? (
                                <span className="text-red-400">(Required)</span>
                              ) : (
                                "(Optional)"
                              )}
                            </label>
                            <textarea
                              value={reviewForm.feedback}
                              onChange={(e) =>
                                setReviewForm((prev) => ({
                                  ...prev,
                                  feedback: e.target.value,
                                }))
                              }
                              placeholder={
                                reviewForm.decision === "approve"
                                  ? "Great work! The project meets all requirements."
                                  : "Please make the following changes..."
                              }
                              rows={4}
                              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 resize-none"
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button
                              onClick={() => {
                                if (
                                  reviewForm.decision === "reject" &&
                                  !reviewForm.feedback.trim()
                                ) {
                                  toast.error(
                                    "Feedback is required when requesting changes."
                                  );
                                  return;
                                }
                                handleReview(
                                  project._id,
                                  reviewForm.decision,
                                  reviewForm.feedback
                                );
                              }}
                              className={
                                reviewForm.decision === "approve"
                                  ? "bg-green-500 hover:bg-green-600 text-black font-semibold"
                                  : "bg-red-500 hover:bg-red-600 text-white font-semibold"
                              }
                              style={
                                reviewForm.decision === "approve"
                                  ? {
                                      background:
                                        "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                                    }
                                  : {}
                              }
                            >
                              {reviewForm.decision === "approve" ? (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve Project
                                </>
                              ) : (
                                <>
                                  <X className="h-4 w-4 mr-2" />
                                  Request Changes
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => setReviewingProject(null)}
                              variant="outline"
                              className="border-gray-600 text-gray-300 hover:bg-gray-800"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const PaymentsTab = ({ currentSubscription }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/payments/history");
      const data = await response.json();

      if (data.success) {
        setPayments(data.payments || []);
      } else {
        console.error("Failed to fetch payment history:", data.error);
        toast.error("Failed to load payment history");
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
      toast.error("Error loading payment history");
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesFilter = filter === "all" || payment.status === filter;
    const matchesSearch =
      payment.subscriptionId
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      payment.planType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.gig?.title?.toLowerCase().includes(searchTerm.toLowerCase());

    // Only show payments where the company is the payer (outgoing payments)
    // and exclude duplicate "gig_payment" entries (these are internal transfers)
    const isValidPayment =
      payment.isOutgoing &&
      (payment.type === "gig_escrow" || payment.type === "subscription");

    return matchesFilter && matchesSearch && isValidPayment;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "refunded":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
      case "completed":
        return <CheckCircle2 className="h-3 w-3" />;
      case "failed":
        return <XCircle className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "refunded":
        return <RotateCcw className="h-3 w-3" />;
      default:
        return <DollarSign className="h-3 w-3" />;
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatCurrency = (amount) => `₹${amount?.toLocaleString() || 0}`;

  // NEW: Download invoice function using the invoice API
  const downloadInvoice = async (payment) => {
    try {
      setDownloadingInvoice(payment._id || payment.paymentId);

      let downloadUrl;

      // If we have subscription ID and payment ID, use the specific endpoint
      if (payment.subscriptionId && payment._id) {
        downloadUrl = `/api/subscription/invoice?format=pdf&subscriptionId=${payment.subscriptionId}&paymentId=${payment._id}`;
      } else {
        // Use the general current subscription invoice endpoint
        downloadUrl = `/api/subscription/invoice?format=pdf`;
      }

      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Get the PDF blob
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${payment.paymentId || payment._id}.pdf`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("Invoice downloaded successfully!");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to download invoice");
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error(`Error downloading invoice: ${error.message}`);
    } finally {
      setDownloadingInvoice(null);
    }
  };

  // NEW: View invoice in browser function
  const viewInvoice = async (payment) => {
    try {
      let viewUrl;

      // If we have subscription ID and payment ID, use the specific endpoint
      if (payment.subscriptionId && payment._id) {
        viewUrl = `/api/subscription/invoice?subscriptionId=${payment.subscriptionId}&paymentId=${payment._id}`;
      } else {
        // Use the general current subscription invoice endpoint
        viewUrl = `/api/subscription/invoice`;
      }

      const response = await fetch(viewUrl);
      const data = await response.json();

      if (data.success) {
        // Open a new window with invoice details (you could create a formatted view)
        const newWindow = window.open("", "_blank");
        newWindow.document.write(`
          <html>
            <head><title>Invoice ${data.invoice.invoiceNumber}</title></head>
            <body>
              <h1>Invoice ${data.invoice.invoiceNumber}</h1>
              <p><strong>Date:</strong> ${new Date(
                data.invoice.invoiceDate
              ).toLocaleDateString()}</p>
              <p><strong>Amount:</strong> ${formatCurrency(
                data.invoice.payment.total
              )}</p>
              <p><strong>Status:</strong> ${data.invoice.payment.status}</p>
              <p><strong>Plan:</strong> ${
                data.invoice.subscription.planType
              } (${data.invoice.subscription.duration})</p>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        toast.error("Failed to load invoice details");
      }
    } catch (error) {
      console.error("Error viewing invoice:", error);
      toast.error("Error loading invoice details");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-4 sm:p-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-medium">Payment History</h1>
            <p className="text-gray-400 mt-1">
              View all your subscription payments and download invoices
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Total Payments",
              value: payments.length.toString(),
              subtitle: "All transactions",
              icon: <DollarSign />,
              color: "text-green-400",
            },
            {
              title: "Successful",
              value: payments
                .filter(
                  (p) => p.status === "success" || p.status === "completed"
                )
                .length.toString(),
              subtitle: "Completed payments",
              icon: <CheckCircle2 />,
              color: "text-green-400",
            },
            {
              title: "Total Amount",
              value: formatCurrency(
                payments
                  .filter(
                    (p) =>
                      (p.status === "success" || p.status === "completed") &&
                      p.isOutgoing &&
                      p.type === "gig_escrow" // Only count actual payments made by company
                  )
                  .reduce((sum, p) => sum + (p.amount || 0), 0)
              ),
              subtitle: "Total spent",
              icon: <Award />,
              color: "text-green-400",
            },
            {
              title: "This Month",
              value: payments
                .filter((p) => {
                  const paymentDate = new Date(p.createdAt);
                  const currentDate = new Date();
                  return (
                    paymentDate.getMonth() === currentDate.getMonth() &&
                    paymentDate.getFullYear() === currentDate.getFullYear() &&
                    (p.status === "success" || p.status === "completed") &&
                    p.isOutgoing &&
                    p.type === "gig_escrow"
                  );
                })
                .length.toString(),
              subtitle: "Payments this month",
              icon: <Calendar />,
              color: "text-green-400",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-[#1A2D25]/30 backdrop-blur-sm border border-green-500/20 rounded-lg p-4 flex items-center gap-4"
            >
              <div className="p-3 rounded-full bg-[#1F3C30]">
                {React.cloneElement(stat.icon, {
                  className: `h-6 w-6 ${stat.color}`,
                })}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Section */}
      <Card className="mb-8">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search by payment ID, plan type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-600 rounded-lg">
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="success">Successful</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No payments found
              </h3>
              <p className="text-gray-500 mb-6">
                {filter === "all"
                  ? "No payment history available"
                  : `No payments with status "${filter}" found.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-scroll">
              {filteredPayments.map((payment) => (
                <div
                  key={payment._id || payment.paymentId}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {payment.type === "gig_escrow"
                            ? `Gig Payment: ${
                                payment.gig?.title || "Project Payment"
                              }`
                            : `${
                                payment.planType?.charAt(0)?.toUpperCase() +
                                payment.planType?.slice(1)
                              } Plan`}
                        </h3>
                        <Badge className={getStatusColor(payment.status)}>
                          {getStatusIcon(payment.status)}
                          <span className="ml-2">
                            {payment.status?.toUpperCase()}
                          </span>
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <p>
                            <span className="text-gray-300">
                              {payment.type === "gig_escrow"
                                ? "Transaction ID"
                                : "Payment ID"}
                              :
                            </span>{" "}
                            {payment.razorpayPaymentId ||
                              payment.paymentId ||
                              "N/A"}
                          </p>
                          {payment.type === "subscription" && (
                            <p>
                              <span className="text-gray-300">Duration:</span>{" "}
                              {payment.duration}
                            </p>
                          )}
                          {payment.type === "gig_escrow" && (
                            <p>
                              <span className="text-gray-300">Type:</span> Gig
                              Acceptance Payment
                            </p>
                          )}
                          <p>
                            <span className="text-gray-300">Amount:</span>{" "}
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                        <div>
                          <p>
                            <span className="text-gray-300">Date:</span>{" "}
                            {formatDate(payment.createdAt)}
                          </p>
                          <p>
                            <span className="text-gray-300">Method:</span>{" "}
                            {payment.paymentMethod || "Razorpay"}
                          </p>
                          {payment.failureReason && (
                            <p>
                              <span className="text-red-400">
                                Failure Reason:
                              </span>{" "}
                              {payment.failureReason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(payment.status === "success" ||
                        payment.status === "completed") && (
                        <>
                          <Button
                            onClick={() => viewInvoice(payment)}
                            size="sm"
                            variant="outline"
                            className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            onClick={() => downloadInvoice(payment)}
                            disabled={
                              downloadingInvoice ===
                              (payment._id || payment.paymentId)
                            }
                            size="sm"
                            className="bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                          >
                            {downloadingInvoice ===
                            (payment._id || payment.paymentId) ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Invoice
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function HiringSubscriptionContent() {
  const [plans, setPlans] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [enableAutoPay, setEnableAutoPay] = useState(true);
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const mobileView = searchParams.get("view");
  const [activeTab, setActiveTab] = useState("projects");
  const [usePaymentLink, setUsePaymentLink] = useState(true);

  useEffect(() => {
    if (session?.user) {
      Promise.all([
        fetchPlans(),
        checkCurrentSubscription(),
        fetchPaymentHistory(),
      ]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // Sync desktop tab with mobile view param
    if (mobileView === "subscription") {
      setActiveTab("subscription");
    } else if (mobileView === "payments") {
      setActiveTab("payments");
    } else {
      setActiveTab("projects");
    }
  }, [mobileView]);

  const fetchPlans = async () => {
    try {
      console.log("🔍 Fetching plans for role: hiring");
      const response = await fetch("/api/subscription/plans?role=hiring");
      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      const data = await response.json();
      console.log("📦 Raw API data:", data);

      if (data.success) {
        console.log("✅ Plans received:", data.plans);
        console.log("📊 Comparison data:", data.comparisonData);

        setPlans(data.plans);
        setComparisonData(data.comparisonData.hiring);

        console.log("💾 Plans set in state:", data.plans.length);
      } else {
        console.error("❌ API returned error:", data.error);
        throw new Error(data.error || "Failed to fetch plans");
      }
    } catch (error) {
      console.error("🚨 Fetch error:", error);
      toast.error("Failed to load subscription plans");
    }
  };

  const checkCurrentSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/manage");
      const data = await response.json();
      if (response.ok && data.success && data.hasActiveSubscription) {
        setCurrentSubscription(data.currentSubscription);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch("/api/payments/history?type=subscription");
      const data = await response.json();
      if (data.success) {
        setPaymentHistory(data.payments || []);
      }
    } catch (error) {
      console.error("Error fetching payment history:", error);
    }
  };
  const handleSubscribe = async (plan) => {
    if (!session) {
      toast.error("Please login to subscribe");
      router.push("/login");
      return;
    }

    const planKey = `${plan.id}-${plan.duration}`;
    setSubscribing(planKey);

    try {
      // Check if this is hiring user with monthly basic plan wanting payment link
      const isHiring = session?.user?.role === "hiring";
      const isMonthlyBasic =
        plan.planType === "basic" && plan.duration === "monthly";
      const shouldUsePaymentLink = isHiring && isMonthlyBasic;

      const orderResponse = await fetch("/api/subscription/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: plan.planType,
          duration: plan.duration,
          enableAutoPay: enableAutoPay && plan.duration !== "lifetime",
          // usePaymentLink: shouldUsePaymentLink,
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      console.log("📦 Order Response:", orderData);

      // ✅ NEW: Handle free plan response
      if (orderData.paymentType === "free") {
        console.log("✅ Free plan detected - no Razorpay modal needed");

        // Show success message
        toast.success("🎉 Free plan activated successfully!");

        // Refresh subscription status
        await checkCurrentSubscription();
        await fetchPaymentHistory();

        // Reset loading state
        setSubscribing(null);

        // Redirect to create gig or show success
        router.push("/dashboard/create-gig");

        return; // ✅ CRITICAL: Exit here - don't open Razorpay modal
      }

      // NEW: Handle payment link response
      if (orderData.paymentType === "payment_link") {
        toast.success("Redirecting to payment page...");
        window.open(orderData.paymentLink, "_blank");
        setSubscribing(null);

        // Show success message and refresh subscription status
        setTimeout(async () => {
          toast.success(
            "Payment link opened! Complete payment to activate subscription."
          );
          await checkCurrentSubscription();
        }, 1000);

        return;
      }

      // ✅ Continue with existing Razorpay logic for PAID plans only...
      const loadRazorpayScript = () =>
        new Promise((resolve) => {
          if (window.Razorpay) return resolve(true);
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
        });

      if (!(await loadRazorpayScript())) {
        throw new Error("Failed to load payment gateway.");
      }

      // Helper function to sanitize name for Razorpay
      const sanitizeName = (name) => {
        if (!name) return "User";

        // Remove all special characters except spaces, dots, and hyphens
        // Allow only letters, numbers, spaces, dots, and hyphens
        let sanitized = name
          .replace(/[^\w\s.-]/g, "") // Remove special chars except word chars, spaces, dots, hyphens
          .replace(/\s+/g, " ") // Replace multiple spaces with single space
          .trim(); // Remove leading/trailing spaces

        // Ensure name is not empty after sanitization
        if (!sanitized || sanitized.length === 0) {
          return "User";
        }

        // Limit length to 100 characters (Razorpay limit)
        if (sanitized.length > 100) {
          sanitized = sanitized.substring(0, 100).trim();
        }

        return sanitized;
      };

      // Helper function to sanitize phone number
      const sanitizePhone = (phone) => {
        if (!phone) return "";

        // Remove all non-numeric characters
        const cleaned = phone.replace(/\D/g, "");

        // Ensure it's a valid Indian phone number format
        if (cleaned.length === 10) {
          return cleaned;
        } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
          return cleaned.substring(2);
        } else if (cleaned.length === 13 && cleaned.startsWith("+91")) {
          return cleaned.substring(3);
        }

        return "";
      };

      // Check if this is a special pricing scenario
      const isMonthly = plan.duration === "monthly";
      const showSpecialPricing = isHiring && isMonthly && enableAutoPay;

      // Create detailed description based on pricing
      let detailedDescription = `${plan.name} Plan (${plan.duration})`;
      if (showSpecialPricing) {
        detailedDescription = `${plan.name} Plan - First Month ₹9.99 (99% OFF), then ₹999/month`;
      }

      // Sanitize user data
      const sanitizedName = sanitizeName(session.user.name);
      const sanitizedPhone = sanitizePhone(session.user.phone);

      console.log("Original name:", session.user.name);
      console.log("Sanitized name:", sanitizedName);
      console.log("Original phone:", session.user.phone);
      console.log("Sanitized phone:", sanitizedPhone);

      // Enhanced Razorpay options with proper validation
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "UnJob Hiring Platform",
        description: detailedDescription,
        image: "/logo.png",
        order_id: orderData.orderId,
        subscription_id: orderData.subscriptionId,

        // Custom notes to display pricing breakdown
        notes: {
          plan_name: plan.name,
          duration: plan.duration,
          original_price:
            plan.originalPrice?.toString() || plan.price.toString(),
          discounted_price: plan.price.toString(),
          special_offer: showSpecialPricing
            ? "First month ₹9.99, then ₹999/month"
            : "Standard pricing",
          auto_pay: enableAutoPay ? "enabled" : "disabled",
        },

        // Enable all payment methods
        method: {
          netbanking: true,
          card: true,
          upi: true,
          wallet: true,
          emi: true,
          paylater: true,
        },

        // UPI specific configuration
        config: {
          display: {
            blocks: {
              banks: {
                name: "Pay via UPI",
                instruments: [
                  {
                    method: "upi",
                  },
                ],
              },
            },
            sequence: ["block.banks"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },

        handler: async (response) => {
          toast.loading("Verifying payment...", { id: "payment-verify" });
          const verifyResponse = await fetch(
            "/api/subscription/verify-payment",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...response,
                subscriptionId: orderData.dbSubscriptionId,
                paymentType: orderData.paymentType,
                planDetails: {
                  name: plan.name,
                  duration: plan.duration,
                  specialPricing: showSpecialPricing,
                },
              }),
            }
          );
          const verifyData = await verifyResponse.json();
          toast.dismiss("payment-verify");
          if (verifyData.success) {
            toast.success("🎉 Subscription activated successfully!");
            await checkCurrentSubscription();
            await fetchPaymentHistory();
            router.push("/dashboard/create-gig");
          } else {
            toast.error(verifyData.error || "Payment verification failed");
          }
          setSubscribing(null);
        },

        prefill: {
          name: sanitizedName,
          email: session.user.email || "",
          ...(sanitizedPhone && { contact: sanitizedPhone }),
        },

        theme: {
          color: "#10b981",
          backdrop_color: "rgba(0,0,0,0.8)",
          hide_topbar: false,
        },

        modal: {
          ondismiss: () => {
            setSubscribing(null);
            toast("Payment cancelled.", { icon: "⚠️" });
          },
          confirm_close: true,
          escape: true,
          animation: true,
          backdropclose: false,
        },

        retry: {
          enabled: true,
          max_count: 3,
        },

        timeout: 300, // 5 minutes timeout
      };

      console.log("🚀 Opening Razorpay with sanitized options:", {
        ...options,
        prefill: options.prefill,
      });

      const rzp = new window.Razorpay(options);

      // Handle payment failure with detailed error info
      rzp.on("payment.failed", function (response) {
        console.error("Payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setSubscribing(null);
      });

      rzp.open();
    } catch (error) {
      console.error("Subscription error:", error);
      toast.error(error.message || "Failed to process subscription");
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Subscription cancelled successfully");
        setCurrentSubscription(null);
        setShowCancelDialog(false);
        await checkCurrentSubscription();
      } else {
        toast.error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Error cancelling subscription");
    } finally {
      setCancelling(false);
    }
  };

  const getReasonMessage = () => {
    switch (reason) {
      case "required":
        return {
          type: "info",
          title: "Subscription Required",
          message:
            "An active subscription is needed to post gigs and connect with freelancers.",
        };
      case "limit-reached":
        return {
          type: "warning",
          title: "Gig Limit Reached",
          message: "Upgrade your subscription to post more gigs.",
        };
      case "expired":
        return {
          type: "warning",
          title: "Subscription Expired",
          message: "Renew your subscription to continue posting gigs.",
        };
      default:
        return null;
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const formatCurrency = (amount) => `₹${amount.toLocaleString()}`;
  const reasonMessage = getReasonMessage();

  const renderSubscriptionContent = () => (
    <div className="animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          Subscription Plans
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Choose the perfect plan to connect with top freelance talent.
        </p>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription && (
        <Card className="mb-8 bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Crown className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {currentSubscription.planType?.charAt(0)?.toUpperCase() +
                    currentSubscription.planType?.slice(1)}{" "}
                  Plan
                </h3>
                <div className="space-y-2 text-gray-300">
                  <p>
                    <span className="text-gray-400">Duration:</span>{" "}
                    {currentSubscription.duration}
                  </p>
                  <p>
                    <span className="text-gray-400">Status:</span>
                    <Badge className="ml-2 bg-green-500/20 text-green-400">
                      {currentSubscription.status?.toUpperCase()}
                    </Badge>
                  </p>
                  <p>
                    <span className="text-gray-400">Started:</span>{" "}
                    {formatDate(currentSubscription.startDate)}
                  </p>
                  <p>
                    <span className="text-gray-400">Expires:</span>{" "}
                    {formatDate(currentSubscription.endDate)}
                  </p>
                  {currentSubscription.autoRenewal && (
                    <p className="flex items-center gap-2">
                      <span className="text-gray-400">Auto-Renewal:</span>
                      <Badge className="bg-blue-500/20 text-blue-400">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-3">
                <Button
                  onClick={() => setShowCancelDialog(true)}
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
                <Button
                  onClick={() => router.push("/dashboard/create-gig")}
                  className="bg-green-500 hover:bg-green-600 text-black font-semibold"
                  style={{
                    background:
                      "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                  }}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Create Gig
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
        {plans.map((plan) => {
          const isCurrentPlan =
            currentSubscription?.planType === plan.planType &&
            currentSubscription?.duration === plan.duration;
          const isSubscribing = subscribing === `${plan.id}-${plan.duration}`;
          const isLifetime = plan.duration === "lifetime";
          return (
            <Card
              key={plan.id}
              className={`relative bg-[#111827]/60 border transition-all duration-300 flex flex-col ${
                plan.bestDeal
                  ? "border-green-500/50 shadow-lg shadow-green-900/20"
                  : "border-gray-800 hover:border-gray-700"
              }`}
            >
              {plan.bestDeal && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black font-semibold px-4 py-1">
                  Best Value
                </Badge>
              )}
              {isCurrentPlan && (
                <Badge className="absolute -top-3 right-4 bg-green-400 text-black font-semibold">
                  Active
                </Badge>
              )}
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-xl font-bold text-white mb-2">
                  {plan.name}
                </CardTitle>
                {plan.originalPrice > plan.price && (
                  <div className="text-sm text-gray-500 line-through mb-1">
                    {formatCurrency(plan.originalPrice)}
                  </div>
                )}
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold text-white">
                    {formatCurrency(plan.price)}
                  </span>
                  {!isLifetime && (
                    <span className="text-gray-400 ml-1.5">
                      /{plan.duration.replace("ly", "")}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm h-10">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between space-y-4">
                <ul className="space-y-3">
                  {plan.features?.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isSubscribing || isCurrentPlan}
                  className={`w-full py-3 font-semibold rounded-lg mt-4 ${
                    plan.bestDeal
                      ? "bg-green-500 hover:bg-green-600 text-black"
                      : isCurrentPlan
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "bg-gray-800 hover:bg-gray-700 text-white"
                  }`}
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Current Plan
                    </>
                  ) : (
                    "Subscribe Now"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Platform Comparison */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          Platform Comparison
        </h2>
        <div className="hidden lg:block">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-400 uppercase bg-[#111827]/60">
              <tr className="border-b border-gray-800">
                <th scope="col" className="px-6 py-3 rounded-tl-lg">
                  Comparison
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-green-400"
                >
                  UnJob.ai
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Upwork
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Fiverr
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Freelancer
                </th>
                <th scope="col" className="px-6 py-3 text-center rounded-tr-lg">
                  Unstop
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, i) => (
                <tr
                  key={i}
                  className="bg-black/20 border-b border-gray-800 hover:bg-gray-800/30"
                >
                  <th scope="row" className="px-6 py-4 font-medium text-white">
                    {row.feature}
                  </th>
                  <td className="px-6 py-4 text-center font-bold text-green-400">
                    {row.unJob}
                  </td>
                  <td className="px-6 py-4 text-center">{row.upwork}</td>
                  <td className="px-6 py-4 text-center">{row.fiverr}</td>
                  <td className="px-6 py-4 text-center">{row.freelancer}</td>
                  <td className="px-6 py-4 text-center">{row.unstop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden space-y-4">
          {comparisonData.map((row, i) => (
            <Card key={i} className="bg-[#111827]/60 border-gray-800">
              <CardContent className="p-4">
                <h3 className="font-semibold text-white mb-3">{row.feature}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-semibold">
                    <span className="text-green-400">UnJob.ai</span>
                    <span className="text-green-400">{row.unJob}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Upwork</span>
                    <span>{row.upwork}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Fiverr</span>
                    <span>{row.fiverr}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Freelancer</span>
                    <span>{row.freelancer}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Unstop</span>
                    <span>{row.unstop}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Cancel Subscription
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to cancel your subscription? You'll lose
              access to premium features at the end of your current billing
              period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Keep Subscription
            </Button>
            <Button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (loading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-green-400" />
      </div>
    );
  if (!session)
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-center p-4">
        <div>
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
          <p className="text-gray-400 mb-6">
            Please log in to manage your subscription.
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold"
          >
            Login
          </Button>
        </div>
      </div>
    );
  if (session?.user?.role !== "hiring")
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center text-center p-4">
        <div>
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="text-gray-400 mb-6">
            These plans are for hiring managers only.
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            className="bg-green-500 hover:bg-green-600 text-black font-semibold"
          >
            Dashboard
          </Button>
        </div>
      </div>
    );

  if (isMobile) {
    const MobileSettingsList = () => {
      const menuItems = [
        { label: "Projects", icon: Briefcase, view: "projects" },
        { label: "Subscriptions", icon: CreditCard, view: "subscription" },
        { label: "Payments", icon: DollarSign, view: "payments" },
        {
          label: "Terms Of Services",
          icon: FileText,
          view: "/terms-of-services",
        },
        { label: "Refund Policy", icon: RefreshCw, view: "/refund-policy" },
        { label: "Privacy Policy", icon: Shield, view: "/privacy-policy" },
        { label: "Contact", icon: MessageCircle, view: "/contact-us" },
        { label: "Support", icon: CircleHelp, view: "/dashboard/help" },
      ];

      const handleMenuItemClick = (item) => {
        if (item.view.startsWith("/")) {
          // For external routes (starting with /), navigate directly
          router.push(item.view);
        } else {
          // For internal views, use the query parameter
          router.push(`/dashboard/settings/hiring?view=${item.view}`);
        }
      };

      return (
        <div className="p-4">
          <div className="flex items-center justify-between mb-8 ">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="p-2 rounded-full border-gray-700/80"
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="p-2 rounded-full border-gray-700/80"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.view}
                onClick={() => handleMenuItemClick(item)}
                className="w-full flex items-center justify-between p-4 rounded-lg text-left "
              >
                <div className="flex items-center">
                  <item.icon className="h-8 w-8 text-white mr-4 border border-white rounded-full p-1" />
                  <span className="text-white font-medium">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-[#10B981]" />
              </button>
            ))}
          </div>
        </div>
      );
    };

    const renderMobileContent = () => {
      switch (mobileView) {
        case "projects":
          return (
            <ProjectsTab
              currentSubscription={currentSubscription}
              setActiveTab={setActiveTab}
            />
          );
        case "subscription":
          return renderSubscriptionContent();
        case "payments":
          return <PaymentsTab currentSubscription={currentSubscription} />;
        default:
          return <MobileSettingsList />;
      }
    };

    return (
      <div className="min-h-screen bg-black text-white">
        {mobileView && (
          <header className="p-4 flex items-center gap-4 sticky top-0 bg-black/80 backdrop-blur-sm z-10 border-b border-gray-800">
            <Button onClick={() => router.back()} variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold capitalize">{mobileView}</h2>
          </header>
        )}
        <main className={!mobileView ? "" : "p-4"}>
          {renderMobileContent()}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {reasonMessage && (
          <div
            className={`mb-8 p-4 rounded-lg border flex items-start gap-4 ${
              reasonMessage.type === "warning"
                ? "bg-yellow-900/20 border-yellow-500/30 text-yellow-300"
                : "bg-blue-900/20 border-blue-500/30 text-blue-300"
            }`}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">{reasonMessage.title}</h3>
              <p className="text-sm mt-1 opacity-90">{reasonMessage.message}</p>
            </div>
          </div>
        )}

        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="flex bg-[#111827]/60 backdrop-blur-sm rounded-full p-1 border border-gray-800">
            {[
              { label: "Projects", value: "projects", icon: Briefcase },
              {
                label: "Subscription",
                value: "subscription",
                icon: CreditCard,
              },
              { label: "Payments", value: "payments", icon: DollarSign },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.value
                    ? "bg-green-500 text-black"
                    : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="animate-in fade-in duration-500">
          {activeTab === "projects" && (
            <ProjectsTab
              currentSubscription={currentSubscription}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "subscription" && renderSubscriptionContent()}
          {activeTab === "payments" && (
            <PaymentsTab currentSubscription={currentSubscription} />
          )}
        </div>
      </div>
    </div>
  );
}

// Main component wrapper
export default function HiringSubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-400" />
        </div>
      }
    >
      <HiringSubscriptionContent />
    </Suspense>
  );
}

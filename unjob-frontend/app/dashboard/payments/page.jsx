// app/dashboard/payments/page.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  MessageCircle,
  CreditCard,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit,
  Send,
  User,
  Mail,
  FileText,
  Wallet,
  Search,
  Users,
  IndianRupee,
  History,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function CompanyPaymentsDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State management
  const [applications, setApplications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [showPaymentStatusModal, setShowPaymentStatusModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [freelancerBankDetails, setFreelancerBankDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    description: "",
    paymentType: "gig_payment",
  });

  // Payment status update form
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: "",
    notes: "",
    transferDetails: {
      transferId: "",
      transferMode: "bank",
    },
  });

  // Statistics
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingPayments: 0,
    completedPayments: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (session?.user?.role !== "hiring") {
      router.push("/dashboard");
      return;
    }

    fetchApplications();
    fetchPayments();
  }, [session, status]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      console.log("Fetching company applications...");

      // Use the company-specific gig endpoint to get applications
      const response = await fetch("/api/gigs/getGigs", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("Gigs response:", data);

      if (response.ok && data.success) {
        // Filter gigs that belong to current user and have accepted applications
        const userGigs = data.gigs.filter(
          (gig) =>
            gig.company._id === session.user.id &&
            gig.applications &&
            gig.applications.length > 0
        );

        // Extract accepted applications from user's gigs
        const acceptedApps = [];
        userGigs.forEach((gig) => {
          const accepted = gig.applications.filter(
            (app) => app.applicationStatus === "accepted"
          );
          accepted.forEach((app) => {
            acceptedApps.push({
              _id: app._id,
              gigId: gig._id,
              gig: {
                _id: gig._id,
                title: gig.title,
                budget: gig.budget,
                timeline: gig.timeline,
                company: gig.company,
              },
              freelancer: {
                _id: app.freelancer,
                name: app.name,
                image: app.image,
                email: app.email || "No email provided",
              },
              applicationStatus: app.applicationStatus,
              proposedRate: app.proposedRate,
              estimatedDuration: app.estimatedDuration,
              coverLetter: app.coverLetter,
              appliedAt: app.appliedAt,
              acceptedAt: app.acceptedAt,
            });
          });
        });

        setApplications(acceptedApps);

        // Update stats
        setStats((prev) => ({
          ...prev,
          totalApplications: acceptedApps.length,
        }));

        console.log("Found accepted applications:", acceptedApps.length);
      } else {
        toast.error(data.error || "Failed to fetch applications");
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      console.log("Fetching payments for company...");

      const response = await fetch("/api/payments/history");
      const data = await response.json();

      console.log("Payments API response:", data);

      if (response.ok && data.success) {
        // Filter payments where current user is the payer (outgoing payments)
        // Check multiple possible ID fields due to session inconsistencies
        const currentUserId =
          session.user.id || session.user.userId || session.user._id;

        console.log("Current user ID for filtering:", currentUserId);
        console.log("All payments received:", data.payments.length);

        const companyPayments = data.payments.filter((payment) => {
          const payerId = payment.payer?._id || payment.payer?.id;
          const isOutgoing = payment.isOutgoing;

          console.log("Payment check:", {
            paymentId: payment._id,
            payerId,
            currentUserId,
            isOutgoing,
            match: payerId === currentUserId || isOutgoing,
          });

          return payerId === currentUserId || isOutgoing;
        });

        console.log("Filtered company payments:", companyPayments.length);
        setPayments(companyPayments);

        // Calculate payment stats
        const pending = companyPayments.filter((p) =>
          ["pending", "processing"].includes(p.status)
        ).length;
        const completed = companyPayments.filter(
          (p) => p.status === "completed"
        ).length;
        const totalAmount = companyPayments
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + p.amount, 0);

        setStats((prev) => ({
          ...prev,
          pendingPayments: pending,
          completedPayments: completed,
          totalAmount,
        }));

        console.log("Payment stats updated:", {
          pending,
          completed,
          totalAmount,
        });
      } else {
        console.error("Payments API error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      // Don't show error toast for payments as it's secondary data
    }
  };

  const fetchFreelancerBankDetails = async (freelancerId) => {
    try {
      const response = await fetch(
        `/api/freelancer/${freelancerId}/bank-details`
      );
      const data = await response.json();

      if (response.ok && data.success) {
        setFreelancerBankDetails(data.bankDetails);

        // If called from payment button, show payment modal directly
        if (selectedApplication) {
          setShowPaymentModal(true);
        } else {
          setShowBankDetailsModal(true);
        }
      } else {
        toast.error("Failed to fetch freelancer bank details");
        console.error("Bank details error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching bank details:", error);
      toast.error("Failed to fetch bank details");
    }
  };

  const initiatePayment = async () => {
    try {
      setProcessingPayment(true);

      if (!paymentForm.amount || !selectedApplication) {
        toast.error("Please fill all required fields");
        return;
      }

      if (
        !freelancerBankDetails ||
        (!freelancerBankDetails.accountNumber && !freelancerBankDetails.upiId)
      ) {
        toast.error("Freelancer bank details are incomplete");
        return;
      }

      const paymentData = {
        freelancerId: selectedApplication.freelancer._id,
        gigId: selectedApplication.gigId,
        amount: parseFloat(paymentForm.amount),
        description:
          paymentForm.description ||
          `Payment for "${selectedApplication.gig.title}"`,
        freelancerBankDetails: freelancerBankDetails,
        paymentType: paymentForm.paymentType,
      };

      console.log("Initiating payment:", paymentData);

      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Payment initiated successfully!");
        setShowPaymentModal(false);
        setPaymentForm({
          amount: "",
          description: "",
          paymentType: "gig_payment",
        });
        setSelectedApplication(null);
        setFreelancerBankDetails(null);

        // Refresh data after a short delay to allow backend processing
        setTimeout(async () => {
          await fetchApplications();
          await fetchPayments();
        }, 1000);
      } else {
        toast.error(data.error || "Failed to initiate payment");
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      toast.error("Failed to initiate payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  const updatePaymentStatus = async () => {
    try {
      setUpdatingStatus(true);

      if (!statusUpdateForm.status || !selectedPayment) {
        toast.error("Please select a status");
        return;
      }

      const updateData = {
        status: statusUpdateForm.status,
        notes: statusUpdateForm.notes,
        transferDetails: statusUpdateForm.transferDetails,
      };

      const response = await fetch(
        `/api/admin/payments/${selectedPayment._id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        }
      );

      if (response.status === 403) {
        toast.error(
          "Payment status updates require admin privileges. Please contact support."
        );
        setShowPaymentStatusModal(false);
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Payment status updated successfully!");
        setShowPaymentStatusModal(false);
        setStatusUpdateForm({
          status: "",
          notes: "",
          transferDetails: { transferId: "", transferMode: "bank" },
        });
        setSelectedPayment(null);

        // Refresh payments
        await fetchPayments();
      } else {
        toast.error(data.error || "Failed to update payment status");
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("Failed to update payment status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500";
      case "processing":
        return "bg-blue-500/20 text-blue-400 border-blue-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "processing":
        return <Clock className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Filter applications and payments
  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.gig?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.freelancer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.gig?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payee?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading payments dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Payments Dashboard</h1>
              <p className="text-gray-400">
                Manage payments for your approved freelancers
              </p>
            </div>
            <Button
              onClick={() => {
                fetchApplications();
                fetchPayments();
              }}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
       

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Approved Applications</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.totalApplications}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending Payments</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {stats.pendingPayments}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Completed Payments</p>
                  <p className="text-2xl font-bold text-green-400">
                    {stats.completedPayments}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Paid</p>
                  <p className="text-2xl font-bold text-green-400">
                    ₹{stats.totalAmount.toLocaleString()}
                  </p>
                </div>
                <IndianRupee className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by gig title or freelancer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="bg-gray-900 border-gray-700">
            <TabsTrigger
              value="applications"
              className="data-[state=active]:bg-gray-700"
            >
              Approved Applications ({filteredApplications.length})
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-gray-700"
            >
              Payment History ({filteredPayments.length})
            </TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            {filteredApplications.length > 0 ? (
              filteredApplications.map((application) => (
                <Card
                  key={application._id}
                  className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={application.freelancer?.image} />
                          <AvatarFallback className="bg-gray-700 text-white">
                            {application.freelancer?.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">
                              {application.freelancer?.name}
                            </h3>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          </div>

                          <p className="text-gray-300 font-medium mb-2">
                            {application.gig?.title}
                          </p>

                          <div className="flex items-center gap-6 text-sm text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              <span>₹{application.proposedRate}/hr</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{application.estimatedDuration}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4" />
                              <span>{application.freelancer?.email}</span>
                            </div>
                          </div>

                          <p className="text-gray-300 text-sm line-clamp-2">
                            {application.coverLetter}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() =>
                            fetchFreelancerBankDetails(
                              application.freelancer._id
                            )
                          }
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          title="View freelancer's bank account details"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Bank Details
                        </Button>

                        <Button
                          onClick={() => {
                            setSelectedApplication(application);
                            setPaymentForm({
                              amount: application.proposedRate || "",
                              description: `Payment for "${application.gig?.title}"`,
                              paymentType: "gig_payment",
                            });
                            fetchFreelancerBankDetails(
                              application.freelancer._id
                            );
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Initiate Payment
                        </Button>

                        {application.conversationId && (
                          <Button
                            onClick={() =>
                              router.push(`/chat/${application.conversationId}`)
                            }
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Chat
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  No Approved Applications
                </h3>
                <p className="text-gray-500">
                  {applications.length === 0
                    ? "No applications have been approved yet."
                    : "No applications match your search criteria."}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            {filteredPayments.length > 0 ? (
              filteredPayments.map((payment) => (
                <Card
                  key={payment._id}
                  className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={payment.payee?.image} />
                          <AvatarFallback className="bg-gray-700 text-white">
                            {payment.payee?.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">
                              {payment.payee?.name}
                            </h3>
                            <Badge className={getStatusColor(payment.status)}>
                              {getStatusIcon(payment.status)}
                              <span className="ml-2 capitalize">
                                {payment.status}
                              </span>
                            </Badge>
                          </div>

                          <p className="text-gray-300 font-medium mb-2">
                            {payment.gig?.title || "Payment"}
                          </p>

                          <div className="flex items-center gap-6 text-sm text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <IndianRupee className="h-4 w-4" />
                              <span>₹{payment.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(
                                  payment.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-4 w-4" />
                              <span className="capitalize">
                                {payment.type.replace("_", " ")}
                              </span>
                            </div>
                          </div>

                          {payment.description && (
                            <p className="text-gray-300 text-sm">
                              {payment.description}
                            </p>
                          )}

                          {payment.transferDetails?.transferId && (
                            <div className="mt-2 text-xs text-gray-500">
                              Transfer ID: {payment.transferDetails.transferId}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => {
                            setSelectedPayment(payment);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>

                        {/* Only show update status for certain scenarios */}
                        {(payment.status === "pending" ||
                          payment.status === "processing") && (
                          <Button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setStatusUpdateForm({
                                status: payment.status,
                                notes: "",
                                transferDetails: {
                                  transferId:
                                    payment.transferDetails?.transferId || "",
                                  transferMode:
                                    payment.transferDetails?.transferMode ||
                                    "bank",
                                },
                              });
                              setShowPaymentStatusModal(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            title="Update payment status (requires admin privileges)"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Update Status
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-16">
                <History className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">
                  No Payment History
                </h3>
                <p className="text-gray-500 mb-4">
                  {payments.length === 0
                    ? "You haven't initiated any payments yet. Start by approving applications and then initiate payments."
                    : "No payments match your search criteria."}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => router.push("/dashboard/gigs")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    View Applications
                  </Button>
                  <Button
                    onClick={fetchPayments}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Initiate Payment</DialogTitle>
            </DialogHeader>

            {selectedApplication && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Payment To:</h4>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={selectedApplication.freelancer?.image}
                      />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {selectedApplication.freelancer?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {selectedApplication.freelancer?.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {selectedApplication.gig?.title}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="amount" className="text-gray-300">
                    Payment Amount (₹) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <Label htmlFor="paymentType" className="text-gray-300">
                    Payment Type
                  </Label>
                  <Select
                    value={paymentForm.paymentType}
                    onValueChange={(value) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        paymentType: value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="gig_payment">Full Payment</SelectItem>
                      <SelectItem value="milestone_payment">
                        Milestone Payment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description" className="text-gray-300">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={paymentForm.description}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="Payment description"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={initiatePayment}
                    disabled={processingPayment || !paymentForm.amount}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Initiate Payment
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowPaymentModal(false)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bank Details Modal */}
        <Dialog
          open={showBankDetailsModal}
          onOpenChange={setShowBankDetailsModal}
        >
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Freelancer Bank Details</DialogTitle>
            </DialogHeader>

            {freelancerBankDetails ? (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Bank Account Information
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-400">
                        Account Holder Name
                      </Label>
                      <p className="text-white font-medium">
                        {freelancerBankDetails.accountHolderName}
                      </p>
                    </div>

                    {freelancerBankDetails.bankName && (
                      <div>
                        <Label className="text-gray-400">Bank Name</Label>
                        <p className="text-white">
                          {freelancerBankDetails.bankName}
                        </p>
                      </div>
                    )}

                    {freelancerBankDetails.accountNumber && (
                      <div>
                        <Label className="text-gray-400">Account Number</Label>
                        <p className="text-white font-mono">
                          ****{freelancerBankDetails.accountNumber.slice(-4)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last 4 digits shown for security
                        </p>
                      </div>
                    )}

                    {freelancerBankDetails.ifscCode && (
                      <div>
                        <Label className="text-gray-400">IFSC Code</Label>
                        <p className="text-white font-mono">
                          {freelancerBankDetails.ifscCode}
                        </p>
                      </div>
                    )}

                    {freelancerBankDetails.upiId && (
                      <div>
                        <Label className="text-gray-400">UPI ID</Label>
                        <p className="text-white">
                          {freelancerBankDetails.upiId}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowBankDetailsModal(false);
                      setShowPaymentModal(true);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Proceed to Payment
                  </Button>
                  <Button
                    onClick={() => setShowBankDetailsModal(false)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h4 className="font-medium text-yellow-400 mb-2">
                  No Bank Details Found
                </h4>
                <p className="text-gray-400 text-sm mb-4">
                  This freelancer hasn't added their bank details yet. Please
                  ask them to complete their payment information before
                  initiating a payment.
                </p>
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                  <p className="text-blue-400 text-xs">
                    💡 Tip: You can still initiate a payment, but it will be
                    marked as pending until the freelancer provides their bank
                    details.
                  </p>
                </div>
                <Button
                  onClick={() => setShowBankDetailsModal(false)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Status Update Modal */}
        <Dialog
          open={showPaymentStatusModal}
          onOpenChange={setShowPaymentStatusModal}
        >
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Update Payment Status</DialogTitle>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Payment Details:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">To:</span>
                      <span>{selectedPayment.payee?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount:</span>
                      <span>₹{selectedPayment.amount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Status:</span>
                      <Badge className={getStatusColor(selectedPayment.status)}>
                        {selectedPayment.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status" className="text-gray-300">
                    Update Status *
                  </Label>
                  <Select
                    value={statusUpdateForm.status}
                    onValueChange={(value) =>
                      setStatusUpdateForm((prev) => ({
                        ...prev,
                        status: value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {statusUpdateForm.status === "completed" && (
                  <>
                    <div>
                      <Label htmlFor="transferId" className="text-gray-300">
                        Transfer ID
                      </Label>
                      <Input
                        id="transferId"
                        value={statusUpdateForm.transferDetails.transferId}
                        onChange={(e) =>
                          setStatusUpdateForm((prev) => ({
                            ...prev,
                            transferDetails: {
                              ...prev.transferDetails,
                              transferId: e.target.value,
                            },
                          }))
                        }
                        className="bg-gray-800 border-gray-600 text-white mt-1"
                        placeholder="Enter bank transfer ID"
                      />
                    </div>

                    <div>
                      <Label htmlFor="transferMode" className="text-gray-300">
                        Transfer Mode
                      </Label>
                      <Select
                        value={statusUpdateForm.transferDetails.transferMode}
                        onValueChange={(value) =>
                          setStatusUpdateForm((prev) => ({
                            ...prev,
                            transferDetails: {
                              ...prev.transferDetails,
                              transferMode: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="bank">Bank Transfer</SelectItem>
                          <SelectItem value="upi">UPI Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="notes" className="text-gray-300">
                    Admin Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={statusUpdateForm.notes}
                    onChange={(e) =>
                      setStatusUpdateForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="Add notes about this status update"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={updatePaymentStatus}
                    disabled={updatingStatus || !statusUpdateForm.status}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    title="Note: Status updates may require admin privileges"
                  >
                    {updatingStatus ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Update Status
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowPaymentStatusModal(false)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                </div>

                {/* Admin notice */}
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-yellow-400 text-xs font-medium">
                        Admin Note
                      </p>
                      <p className="text-yellow-200 text-xs">
                        Payment status updates may require admin privileges. If
                        you encounter permission issues, please contact your
                        system administrator or use the regular payment tracking
                        features.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Details Modal */}
        <Dialog
          open={!!selectedPayment && !showPaymentStatusModal}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
        >
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-6">
                {/* Payment Overview */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Overview
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-400">Payment ID</Label>
                      <p className="text-white font-mono text-sm">
                        {selectedPayment._id}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Amount</Label>
                      <p className="text-white font-bold text-lg">
                        ₹{selectedPayment.amount?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Status</Label>
                      <div className="mt-1">
                        <Badge
                          className={getStatusColor(selectedPayment.status)}
                        >
                          {getStatusIcon(selectedPayment.status)}
                          <span className="ml-2 capitalize">
                            {selectedPayment.status}
                          </span>
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-400">Payment Type</Label>
                      <p className="text-white capitalize">
                        {selectedPayment.type?.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Initiated Date</Label>
                      <p className="text-white">
                        {new Date(selectedPayment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-gray-400">Last Updated</Label>
                      <p className="text-white">
                        {new Date(selectedPayment.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Recipient Details
                  </h3>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedPayment.payee?.image} />
                      <AvatarFallback className="bg-gray-700 text-white text-lg">
                        {selectedPayment.payee?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-semibold text-lg">
                        {selectedPayment.payee?.name}
                      </p>
                      <p className="text-gray-400">
                        {selectedPayment.payee?.email}
                      </p>
                      {selectedPayment.gig?.title && (
                        <p className="text-blue-400 text-sm mt-1">
                          Project: {selectedPayment.gig.title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Transfer Details */}
                {selectedPayment.transferDetails && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Transfer Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedPayment.transferDetails.transferId && (
                        <div>
                          <Label className="text-gray-400">Transfer ID</Label>
                          <p className="text-white font-mono">
                            {selectedPayment.transferDetails.transferId}
                          </p>
                        </div>
                      )}
                      {selectedPayment.transferDetails.transferMode && (
                        <div>
                          <Label className="text-gray-400">Transfer Mode</Label>
                          <p className="text-white capitalize">
                            {selectedPayment.transferDetails.transferMode}
                          </p>
                        </div>
                      )}
                      {selectedPayment.transferDetails.transferredAt && (
                        <div>
                          <Label className="text-gray-400">Transfer Date</Label>
                          <p className="text-white">
                            {new Date(
                              selectedPayment.transferDetails.transferredAt
                            ).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {selectedPayment.transferDetails.transferStatus && (
                        <div>
                          <Label className="text-gray-400">
                            Transfer Status
                          </Label>
                          <p className="text-white capitalize">
                            {selectedPayment.transferDetails.transferStatus}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedPayment.description && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Description
                    </h3>
                    <p className="text-gray-300">
                      {selectedPayment.description}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setStatusUpdateForm({
                        status: selectedPayment.status,
                        notes: "",
                        transferDetails: {
                          transferId:
                            selectedPayment.transferDetails?.transferId || "",
                          transferMode:
                            selectedPayment.transferDetails?.transferMode ||
                            "bank",
                        },
                      });
                      setShowPaymentStatusModal(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Update Status
                  </Button>
                  <Button
                    onClick={() => setSelectedPayment(null)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

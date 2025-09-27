"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wallet,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  Building,
  Loader2,
  RefreshCw,
  CreditCard,
  Plus,
  FileText,
  Users,
  TrendingDown,
  Send,
  Check,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function FreelancerEarningsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State management
  const [payments, setPayments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [activeTab, setActiveTab] = useState("earnings");

  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingPayments: 0,
    completedPayments: 0,
    thisMonthEarnings: 0,
    approvedApplications: 0,
    pendingRequests: 0,
  });

  // Payment request form state
  const [paymentRequestForm, setPaymentRequestForm] = useState({
    bankDetails: {
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      bankName: "",
      branchName: "",
      upiId: "",
      panNumber: "",
    },
    workDetails: {
      projectDescription: "",
      deliverables: "",
      completedDate: "",
      workDuration: "",
      clientSatisfactionRating: 5,
    },
    freelancerPhone: "",
    additionalNotes: "",
    urgencyLevel: "normal",
  });

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (session?.user) {
      fetchData();
    }
  }, [session, status]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPayments(),
        fetchApplications(),
        fetchPaymentRequests(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/freelancer/earnings");
      const data = await response.json();

      if (response.ok && data.success) {
        setPayments(data.payments || []);
        calculateStats(data.payments || []);
      } else {
        toast.error(data.error || "Failed to fetch earnings");
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to fetch earnings");
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await fetch("/api/freelancer/applications");
      const data = await response.json();

      if (response.ok && data.success) {
        setApplications(data.applications || []);
      } else {
        console.log("Failed to fetch applications:", data.error);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
      const response = await fetch("/api/freelancer/payment-request");
      const data = await response.json();

      if (response.ok && data.success) {
        setPaymentRequests(data.paymentRequests || []);
      } else {
        console.log("Failed to fetch payment requests:", data.error);
      }
    } catch (error) {
      console.error("Error fetching payment requests:", error);
    }
  };

  const calculateStats = (paymentsData) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const approvedApps = applications.filter(
      (app) => app.applicationStatus === "accepted"
    ).length;

    const pendingReqs = paymentRequests.filter(
      (req) => req.status === "pending"
    ).length;

    const stats = {
      totalEarnings: paymentsData
        .filter((p) => p.status === "completed")
        .reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: paymentsData
        .filter((p) => p.status === "pending" || p.status === "processing")
        .reduce((sum, p) => sum + p.amount, 0),
      completedPayments: paymentsData.filter((p) => p.status === "completed")
        .length,
      thisMonthEarnings: paymentsData
        .filter((p) => {
          const paymentDate = new Date(p.createdAt);
          return (
            p.status === "completed" &&
            paymentDate.getMonth() === currentMonth &&
            paymentDate.getFullYear() === currentYear
          );
        })
        .reduce((sum, p) => sum + p.amount, 0),
      approvedApplications: approvedApps,
      pendingRequests: pendingReqs,
    };

    setStats(stats);
  };

  const handlePaymentRequestSubmit = async () => {
    if (!selectedApplication) return;

    try {
      setSubmittingRequest(true);

      // Validate required fields
      const { bankDetails, workDetails, freelancerPhone } = paymentRequestForm;

      if (!bankDetails.accountHolderName || !bankDetails.panNumber) {
        toast.error("Account holder name and PAN number are required");
        return;
      }

      if (!bankDetails.accountNumber && !bankDetails.upiId) {
        toast.error("Either account number or UPI ID is required");
        return;
      }

      if (bankDetails.accountNumber && !bankDetails.ifscCode) {
        toast.error("IFSC code is required when providing account number");
        return;
      }

      if (
        !workDetails.projectDescription ||
        !workDetails.completedDate ||
        !freelancerPhone
      ) {
        toast.error("Please fill in all required work details");
        return;
      }

      const requestData = {
        gigId: selectedApplication.gigId,
        applicationId: selectedApplication._id,
        bankDetails: {
          ...bankDetails,
          panNumber: bankDetails.panNumber.toUpperCase(),
          ifscCode: bankDetails.ifscCode.toUpperCase(),
          upiId: bankDetails.upiId.toLowerCase(),
        },
        workDetails: {
          ...workDetails,
          deliverables: workDetails.deliverables
            .split("\n")
            .filter((d) => d.trim()),
        },
        freelancerPhone,
        additionalNotes: paymentRequestForm.additionalNotes,
        urgencyLevel: paymentRequestForm.urgencyLevel,
      };

      const response = await fetch("/api/freelancer/payment-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Payment request submitted successfully!");
        setShowPaymentRequestModal(false);
        setShowSuccessModal(true);
        setSelectedApplication(null);

        // Reset form
        setPaymentRequestForm({
          bankDetails: {
            accountHolderName: "",
            accountNumber: "",
            ifscCode: "",
            bankName: "",
            branchName: "",
            upiId: "",
            panNumber: "",
          },
          workDetails: {
            projectDescription: "",
            deliverables: "",
            completedDate: "",
            workDuration: "",
            clientSatisfactionRating: 5,
          },
          freelancerPhone: "",
          additionalNotes: "",
          urgencyLevel: "normal",
        });

        // Refresh data
        await fetchPaymentRequests();
      } else {
        toast.error(data.error || "Failed to submit payment request");
      }
    } catch (error) {
      console.error("Error submitting payment request:", error);
      toast.error("Failed to submit payment request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "approved":
        return <Check className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
      case "approved":
        return "bg-green-500/20 text-green-400 border-green-500";
      case "processing":
        return "bg-blue-500/20 text-blue-400 border-blue-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500";
      case "failed":
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500";
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.gig?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payer?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const approvedApplications = applications.filter(
    (app) => app.applicationStatus === "accepted"
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading your earnings...</p>
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
              <h1 className="text-3xl font-bold mb-2">
                My Earnings & Payments
              </h1>
              <p className="text-gray-400">
                Track your payments, earnings, and submit payment requests
              </p>
            </div>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-4 border-b border-gray-700">
            <button
              onClick={() => setActiveTab("earnings")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "earnings"
                  ? "border-green-500 text-green-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <DollarSign className="h-4 w-4 inline mr-2" />
              Earnings
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "requests"
                  ? "border-green-500 text-green-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Send className="h-4 w-4 inline mr-2" />
              Payment Requests
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "applications"
                  ? "border-green-500 text-green-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Approved Projects
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-400">
                    ₹{stats.totalEarnings.toLocaleString()}
                  </div>
                  <p className="text-gray-400">Total Earnings</p>
                </div>
                <Wallet className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-400">
                    {stats.approvedApplications}
                  </div>
                  <p className="text-gray-400">Approved Projects</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {stats.pendingRequests}
                  </div>
                  <p className="text-gray-400">Pending Requests</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-400">
                    ₹{stats.thisMonthEarnings.toLocaleString()}
                  </div>
                  <p className="text-gray-400">This Month</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Content */}
        {activeTab === "earnings" && (
          <>
            {/* Filters */}
            <Card className="bg-gray-900 border-gray-700 mb-8">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                      <Input
                        placeholder="Search payments, projects, or clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-gray-800 border-gray-600 text-white"
                      />
                    </div>
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48 bg-gray-800 border-gray-600">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payments Table */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPayments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-300">Date</TableHead>
                          <TableHead className="text-gray-300">
                            Project
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Client
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Amount
                          </TableHead>
                          <TableHead className="text-gray-300">Type</TableHead>
                          <TableHead className="text-gray-300">
                            Status
                          </TableHead>
                          <TableHead className="text-gray-300">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow
                            key={payment._id}
                            className="border-gray-700 hover:bg-gray-800/50"
                          >
                            <TableCell className="text-gray-300">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {new Date(
                                  payment.createdAt
                                ).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-white">
                              <div className="max-w-48 truncate">
                                {payment.gig?.title || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300">
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                {payment.payer?.name || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="text-green-400 font-semibold">
                              ₹{payment.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              <span className="capitalize">
                                {payment.type?.replace("_", " ") || "N/A"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(payment.status)}>
                                {getStatusIcon(payment.status)}
                                <span className="ml-2">{payment.status}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => setSelectedPayment(payment)}
                                variant="outline"
                                size="sm"
                                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Wallet className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">
                      No payments found
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Payments will appear here once clients initiate them for
                      your completed work
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "applications" && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Approved Projects - Request Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedApplications.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Project</TableHead>
                        <TableHead className="text-gray-300">Company</TableHead>
                        <TableHead className="text-gray-300">
                          Applied Date
                        </TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedApplications.map((application) => (
                        <TableRow
                          key={application._id}
                          className="border-gray-700 hover:bg-gray-800/50"
                        >
                          <TableCell className="text-white">
                            {application.gig?.title}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {application.gig?.company?.name}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(
                              application.appliedAt
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusColor(
                                application.applicationStatus
                              )}
                            >
                              {getStatusIcon(application.applicationStatus)}
                              <span className="ml-2">
                                {application.applicationStatus}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => {
                                setSelectedApplication(application);
                                setShowPaymentRequestModal(true);
                              }}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Request Payment
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <FileText className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No approved projects found
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Complete projects will appear here for payment requests
                  </p>
                  <Button
                    onClick={() => router.push("/freelancer/applications")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    View My Applications
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "requests" && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Payment Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">
                          Request ID
                        </TableHead>
                        <TableHead className="text-gray-300">Project</TableHead>
                        <TableHead className="text-gray-300">Amount</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">
                          Submitted
                        </TableHead>
                        <TableHead className="text-gray-300">Urgency</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentRequests.map((request) => (
                        <TableRow
                          key={request.requestId}
                          className="border-gray-700 hover:bg-gray-800/50"
                        >
                          <TableCell className="text-white font-mono">
                            {request.requestId}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {request.gigTitle}
                          </TableCell>
                          <TableCell className="text-green-400 font-semibold">
                            ₹{request.amount?.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(request.status)}>
                              {getStatusIcon(request.status)}
                              <span className="ml-2">{request.status}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(request.submittedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                request.urgencyLevel === "urgent"
                                  ? "bg-red-500/20 text-red-400 border-red-500"
                                  : "bg-gray-500/20 text-gray-400 border-gray-500"
                              }
                            >
                              {request.urgencyLevel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Send className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    No payment requests found
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Submit payment requests for your completed projects
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Detail Modal */}
        {selectedPayment && (
          <Dialog
            open={!!selectedPayment}
            onOpenChange={() => setSelectedPayment(null)}
          >
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Payment Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-sm">Amount</label>
                    <p className="text-2xl font-bold text-green-400">
                      ₹{selectedPayment.amount}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(selectedPayment.status)}>
                        {getStatusIcon(selectedPayment.status)}
                        <span className="ml-2">{selectedPayment.status}</span>
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Gig & Company Info */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-3">
                    Project Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-400 text-sm">Project</label>
                      <p className="text-white">
                        {selectedPayment.gig?.title || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">Client</label>
                      <p className="text-white">
                        {selectedPayment.payer?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm">
                        Payment Type
                      </label>
                      <p className="text-white capitalize">
                        {selectedPayment.type?.replace("_", " ") || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Timeline */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-3">Timeline</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Initiated:</span>
                      <span className="text-white">
                        {new Date(selectedPayment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedPayment.transferDetails?.transferredAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Completed:</span>
                        <span className="text-white">
                          {new Date(
                            selectedPayment.transferDetails.transferredAt
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Transfer Details */}
                {selectedPayment.transferDetails && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-3">
                      Transfer Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      {selectedPayment.transferDetails.transferId && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transfer ID:</span>
                          <span className="text-white font-mono">
                            {selectedPayment.transferDetails.transferId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Payment Request Modal */}
        {showPaymentRequestModal && selectedApplication && (
          <Dialog
            open={showPaymentRequestModal}
            onOpenChange={setShowPaymentRequestModal}
          >
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Submit Payment Request - {selectedApplication.gig?.title}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Project Summary */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Project Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Project:</span>
                      <p className="text-white">
                        {selectedApplication.gig?.title}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Company:</span>
                      <p className="text-white">
                        {selectedApplication.gig?.company?.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Budget:</span>
                      <p className="text-green-400">
                        ₹{selectedApplication.gig?.budget?.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Your Rate:</span>
                      <p className="text-green-400">
                        ₹{selectedApplication.proposedRate?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bank Details Form */}
                <div>
                  <h3 className="font-semibold mb-4">Bank Account Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Account Holder Name *
                      </label>
                      <Input
                        value={paymentRequestForm.bankDetails.accountHolderName}
                        onChange={(e) =>
                          setPaymentRequestForm((prev) => ({
                            ...prev,
                            bankDetails: {
                              ...prev.bankDetails,
                              accountHolderName: e.target.value,
                            },
                          }))
                        }
                        placeholder="Full name as per bank account"
                        className="bg-gray-800 border-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        PAN Number *
                      </label>
                      <Input
                        value={paymentRequestForm.bankDetails.panNumber}
                        onChange={(e) =>
                          setPaymentRequestForm((prev) => ({
                            ...prev,
                            bankDetails: {
                              ...prev.bankDetails,
                              panNumber: e.target.value.toUpperCase(),
                            },
                          }))
                        }
                        placeholder="ABCDE1234F"
                        className="bg-gray-800 border-gray-600"
                        maxLength={10}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Account Number
                      </label>
                      <Input
                        value={paymentRequestForm.bankDetails.accountNumber}
                        onChange={(e) =>
                          setPaymentRequestForm((prev) => ({
                            ...prev,
                            bankDetails: {
                              ...prev.bankDetails,
                              accountNumber: e.target.value,
                            },
                          }))
                        }
                        placeholder="Enter account number"
                        className="bg-gray-800 border-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        IFSC Code
                      </label>
                      <Input
                        value={paymentRequestForm.bankDetails.ifscCode}
                        onChange={(e) =>
                          setPaymentRequestForm((prev) => ({
                            ...prev,
                            bankDetails: {
                              ...prev.bankDetails,
                              ifscCode: e.target.value.toUpperCase(),
                            },
                          }))
                        }
                        placeholder="SBIN0001234"
                        className="bg-gray-800 border-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Bank Name
                      </label>
                      <Input
                        value={paymentRequestForm.bankDetails.bankName}
                        onChange={(e) =>
                          setPaymentRequestForm((prev) => ({
                            ...prev,
                            bankDetails: {
                              ...prev.bankDetails,
                              bankName: e.target.value,
                            },
                          }))
                        }
                        placeholder="State Bank of India"
                        className="bg-gray-800 border-gray-600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        UPI ID (Alternative)
                      </label>
                      <Input
                        value={paymentRequestForm.bankDetails.upiId}
                        onChange={(e) =>
                          setPaymentRequestForm((prev) => ({
                            ...prev,
                            bankDetails: {
                              ...prev.bankDetails,
                              upiId: e.target.value.toLowerCase(),
                            },
                          }))
                        }
                        placeholder="yourname@paytm"
                        className="bg-gray-800 border-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Work Details */}
                <div>
                  <h3 className="font-semibold mb-4">
                    Work Completion Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Project Description *
                      </label>
                      <Textarea
                        value={
                          paymentRequestForm.workDetails.projectDescription
                        }
                        onChange={(e) =>
                          setPaymentRequestForm((prev) => ({
                            ...prev,
                            workDetails: {
                              ...prev.workDetails,
                              projectDescription: e.target.value,
                            },
                          }))
                        }
                        placeholder="Describe the work completed..."
                        rows={4}
                        className="bg-gray-800 border-gray-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Completion Date *
                        </label>
                        <Input
                          type="date"
                          value={paymentRequestForm.workDetails.completedDate}
                          onChange={(e) =>
                            setPaymentRequestForm((prev) => ({
                              ...prev,
                              workDetails: {
                                ...prev.workDetails,
                                completedDate: e.target.value,
                              },
                            }))
                          }
                          className="bg-gray-800 border-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Work Duration *
                        </label>
                        <Input
                          value={paymentRequestForm.workDetails.workDuration}
                          onChange={(e) =>
                            setPaymentRequestForm((prev) => ({
                              ...prev,
                              workDetails: {
                                ...prev.workDetails,
                                workDuration: e.target.value,
                              },
                            }))
                          }
                          placeholder="e.g., 2 weeks"
                          className="bg-gray-800 border-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Your Phone Number *
                        </label>
                        <Input
                          value={paymentRequestForm.freelancerPhone}
                          onChange={(e) =>
                            setPaymentRequestForm((prev) => ({
                              ...prev,
                              freelancerPhone: e.target.value,
                            }))
                          }
                          placeholder="+91 9876543210"
                          className="bg-gray-800 border-gray-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Deliverables (one per line)
                      </label>
                      <Textarea
                        value={paymentRequestForm.workDetails.deliverables}
                        onChange={(e) =>
                          setPaymentRequestForm((prev) => ({
                            ...prev,
                            workDetails: {
                              ...prev.workDetails,
                              deliverables: e.target.value,
                            },
                          }))
                        }
                        placeholder="Website design files&#10;Source code&#10;Documentation"
                        rows={3}
                        className="bg-gray-800 border-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Urgency Level
                    </label>
                    <Select
                      value={paymentRequestForm.urgencyLevel}
                      onValueChange={(value) =>
                        setPaymentRequestForm((prev) => ({
                          ...prev,
                          urgencyLevel: value,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Client Satisfaction Rating
                    </label>
                    <Select
                      value={paymentRequestForm.workDetails.clientSatisfactionRating.toString()}
                      onValueChange={(value) =>
                        setPaymentRequestForm((prev) => ({
                          ...prev,
                          workDetails: {
                            ...prev.workDetails,
                            clientSatisfactionRating: parseInt(value),
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="5">5 - Excellent</SelectItem>
                        <SelectItem value="4">4 - Good</SelectItem>
                        <SelectItem value="3">3 - Average</SelectItem>
                        <SelectItem value="2">2 - Poor</SelectItem>
                        <SelectItem value="1">1 - Very Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Additional Notes
                  </label>
                  <Textarea
                    value={paymentRequestForm.additionalNotes}
                    onChange={(e) =>
                      setPaymentRequestForm((prev) => ({
                        ...prev,
                        additionalNotes: e.target.value,
                      }))
                    }
                    placeholder="Any additional information..."
                    rows={3}
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentRequestModal(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePaymentRequestSubmit}
                  disabled={submittingRequest}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submittingRequest ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center">
                  Payment Request Submitted Successfully!
                </DialogTitle>
              </DialogHeader>

              <div className="text-center py-6">
                <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>

                <p className="text-gray-300 mb-6">
                  Your payment request has been submitted to our Excel system
                  and will be processed within{" "}
                  <span className="font-semibold text-green-400">
                    7 business days
                  </span>
                  .
                </p>

                <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
                  <h4 className="font-semibold mb-3">What happens next?</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Your details have been exported to Excel
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      Admin will review your request
                    </li>
                    <li className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Payment will be initiated to your bank account
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      You'll receive confirmation once completed
                    </li>
                  </ul>
                </div>

                <p className="text-sm text-gray-400">
                  You can track your request status in the "Payment Requests"
                  tab.
                </p>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setActiveTab("requests");
                  }}
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  View My Requests
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

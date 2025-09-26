// app/freelancer/applications/page.js
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
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  MapPin,
  Calendar,
  Building,
  MessageCircle,
  CreditCard,
  Loader2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Edit,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

export default function FreelancerApplicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    bankName: "",
    upiId: "",
  });
  const [savingBankDetails, setSavingBankDetails] = useState(false);
  const [bankDetailsExist, setBankDetailsExist] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (session?.user) {
      console.log("Session user:", session.user);
      fetchApplications();
      fetchBankDetails();
    }
  }, [session, status]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      console.log("Fetching applications...");

      const response = await fetch("/api/freelancer/applications", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok && data.success) {
        setApplications(data.applications || []);
        console.log("Applications loaded:", data.applications?.length || 0);
      } else {
        console.error("API Error:", data.error);
        toast.error(data.error || "Failed to fetch applications");
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchBankDetails = async () => {
    try {
      const response = await fetch("/api/freelancer/bank-details");
      const data = await response.json();

      if (response.ok && data.success) {
        const details = data.bankDetails || {};
        setBankDetails(details);
        setBankDetailsExist(!!(details.accountNumber || details.upiId));
        console.log("Bank details fetched:", details);
      } else {
        console.log("No bank details found or error:", data.error);
        setBankDetailsExist(false);
      }
    } catch (error) {
      console.error("Error fetching bank details:", error);
      setBankDetailsExist(false);
    }
  };

  const saveBankDetails = async () => {
    try {
      setSavingBankDetails(true);

      // Validate required fields
      if (!bankDetails.accountHolderName?.trim()) {
        toast.error("Account holder name is required");
        return;
      }

      if (!bankDetails.accountNumber?.trim() && !bankDetails.upiId?.trim()) {
        toast.error("Either account number or UPI ID is required");
        return;
      }

      if (bankDetails.accountNumber?.trim() && !bankDetails.ifscCode?.trim()) {
        toast.error("IFSC code is required when using account number");
        return;
      }

      console.log("Saving bank details:", bankDetails);

      const response = await fetch("/api/freelancer/bank-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bankDetails),
      });

      const data = await response.json();
      console.log("Save response:", data);

      if (response.ok && data.success) {
        toast.success("Bank details saved successfully!");
        setShowBankDetailsModal(false);
        setBankDetailsExist(true);
        // Refresh bank details
        await fetchBankDetails();
      } else {
        toast.error(data.error || "Failed to save bank details");
      }
    } catch (error) {
      console.error("Error saving bank details:", error);
      toast.error("Failed to save bank details");
    } finally {
      setSavingBankDetails(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "accepted":
        return "bg-green-500/20 text-green-400 border-green-500";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500";
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500";
    }
  };

  const getPaymentStatusColor = (status) => {
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

  const openChat = (conversationId) => {
    router.push(`/dashboard/messages`);
  };

  const handleBankDetailsChange = (field, value) => {
    setBankDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Debug: Log current user role
  console.log("Current user role:", session?.user?.role);

  const ApplicationModal = ({ application, isOpen, onClose }) => {
    if (!application) return null;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Application Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Gig Information */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Building className="h-5 w-5" />
                Gig Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Title</Label>
                  <p className="text-white font-medium">
                    {application.gig?.title}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">Company</Label>
                  <p className="text-white">{application.gig?.company?.name}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Budget</Label>
                  <p className="text-white">₹{application.gig?.budget}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Timeline</Label>
                  <p className="text-white">{application.gig?.timeline}</p>
                </div>
              </div>
            </div>

            {/* Application Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Your Application</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Proposed Rate</Label>
                    <p className="text-white">₹{application.proposedRate}/hr</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Estimated Duration</Label>
                    <p className="text-white">
                      {application.estimatedDuration}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Cover Letter</Label>
                  <div className="bg-gray-700 rounded-lg p-4 mt-2">
                    <p className="text-gray-300">{application.coverLetter}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Application Status</Label>
                  <div className="mt-2">
                    <Badge
                      className={getStatusColor(application.applicationStatus)}
                    >
                      {getStatusIcon(application.applicationStatus)}
                      <span className="ml-2 capitalize">
                        {application.applicationStatus || "pending"}
                      </span>
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            {application.applicationStatus === "accepted" && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </h3>
                {application.payment ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-400">Amount</Label>
                        <p className="text-white font-medium">
                          ₹{application.payment.amount}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Payment Status</Label>
                        <div className="mt-2">
                          <Badge
                            className={getPaymentStatusColor(
                              application.payment.status
                            )}
                          >
                            {application.payment.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-400">Payment Type</Label>
                        <p className="text-white">{application.payment.type}</p>
                      </div>
                      <div>
                        <Label className="text-gray-400">Initiated Date</Label>
                        <p className="text-white">
                          {new Date(
                            application.payment.createdAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {application.payment.description && (
                      <div>
                        <Label className="text-gray-400">Description</Label>
                        <p className="text-white">
                          {application.payment.description}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <p className="text-gray-400">No payment initiated yet</p>
                    <p className="text-sm text-gray-500 mt-2">
                      The client will initiate payment once they're ready to
                      proceed
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {application.applicationStatus === "accepted" && (
              <div className="flex gap-4">
                {application.conversationId && (
                  <Button
                    onClick={() => openChat(application.conversationId)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Open Chat
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const BankDetailsModal = () => (
    <Dialog
      open={showBankDetailsModal}
      onOpenChange={(open) => {
        if (!open) {
          setShowBankDetailsModal(false);
        }
      }}
    >
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>
            {bankDetailsExist ? "Update Bank Details" : "Add Bank Details"}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBankDetailsModal(false)}
            className="p-1 h-auto text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="accountHolderName" className="text-gray-300">
              Account Holder Name *
            </Label>
            <Input
              id="accountHolderName"
              value={bankDetails.accountHolderName}
              onChange={(e) =>
                handleBankDetailsChange("accountHolderName", e.target.value)
              }
              className="bg-gray-800 border-gray-600 text-white mt-1"
              placeholder="Enter account holder name"
            />
          </div>
          <div>
            <Label htmlFor="bankName" className="text-gray-300">
              Bank Name
            </Label>
            <Input
              id="bankName"
              value={bankDetails.bankName}
              onChange={(e) =>
                handleBankDetailsChange("bankName", e.target.value)
              }
              className="bg-gray-800 border-gray-600 text-white mt-1"
              placeholder="Enter bank name"
            />
          </div>
          <div>
            <Label htmlFor="accountNumber" className="text-gray-300">
              Account Number
            </Label>
            <Input
              id="accountNumber"
              value={bankDetails.accountNumber}
              onChange={(e) =>
                handleBankDetailsChange("accountNumber", e.target.value)
              }
              className="bg-gray-800 border-gray-600 text-white mt-1"
              placeholder="Enter account number"
            />
          </div>
          <div>
            <Label htmlFor="ifscCode" className="text-gray-300">
              IFSC Code
            </Label>
            <Input
              id="ifscCode"
              value={bankDetails.ifscCode}
              onChange={(e) =>
                handleBankDetailsChange("ifscCode", e.target.value)
              }
              className="bg-gray-800 border-gray-600 text-white mt-1"
              placeholder="Enter IFSC code"
            />
          </div>
          <div>
            <Label htmlFor="upiId" className="text-gray-300">
              UPI ID (Optional)
            </Label>
            <Input
              id="upiId"
              value={bankDetails.upiId}
              onChange={(e) => handleBankDetailsChange("upiId", e.target.value)}
              className="bg-gray-800 border-gray-600 text-white mt-1"
              placeholder="Enter UPI ID"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              onClick={saveBankDetails}
              disabled={savingBankDetails}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {savingBankDetails ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Details"
              )}
            </Button>
            <Button
              onClick={() => setShowBankDetailsModal(false)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading your applications...</p>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(
    (app) => app.applicationStatus === "pending"
  );
  const acceptedApplications = applications.filter(
    (app) => app.applicationStatus === "accepted"
  );
  const rejectedApplications = applications.filter(
    (app) => app.applicationStatus === "rejected"
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Applications</h1>
              <p className="text-gray-400">
                Track your gig applications and their status
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowBankDetailsModal(true)}
                className={`${
                  bankDetailsExist
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-yellow-600 hover:bg-yellow-700"
                }`}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {bankDetailsExist ? (
                  <>
                    <Edit className="h-4 w-4 mr-1" />
                    Update Bank Details
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Bank Details
                  </>
                )}
              </Button>
              <Button
                onClick={fetchApplications}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Bank Details Alert */}
        {!bankDetailsExist && acceptedApplications.length > 0 && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-400 mb-1">
                  Bank Details Required
                </h4>
                <p className="text-yellow-200 text-sm mb-3">
                  You have accepted applications but haven't added your bank
                  details yet. Add them now to receive payments from clients.
                </p>
                <Button
                  onClick={() => setShowBankDetailsModal(true)}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Bank Details
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-white">
                {applications.length}
              </div>
              <p className="text-gray-400">Total Applications</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-400">
                {pendingApplications.length}
              </div>
              <p className="text-gray-400">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-400">
                {acceptedApplications.length}
              </div>
              <p className="text-gray-400">Accepted</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-400">
                {rejectedApplications.length}
              </div>
              <p className="text-gray-400">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Applications List */}
        {applications.length > 0 ? (
          <div className="space-y-6">
            {applications.map((application) => (
              <Card
                key={application._id}
                className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-white">
                          {application.gig?.title}
                        </h3>
                        <Badge
                          className={getStatusColor(
                            application.applicationStatus
                          )}
                        >
                          {getStatusIcon(application.applicationStatus)}
                          <span className="ml-2 capitalize">
                            {application.applicationStatus || "pending"}
                          </span>
                        </Badge>
                        {application.payment && (
                          <Badge
                            className={getPaymentStatusColor(
                              application.payment.status
                            )}
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Payment: {application.payment.status}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-400 mb-4">
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          <span>{application.gig?.company?.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>₹{application.proposedRate}/hr</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Applied{" "}
                            {new Date(
                              application.appliedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm line-clamp-2 mb-4">
                        {application.coverLetter}
                      </p>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={() => setSelectedApplication(application)}
                          variant="outline"
                          size="sm"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>

                        {application.applicationStatus === "accepted" && (
                          <>
                            {application.conversationId && (
                              <Button
                                onClick={() =>
                                  openChat(application.conversationId)
                                }
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Open Chat
                              </Button>
                            )}
                            {application.payment?.status === "completed" && (
                              <Button
                                onClick={() =>
                                  openChat(application.conversationId)
                                }
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <ArrowRight className="h-4 w-4 mr-2" />
                                Start Project
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-500 mb-4 text-lg">
              No applications yet
            </div>
            <p className="text-gray-400 mb-6">
              Start applying to gigs to see your applications here
            </p>
            <div className="space-y-4">
              <Button
                onClick={() => router.push("/gigs")}
                className="bg-green-600 hover:bg-green-700 mr-4"
              >
                Browse Gigs
              </Button>
              <Button
                onClick={fetchApplications}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        )}

        {/* Modals */}
        <ApplicationModal
          application={selectedApplication}
          isOpen={!!selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
        <BankDetailsModal />
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CreditCard,
  DollarSign,
  User,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Shield,
  Clock,
  Building2,
  Banknote,
  Send,
} from "lucide-react";

export default function GigPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Get gigId from params and freelancer from searchParams
  const gigId = params?.gigId;
  const freelancerId = searchParams?.get("freelancer");

  const [gig, setGig] = useState(null);
  const [freelancer, setFreelancer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    amount: "",
    description: "",
    paymentType: "gig_payment",
    milestoneDetails: {
      title: "",
      description: "",
      deliverables: [],
    },
  });

  // Freelancer bank details
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    bankName: "",
    upiId: "",
  });

  // Fetch gig and freelancer data
  useEffect(() => {
    const fetchData = async () => {
      if (!gigId || !freelancerId) {
        console.log("Missing gigId or freelancerId:", { gigId, freelancerId });
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Fetch gig details
        console.log("Fetching gig details for:", gigId);
        const gigResponse = await fetch(`/api/gigs/${gigId}`);
        if (!gigResponse.ok) {
          const errorData = await gigResponse.json();
          throw new Error(errorData.error || "Failed to fetch gig");
        }
        const gigData = await gigResponse.json();
        console.log("Gig data received:", gigData);
        setGig(gigData.gig);

        // Fetch freelancer details
        console.log("Fetching freelancer details for:", freelancerId);
        const freelancerResponse = await fetch(`/api/profile/${freelancerId}`);
        if (!freelancerResponse.ok) {
          const errorData = await freelancerResponse.json();
          throw new Error(errorData.error || "Failed to fetch freelancer");
        }
        const freelancerData = await freelancerResponse.json();
        console.log("Freelancer data received:", freelancerData);
        setFreelancer(freelancerData.user);

        // Try to fetch freelancer bank details (this might fail if freelancer hasn't set them)
        try {
          const bankResponse = await fetch(`/api/freelancer/bank-details`);
          if (bankResponse.ok) {
            const bankData = await bankResponse.json();
            setBankDetails(bankData.bankDetails || {});
          }
        } catch (bankError) {
          console.log("Bank details not available:", bankError.message);
          // This is not critical, user can enter manually
        }

        // Set default amount to gig budget
        setPaymentData((prev) => ({
          ...prev,
          amount: gigData.gig.budget?.toString() || "",
          description: `Payment for "${gigData.gig.title}"`,
        }));
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [gigId, freelancerId]);

  const handleInputChange = (field, value) => {
    setPaymentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBankDetailsChange = (field, value) => {
    setBankDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      setError("Please enter a valid amount");
      return false;
    }

    if (!bankDetails.accountHolderName?.trim()) {
      setError("Account holder name is required");
      return false;
    }

    if (!bankDetails.accountNumber?.trim() && !bankDetails.upiId?.trim()) {
      setError("Either account number or UPI ID is required");
      return false;
    }

    if (bankDetails.accountNumber?.trim() && !bankDetails.ifscCode?.trim()) {
      setError("IFSC code is required when using account number");
      return false;
    }

    return true;
  };

  const initiatePayment = async () => {
    if (!validateForm()) return;

    try {
      setInitiatingPayment(true);
      setError("");

      const paymentPayload = {
        freelancerId,
        gigId,
        amount: parseFloat(paymentData.amount),
        description: paymentData.description,
        freelancerBankDetails: bankDetails,
        paymentType: paymentData.paymentType,
        milestoneDetails:
          paymentData.paymentType === "milestone_payment"
            ? paymentData.milestoneDetails
            : undefined,
      };

      console.log("Initiating payment with payload:", paymentPayload);

      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentPayload),
      });

      const data = await response.json();
      console.log("Payment response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate payment");
      }

      setSuccess(
        "Payment initiated successfully! The freelancer will receive the payment within 2-3 business days."
      );

      // Redirect to gig page after 3 seconds
      setTimeout(() => {
        router.push(`/dashboard/gigs/${gigId}`);
      }, 3000);
    } catch (err) {
      console.error("Payment initiation error:", err);
      setError(err.message);
    } finally {
      setInitiatingPayment(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Initiated!
          </h2>
          <p className="text-gray-600 mb-6">{success}</p>
          <button
            onClick={() => router.push(`/dashboard/gigs/${gigId}`)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Gig
          </button>
        </div>
      </div>
    );
  }

  // Error state (if critical error during loading)
  if (error && !gig && !freelancer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Initiate Payment
            </h1>
            <div className="w-16"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gig & Freelancer Info */}
          <div className="space-y-6">
            {/* Gig Details */}
            {gig && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Gig Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Project Title</p>
                    <p className="font-medium">{gig.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Budget</p>
                    <p className="font-medium text-green-600">
                      ₹{gig.budget?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{gig.category}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Freelancer Details */}
            {freelancer && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Freelancer Details
                </h3>
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={freelancer.image || "/default-avatar.png"}
                    alt={freelancer.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium">{freelancer.name}</p>
                    <p className="text-sm text-gray-500">{freelancer.role}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Hourly Rate:</span>
                    <span className="font-medium">
                      ₹{freelancer.profile?.hourlyRate || "N/A"}/hour
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Rating:</span>
                    <span className="font-medium">
                      {freelancer.stats?.rating || "N/A"}/5
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Form */}
          <div className="space-y-6">
            {/* Payment Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Details
              </h3>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Type
                  </label>
                  <select
                    value={paymentData.paymentType}
                    onChange={(e) =>
                      handleInputChange("paymentType", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="gig_payment">Full Gig Payment</option>
                    <option value="milestone_payment">Milestone Payment</option>
                    <option value="bonus_payment">Bonus Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) =>
                      handleInputChange("amount", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount"
                    min="1"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={paymentData.description}
                    onChange={(e) =>
                      handleInputChange("description", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                    placeholder="Payment description"
                  />
                </div>

                {paymentData.paymentType === "milestone_payment" && (
                  <div className="space-y-3 border-t pt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Milestone Title
                      </label>
                      <input
                        type="text"
                        value={paymentData.milestoneDetails.title}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            milestoneDetails: {
                              ...prev.milestoneDetails,
                              title: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Design Phase Completion"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Milestone Description
                      </label>
                      <textarea
                        value={paymentData.milestoneDetails.description}
                        onChange={(e) =>
                          setPaymentData((prev) => ({
                            ...prev,
                            milestoneDetails: {
                              ...prev.milestoneDetails,
                              description: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        rows="2"
                        placeholder="Describe what was completed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Bank Details
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    value={bankDetails.accountHolderName}
                    onChange={(e) =>
                      handleBankDetailsChange(
                        "accountHolderName",
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Full name as per bank account"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) =>
                        handleBankDetailsChange("accountNumber", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Bank account number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={bankDetails.ifscCode}
                      onChange={(e) =>
                        handleBankDetailsChange("ifscCode", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="IFSC code"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankDetails.bankName}
                    onChange={(e) =>
                      handleBankDetailsChange("bankName", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Bank name"
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Or use UPI:</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      value={bankDetails.upiId}
                      onChange={(e) =>
                        handleBankDetailsChange("upiId", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      placeholder="user@paytm or user@upi"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900">Secure Payment</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your payment will be processed securely. The freelancer will
                    receive the payment within 2-3 business days.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={initiatePayment}
              disabled={initiatingPayment || !gig || !freelancer}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {initiatingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Initiate Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

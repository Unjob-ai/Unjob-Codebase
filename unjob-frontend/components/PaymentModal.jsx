"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, CreditCard, Building, Smartphone } from "lucide-react";
import { toast } from "react-hot-toast";

export default function PaymentModal({
  isOpen,
  onClose,
  freelancer,
  gig,
  onPaymentSuccess,
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    bankName: "",
    upiId: "",
  });
  const [paymentType, setPaymentType] = useState("gig_payment");
  const [paymentMode, setPaymentMode] = useState("bank"); // bank or upi
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form
      if (!amount || parseFloat(amount) <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (!bankDetails.accountHolderName.trim()) {
        toast.error("Account holder name is required");
        return;
      }

      if (paymentMode === "bank") {
        if (
          !bankDetails.accountNumber ||
          !bankDetails.ifscCode ||
          !bankDetails.bankName
        ) {
          toast.error("Please fill all bank details");
          return;
        }
      } else {
        if (!bankDetails.upiId) {
          toast.error("Please enter UPI ID");
          return;
        }
      }

      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          freelancerId: freelancer._id,
          gigId: gig._id,
          amount: parseFloat(amount),
          description: description || `Payment for "${gig.title}"`,
          freelancerBankDetails: bankDetails,
          paymentType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Payment initiated successfully!");
        onPaymentSuccess();
        onClose();
        // Reset form
        setAmount("");
        setDescription("");
        setBankDetails({
          accountNumber: "",
          ifscCode: "",
          accountHolderName: "",
          bankName: "",
          upiId: "",
        });
      } else {
        toast.error(data.error || "Failed to initiate payment");
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (mode) => {
    setPaymentMode(mode);
    // Clear opposite mode fields
    if (mode === "bank") {
      setBankDetails((prev) => ({ ...prev, upiId: "" }));
    } else {
      setBankDetails((prev) => ({
        ...prev,
        accountNumber: "",
        ifscCode: "",
        bankName: "",
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Initiate Payment
            </CardTitle>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="text-sm text-gray-400">
            Pay {freelancer.name} for "{gig.title}"
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Payment Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50000"
                    className="bg-gray-800 border-gray-600 text-white mt-2"
                    required
                    min="100"
                  />
                </div>

                <div>
                  <Label className="text-white">Payment Type</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="gig_payment" className="text-white">
                        Full Payment
                      </SelectItem>
                      <SelectItem
                        value="milestone_payment"
                        className="text-white"
                      >
                        Milestone Payment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white">Description (Optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Payment description..."
                  className="bg-gray-800 border-gray-600 text-white mt-2"
                  rows="3"
                />
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Payment Mode</h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleModeChange("bank")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMode === "bank"
                      ? "border-green-500 bg-green-500/10"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Building className="h-6 w-6 text-white" />
                    <span className="text-white font-medium">
                      Bank Transfer
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange("upi")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    paymentMode === "upi"
                      ? "border-green-500 bg-green-500/10"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Smartphone className="h-6 w-6 text-white" />
                    <span className="text-white font-medium">UPI Transfer</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Bank/UPI Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                {paymentMode === "bank" ? "Bank Details" : "UPI Details"}
              </h3>

              <div>
                <Label className="text-white">Account Holder Name *</Label>
                <Input
                  type="text"
                  value={bankDetails.accountHolderName}
                  onChange={(e) =>
                    setBankDetails({
                      ...bankDetails,
                      accountHolderName: e.target.value,
                    })
                  }
                  placeholder="John Doe"
                  className="bg-gray-800 border-gray-600 text-white mt-2"
                  required
                />
              </div>

              {paymentMode === "bank" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Account Number *</Label>
                      <Input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) =>
                          setBankDetails({
                            ...bankDetails,
                            accountNumber: e.target.value,
                          })
                        }
                        placeholder="1234567890"
                        className="bg-gray-800 border-gray-600 text-white mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-white">IFSC Code *</Label>
                      <Input
                        type="text"
                        value={bankDetails.ifscCode}
                        onChange={(e) =>
                          setBankDetails({
                            ...bankDetails,
                            ifscCode: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="SBIN0001234"
                        className="bg-gray-800 border-gray-600 text-white mt-2"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white">Bank Name *</Label>
                    <Input
                      type="text"
                      value={bankDetails.bankName}
                      onChange={(e) =>
                        setBankDetails({
                          ...bankDetails,
                          bankName: e.target.value,
                        })
                      }
                      placeholder="State Bank of India"
                      className="bg-gray-800 border-gray-600 text-white mt-2"
                      required
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-white">UPI ID *</Label>
                  <Input
                    type="text"
                    value={bankDetails.upiId}
                    onChange={(e) =>
                      setBankDetails({ ...bankDetails, upiId: e.target.value })
                    }
                    placeholder="john@paytm"
                    className="bg-gray-800 border-gray-600 text-white mt-2"
                    required
                  />
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-white">Payment Summary</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white">₹{amount || "0"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Mode:</span>
                <span className="text-white capitalize">
                  {paymentMode} Transfer
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Processing Fee:</span>
                <span className="text-white">₹0</span>
              </div>
              <div className="border-t border-gray-600 pt-2 flex justify-between">
                <span className="text-white font-medium">Total:</span>
                <span className="text-green-400 font-bold">
                  ₹{amount || "0"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-gray-600 text-white hover:bg-gray-800 bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                    Processing...
                  </div>
                ) : (
                  "Initiate Payment"
                )}
              </Button>
            </div>

            {/* Disclaimer */}
            <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded">
              <p className="mb-1">⚠️ Important:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>
                  This will initiate a direct bank transfer to the freelancer
                </li>
                <li>Please verify all bank details before proceeding</li>
                <li>Payment processing may take 1-3 business days</li>
                <li>
                  You will receive a confirmation once payment is completed
                </li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

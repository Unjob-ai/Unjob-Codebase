// components/messages/NegotiationPanel.js - NEW FILE
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Send,
  CreditCard,
  IndianRupee,
  Handshake,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-hot-toast";

export function NegotiationPanel({
  conversation,
  session,
  onSendNegotiation,
  onAcceptOffer,
  onProceedToPayment,
}) {
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [negotiationData, setNegotiationData] = useState({
    proposedPrice: "",
    timeline: "",
    additionalTerms: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const isHiring = session?.user?.role === "hiring";
  const currentNegotiation = conversation?.metadata?.currentNegotiation;
  const originalBudget = conversation?.metadata?.initialBudget || 0;
  const projectTitle = conversation?.metadata?.projectTitle || "Project";

  // Calculate platform fee and total
  const proposedAmount = currentNegotiation?.proposedPrice || originalBudget;
  const platformFee = Math.round(proposedAmount * 0.05);
  const totalPayable = proposedAmount + platformFee;

  const handleSendNegotiation = async () => {
    if (!negotiationData.proposedPrice) {
      toast.error("Please enter a proposed price");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendNegotiation({
        proposedPrice: parseInt(negotiationData.proposedPrice),
        timeline: negotiationData.timeline,
        additionalTerms: negotiationData.additionalTerms,
        proposedBy: session.user.role,
      });

      setNegotiationData({
        proposedPrice: "",
        timeline: "",
        additionalTerms: "",
      });
      setShowNegotiationForm(false);
      toast.success("Negotiation sent successfully!");
    } catch (error) {
      toast.error("Failed to send negotiation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptOffer = async () => {
    setIsSubmitting(true);
    try {
      await onAcceptOffer(currentNegotiation);
      toast.success("Offer accepted! Ready for payment...");
    } catch (error) {
      toast.error("Failed to accept offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToPayment = async () => {
    setIsSubmitting(true);
    try {
      const result = await onProceedToPayment({
        conversationId: conversation._id,
        finalAmount: currentNegotiation.proposedPrice,
        agreementTerms: currentNegotiation.additionalTerms,
      });

      if (result.requiresPayment) {
        setPaymentData(result);
        setShowPaymentDialog(true);
      }
      setShowPaymentConfirm(false);
    } catch (error) {
      toast.error("Failed to initiate payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Razorpay payment handler
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

  const handleRazorpayPayment = async () => {
    try {
      setPaymentProcessing(true);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway");
        return;
      }

      const options = {
        key: paymentData.keyId,
        amount: paymentData.amount * 100,
        currency: paymentData.currency,
        name: "UnJob Platform",
        description: `Payment for ${paymentData.projectDetails.title}`,
        order_id: paymentData.orderId,
        handler: async function (response) {
          try {
            const verifyResponse = await fetch(
              `/api/conversations/${conversation._id}/verify-payment`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              toast.success("Payment successful! Project has started.");
              setShowPaymentDialog(false);
              // Refresh the page or update conversation state
              window.location.reload();
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

  // Don't show if conversation is not in negotiating status
  if (!["negotiating", "payment_pending"].includes(conversation?.status)) {
    return null;
  }

  return (
    <>
      {/* Negotiation Status Panel */}
      <div className="bg-gray-900/50 border-b border-green-600/30 p-4">
        <Card className="bg-gradient-to-r from-blue-900/20 to-green-900/20 border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Handshake className="h-5 w-5 text-blue-400" />
              {conversation?.status === "payment_pending"
                ? "Payment Pending"
                : "Price Negotiation in Progress"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-300 text-sm">Project</p>
                <p className="text-white font-medium">{projectTitle}</p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Original Budget</p>
                <p className="text-white font-medium">
                  ₹{originalBudget?.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Current Negotiation Status */}
            {currentNegotiation ? (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        currentNegotiation.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }
                    >
                      {currentNegotiation.status === "accepted"
                        ? "Agreed Price"
                        : "Latest Offer"}
                    </Badge>
                    <span className="text-gray-400 text-sm">
                      by{" "}
                      {currentNegotiation.proposedBy === "hiring"
                        ? "Client"
                        : "Freelancer"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">
                      ₹{currentNegotiation.proposedPrice?.toLocaleString()}
                    </p>
                    {currentNegotiation.timeline && (
                      <p className="text-gray-400 text-sm">
                        {currentNegotiation.timeline}
                      </p>
                    )}
                  </div>
                </div>

                {currentNegotiation.additionalTerms && (
                  <div>
                    <p className="text-gray-300 text-sm mb-1">
                      Additional Terms:
                    </p>
                    <p className="text-white text-sm">
                      {currentNegotiation.additionalTerms}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <Separator className="my-4" />
                <div className="flex gap-3 flex-wrap">
                  {/* If offer is accepted and user is hiring, show payment button */}
                  {isHiring && currentNegotiation.status === "accepted" && (
                    <Button
                      onClick={() => setShowPaymentConfirm(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Proceed to Payment
                    </Button>
                  )}

                  {/* If the current user didn't make the offer and it's not accepted, they can accept it */}
                  {currentNegotiation.proposedBy !== session.user.role &&
                    currentNegotiation.status !== "accepted" && (
                      <Button
                        onClick={handleAcceptOffer}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Accept Offer
                      </Button>
                    )}

                  {/* Counter Offer Button - only if status is not accepted */}
                  {currentNegotiation.status !== "accepted" && (
                    <Button
                      onClick={() => setShowNegotiationForm(true)}
                      variant="outline"
                      className="border-blue-300 text-blue-300 hover:bg-blue-900/20"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      {currentNegotiation.proposedBy === session.user.role
                        ? "Modify Offer"
                        : "Counter Offer"}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Initial Negotiation Prompt */
              <div className="text-center py-4">
                <p className="text-gray-300 mb-4">
                  Start by proposing your preferred price and timeline for this
                  project.
                </p>
                <Button
                  onClick={() => setShowNegotiationForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Start Negotiation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Negotiation Form Dialog */}
      <Dialog open={showNegotiationForm} onOpenChange={setShowNegotiationForm}>
        <DialogContent className="bg-white text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="text-black">
              {currentNegotiation ? "Update Your Offer" : "Make an Offer"}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Propose your price and terms for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-black mb-2 block">
                Proposed Price (₹) *
              </label>
              <Input
                type="number"
                placeholder={originalBudget.toString()}
                value={negotiationData.proposedPrice}
                onChange={(e) =>
                  setNegotiationData((prev) => ({
                    ...prev,
                    proposedPrice: e.target.value,
                  }))
                }
                className="bg-gray-50 border-gray-300 text-black"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black mb-2 block">
                Timeline
              </label>
              <Input
                placeholder="e.g., 7 days, 2 weeks"
                value={negotiationData.timeline}
                onChange={(e) =>
                  setNegotiationData((prev) => ({
                    ...prev,
                    timeline: e.target.value,
                  }))
                }
                className="bg-gray-50 border-gray-300 text-black"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-black mb-2 block">
                Additional Terms
              </label>
              <Textarea
                placeholder="Any additional terms or requirements..."
                value={negotiationData.additionalTerms}
                onChange={(e) =>
                  setNegotiationData((prev) => ({
                    ...prev,
                    additionalTerms: e.target.value,
                  }))
                }
                className="bg-gray-50 border-gray-300 text-black"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNegotiationForm(false)}
              className="border-gray-300 text-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendNegotiation}
              disabled={isSubmitting || !negotiationData.proposedPrice}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentConfirm} onOpenChange={setShowPaymentConfirm}>
        <DialogContent className="bg-white text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="text-black">Confirm Payment</DialogTitle>
            <DialogDescription className="text-gray-600">
              Review the final details before proceeding to payment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Project Amount</span>
                <span className="text-black font-semibold">
                  ₹{proposedAmount?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee (5%)</span>
                <span className="text-black font-semibold">
                  ₹{platformFee?.toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-black font-bold">Total Payable</span>
                <span className="text-green-600 font-bold text-lg">
                  ₹{totalPayable?.toLocaleString()}
                </span>
              </div>
            </div>

            {currentNegotiation?.timeline && (
              <div>
                <p className="text-gray-600 text-sm">Timeline</p>
                <p className="text-black font-medium">
                  {currentNegotiation.timeline}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentConfirm(false)}
              className="border-gray-300 text-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleProceedToPayment}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <IndianRupee className="h-4 w-4 mr-2" />
              )}
              Confirm & Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Razorpay Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-white text-black max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-black">
              <button
                onClick={() => setShowPaymentDialog(false)}
                className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              Payment Checkout
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Project Title */}
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              {paymentData?.projectDetails?.title}
            </h3>

            {/* Freelancer Info */}
            <div>
              <h4 className="text-gray-900 font-semibold text-base mb-3">
                Paying to:
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  {paymentData?.freelancerDetails?.image ? (
                    <img
                      src={paymentData.freelancerDetails.image}
                      alt="Freelancer"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-semibold">
                      {paymentData?.freelancerDetails?.name?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold text-base">
                    {paymentData?.freelancerDetails?.name || "User"}
                  </p>
                  <p className="text-gray-500 text-sm">
                    @{paymentData?.freelancerDetails?.username || "user"}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {paymentData?.projectDetails?.timeline && (
              <div>
                <h4 className="text-gray-900 font-semibold text-base mb-3">
                  Timeline:
                </h4>
                <p className="text-gray-600 font-medium text-base">
                  {paymentData.projectDetails.timeline}
                </p>
              </div>
            )}

            {/* Amount Breakdown */}
            <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
              <h4 className="text-gray-900 font-bold text-xl">
                Amount Breakdown
              </h4>

              <div className="flex justify-between items-center">
                <span className="text-emerald-500 font-semibold text-base">
                  Project Amount
                </span>
                <span className="text-gray-900 font-bold text-base">
                  ₹{paymentData?.projectDetails?.amount?.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-emerald-500 font-semibold text-base">
                  Platform Fee (5%)
                </span>
                <span className="text-gray-900 font-bold text-base">
                  ₹{paymentData?.projectDetails?.platformFee?.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-gray-400 font-semibold text-lg">
                  Total Amount
                </span>
                <span className="text-emerald-500 font-bold text-xl">
                  ₹{paymentData?.projectDetails?.totalPayable?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handleRazorpayPayment}
              disabled={paymentProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-4 rounded-2xl text-lg h-14"
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
    </>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  MessageCircle,
  CreditCard,
  Loader2,
  X,
  CheckCircle,
  Clock,
  DollarSign,
  Send,
  Check,
} from "lucide-react";

export default function Modals({
  // Application Detail Modal
  selectedApplication,
  setSelectedApplication,
  getStatusColor,
  getStatusIcon,
  openChat,

  // Bank Details Modal
  showBankDetailsModal,
  setShowBankDetailsModal,
  bankDetails,
  handleBankDetailsChange,
  savingBankDetails,
  saveBankDetails,
  bankDetailsExist,

  // Change Bank Details Modal
  showChangeBankDetailsModal,
  setShowChangeBankDetailsModal,
  changeBankDetails,
  handleChangeBankDetailsChange,
  savingChangeBankDetails,
  saveChangeBankDetails,

  // Payment Detail Modal
  selectedPayment,
  setSelectedPayment,

  // Payment Request Modal
  showPaymentRequestModal,
  setShowPaymentRequestModal,
  paymentRequestForm,
  setPaymentRequestForm,
  handlePaymentRequestSubmit,
  submittingRequest,

  // Success Modal
  showSuccessModal,
  setShowSuccessModal,
  setActiveTab,
}) {
  return (
    <>
      {/* Application Detail Modal - Horizontal Layout (many fields) */}
      {selectedApplication && (
        <Dialog
          open={!!selectedApplication}
          onOpenChange={() => setSelectedApplication(null)}
        >
          <DialogContent className="bg-white text-black max-w-4xl w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
            <DialogHeader className="p-4 pb-3 border-b border-gray-200">
              <DialogTitle className="text-xl font-bold text-black">
                APPLICATION DETAILS
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-5">
              {/* Gig Information */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-black">
                  <Building className="h-4 w-4 text-green-500" />
                  Gig Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-black mb-1 block">
                      Title
                    </Label>
                    <p className="text-gray-700 font-medium bg-white p-2 rounded-lg border border-gray-200 text-sm">
                      {selectedApplication.gig?.title}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-black mb-1 block">
                      Company
                    </Label>
                    <p className="text-gray-700 bg-white p-2 rounded-lg border border-gray-200 text-sm">
                      {selectedApplication.gig?.company?.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-black mb-1 block">
                      Budget
                    </Label>
                    <p className="text-green-600 font-semibold bg-white p-2 rounded-lg border border-gray-200 text-sm">
                      ₹{selectedApplication.gig?.budget}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-black mb-1 block">
                      Timeline
                    </Label>
                    <p className="text-gray-700 bg-white p-2 rounded-lg border border-gray-200 text-sm">
                      {selectedApplication.gig?.timeline}
                    </p>
                  </div>
                </div>
              </div>



              {/* Action Buttons */}
              {selectedApplication.applicationStatus === "accepted" && (
                <div className="flex gap-3 pt-2">
                  {selectedApplication.conversationId && (
                    <Button
                      onClick={() =>
                        openChat(selectedApplication.conversationId)
                      }
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-full h-10 text-sm font-medium"
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
      )}

      {/* Bank Details Modal - Vertical Layout (fewer fields) */}
      <Dialog
        open={showBankDetailsModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowBankDetailsModal(false);
          }
        }}
      >
        <DialogContent className="bg-white text-black max-w-md w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-black">
              {bankDetailsExist ? "UPDATE BANK DETAILS" : "ADD BANK DETAILS"}
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4">
            <div>
              <Label
                htmlFor="accountHolderName"
                className="text-xs font-medium text-black mb-2 block"
              >
                Account Holder Name *
              </Label>
              <Input
                id="accountHolderName"
                value={bankDetails.accountHolderName}
                onChange={(e) =>
                  handleBankDetailsChange("accountHolderName", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter account holder name"
              />
            </div>

            <div>
              <Label
                htmlFor="bankName"
                className="text-xs font-medium text-black mb-2 block"
              >
                Bank Name
              </Label>
              <Input
                id="bankName"
                value={bankDetails.bankName}
                onChange={(e) =>
                  handleBankDetailsChange("bankName", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter bank name"
              />
            </div>

            <div>
              <Label
                htmlFor="accountNumber"
                className="text-xs font-medium text-black mb-2 block"
              >
                Account Number
              </Label>
              <Input
                id="accountNumber"
                value={bankDetails.accountNumber}
                onChange={(e) =>
                  handleBankDetailsChange("accountNumber", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter account number"
              />
            </div>

            <div>
              <Label
                htmlFor="ifscCode"
                className="text-xs font-medium text-black mb-2 block"
              >
                IFSC Code
              </Label>
              <Input
                id="ifscCode"
                value={bankDetails.ifscCode}
                onChange={(e) =>
                  handleBankDetailsChange("ifscCode", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter IFSC code"
              />
            </div>

            <div>
              <Label
                htmlFor="upiId"
                className="text-xs font-medium text-black mb-2 block"
              >
                UPI ID (Optional)
              </Label>
              <Input
                id="upiId"
                value={bankDetails.upiId}
                onChange={(e) =>
                  handleBankDetailsChange("upiId", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter UPI ID"
              />
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={saveBankDetails}
                disabled={savingBankDetails}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full h-10 text-sm font-medium"
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
                className="border-green-500 text-green-500 hover:bg-green-50 rounded-full h-10 text-sm font-medium bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Bank Details Modal - Vertical Layout (fewer fields) */}
      <Dialog
        open={showChangeBankDetailsModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowChangeBankDetailsModal(false);
          }
        }}
      >
        <DialogContent className="bg-white text-black max-w-md w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-black">
              CHANGE BANK DETAILS
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 space-y-4">
            <div>
              <Label
                htmlFor="changeAccountHolderName"
                className="text-xs font-medium text-black mb-2 block"
              >
                Account Holder Name *
              </Label>
              <Input
                id="changeAccountHolderName"
                value={changeBankDetails?.accountHolderName || ""}
                onChange={(e) =>
                  handleChangeBankDetailsChange("accountHolderName", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter account holder name"
              />
            </div>

            <div>
              <Label
                htmlFor="changeBankName"
                className="text-xs font-medium text-black mb-2 block"
              >
                Bank Name
              </Label>
              <Input
                id="changeBankName"
                value={changeBankDetails?.bankName || ""}
                onChange={(e) =>
                  handleChangeBankDetailsChange("bankName", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter bank name"
              />
            </div>

            <div>
              <Label
                htmlFor="changeAccountNumber"
                className="text-xs font-medium text-black mb-2 block"
              >
                Account Number
              </Label>
              <Input
                id="changeAccountNumber"
                value={changeBankDetails?.accountNumber || ""}
                onChange={(e) =>
                  handleChangeBankDetailsChange("accountNumber", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter account number"
              />
            </div>

            <div>
              <Label
                htmlFor="changeIfscCode"
                className="text-xs font-medium text-black mb-2 block"
              >
                IFSC Code
              </Label>
              <Input
                id="changeIfscCode"
                value={changeBankDetails?.ifscCode || ""}
                onChange={(e) =>
                  handleChangeBankDetailsChange("ifscCode", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter IFSC code"
              />
            </div>

            <div>
              <Label
                htmlFor="changeUpiId"
                className="text-xs font-medium text-black mb-2 block"
              >
                UPI ID (Optional)
              </Label>
              <Input
                id="changeUpiId"
                value={changeBankDetails?.upiId || ""}
                onChange={(e) =>
                  handleChangeBankDetailsChange("upiId", e.target.value)
                }
                className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                placeholder="Enter UPI ID"
              />
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button
                onClick={saveChangeBankDetails}
                disabled={savingChangeBankDetails}
                className="bg-green-500 hover:bg-green-700 text-white rounded-full h-10 text-sm font-medium"
              >
                {savingChangeBankDetails ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Details"
                )}
              </Button>
              <Button
                onClick={() => setShowChangeBankDetailsModal(false)}
                variant="outline"
                className="border-green-500 text-black hover:bg-transparent hover:text-black rounded-full h-10 text-sm font-medium bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Detail Modal - Vertical Layout (fewer fields) */}
      {selectedPayment && (
        <Dialog
          open={!!selectedPayment}
          onOpenChange={() => setSelectedPayment(null)}
        >
          <DialogContent className="bg-white text-black max-w-lg w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-3 border-b border-gray-200">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-black">
                <CreditCard className="h-5 w-5 text-green-500" />
                PAYMENT DETAILS
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-4">
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <label className="text-xs font-medium text-black block mb-2">
                    Amount
                  </label>
                  <p className="text-2xl font-bold text-green-500">
                    ₹{selectedPayment.amount}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                  <label className="text-xs font-medium text-black block mb-2">
                    Status
                  </label>
                  <Badge className={getStatusColor(selectedPayment.status)}>
                    {getStatusIcon(selectedPayment.status)}
                    <span className="ml-2">{selectedPayment.status}</span>
                  </Badge>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-black mb-3 text-base">
                  Project Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-black block mb-1">
                      Project
                    </label>
                    <p className="text-gray-700 bg-white p-2 rounded-lg border border-gray-200 text-sm">
                      {selectedPayment.gig?.title || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-black block mb-1">
                      Client
                    </label>
                    <p className="text-gray-700 bg-white p-2 rounded-lg border border-gray-200 text-sm">
                      {selectedPayment.payer?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-black block mb-1">
                      Payment Type
                    </label>
                    <p className="text-gray-700 bg-white p-2 rounded-lg border border-gray-200 capitalize text-sm">
                      {selectedPayment.type?.replace("_", " ") || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Request Modal - Horizontal Layout (many fields) */}
      {showPaymentRequestModal && selectedApplication && (
        <Dialog
          open={showPaymentRequestModal}
          onOpenChange={setShowPaymentRequestModal}
        >
          <DialogContent className="bg-white text-black max-w-4xl w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
            <DialogHeader className="p-4 pb-3 border-b border-gray-200">
              <DialogTitle className="text-xl font-bold text-black">
                SUBMIT PAYMENT REQUEST - {selectedApplication.gig?.title}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 space-y-5">
              {/* Project Summary */}
              <div className="bg-green-100 rounded-lg p-4 border border-green-300">
                <h3 className="font-semibold mb-3 text-black text-base">
                  Project Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-black font-medium text-xs">
                      Project:
                    </span>
                    <p className="text-gray-700 bg-white p-2 rounded-lg border border-gray-200 mt-1 text-sm">
                      {selectedApplication.gig?.title}
                    </p>
                  </div>
                  <div>
                    <span className="text-black font-medium text-xs">
                      Company:
                    </span>
                    <p className="text-gray-700 bg-white p-2 rounded-lg border border-gray-200 mt-1 text-sm">
                      {selectedApplication.gig?.company?.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-black font-medium text-xs">
                      Budget:
                    </span>
                    <p className="text-green-600 font-semibold bg-white p-2 rounded-lg border border-gray-200 mt-1 text-sm">
                      ₹{selectedApplication.gig?.budget?.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-black font-medium text-xs">
                      Your Rate:
                    </span>
                    <p className="text-green-600 font-semibold bg-white p-2 rounded-lg border border-gray-200 mt-1 text-sm">
                      ₹{selectedApplication.proposedRate?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Details Form */}
              <div>
                <h3 className="font-semibold mb-3 text-black text-base">
                  Bank Account Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-black mb-2 block">
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
                      className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-black mb-2 block">
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
                      className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-black mb-2 block">
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
                      className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-black mb-2 block">
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
                      className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-black mb-2 block">
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
                      className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-black mb-2 block">
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
                      className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Work Details */}
              <div>
                <h3 className="font-semibold mb-3 text-black text-base">
                  Work Completion Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-black mb-2 block">
                      Project Description *
                    </label>
                    <Textarea
                      value={paymentRequestForm.workDetails.projectDescription}
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
                      rows={3}
                      className="bg-gray-100 border-gray-300 text-black rounded-lg focus:border-green-500 focus:ring-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-black mb-2 block">
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
                        className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-black mb-2 block">
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
                        className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-black mb-2 block">
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
                        className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-black mb-2 block">
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
                      rows={2}
                      className="bg-gray-100 border-gray-300 text-black rounded-lg focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black mb-2 block">
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
                    <SelectTrigger className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-black mb-2 block">
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
                    <SelectTrigger className="bg-gray-100 border-gray-300 text-black h-10 rounded-lg focus:border-green-500 focus:ring-green-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
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
                <label className="text-xs font-medium text-black mb-2 block">
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
                  rows={2}
                  className="bg-gray-100 border-gray-300 text-black rounded-lg focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  onClick={handlePaymentRequestSubmit}
                  disabled={submittingRequest}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-full h-10 text-sm font-medium"
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
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentRequestModal(false)}
                  className="flex-1 border-green-500 text-green-500 hover:bg-green-50 rounded-full h-10 text-sm font-medium bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Success Modal - Vertical Layout (simple modal) */}
      {showSuccessModal && (
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="bg-white text-black max-w-md w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
            <DialogHeader className="p-4 pb-3 border-b border-gray-200">
              <DialogTitle className="text-xl font-bold text-center text-black">
                PAYMENT REQUEST SUBMITTED SUCCESSFULLY!
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 text-center">
              <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-7 w-7 text-green-500" />
              </div>

              <p className="text-gray-700 mb-4 leading-relaxed text-sm">
                Your payment request has been submitted to our Excel system and
                will be processed within{" "}
                <span className="font-semibold text-green-600">
                  7 business days
                </span>
                .
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left border border-gray-200">
                <h4 className="font-semibold mb-3 text-black text-sm">
                  What happens next?
                </h4>
                <ul className="space-y-2 text-xs text-gray-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                    Your details have been exported to Excel
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                    Admin will review your request
                  </li>
                  <li className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-green-500 flex-shrink-0" />
                    Payment will be initiated to your bank account
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-blue-500 flex-shrink-0" />
                    You'll receive confirmation once completed
                  </li>
                </ul>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                You can track your request status in the "Earnings" tab.
              </p>

              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  setActiveTab("earnings");
                }}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full h-10 text-sm font-medium w-full"
              >
                View Earnings
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

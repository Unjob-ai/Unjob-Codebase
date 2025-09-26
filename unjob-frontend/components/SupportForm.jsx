"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import {
  Upload,
  X,
  Phone,
  Mail,
  User,
  AlertCircle,
  Crown,
  Zap,
  Shield,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ISSUE_TYPES = [
  { value: "payment_issue", label: "Payment Issue" },
  { value: "subscription_issue", label: "Subscription Issue" },
  { value: "account_issue", label: "Account Issue" },
  { value: "technical_issue", label: "Technical Issue" },
  { value: "billing_question", label: "Billing Question" },
  { value: "refund_request", label: "Refund Request" },
  { value: "feature_request", label: "Feature Request" },
  { value: "bug_report", label: "Bug Report" },
  { value: "other", label: "Other" },
];

const PRIORITY_LEVELS = [
  { value: "low", label: "Low", color: "#6B7280" },
  { value: "medium", label: "Medium", color: "#F59E0B" },
  { value: "high", label: "High", color: "#EF4444" },
  { value: "urgent", label: "Urgent", color: "#DC2626" },
];

export function SupportForm({ onSuccess }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    contactNumber: "",
    issueType: "",
    priority: "medium",
    subject: "",
    description: "",
  });
  const [customFields, setCustomFields] = useState({});
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomFieldChange = (key, value) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);

    if (attachments.length + files.length > 5) {
      toast.error("Maximum 5 files allowed");
      return;
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        return;
      }
    }

    setAttachments((prev) => [...prev, ...files]);
  };

  const removeFile = (fileToRemove) => {
    setAttachments((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.subject ||
      !formData.description
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const submitFormData = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        submitFormData.append(key, value);
      });

      submitFormData.append("customFields", JSON.stringify(customFields));

      attachments.forEach((file) => {
        submitFormData.append("attachments", file);
      });

      const response = await fetch("/api/support", {
        method: "POST",
        body: submitFormData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Support ticket created successfully!");
        setFormData({
          name: session?.user?.name || "",
          email: session?.user?.email || "",
          contactNumber: "",
          issueType: "",
          priority: "medium",
          subject: "",
          description: "",
        });
        setCustomFields({});
        setAttachments([]);
        onSuccess?.(data);
      } else {
        toast.error(data.error || "Failed to create support ticket");
      }
    } catch (error) {
      console.error("Support form submission error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#10B981]/20 to-[#376A59]/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-6 h-6 text-[#10B981]" />
            </div>
            <h1 className="text-3xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Premium Support
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Get priority assistance from our expert support team. We're here to
            resolve your issues quickly and efficiently.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Contact Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-[#10B981]/20 to-[#376A59]/20 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-[#10B981]" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Contact Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300 font-medium">
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your full name"
                      className="pl-10 bg-black/50 border-gray-600 text-white placeholder-gray-500 focus:border-[#10B981] focus:ring-[#10B981] backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300 font-medium">
                    Email Address <span className="text-red-400">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      className="pl-10 bg-black/50 border-gray-600 text-white placeholder-gray-500 focus:border-[#10B981] focus:ring-[#10B981] backdrop-blur-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="contactNumber"
                  className="text-gray-300 font-medium"
                >
                  Contact Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="contactNumber"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 123-4567"
                    className="pl-10 bg-black/50 border-gray-600 text-white placeholder-gray-500 focus:border-[#10B981] focus:ring-[#10B981] backdrop-blur-sm"
                  />
                </div>
              </div>
            </div>

            {/* Issue Details Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-[#10B981]/20 to-[#376A59]/20 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-[#10B981]" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Issue Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="issueType"
                    className="text-gray-300 font-medium"
                  >
                    Issue Type <span className="text-red-400">*</span>
                  </Label>
                  <select
                    id="issueType"
                    name="issueType"
                    value={formData.issueType}
                    onChange={handleInputChange}
                    className="w-full h-11 px-3 rounded-lg border border-gray-600 bg-black/50 text-white backdrop-blur-sm focus:border-[#10B981] focus:ring-[#10B981] focus:outline-none"
                    required
                  >
                    <option value="" className="bg-gray-900">
                      Select issue type
                    </option>
                    {ISSUE_TYPES.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                        className="bg-gray-900"
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="priority"
                    className="text-gray-300 font-medium"
                  >
                    Priority Level
                  </Label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full h-11 px-3 rounded-lg border border-gray-600 bg-black/50 text-white backdrop-blur-sm focus:border-[#10B981] focus:ring-[#10B981] focus:outline-none"
                  >
                    {PRIORITY_LEVELS.map((level) => (
                      <option
                        key={level.value}
                        value={level.value}
                        className="bg-gray-900"
                      >
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-gray-300 font-medium">
                  Subject <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Brief description of your issue"
                  className="bg-black/50 border-gray-600 text-white placeholder-gray-500 focus:border-[#10B981] focus:ring-[#10B981] backdrop-blur-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-gray-300 font-medium"
                >
                  Description <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Please provide detailed information about your issue..."
                  className="min-h-[120px] bg-black/50 border-gray-600 text-white placeholder-gray-500 focus:border-[#10B981] focus:ring-[#10B981] backdrop-blur-sm resize-none"
                  required
                />
              </div>
            </div>

            {/* Additional Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-[#10B981]/20 to-[#376A59]/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#10B981]" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Additional Information
                </h2>
                <span className="text-gray-500 text-sm">(Optional)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="orderNumber"
                    className="text-gray-300 font-medium"
                  >
                    Order/Transaction ID
                  </Label>
                  <Input
                    id="orderNumber"
                    placeholder="Enter order or transaction ID"
                    value={customFields.orderNumber || ""}
                    onChange={(e) =>
                      handleCustomFieldChange("orderNumber", e.target.value)
                    }
                    className="bg-black/50 border-gray-600 text-white placeholder-gray-500 focus:border-[#10B981] focus:ring-[#10B981] backdrop-blur-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="subscriptionId"
                    className="text-gray-300 font-medium"
                  >
                    Subscription ID
                  </Label>
                  <Input
                    id="subscriptionId"
                    placeholder="Your subscription ID"
                    value={customFields.subscriptionId || ""}
                    onChange={(e) =>
                      handleCustomFieldChange("subscriptionId", e.target.value)
                    }
                    className="bg-black/50 border-gray-600 text-white placeholder-gray-500 focus:border-[#10B981] focus:ring-[#10B981] backdrop-blur-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="browserInfo"
                  className="text-gray-300 font-medium"
                >
                  Browser/Device Information
                </Label>
                <Textarea
                  id="browserInfo"
                  placeholder="e.g., Chrome 119, iPhone 15, Windows 11..."
                  value={customFields.browserInfo || ""}
                  onChange={(e) =>
                    handleCustomFieldChange("browserInfo", e.target.value)
                  }
                  className="min-h-[80px] bg-black/50 border-gray-600 text-white placeholder-gray-500 focus:border-[#10B981] focus:ring-[#10B981] backdrop-blur-sm resize-none"
                />
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-[#10B981]/20 to-[#376A59]/20 rounded-lg flex items-center justify-center">
                  <Upload className="w-4 h-4 text-[#10B981]" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Attachments
                </h2>
                <span className="text-gray-500 text-sm">(Optional)</span>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  Upload screenshots, documents, or other files that might help
                  us understand your issue better.
                </p>

                <div
                  className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-[#10B981] transition-all duration-300 bg-black/20 backdrop-blur-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#10B981]/20 to-[#376A59]/20 rounded-2xl flex items-center justify-center">
                    <Upload className="h-8 w-8 text-[#10B981]" />
                  </div>
                  <p className="text-gray-300 font-medium mb-2">
                    Click to upload files or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    Max 5 files, 10MB each (Images, PDFs, Documents)
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* File Preview */}
                {attachments.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-gray-300 font-medium">
                      Selected Files:
                    </Label>
                    <div className="space-y-3">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 p-4 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#10B981]/20 to-[#376A59]/20 rounded-xl flex items-center justify-center">
                              {file.type.startsWith("image/") ? (
                                <div className="w-6 h-6 bg-[#10B981] rounded-md"></div>
                              ) : (
                                <div className="w-6 h-6 bg-[#10B981] rounded"></div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-8 border-t border-gray-700/50">
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-12 py-4 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: loading
                    ? "linear-gradient(180deg, #6B7280 0%, #4B5563 100%)"
                    : "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Submit Support Request
                  </div>
                )}
              </Button>

              <p className="text-xs text-gray-500 mt-4">
                Your support request will be handled by our premium support team
                within 24 hours.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

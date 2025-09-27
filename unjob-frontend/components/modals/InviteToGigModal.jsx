// components/modals/InviteToGigModal.jsx - Enhanced with comprehensive error handling
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Target,
  Briefcase,
  Send,
  Calendar,
  DollarSign,
  Clock,
  Users,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCcw,
  Info,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export function InviteToGigModal({
  isOpen,
  onClose,
  freelancer,
  onInviteSent,
}) {
  const [userGigs, setUserGigs] = useState([]);
  const [loadingGigs, setLoadingGigs] = useState(false);
  const [selectedGigId, setSelectedGigId] = useState("");
  const [customGigMode, setCustomGigMode] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  // Error state management
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [apiError, setApiError] = useState(null);

  // Success state
  const [successMessage, setSuccessMessage] = useState("");

  // Custom gig form data
  const [customGigData, setCustomGigData] = useState({
    title: "",
    description: "",
    budget: "",
    timeline: "",
    category: "",
    requirements: "",
  });

  // Fetch user's gigs when modal opens
  useEffect(() => {
    if (isOpen && !customGigMode) {
      fetchUserGigs();
    }
  }, [isOpen, customGigMode]);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      clearAllErrors();
      setSuccessMessage("");
    }
  }, [isOpen]);

  const clearAllErrors = () => {
    setError(null);
    setValidationErrors({});
    setApiError(null);
  };

  const fetchUserGigs = async () => {
    setLoadingGigs(true);
    clearAllErrors();

    try {
      const response = await fetch("/api/gigs/invite");
      const data = await response.json();

      if (response.ok && data.success) {
        setUserGigs(data.gigs || []);
        if (data.gigs?.length === 0) {
          setError({
            type: "info",
            title: "No Active Gigs Found",
            message: "You don't have any active gigs to invite freelancers to.",
            suggestion:
              "Create a custom invitation instead, or post a new gig first.",
          });
        }
      } else {
        // Handle API errors from the improved backend
        setError({
          type: "error",
          title: data.error || "Failed to Load Gigs",
          message: data.message || "Unable to fetch your active gigs",
          suggestion:
            data.suggestion ||
            "Please try refreshing or contact support if this persists",
        });
        console.error("Failed to fetch gigs:", data);
      }
    } catch (error) {
      console.error("Network error fetching gigs:", error);
      setError({
        type: "error",
        title: "Connection Error",
        message: "Unable to connect to the server",
        suggestion: "Please check your internet connection and try again",
      });
    } finally {
      setLoadingGigs(false);
    }
  };

  // Handle custom gig form changes with validation
  const handleCustomGigChange = (field, value) => {
    setCustomGigData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field-specific validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Real-time validation
    validateCustomGigField(field, value);
  };

  const validateCustomGigField = (field, value) => {
    const errors = {};

    switch (field) {
      case "title":
        if (!value.trim()) {
          errors.title = "Gig title is required";
        } else if (value.length > 100) {
          errors.title = "Title must be less than 100 characters";
        }
        break;

      case "description":
        if (!value.trim()) {
          errors.description = "Description is required";
        } else if (value.length < 20) {
          errors.description = "Description must be at least 20 characters";
        } else if (value.length > 2000) {
          errors.description = "Description must be less than 2000 characters";
        }
        break;

      case "budget":
        if (!value) {
          errors.budget = "Budget is required";
        } else if (isNaN(value) || parseFloat(value) <= 0) {
          errors.budget = "Enter a valid budget amount";
        } else if (parseFloat(value) > 10000000) {
          errors.budget = "Budget seems too high, please verify";
        }
        break;
    }

    setValidationErrors((prev) => ({
      ...prev,
      ...errors,
    }));
  };

  // Validate all custom gig fields
  const validateCustomGig = () => {
    const errors = {};

    if (!customGigData.title.trim()) {
      errors.title = "Gig title is required";
    } else if (customGigData.title.length > 100) {
      errors.title = "Title must be less than 100 characters";
    }

    if (!customGigData.description.trim()) {
      errors.description = "Description is required";
    } else if (customGigData.description.length < 20) {
      errors.description = "Description must be at least 20 characters";
    }

    if (!customGigData.budget) {
      errors.budget = "Budget is required";
    } else if (
      isNaN(customGigData.budget) ||
      parseFloat(customGigData.budget) <= 0
    ) {
      errors.budget = "Enter a valid budget amount";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Send gig invitation with comprehensive error handling
  const sendGigInvitation = async () => {
    if (!freelancer) return;

    clearAllErrors();
    setSuccessMessage("");
    setSendingInvite(true);

    try {
      // Validate form data before sending
      if (customGigMode) {
        if (!validateCustomGig()) {
          setSendingInvite(false);
          setError({
            type: "warning",
            title: "Please Fix Form Errors",
            message:
              "Complete all required fields before sending the invitation",
            suggestion: "Check the highlighted fields below",
          });
          return;
        }
      } else {
        if (!selectedGigId) {
          setSendingInvite(false);
          setError({
            type: "warning",
            title: "No Gig Selected",
            message: "Please select a gig to invite the freelancer to",
            suggestion:
              "Choose from your active gigs or create a custom invitation",
          });
          return;
        }
      }

      const payload = {
        freelancerId: freelancer._id,
        personalMessage: inviteMessage.trim(),
      };

      if (customGigMode) {
        payload.customGigData = {
          ...customGigData,
          title: customGigData.title.trim(),
          description: customGigData.description.trim(),
          budget: parseFloat(customGigData.budget),
          timeline: customGigData.timeline?.trim(),
          category: customGigData.category?.trim(),
          requirements: customGigData.requirements?.trim(),
        };
      } else {
        payload.gigId = selectedGigId;
      }

      console.log("Sending invitation payload:", payload);

      const response = await fetch("/api/gigs/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - show success message and close modal
        setSuccessMessage(data.message);
        toast.success(data.message);

        setTimeout(() => {
          resetAndClose();
          if (onInviteSent) onInviteSent(data.invitation);
        }, 1500);
      } else {
        // Handle different types of API errors
        if (data.code === "ALREADY_INVITED") {
          // Special handling for already invited error
          setApiError({
            type: "info",
            title: data.error,
            message: data.message,
            suggestion: data.suggestion,
            details: data.existingInvitation
              ? {
                  status: data.existingInvitation.status,
                  sentAt: new Date(
                    data.existingInvitation.sentAt
                  ).toLocaleDateString(),
                  gigTitle: data.existingInvitation.gigTitle,
                }
              : null,
          });
        } else if (data.validationErrors) {
          // Handle validation errors from backend
          const backendErrors = {};
          data.validationErrors.forEach((error) => {
            if (error.includes("title")) backendErrors.title = error;
            if (error.includes("description"))
              backendErrors.description = error;
            if (error.includes("budget")) backendErrors.budget = error;
          });
          setValidationErrors(backendErrors);
          setError({
            type: "error",
            title: data.error,
            message: data.message,
            suggestion: data.suggestion,
          });
        } else {
          // Generic API error
          setApiError({
            type: "error",
            title: data.error || "Invitation Failed",
            message: data.message || "Unable to send the invitation",
            suggestion:
              data.suggestion || "Please try again or contact support",
          });
        }

        toast.error(data.message || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Network error sending invitation:", error);
      setApiError({
        type: "error",
        title: "Connection Error",
        message: "Unable to send invitation due to network error",
        suggestion: "Please check your internet connection and try again",
      });
      toast.error("Network error - please try again");
    } finally {
      setSendingInvite(false);
    }
  };

  // Reset modal state and close
  const resetAndClose = () => {
    setSelectedGigId("");
    setCustomGigMode(false);
    setInviteMessage("");
    setCustomGigData({
      title: "",
      description: "",
      budget: "",
      timeline: "",
      category: "",
      requirements: "",
    });
    clearAllErrors();
    setSuccessMessage("");
    onClose();
  };

  // Error display component
  const ErrorDisplay = ({ error, className = "" }) => {
    if (!error) return null;

    const getIcon = () => {
      switch (error.type) {
        case "info":
          return <Info className="h-4 w-4" />;
        case "warning":
          return <AlertCircle className="h-4 w-4" />;
        case "error":
        default:
          return <AlertCircle className="h-4 w-4" />;
      }
    };

    const getAlertVariant = () => {
      switch (error.type) {
        case "info":
          return "default";
        case "warning":
          return "default";
        case "error":
        default:
          return "destructive";
      }
    };

    return (
      <Alert variant={getAlertVariant()} className={cn("mb-4", className)}>
        <div className="flex items-start gap-2">
          {getIcon()}
          <div className="flex-1">
            <div className="font-medium text-sm">{error.title}</div>
            <AlertDescription className="text-sm mt-1">
              {error.message}
              {error.suggestion && (
                <div className="mt-2 text-xs opacity-75">
                  <strong>Tip:</strong> {error.suggestion}
                </div>
              )}
              {error.details && (
                <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                  <div>
                    <strong>Status:</strong> {error.details.status}
                  </div>
                  <div>
                    <strong>Sent:</strong> {error.details.sentAt}
                  </div>
                  <div>
                    <strong>Gig:</strong> {error.details.gigTitle}
                  </div>
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  };

  // Field component with validation
  const FormField = ({ label, error, required, children, hint }) => (
    <div className="space-y-1 sm:space-y-2">
      <label className="text-xs sm:text-sm font-medium text-black flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );

  if (!freelancer) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) resetAndClose();
      }}
    >
      <DialogContent className="bg-white text-black border-gray-300 w-[calc(100vw-16px)] max-w-4xl h-[calc(100vh-16px)] max-h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-lg sm:rounded-2xl p-0 overflow-hidden z-[1000] fixed m-2 sm:m-auto">
        <DialogHeader className="p-3 sm:p-6 border-b border-gray-200">
          <DialogTitle className="text-lg sm:text-2xl font-bold text-black flex items-center gap-2 sm:gap-3">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 flex-shrink-0" />
            <span className="truncate">
              Invite {freelancer?.name} to Your Gig
            </span>
          </DialogTitle>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            Choose an existing gig or create a custom invitation
          </p>
        </DialogHeader>

        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
          {/* Success Message */}
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          <ErrorDisplay error={error || apiError} />

       

          {/* Existing Gig Selection */}
          {!customGigMode && (
            <div className="space-y-3 sm:space-y-4">
              {loadingGigs ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="inline-block h-6 w-6 sm:h-8 sm:w-8 border-3 sm:border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm sm:text-base text-gray-600 mt-2">
                    Loading your gigs...
                  </p>
                </div>
              ) : userGigs.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-600">
                  <Briefcase className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-gray-400" />
                  <p className="text-sm sm:text-base">
                    You don't have any active gigs.
                  </p>
                  <p className="text-xs sm:text-sm">
                    Create a custom invitation instead.
                  </p>
                  <Button
                    onClick={() => setCustomGigMode(true)}
                    className="mt-3"
                    size="sm"
                  >
                    Create Custom Invitation
                  </Button>
                </div>
              ) : (
                <FormField
                  label="Select a Gig"
                  required
                  error={
                    !selectedGigId && error?.type === "warning"
                      ? "Please select a gig"
                      : ""
                  }
                >
                  <div className="grid gap-2 sm:gap-3 max-h-48 sm:max-h-60 overflow-y-auto">
                    {userGigs.map((gig) => (
                      <div
                        key={gig._id}
                        className={cn(
                          "p-3 sm:p-4 border rounded-md sm:rounded-lg cursor-pointer transition-all",
                          selectedGigId === gig._id
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-green-300"
                        )}
                        onClick={() => {
                          setSelectedGigId(gig._id);
                          clearAllErrors();
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-black text-sm sm:text-base line-clamp-2 flex-1 pr-2">
                            {gig.title}
                          </h4>
                          <Badge className="ml-1 sm:ml-2 bg-green-100 text-green-800 text-xs flex-shrink-0">
                            ₹{gig.budget?.toLocaleString()}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-xs sm:text-sm line-clamp-2 mb-2">
                          {gig.description}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {gig.timeline}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {gig.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </FormField>
              )}
            </div>
          )}

          {/* Custom Gig Form */}
          {customGigMode && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <FormField
                  label="Gig Title"
                  required
                  error={validationErrors.title}
                  hint={`${customGigData.title.length}/100 characters`}
                >
                  <Input
                    placeholder="e.g., Website Development"
                    value={customGigData.title}
                    onChange={(e) =>
                      handleCustomGigChange("title", e.target.value)
                    }
                    className={cn(
                      "border-gray-300 focus:border-green-500 text-black text-sm sm:text-base h-9 sm:h-10",
                      validationErrors.title &&
                        "border-red-300 focus:border-red-500"
                    )}
                    maxLength={100}
                  />
                </FormField>

                <FormField
                  label="Budget"
                  required
                  error={validationErrors.budget}
                  hint="Enter amount in ₹"
                >
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      ₹
                    </span>
                    <Input
                      type="number"
                      placeholder="5000"
                      value={customGigData.budget}
                      onChange={(e) =>
                        handleCustomGigChange("budget", e.target.value)
                      }
                      className={cn(
                        "rounded-l-none border-gray-300 focus:border-green-500 text-black text-sm sm:text-base h-9 sm:h-10",
                        validationErrors.budget &&
                          "border-red-300 focus:border-red-500"
                      )}
                      min="1"
                    />
                  </div>
                </FormField>
              </div>

              <FormField
                label="Description"
                required
                error={validationErrors.description}
                hint={`${customGigData.description.length}/2000 characters (minimum 20)`}
              >
                <Textarea
                  placeholder="Describe the project requirements, deliverables, and expectations..."
                  value={customGigData.description}
                  onChange={(e) =>
                    handleCustomGigChange("description", e.target.value)
                  }
                  className={cn(
                    "border-gray-300 focus:border-green-500 text-black min-h-[80px] sm:min-h-[100px] text-sm sm:text-base",
                    validationErrors.description &&
                      "border-red-300 focus:border-red-500"
                  )}
                  rows={4}
                  maxLength={2000}
                />
              </FormField>

              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <FormField label="Timeline" hint="e.g., 2 weeks, 1 month">
                  <Input
                    placeholder="e.g., 2 weeks"
                    value={customGigData.timeline}
                    onChange={(e) =>
                      handleCustomGigChange("timeline", e.target.value)
                    }
                    className="border-gray-300 focus:border-green-500 text-black text-sm sm:text-base h-9 sm:h-10"
                  />
                </FormField>

                <FormField label="Category" hint="e.g., Web Development">
                  <Input
                    placeholder="e.g., Web Development"
                    value={customGigData.category}
                    onChange={(e) =>
                      handleCustomGigChange("category", e.target.value)
                    }
                    className="border-gray-300 focus:border-green-500 text-black text-sm sm:text-base h-9 sm:h-10"
                  />
                </FormField>
              </div>

              <FormField
                label="Special Requirements"
                hint="Any specific skills or tools needed"
              >
                <Textarea
                  placeholder="Any specific skills, tools, or requirements..."
                  value={customGigData.requirements}
                  onChange={(e) =>
                    handleCustomGigChange("requirements", e.target.value)
                  }
                  className="border-gray-300 focus:border-green-500 text-black text-sm sm:text-base"
                  rows={2}
                  maxLength={500}
                />
              </FormField>
            </div>
          )}

          {/* Personal Message */}
          <FormField
            label="Personal Message"
            hint={`${inviteMessage.length}/1000 characters - Add a personal touch`}
          >
            <Textarea
              placeholder="Hi [Name], I'd like to invite you to work on this project because..."
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              className="border-gray-300 focus:border-green-500 text-black text-sm sm:text-base"
              rows={3}
              maxLength={1000}
            />
          </FormField>
        </div>

        {/* Modal Actions */}
        <div className="p-3 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
          <div className="text-xs text-gray-500 order-2 sm:order-1">
            {freelancer.name} will be notified immediately
          </div>

          <div className="flex gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={resetAndClose}
              className="flex-1 sm:flex-none bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-600 text-sm sm:text-base h-9 sm:h-10"
              disabled={sendingInvite}
            >
              Cancel
            </Button>

            {error?.type === "info" && (
              <Button
                onClick={fetchUserGigs}
                variant="outline"
                className="flex-1 sm:flex-none text-sm sm:text-base h-9 sm:h-10"
                disabled={sendingInvite}
              >
                <RefreshCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Retry
              </Button>
            )}

            <Button
              onClick={sendGigInvitation}
              disabled={
                sendingInvite ||
                (!customGigMode && !selectedGigId) ||
                (customGigMode && Object.keys(validationErrors).length > 0) ||
                !!successMessage
              }
              className="flex-1 sm:flex-none bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400 text-sm sm:text-base h-9 sm:h-10"
            >
              {sendingInvite ? (
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm sm:text-base">Sending...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-sm sm:text-base">Send Invitation</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ProjectReviewButtons.jsx - Complete UI component with confirmation popups
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Edit, AlertTriangle, Clock } from "lucide-react";
import { toast } from "react-hot-toast";

const ProjectReviewButtons = ({
  projectId,
  projectTitle,
  remainingIterations = 0,
  onReviewComplete,
  isLoading = false,
  className = "",
}) => {
  const [activeModal, setActiveModal] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Handle modal opening
  const openModal = (type) => {
    setActiveModal(type);
    setFeedback("");
    setError("");
  };

  // Handle modal closing
  const closeModal = () => {
    setActiveModal(null);
    setFeedback("");
    setError("");
  };

  // Submit review action
  const submitReview = async (action) => {
    if (!projectId) {
      setError("Project ID is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${projectId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: action,
          feedback: feedback.trim(),
          additionalData: {
            remainingIterations,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process review");
      }

      // Show success message
      if (action === "approve") {
        toast.success("Project approved and gig completed!");
      } else if (action === "request_revision") {
        toast.success("Revision request sent to freelancer");
      } else if (action === "mark_completed") {
        toast.success("Project marked as completed");
      }

      // Call parent callback with result
      if (onReviewComplete) {
        onReviewComplete(data);
      }

      // Close modal on success
      closeModal();
    } catch (err) {
      console.error("Review submission error:", err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border ${className}`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 mb-1">
          Project Review Actions
        </h3>
        <p className="text-xs text-gray-600">
          Choose an action for "{projectTitle}"
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Approve & Complete Button */}
        <Button
          onClick={() => openModal("approve")}
          disabled={isLoading || isSubmitting}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve & Complete
        </Button>

        {/* Request Revision Button */}
        <Button
          onClick={() => openModal("revision")}
          disabled={isLoading || isSubmitting || remainingIterations <= 0}
          variant="outline"
          className="border-orange-300 text-orange-700 hover:bg-orange-50 px-4 py-2 text-sm"
        >
          <Edit className="h-4 w-4 mr-2" />
          Request Revision
          {remainingIterations > 0 && (
            <span className="ml-1 text-xs bg-orange-100 px-1.5 py-0.5 rounded">
              {remainingIterations} left
            </span>
          )}
        </Button>

        {/* Mark Completed Button */}
        <Button
          onClick={() => openModal("completed")}
          disabled={isLoading || isSubmitting}
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-50 px-4 py-2 text-sm"
        >
          <Clock className="h-4 w-4 mr-2" />
          Mark Completed
        </Button>
      </div>

      {/* Approve & Complete Modal */}
      <Dialog
        open={activeModal === "approve"}
        onOpenChange={() => !isSubmitting && closeModal()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Approve & Complete Project
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this project and mark the gig as
              completed?
              <br />
              <strong>Note:</strong> The project will be completed and payment
              will be processed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="approve-feedback" className="text-sm font-medium">
                Feedback (Optional)
              </Label>
              <Textarea
                id="approve-feedback"
                placeholder="Provide feedback for the freelancer..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={isSubmitting}
                className="mt-1"
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitReview("approve")}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Complete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Revision Modal */}
      <Dialog
        open={activeModal === "revision"}
        onOpenChange={() => !isSubmitting && closeModal()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Edit className="h-5 w-5" />
              Request Project Revision
            </DialogTitle>
            <DialogDescription>
              Write the feedback/changes you want in this project.
              <br />
              You will have <strong>{remainingIterations - 1}</strong>{" "}
              revision(s) left after this.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="revision-feedback"
                className="text-sm font-medium"
              >
                Feedback/Changes Required *
              </Label>
              <Textarea
                id="revision-feedback"
                placeholder="Describe what changes are needed..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={isSubmitting}
                className="mt-1"
                rows={4}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                After requesting this revision, the freelancer will have{" "}
                {remainingIterations - 1} revision(s) remaining.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitReview("request_revision")}
              disabled={isSubmitting || !feedback.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Request Revision
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Completed Modal */}
      <Dialog
        open={activeModal === "completed"}
        onOpenChange={() => !isSubmitting && closeModal()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Clock className="h-5 w-5" />
              Mark Project as Completed
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this project as completed?
              <br />
              <strong>Note:</strong> The project will be completed and no
              further changes can be requested. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="completed-feedback"
                className="text-sm font-medium"
              >
                Note (Optional)
              </Label>
              <Textarea
                id="completed-feedback"
                placeholder="Add a note about the completion..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={isSubmitting}
                className="mt-1"
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitReview("mark_completed")}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Mark Completed
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectReviewButtons;

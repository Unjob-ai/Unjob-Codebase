import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Send,
  Paperclip,
  MoreVertical,
  Download,
  Smile,
  Upload,
  FileText,
  CheckCircle,
  Check,
  Clock,
  AlertTriangle,
  Timer,
  ArrowLeft,
  X,
  Plus,
  Shield,
  DollarSign,
  Wallet,
  Edit,
} from "lucide-react";
import { toast } from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";

export function MessagePanel({
  activeConversation,
  messages = [],
  onSendMessage,
  onFileUpload,
  onProjectSubmit,
  onTyping,
  isUserOnline,
  isUserTyping,
  getOtherParticipant,
  session,
  isMobile = false,
  onBack,
}) {
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(null);
  const [validationError, setValidationError] = useState("");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isProjectSubmitting, setIsProjectSubmitting] = useState(false);

  // Add these state variables
  const [showReviewModal, setShowReviewModal] = useState(null); // 'approve', 'revision', 'completed'
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [projectInfo, setProjectInfo] = useState(null);
  const [conversationDetails, setConversationDetails] = useState(null);

  // Project submission state
  const [projectData, setProjectData] = useState({
    title: "",
    description: "",
    files: [],
  });

  // Enhanced content validation patterns
  const validateContent = (content) => {
    const text = content.toLowerCase();

    // Phone number patterns (various formats)
    const phonePatterns = [
      /\b\d{10}\b/g, // 10 digits
      /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // XXX-XXX-XXXX or XXX.XXX.XXXX or XXX XXX XXXX
      /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/g, // (XXX) XXX-XXXX
      /\+\d{1,3}[-.\s]?\d{1,14}/g, // International format
      /\b\d{4}[-.\s]?\d{3}[-.\s]?\d{3}\b/g, // XXXX-XXX-XXX
      /\b\d{5}[-.\s]?\d{5}\b/g, // XXXXX-XXXXX
      /\b\d{11}\b/g, // 11 digits
      /\b\d{12}\b/g, // 12 digits
      /\b\d{9}\b/g,
      /\b\d{8}\b/g,
      /\b\d{7}\b/g,
    ];

    // Email patterns
    const emailPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      /\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b/g, // With spaces
      /\b[A-Za-z0-9._%+-]+\s*\[\s*at\s*\]\s*[A-Za-z0-9.-]+\s*\[\s*dot\s*\]\s*[A-Z|a-z]{2,}\b/gi, // [at] [dot] format
    ];

    // URL/Link patterns
    const linkPatterns = [
      /https?:\/\/[^\s]+/gi,
      /www\.[^\s]+/gi,
      /\b[a-zA-Z0-9-]+\.(com|net|org|edu|gov|mil|int|co|info|biz|name|museum|coop|aero|pro|tel|travel|jobs|mobi|cat|asia|xxx|post|geo|ly|me|cc|tv|tk|ml|ga|cf)\b/gi,
      /\b[a-zA-Z0-9-]+\s*\[\s*dot\s*\]\s*(com|net|org|edu|gov|mil|int|co|info|biz|name|museum|coop|aero|pro|tel|travel|jobs|mobi|cat|asia|xxx|post|geo|ly|me|cc|tv|tk|ml|ga|cf)\b/gi,
    ];

    // Social media patterns
    const socialPatterns = [
      /\b(instagram|insta|ig)\s*[:=@]?\s*[a-zA-Z0-9_.]+/gi,
      /\b(twitter|x\.com)\s*[:=@]?\s*[a-zA-Z0-9_]+/gi,
      /\b(facebook|fb)\s*[:=@]?\s*[a-zA-Z0-9_.]+/gi,
      /\b(linkedin|in)\s*[:=@]?\s*[a-zA-Z0-9_.-]+/gi,
      /\b(tiktok|tt)\s*[:=@]?\s*[a-zA-Z0-9_.]+/gi,
      /\b(youtube|yt)\s*[:=@]?\s*[a-zA-Z0-9_.-]+/gi,
      /\b(snapchat|snap)\s*[:=@]?\s*[a-zA-Z0-9_.]+/gi,
      /\b(telegram|tg)\s*[:=@]?\s*[a-zA-Z0-9_.]+/gi,
      /\b(whatsapp|wa)\s*[:=@]?\s*[a-zA-Z0-9_.+]+/gi,
      /\b(discord)\s*[:=@]?\s*[a-zA-Z0-9_.#]+/gi,
    ];

    // Alternative spellings and bypass attempts
    const bypassPatterns = [
      /\b(e\s*m\s*a\s*i\s*l|e\s*-\s*m\s*a\s*i\s*l)\b/gi,
      /\b(p\s*h\s*o\s*n\s*e|n\s*u\s*m\s*b\s*e\s*r)\b/gi,
      /\b(c\s*o\s*n\s*t\s*a\s*c\s*t|r\s*e\s*a\s*c\s*h)\s+(m\s*e|o\s*u\s*t)/gi,
      /\b(m\s*y\s*\s+)?(i\s*g|i\s*n\s*s\s*t\s*a|f\s*b|t\s*w\s*i\s*t\s*t\s*e\s*r)\b/gi,
    ];

    // Check all patterns
    const allPatterns = [
      ...phonePatterns,
      ...emailPatterns,
      ...linkPatterns,
      ...socialPatterns,
      ...bypassPatterns,
    ];

    for (const pattern of allPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }

    // Check for common phrases that might indicate sharing contact info
    const bannedPhrases = [
      "my email",
      "email me",
      "contact me",
      "reach out",
      "my phone",
      "call me",
      "text me",
      "my number",
      "phone number",
      "contact info",
      "social media",
      "follow me",
      "add me on",
      "find me on",
      "my handle",
      "my username",
      "dm me",
      "message me",
      "outside of here",
      "off platform",
      "personal contact",
      "private message",
    ];

    for (const phrase of bannedPhrases) {
      if (text.includes(phrase)) {
        return false;
      }
    }

    return true;
  };

  // Auto-close countdown effect
  useEffect(() => {
    if (
      activeConversation?.autoCloseAt &&
      activeConversation?.autoCloseEnabled
    ) {
      updateCountdown();
      countdownIntervalRef.current = setInterval(updateCountdown, 1000);
      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }
      };
    } else {
      setAutoCloseCountdown(null);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }
  }, [activeConversation?.autoCloseAt, activeConversation?.autoCloseEnabled]);

  const updateCountdown = () => {
    if (!activeConversation?.autoCloseAt) {
      setAutoCloseCountdown(null);
      return;
    }

    const now = new Date();
    const closeTime = new Date(activeConversation.autoCloseAt);
    const timeRemaining = closeTime.getTime() - now.getTime();

    if (timeRemaining <= 0) {
      setAutoCloseCountdown({ expired: true });
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      return;
    }

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor(
      (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    setAutoCloseCountdown({
      expired: false,
      hours,
      minutes,
      seconds,
      totalMinutes: Math.floor(timeRemaining / (1000 * 60)),
      formattedTime:
        hours > 0
          ? `${hours}h ${minutes}m ${seconds}s`
          : minutes > 0
          ? `${minutes}m ${seconds}s`
          : `${seconds}s`,
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // In your useEffect for fetching project info, add console logs:
  useEffect(() => {
    const fetchProjectInfo = async () => {
      if (activeConversation && session?.user?.role === "hiring") {
        try {
          const response = await fetch(
            `/api/conversations/${activeConversation._id}/project-info`
          );
          if (response.ok) {
            const data = await response.json();
            console.log("🔍 Project Info Response:", data); // ADD THIS
            console.log("🔍 Project Status:", data.project?.status); // ADD THIS
            setProjectInfo(data.project);
            setConversationDetails(data.conversation);
          } else {
            console.log("❌ Project Info API failed:", response.status); // ADD THIS
          }
        } catch (error) {
          console.error("Error fetching project info:", error);
        }
      } else {
        console.log("🔍 Conditions not met:", {
          // ADD THIS
          hasActiveConversation: !!activeConversation,
          userRole: session?.user?.role,
        });
      }
    };

    fetchProjectInfo();
  }, [activeConversation, session]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Validate content before sending
    if (!validateContent(newMessage.trim())) {
      setValidationError(
        "Message contains restricted content (phone numbers, emails, or links)"
      );
      toast.error(
        "🚫 Cannot send: Message contains phone numbers, emails, or links. Please remove them and try again.",
        {
          duration: 5000,
          position: "top-center",
          style: {
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#fff",
            fontWeight: "600",
            fontSize: "14px",
            padding: "16px 20px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)",
            border: "2px solid #dc2626",
            maxWidth: "90vw",
            width: "auto",
            minWidth: "320px",
          },
          icon: "🔒",
        }
      );
      return;
    }

    setValidationError("");
    await onSendMessage(newMessage.trim());
    setNewMessage("");
    handleTypingStop();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("");
    }

    // Real-time validation feedback
    if (value.trim() && !validateContent(value.trim())) {
      setValidationError("Message contains restricted content");
    } else {
      setValidationError("");
    }

    if (value.trim() && !isTyping) {
      handleTypingStart();
    } else if (!value.trim() && isTyping) {
      handleTypingStop();
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1000);
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      onTyping(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setIsFileUploading(true);
      try {
        await onFileUpload(file);
      } catch (error) {
        console.error("File upload error:", error);
      } finally {
        setIsFileUploading(false);
        // Clear the input so the same file can be selected again
        e.target.value = "";
      }
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleProjectFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setProjectData((prev) => ({
      ...prev,
      files: [...prev.files, ...files],
    }));
  };

  const removeProjectFile = (index) => {
    setProjectData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleProjectSubmit = async () => {
    if (!projectData.title.trim() || !projectData.description.trim()) {
      toast.error("Please fill in title and description");
      return;
    }

    // Validate project data for restricted content
    if (
      !validateContent(projectData.title) ||
      !validateContent(projectData.description)
    ) {
      toast.error(
        "🚫 Cannot submit: Project title or description contains phone numbers, emails, or links. Please remove them and try again.",
        {
          duration: 5000,
          position: "top-center",
          style: {
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: "#fff",
            fontWeight: "600",
          },
        }
      );
      return;
    }

    setIsProjectSubmitting(true);
    try {
      await onProjectSubmit(projectData);
      setShowProjectModal(false);
      setProjectData({ title: "", description: "", files: [] });
      toast.success("Project submitted! Chat will auto-close in 7 hours.");
    } catch (error) {
      console.error("Project submission error:", error);
      toast.error("Failed to submit project");
    } finally {
      setIsProjectSubmitting(false);
    }
  };
// Replace the handleReviewAction function with this fixed version:
const handleReviewAction = async (action) => {
  if (!projectInfo) {
    setReviewError("Project information not available");
    return;
  }

  setIsSubmittingReview(true);
  setReviewError("");

  try {
    let endpoint, requestBody;

    // Map frontend actions to correct API endpoints and request bodies
    if (action === "approve" || action === "mark_completed") {
      // Use the review endpoint for approve/reject decisions
      endpoint = `/api/projects/${projectInfo._id}/review`;
      requestBody = {
        decision: "approve", // Both approve and mark_completed should approve the project
        feedback: reviewFeedback.trim(),
      };
    } else if (action === "request_revision") {
      // Use the request-revision endpoint for revisions
      endpoint = `/api/projects/${projectInfo._id}/request-revision`;
      requestBody = {
        feedback: reviewFeedback.trim(),
        additionalRequirements: [], // Add empty array as expected by API
      };
    } else {
      throw new Error("Invalid action type");
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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

    // Close modal and refresh messages
    closeReviewModal();

    // Refresh the conversation to show new system message
    if (onBack) {
      window.location.reload(); // Simple refresh, or implement a proper refresh callback
    }
  } catch (err) {
    console.error("Review submission error:", err);
    setReviewError(err.message);
  } finally {
    setIsSubmittingReview(false);
  }
};

  const openReviewModal = (type) => {
    setShowReviewModal(type);
    setReviewFeedback("");
    setReviewError("");
  };

  const closeReviewModal = () => {
    setShowReviewModal(null);
    setReviewFeedback("");
    setReviewError("");
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMessageStatusIcon = (message) => {
    if (message.sender._id !== session?.user?.id) {
      return null;
    }

    switch (message.status) {
      case "sending":
        return <Clock className="w-3 h-3 text-gray-400" />;
      case "sent":
        return <Check className="w-3 h-3 text-gray-400" />;
      case "delivered":
        return (
          <div className="flex">
            <Check className="w-3 h-3 text-gray-400" />
            <Check className="w-3 h-3 text-gray-400 -ml-1" />
          </div>
        );
      case "read":
        return (
          <div className="flex">
            <Check className="w-3 h-3 text-green-400" />
            <Check className="w-3 h-3 text-green-400 -ml-1" />
          </div>
        );
      default:
        return null;
    }
  };

  // New helper function to correctly identify a file message
  const isFileMessage = (message) => {
    if (message.type === "file") {
      return true;
    }
    if (message.type === "text") {
      try {
        const content = JSON.parse(message.content);
        return content && content.type === "file" && content.fileUrl;
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  // Updated function to render the file card
  const renderFileMessage = (message) => {
    let fileData;
    try {
      fileData =
        isFileMessage(message) && typeof message.content === "string"
          ? JSON.parse(message.content)
          : message.content;

      if (typeof fileData === "string") {
        fileData = JSON.parse(fileData);
      }
    } catch {
      return (
        <p className="text-sm leading-relaxed break-all">Invalid file format</p>
      );
    }

    const { fileUrl, fileName, fileSize } = fileData;
    const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(fileName);
    const isPDF = /\.pdf$/i.test(fileName);

    const getFileTypeDescription = () => {
      if (isImage) return "Image File";
      if (isPDF) return "PDF Document";
      const extension = fileName.split(".").pop();
      if (extension && extension.length <= 4) {
        return `${extension.toUpperCase()} File`;
      }
      return "File";
    };

    return (
      <div className="max-w-[320px] min-w-[280px]">
        {isImage && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block mb-2 rounded-lg overflow-hidden group"
          >
            <img
              src={fileUrl}
              alt={fileName}
              className="object-cover w-full max-h-48 rounded-lg border border-gray-700 group-hover:opacity-90"
            />
          </a>
        )}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="bg-gray-700 p-2 rounded-md flex-shrink-0">
              <FileText className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p
                className="text-sm font-semibold text-white truncate"
                title={fileName}
              >
                {fileName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{fileSize}</p>
            </div>
          </div>
          <hr className="border-t border-gray-600 my-2" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">
              {getFileTypeDescription()}
            </span>
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-black text-xs font-bold py-1.5 px-3 rounded-md transition-colors"
              style={{
                background: "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = "1";
              }}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectMessage = (message) => {
    return (
      <div className="border border-green-400 rounded-lg p-4 bg-green-900/20">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-green-400" />
          <span className="font-medium text-green-400">Project Submitted</span>
        </div>
        <p className="text-sm text-white">{message.content}</p>
      </div>
    );
  };

  const renderReviewMessage = (message) => {
    const content = message.content;
    const isApproved = content.includes("✅") || content.includes("APPROVED");
    const isRejected =
      content.includes("❌") || content.includes("Revision Required");
    const isGigCompleted =
      content.includes("Gig Completed") ||
      content.includes("gig is now complete");

    return (
      <div
        className={`border rounded-lg p-4 ${
          isApproved
            ? "border-green-400 bg-green-900/20"
            : "border-orange-400 bg-orange-900/20"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          {isApproved ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          )}
          <span
            className={`font-bold text-sm ${
              isApproved ? "text-green-400" : "text-orange-400"
            }`}
          >
            {isApproved ? "PROJECT APPROVED" : "REVISION REQUIRED"}
          </span>
          {isGigCompleted && (
            <span className="bg-green-600 text-black text-xs px-2 py-1 rounded-full font-bold">
              GIG COMPLETE
            </span>
          )}
        </div>

        <div className="text-sm text-white whitespace-pre-line space-y-2">
          {content
            .split("\n")
            .map((line, index) => {
              // Format special lines
              if (line.includes("**") && line.includes("**")) {
                const formatted = line.replace(
                  /\*\*(.*?)\*\*/g,
                  '<strong class="font-bold text-green-400">$1</strong>'
                );
                return (
                  <div
                    key={index}
                    dangerouslySetInnerHTML={{ __html: formatted }}
                  />
                );
              }

              // Payment info lines
              if (
                line.includes("Amount Credited:") ||
                line.includes("Platform Fee:")
              ) {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-green-300"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>{line.replace("• ", "")}</span>
                  </div>
                );
              }

              // Wallet info lines
              if (line.includes("Wallet Status:")) {
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-blue-300"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>{line.replace("• ", "")}</span>
                  </div>
                );
              }

              // Regular lines
              if (line.trim()) {
                return <div key={index}>{line}</div>;
              }

              return null;
            })
            .filter(Boolean)}
        </div>
      </div>
    );
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-black">
        <div className="text-center text-gray-400">
          <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
          <p>Choose a conversation from the sidebar to start messaging</p>
        </div>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant(activeConversation);
  const isOnline = isUserOnline(otherParticipant?._id);
  const otherUserTyping = isUserTyping(otherParticipant?._id);

  // Add this useEffect to show the warning toast when conversation changes
  useEffect(() => {
    if (activeConversation && otherParticipant) {
      // Show warning toast when conversation loads
      const showWarningToast = () => {
        toast(
          "⚠️ To avoid scams, please do not share your personal information like social media handles, phone number, email id etc.",
          {
            duration: 6000, // Show for 6 seconds
            position: "top-center",
            style: {
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              color: "#000",
              fontWeight: "600",
              fontSize: "14px",
              padding: "16px 20px",
              borderRadius: "12px",
              boxShadow: "0 10px 25px -5px rgba(251, 191, 36, 0.4)",
              border: "2px solid #f59e0b",
              maxWidth: "90vw",
              width: "auto",
              minWidth: "320px",
            },
            icon: "🔒",
          }
        );
      };

      // Show warning toast after a short delay
      const timeoutId = setTimeout(showWarningToast, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [activeConversation, otherParticipant]);

  return (
    <div className="flex-1 flex flex-col bg-black h-screen">
      {/* Auto-Close Warning Banner */}
      {autoCloseCountdown && !autoCloseCountdown.expired && (
        <div
          className="border-b border-green-400/30 px-4 py-3"
          style={{
            background:
              "linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(55, 106, 89, 0.1) 100%)",
          }}
        ></div>
      )}

      {/* Expired Warning */}
      {autoCloseCountdown?.expired && (
        <div className="bg-red-600/20 border-b border-red-400/30 px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              This conversation has expired and will be closed soon
            </span>
          </div>
        </div>
      )}

      {/* Chat Header with BLACK background and GREEN highlights */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-green-600/30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Back button for mobile */}
          {isMobile && onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-green-400 hover:text-green-300 hover:bg-green-900/20 p-2 flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          {/* Profile Picture with GREEN ring */}
          <div className="relative flex-shrink-0">
            <Avatar className="w-10 h-10 ring-2 ring-green-400/50">
              <AvatarImage
                src={otherParticipant?.image || "/placeholder.svg"}
                alt={otherParticipant?.name}
              />
              <AvatarFallback className="bg-gray-800 text-green-400 text-sm font-bold">
                {otherParticipant?.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* GREEN online indicator */}
            {isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-black"></div>
            )}
          </div>

          {/* Name and Status - with proper overflow handling */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-base truncate pr-2">
              {otherParticipant?.name}
            </h3>
            <div className="flex items-center gap-1">
              {otherUserTyping ? (
                <span className="text-green-400 text-sm">typing...</span>
              ) : (
                <span className="text-gray-400 text-sm">
                  {isOnline ? "online" : "offline"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions - with responsive handling */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Project Submit Button */}
          {session?.user?.role === "freelancer" &&
            !autoCloseCountdown?.expired &&
            !activeConversation?.hasProjectSubmission && (
              <Dialog
                open={showProjectModal}
                onOpenChange={
                  !isProjectSubmitting ? setShowProjectModal : undefined
                }
              >
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isProjectSubmitting}
                    className="text-green-400 hover:bg-green-900/20 px-2 sm:px-3 py-1 text-xs sm:text-sm border border-green-400/50 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProjectSubmitting ? (
                      <>
                        <div className="w-4 h-4 mr-1 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                        <span className="hidden sm:inline">Submitting...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Submit Project</span>
                        <span className="sm:hidden">Submit</span>
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white text-black max-w-5xl w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
                  {/* Header */}
                  <DialogHeader className="p-4 sm:p-6 border-b border-gray-200">
                    <DialogTitle className="text-xl sm:text-2xl font-bold text-black">
                      SUBMIT PROJECT
                    </DialogTitle>
                  </DialogHeader>

                  <div className="p-4 sm:p-6 relative">
                    {/* Loading overlay */}
                    {isProjectSubmitting && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-b-2xl">
                        <div className="text-center px-4">
                          <div className="w-12 sm:w-16 h-12 sm:h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                          <p className="text-lg sm:text-xl font-bold text-black mb-2">
                            Submitting Project...
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            Please wait while we upload your files and process
                            your submission
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Desktop Layout - 2 columns for title and description */}
                    <div className="hidden md:grid md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <Label className="text-sm font-medium text-black mb-2 block">
                          Project Title *
                        </Label>
                        <Input
                          value={projectData.title}
                          onChange={(e) =>
                            setProjectData((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          disabled={isProjectSubmitting}
                          className="bg-gray-100 border-gray-300 text-black h-12 rounded-xl focus:border-green-500 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Enter project title"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-black mb-2 block">
                          Description *
                        </Label>
                        <Textarea
                          value={projectData.description}
                          onChange={(e) =>
                            setProjectData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          disabled={isProjectSubmitting}
                          className="bg-gray-100 border-gray-300 text-black rounded-xl focus:border-green-500 focus:ring-green-500 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Describe your project submission"
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Mobile Layout - Stacked */}
                    <div className="md:hidden space-y-4 sm:space-y-6 mb-4 sm:mb-6">
                      <div>
                        <Label className="text-sm font-medium text-black mb-2 sm:mb-3 block">
                          Project Title *
                        </Label>
                        <Input
                          value={projectData.title}
                          onChange={(e) =>
                            setProjectData((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          disabled={isProjectSubmitting}
                          className="bg-gray-100 border-gray-300 text-black h-12 rounded-xl focus:border-green-500 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Enter project title"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-black mb-2 sm:mb-3 block">
                          Description *
                        </Label>
                        <Textarea
                          value={projectData.description}
                          onChange={(e) =>
                            setProjectData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          disabled={isProjectSubmitting}
                          className="bg-gray-100 border-gray-300 text-black rounded-xl focus:border-green-500 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="Describe your project submission"
                          rows={4}
                        />
                      </div>
                    </div>

                    {/* Project Files Section */}
                    <div className="mb-4 sm:mb-6">
                      <Label className="text-sm font-medium text-black mb-3 block">
                        Project Files
                      </Label>
                      <div className="space-y-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            document.getElementById("project-files").click()
                          }
                          disabled={isProjectSubmitting}
                          className="w-full h-12 border-gray-300 text-black bg-gray-50 rounded-xl border-2 border-dashed hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Files
                        </Button>
                        <input
                          id="project-files"
                          type="file"
                          multiple
                          onChange={handleProjectFileSelect}
                          disabled={isProjectSubmitting}
                          className="hidden"
                          accept="*/*"
                        />

                        {projectData.files.length > 0 && (
                          <div className="space-y-3">
                            {projectData.files.map((file, index) => (
                              <div
                                key={index}
                                className={`flex items-center justify-between p-3 bg-gray-100 border border-gray-300 rounded-xl ${
                                  isProjectSubmitting ? "opacity-50" : ""
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div
                                    className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{
                                      background:
                                        "linear-gradient(180deg, rgba(16, 185, 129, 0.2) 0%, rgba(55, 106, 89, 0.1) 100%)",
                                    }}
                                  >
                                    <FileText className="w-4 sm:w-5 h-4 sm:h-5 text-green-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-sm font-medium text-black block truncate">
                                      {file.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeProjectFile(index)}
                                  disabled={isProjectSubmitting}
                                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Button
                        onClick={handleProjectSubmit}
                        className="flex-1 text-black rounded-full h-11 sm:h-12 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={
                          !projectData.title.trim() ||
                          !projectData.description.trim() ||
                          isProjectSubmitting
                        }
                        style={{
                          background:
                            "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                        }}
                        onMouseEnter={(e) => {
                          if (!e.target.disabled)
                            e.target.style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          if (!e.target.disabled) e.target.style.opacity = "1";
                        }}
                      >
                        {isProjectSubmitting ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Submit Project
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setShowProjectModal(false)}
                        variant="outline"
                        disabled={isProjectSubmitting}
                        className="flex-1 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full h-11 sm:h-12 text-sm sm:text-base font-medium bg-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

          {/* Project Submitted Status */}
          {session?.user?.role === "freelancer" &&
            activeConversation?.hasProjectSubmission && (
              <div
                className="flex items-center gap-1 sm:gap-2 text-black text-xs sm:text-sm px-2 sm:px-3 py-1 border border-green-400/50 rounded"
                style={{
                  background:
                    "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                }}
              >
                <CheckCircle className="w-3 sm:w-4 h-3 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Project Submitted</span>
                <span className="sm:hidden">Submitted</span>
              </div>
            )}
        </div>
      </div>

      {/* PROJECT REVIEW SECTION - ADD HERE */}
      {session?.user?.role === "hiring" &&
        projectInfo &&
        ["submitted", "under_review", "approved"].includes(
          projectInfo.status
        ) &&
        !autoCloseCountdown?.expired && (
          <div className="bg-gray-900/50 border-b border-green-600/30 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-400" />
                <span className="text-white font-medium">
                  Project Review Required
                </span>
                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-medium">
                  Pending Review
                </span>
              </div>

              <p className="text-gray-300 text-sm">
                "{projectInfo.title}" has been submitted for your review.
              </p>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => openReviewModal("approve")}
                  disabled={isSubmittingReview}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Complete
                </Button>
                <Button
                  onClick={() => openReviewModal("revision")}
                  disabled={
                    isSubmittingReview ||
                    (projectInfo.remainingIterations || 0) <= 0
                  }
                  variant="outline"
                  className="border-orange-300 text-orange-300 hover:bg-orange-900/20 px-4 py-2 text-sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Request Revision
                  {(projectInfo.remainingIterations || 0) > 0 && (
                    <span className="ml-1 text-xs bg-orange-900/30 px-1.5 py-0.5 rounded">
                      {projectInfo.remainingIterations} left
                    </span>
                  )}
                </Button>
                <Button
                  onClick={() => openReviewModal("completed")}
                  disabled={isSubmittingReview}
                  variant="outline"
                  className="border-blue-300 text-blue-300 hover:bg-blue-900/20 px-4 py-2 text-sm"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Mark Completed
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* Messages Area - BLACK background */}
      <div className="flex-1 overflow-hidden bg-black">
        <ScrollArea className="h-full px-4 py-6">
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender._id === session?.user?.id;

              return (
                <div
                  key={message._id}
                  className={`flex gap-2 ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Avatar for received messages */}
                  {!isOwn && (
                    <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-green-400/30">
                      <AvatarImage
                        src={message.sender.image || "/placeholder.svg"}
                        alt={message.sender.name}
                      />
                      <AvatarFallback className="bg-gray-700 text-white text-xs">
                        {message.sender.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div className={`max-w-[75%] ${isOwn ? "order-1" : ""}`}>
                    {/* Message Bubble - WHITE for incoming, GRAY for outgoing */}
                    <div
                      className={`relative px-4 py-2 rounded-2xl ${
                        // Add this condition for system messages
                        message.type === "system" ||
                        (message.content &&
                          (message.content.includes("PROJECT APPROVED") ||
                            message.content.includes("Revision Required")))
                          ? "bg-gray-800 text-white border border-gray-600"
                          : isOwn
                          ? "bg-gray-600 text-white ml-auto"
                          : "bg-white text-black"
                      }`}
                      style={{
                        borderBottomRightRadius: isOwn ? "4px" : "16px",
                        borderBottomLeftRadius: isOwn ? "16px" : "4px",
                      }}
                    >
                      {/* Message tail/pointer */}
                      <div
                        className={`absolute bottom-0 w-0 h-0 ${
                          isOwn
                            ? "right-0 border-l-[8px] border-l-gray-600 border-b-[8px] border-b-transparent"
                            : "left-0 border-r-[8px] border-r-white border-b-[8px] border-b-transparent"
                        }`}
                        style={{
                          transform: isOwn
                            ? "translateX(8px)"
                            : "translateX(-8px)",
                        }}
                      />

                      {/* Message Content */}
                      {isFileMessage(message) ? (
                        renderFileMessage(message)
                      ) : message.type === "project_submission" ? (
                        renderProjectMessage(message)
                      ) : message.type === "system" ||
                        (message.content &&
                          (message.content.includes("PROJECT APPROVED") ||
                            message.content.includes("APPROVED") ||
                            message.content.includes("Revision Required") ||
                            message.content.includes("✅") ||
                            message.content.includes("❌"))) ? (
                        renderReviewMessage(message)
                      ) : (
                        <p className="text-sm leading-relaxed break-words">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {/* Message Info */}
                    <div
                      className={`flex items-center gap-1 mt-1 px-2 ${
                        isOwn ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span className="text-xs text-gray-400">
                        {new Date(message.createdAt).toLocaleDateString() ===
                        new Date().toLocaleDateString()
                          ? formatTime(message.createdAt)
                          : new Date(message.createdAt).toLocaleDateString()}
                      </span>
                      {/* Message status icons for sent messages */}
                      {getMessageStatusIcon(message)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {otherUserTyping && (
              <div className="flex gap-2 justify-start">
                <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-green-400/30">
                  <AvatarImage
                    src={otherParticipant?.image || "/placeholder.svg"}
                    alt={otherParticipant?.name}
                  />
                  <AvatarFallback className="bg-gray-700 text-white text-xs">
                    {otherParticipant?.name?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white px-4 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Message Input - BLACK with GREEN highlights */}
      <div className="border-t border-green-600/30 bg-black px-4 py-3 mb-24 md:mb-0">
        {autoCloseCountdown?.expired ? (
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">
              This conversation has expired and is read-only
            </p>
          </div>
        ) : (
          <>
            {/* Validation Error Display */}
            {validationError && (
              <div className="mb-3 p-3 bg-red-600/20 border border-red-400/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-400">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{validationError}</span>
                </div>
                <p className="text-xs text-red-300 mt-1 ml-6">
                  Please remove phone numbers, emails, links, or social media
                  handles before sending.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isFileUploading}
                  className="text-green-400 hover:text-green-300 hover:bg-green-900/20 p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFileUploading ? (
                    <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Paperclip className="w-5 h-5" />
                  )}
                </Button>

                {/* Message input with GREEN border and validation styling */}
                <div
                  className={`flex-1 relative bg-gray-900 rounded-3xl border transition-colors ${
                    validationError
                      ? "border-red-400/70 focus-within:border-red-400"
                      : "border-green-600/30 focus-within:border-green-400"
                  }`}
                >
                  <input
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Type a message"
                    className={`w-full bg-transparent placeholder:text-gray-400 px-4 py-3 pr-12 border-none focus:outline-none ${
                      validationError ? "text-red-300" : "text-white"
                    }`}
                  />

                  {/* Emoji button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-400 hover:text-green-300 p-1 rounded-full"
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                </div>

                {/* GREEN Send button with validation state */}
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || validationError}
                  className={`text-black p-2 rounded-full transition-opacity ${
                    validationError ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  style={{
                    background: validationError
                      ? "linear-gradient(180deg, #6b7280 0%, #4b5563 100%)"
                      : "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                  }}
                  onMouseEnter={(e) => {
                    if (!validationError && !e.target.disabled) {
                      e.target.style.opacity = "0.9";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!validationError && !e.target.disabled) {
                      e.target.style.opacity = "1";
                    }
                  }}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && !autoCloseCountdown?.expired && (
          <div className="absolute bottom-20 right-8 z-50">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="dark"
              searchDisabled
              skinTonesDisabled
              height={400}
            />
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
        />
      </div>

      {/* Project Review Modals */}
      {/* Approve Modal */}
      <Dialog
        open={showReviewModal === "approve"}
        onOpenChange={() => !isSubmittingReview && closeReviewModal()}
      >
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 text-xl font-bold">
              <CheckCircle className="h-6 w-6" />
              Approve & Complete Project
            </DialogTitle>
            <DialogDescription className="text-gray-700 text-sm leading-relaxed">
              Are you sure you want to approve this project and mark the gig as
              completed?
              <br />
              <strong className="text-black">Note:</strong> The project will be
              completed and payment will be processed. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="approve-feedback"
                className="text-black text-sm font-semibold"
              >
                Feedback (Optional)
              </Label>
              <Textarea
                id="approve-feedback"
                placeholder="Provide feedback for the freelancer..."
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                disabled={isSubmittingReview}
                className="mt-2 bg-gray-50 border-gray-300 text-black placeholder-gray-500 focus:border-green-500 focus:ring-green-500 rounded-lg"
                rows={3}
              />
            </div>

            {reviewError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{reviewError}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={closeReviewModal}
              disabled={isSubmittingReview}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleReviewAction("approve")}
              disabled={isSubmittingReview}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-lg"
            >
              {isSubmittingReview ? (
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
        open={showReviewModal === "revision"}
        onOpenChange={() => !isSubmittingReview && closeReviewModal()}
      >
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 text-xl font-bold">
              <Edit className="h-6 w-6" />
              Request Project Revision
            </DialogTitle>
            <DialogDescription className="text-gray-700 text-sm leading-relaxed">
              Write the feedback/changes you want in this project.
              <br />
              You will have{" "}
              <strong className="text-black">
                {(projectInfo?.remainingIterations || 0) - 1}
              </strong>{" "}
              revision(s) left after this.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="revision-feedback"
                className="text-black text-sm font-semibold"
              >
                Feedback/Changes Required *
              </Label>
              <Textarea
                id="revision-feedback"
                placeholder="Describe what changes are needed..."
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                disabled={isSubmittingReview}
                className="mt-2 bg-gray-50 border-gray-300 text-black placeholder-gray-500 focus:border-green-500 focus:ring-green-500 rounded-lg"
                rows={4}
                required
              />
            </div>

            {reviewError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{reviewError}</span>
                </div>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  After requesting this revision, the freelancer will have{" "}
                  {(projectInfo?.remainingIterations || 0) - 1} revision(s)
                  remaining.
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={closeReviewModal}
              disabled={isSubmittingReview}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleReviewAction("request_revision")}
              disabled={isSubmittingReview || !reviewFeedback.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-lg disabled:bg-gray-400"
            >
              {isSubmittingReview ? (
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
        open={showReviewModal === "completed"}
        onOpenChange={() => !isSubmittingReview && closeReviewModal()}
      >
        <DialogContent className="sm:max-w-md bg-white border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 text-xl font-bold">
              <Clock className="h-6 w-6" />
              Mark Project as Completed
            </DialogTitle>
            <DialogDescription className="text-gray-700 text-sm leading-relaxed">
              Are you sure you want to mark this project as completed?
              <br />
              <strong className="text-black">Note:</strong> The project will be
              completed and no further changes can be requested. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label
                htmlFor="completed-feedback"
                className="text-black text-sm font-semibold"
              >
                Note (Optional)
              </Label>
              <Textarea
                id="completed-feedback"
                placeholder="Add a note about the completion..."
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                disabled={isSubmittingReview}
                className="mt-2 bg-gray-50 border-gray-300 text-black placeholder-gray-500 focus:border-green-500 focus:ring-green-500 rounded-lg"
                rows={3}
              />
            </div>

            {reviewError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{reviewError}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              variant="outline"
              onClick={closeReviewModal}
              disabled={isSubmittingReview}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleReviewAction("mark_completed")}
              disabled={isSubmittingReview}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-lg"
            >
              {isSubmittingReview ? (
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
}

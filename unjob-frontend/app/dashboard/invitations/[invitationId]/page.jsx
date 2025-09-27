"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  Calendar,
  MapPin,
  Tag,
  User,
  MessageSquare,
  ArrowLeft,
  Building2,
  Star,
  Loader2,
} from "lucide-react";

export default function FreelancerInvitationsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState("");

  const invitationId = params?.invitationId;

  // Fetch invitation data
  useEffect(() => {
    if (!invitationId || status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    const fetchInvitation = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/invitations/${invitationId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch invitation");
        }

        if (data.success) {
          setInvitation(data.invitation);
        }
      } catch (error) {
        console.error("Error fetching invitation:", error);
        setError(error.message || "Failed to load invitation");
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [invitationId, session, status, router]);

  const handleResponse = async (status, responseMessage = "") => {
    if (!invitation || responding) return;

    setResponding(true);

    try {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          freelancerResponse: responseMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${status} invitation`);
      }

      // Update local state
      setInvitation((prev) => ({
        ...prev,
        status: data.invitation.status,
        respondedAt: data.invitation.respondedAt,
        freelancerResponse: data.invitation.freelancerResponse,
      }));

      // Show success message
      alert(`Invitation ${status} successfully!`);

      // Redirect to invitations list after a delay
      setTimeout(() => {
        router.push("/dashboard/invitations");
      }, 2000);
    } catch (error) {
      console.error(`Error ${status} invitation:`, error);
      alert(error.message || `Failed to ${status} invitation`);
    } finally {
      setResponding(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
        icon: Clock,
        text: "Pending",
      },
      accepted: {
        color: "bg-green-500/20 text-green-400 border border-green-500/30",
        icon: CheckCircle,
        text: "Accepted",
      },
      declined: {
        color: "bg-red-500/20 text-red-400 border border-red-500/30",
        icon: XCircle,
        text: "Declined",
      },
      expired: {
        color: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
        icon: XCircle,
        text: "Expired",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}
      >
        <IconComponent className="w-4 h-4 mr-1" />
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return "Not specified";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading invitation details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-400 mb-2">
              {error || "Invitation Not Found"}
            </h2>
            <p className="text-red-300 mb-6">
              {error ||
                "The invitation you are looking for does not exist or you do not have permission to view it."}
            </p>
            <button
              onClick={() => router.push("/dashboard/invitations")}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-2 rounded-lg transition-all"
            >
              Back to Invitations
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get gig data (from populated gig or stored in invitation)
  const gigData = invitation.gig || {
    title: invitation.gigTitle,
    description: invitation.gigDescription,
    budget: invitation.budget,
    timeline: invitation.timeline,
    category: invitation.category,
    skillsRequired: invitation.customGigData?.tags || [],
    deliverables: invitation.customGigData?.deliverables || [],
    location: invitation.customGigData?.location,
    workType: invitation.customGigData?.workType,
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Gig Invitation</h1>
            {getStatusBadge(invitation.status)}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Invitation Header */}
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 px-6 py-6 border-b border-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-white mb-3">
                  {gigData.title}
                </h2>
                <div className="flex items-center text-gray-300 mb-2">
                  <User className="w-4 h-4 mr-2" />
                  <span>
                    Invited by {invitation.hiringUser?.name || "Company"}
                  </span>
                  {invitation.hiringUser?.profile?.companyName && (
                    <>
                      <Building2 className="w-4 h-4 ml-4 mr-2" />
                      <span>{invitation.hiringUser.profile.companyName}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center text-gray-400 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>Invited on {formatDate(invitation.createdAt)}</span>
                </div>
                {invitation.expiresAt && invitation.status === "pending" && (
                  <div className="flex items-center text-yellow-400 text-sm mt-1">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Expires on {formatDate(invitation.expiresAt)}</span>
                  </div>
                )}
              </div>
              <div className="text-right ml-6">
                <div className="flex items-center text-2xl font-bold text-green-400 mb-2">
                  <DollarSign className="w-6 h-6" />
                  {formatCurrency(gigData.budget)}
                </div>
                {gigData.timeline && (
                  <div className="flex items-center text-gray-300 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    {gigData.timeline}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Invitation Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Left Column */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Project Description
                </h3>
                <p className="text-gray-300 whitespace-pre-wrap mb-6 leading-relaxed">
                  {gigData.description}
                </p>

                {gigData.category && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-white mb-3">
                      Category
                    </h4>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                      <Tag className="w-3 h-3 mr-2" />
                      {gigData.category}
                    </span>
                  </div>
                )}

                {gigData.skillsRequired &&
                  gigData.skillsRequired.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-white mb-3">
                        Skills Required
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {gigData.skillsRequired.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full border border-gray-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Right Column */}
              <div>
                {invitation.personalMessage && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Personal Message
                    </h3>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-start">
                        <MessageSquare className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                        <p className="text-gray-300 italic leading-relaxed">
                          "{invitation.personalMessage}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Project Details */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-white">
                    Project Details
                  </h3>

                  {gigData.deliverables && gigData.deliverables.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-3">
                        Deliverables
                      </h4>
                      <ul className="list-disc list-inside text-gray-300 text-sm space-y-2">
                        {gigData.deliverables.map((deliverable, index) => (
                          <li key={index} className="leading-relaxed">
                            {deliverable}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {gigData.workType && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">
                        Work Type
                      </h4>
                      <span className="capitalize text-gray-300 font-medium">
                        {gigData.workType}
                      </span>
                    </div>
                  )}

                  {gigData.location && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-2">
                        Location
                      </h4>
                      <div className="flex items-center text-gray-300">
                        <MapPin className="w-4 h-4 mr-2 text-green-400" />
                        {gigData.location}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Response Section */}
            {invitation.status === "pending" && (
              <div className="border-t border-gray-800 pt-8">
                <h3 className="text-xl font-semibold text-white mb-6">
                  Respond to Invitation
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleResponse("accepted")}
                    disabled={responding}
                    className="flex items-center px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    {responding ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5 mr-2" />
                    )}
                    {responding ? "Accepting..." : "Accept Invitation"}
                  </button>
                  <button
                    onClick={() => handleResponse("declined")}
                    disabled={responding}
                    className="flex items-center px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    {responding ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <XCircle className="w-5 h-5 mr-2" />
                    )}
                    {responding ? "Declining..." : "Decline Invitation"}
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-4">
                  Note: Once you respond to this invitation, you cannot change
                  your response.
                </p>
              </div>
            )}

            {/* Response Display */}
            {invitation.status !== "pending" && (
              <div className="border-t border-gray-800 pt-8">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Your Response
                </h3>
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-white">
                      {invitation.status === "accepted"
                        ? "Accepted"
                        : invitation.status === "declined"
                        ? "Declined"
                        : "Expired"}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {formatDate(invitation.respondedAt)}
                    </span>
                  </div>
                  {invitation.freelancerResponse && (
                    <p className="text-gray-300 text-sm">
                      "{invitation.freelancerResponse}"
                    </p>
                  )}
                </div>

                {invitation.status === "accepted" && (
                  <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                      <span className="text-green-400 font-medium">
                        Invitation Accepted!
                      </span>
                    </div>
                    <p className="text-green-300 text-sm mt-2">
                      The hiring team has been notified. They may contact you
                      soon to discuss next steps.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

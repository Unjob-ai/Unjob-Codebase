"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  Calendar,
  User,
  Building2,
  Filter,
  Search,
  ChevronDown,
  Mail,
  Inbox,
  Loader2,
} from "lucide-react";

export default function InvitationsListPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    accepted: 0,
    declined: 0,
    expired: 0,
  });

  useEffect(() => {
    if (session?.user) {
      fetchInvitations();
    }
  }, [session, filter, sortBy]);

  const fetchInvitations = async () => {
    try {
      const queryParams = new URLSearchParams({
        filter,
        sortBy,
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/invitations?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setInvitations(data.invitations || []);
        setStatusCounts(data.statusCounts || statusCounts);
      } else {
        setError(data.error || "Failed to load invitations");
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      setError("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchInvitations();
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredInvitations = invitations.filter(
    (invitation) =>
      searchTerm === "" ||
      invitation.gigTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invitation.hiringUser?.name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const getFilterCount = (filterType) => {
    return statusCounts[filterType] || 0;
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Please log in to view your invitations
          </h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
                >
                  <div className="h-6 bg-gray-800 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-gray-800 rounded w-1/2 mb-4"></div>
                  <div className="h-4 bg-gray-800 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">My Invitations</h1>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Mail className="w-4 h-4" />
              <span>{statusCounts.all} total invitations</span>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Status Filter */}
            <div className="flex space-x-2">
              {[
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "accepted", label: "Accepted" },
                { key: "declined", label: "Declined" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filter === key
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                  }`}
                >
                  {label} ({getFilterCount(key)})
                </button>
              ))}
            </div>

            {/* Search and Sort */}
            <div className="flex space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invitations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                />
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="budget_high">Budget: High to Low</option>
                  <option value="budget_low">Budget: Low to High</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <div className="text-red-400">{error}</div>
          </div>
        )}

        {/* Invitations List */}
        {filteredInvitations.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchTerm ? "No matching invitations" : "No invitations yet"}
            </h3>
            <p className="text-gray-400">
              {searchTerm
                ? "Try adjusting your search terms or filters."
                : "When companies invite you to work on projects, they will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvitations.map((invitation) => (
              <div
                key={invitation._id}
                className="bg-gray-900 rounded-2xl border border-gray-800 hover:border-gray-700 transition-all hover:shadow-lg"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white hover:text-green-400 transition-colors">
                          {invitation.gigTitle}
                        </h3>
                        {getStatusBadge(invitation.status)}
                      </div>

                      <div className="flex items-center text-gray-300 mb-3 space-x-4">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            {invitation.hiringUser?.name || "Company"}
                          </span>
                        </div>
                        {invitation.hiringUser?.profile?.companyName && (
                          <div className="flex items-center">
                            <Building2 className="w-4 h-4 mr-2" />
                            <span className="text-sm">
                              {invitation.hiringUser.profile.companyName}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            {formatDate(invitation.createdAt)}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                        {invitation.gigDescription}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center text-green-400 font-bold">
                            <DollarSign className="w-4 h-4" />
                            <span>{invitation.budget?.toLocaleString()}</span>
                          </div>
                          {invitation.timeline && (
                            <div className="flex items-center text-gray-400 text-sm">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>{invitation.timeline}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/invitations/${invitation._id}`
                            )
                          }
                          className="flex items-center px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all text-sm font-medium"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>

                  {invitation.personalMessage && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-xl border-l-4 border-green-500">
                      <p className="text-gray-300 text-sm italic leading-relaxed">
                        "{invitation.personalMessage}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

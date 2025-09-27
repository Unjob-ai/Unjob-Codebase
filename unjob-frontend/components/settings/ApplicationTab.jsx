import React, { useState } from "react";
import {
  FileText,
  Wallet,
  CheckCircle,
  Clock,
  Building,
  DollarSign,
  Calendar,
  Eye,
  MessageCircle,
  Send,
  CreditCard,
  ChevronDown,
  AlertTriangle,
  XCircle,
  PauseCircle,
} from "lucide-react";

// --- UI Components (Styling updated for the requested theme) ---

const Card = ({ children, className = "" }) => (
  <div
    className={`bg-[#111827]/60 backdrop-blur-sm border border-gray-700/50 rounded-xl ${className}`}
  >
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  disabled = false,
  className = "",
  variant = "default",
  size = "default",
}) => {
  const baseClasses =
    "font-semibold transition-all duration-200 flex items-center justify-center rounded-lg whitespace-nowrap";
  const sizes = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-6 py-3 text-base",
  };
  const variants = {
    default: "bg-green-500 hover:bg-green-600 text-black",
    outline:
      "bg-transparent border border-gray-600 hover:bg-gray-800/50 text-gray-300",
    secondary: "bg-gray-800 hover:bg-gray-700/80 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizes[size]} ${variants[variant]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

const Table = ({ children, className = "" }) => (
  <div className={`w-full ${className}`}>
    <table className="w-full min-w-[800px]">{children}</table>
  </div>
);
const TableHeader = ({ children }) => (
  <thead className="bg-gray-800/50">{children}</thead>
);
const TableBody = ({ children }) => <tbody>{children}</tbody>;
const TableRow = ({ children, className = "" }) => (
  <tr
    className={`border-b border-gray-800 hover:bg-gray-800/40 transition-colors ${className}`}
  >
    {children}
  </tr>
);
const TableHead = ({ children, className = "" }) => (
  <th
    className={`text-left p-4 font-semibold text-sm text-gray-300 uppercase tracking-wider ${className}`}
  >
    {children}
  </th>
);
const TableCell = ({ children, className = "" }) => (
  <td className={`p-4 text-sm text-gray-200 ${className}`}>{children}</td>
);

// --- Main ApplicationsTab Component ---

const ApplicationsTab = ({
  applications = [],
  setSelectedApplication,
  openChat,
  router,
}) => {
  const [activeTab, setActiveTab] = useState("All Projects");

  // Updated status styling functions to include backgrounds
  const getStatusClasses = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "approved":
        return "bg-green-500/10 text-green-400";
      case "in-progress":
      case "accepted":
        return "bg-yellow-500/10 text-yellow-400";
      case "on-hold":
        return "bg-blue-500/10 text-blue-400";
      case "cancelled":
      case "rejected":
        return "bg-red-500/10 text-red-400";
      case "pending":
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "approved":
        return <CheckCircle className="h-3 w-3" />;
      case "in-progress":
      case "accepted":
        return <Clock className="h-3 w-3" />;
      case "on-hold":
        return <PauseCircle className="h-3 w-3" />;
      case "cancelled":
      case "rejected":
        return <XCircle className="h-3 w-3" />;
      case "pending":
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const tabs = ["All Projects", "Accepted", "Completed", "Pending", "Rejected"];

  
  // Filter applications based on active tab
  const filteredApplications = applications.filter((app) => {
    if (activeTab === "All Projects") return true;
    if (activeTab === "Completed") return app.applicationStatus?.toLowerCase() === "completed";
    return app.applicationStatus?.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Projects</h2>
      </div>

      {/* Filter Buttons with Wrapping */}
      <div className="flex items-center gap-3 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
              activeTab === tab
                ? "bg-green-500 text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Applications Section */}
      <Card className="!p-0 overflow-hidden">
        {filteredApplications.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead>Gig Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app._id} className="border-gray-800">
                    <TableCell className="font-medium text-white">
                      {app.gig?.title}
                    </TableCell>
                    <TableCell>{app.gig?.company?.name}</TableCell>
                    <TableCell>
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={getStatusClasses(app.applicationStatus)}
                      >
                        {getStatusIcon(app.applicationStatus)}
                        <span className="capitalize">
                          {app.applicationStatus || "pending"}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() =>
                            setSelectedApplication &&
                            setSelectedApplication(app)
                          }
                          variant="outline"
                          size="sm"
                          className="border-gray-700"
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Details
                        </Button>
                        {app.applicationStatus === "accepted" &&
                          app.conversationId && (
                            <Button
                              onClick={() =>
                                openChat && openChat(app.conversationId)
                              }
                              size="sm"
                              variant="secondary"
                              className="bg-blue-600/10 text-blue-300 hover:bg-blue-600/20"
                            >
                              <MessageCircle className="h-4 w-4 mr-1.5" />
                              Chat
                            </Button>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-500 mb-4 text-lg">
              No projects found for "{activeTab}"
            </div>
            <p className="text-gray-400">
              Your projects with this status will appear here.
            </p>
          </div>
        )}
      </Card>

      {/* Overall Empty State */}
      {applications.length === 0 && (
        <div className="text-center py-16 mt-8">
          <div className="text-gray-500 mb-4 text-lg"></div>

          <Button onClick={() => router && router.push("/dashboard/gigs")}>
            Browse Gigs
          </Button>
        </div>
      )}
    </div>
  );
};

export default ApplicationsTab;

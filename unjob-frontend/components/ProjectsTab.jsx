// components/ProjectsTab.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  User,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";

export function ProjectsTab() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, submitted, under_review, approved, rejected

  useEffect(() => {
    if (session?.user) {
      fetchProjects();
    }
  }, [session, filter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.append("status", filter);
      }

      const response = await fetch(`/api/projects/submit?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setProjects(data.projects || []);
      } else {
        throw new Error(data.error || "Failed to fetch projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "submitted":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "under_review":
        return <Eye className="w-4 h-4 text-blue-500" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "revision_requested":
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "submitted":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
      case "under_review":
        return "bg-blue-600/20 text-blue-400 border-blue-600/30";
      case "approved":
        return "bg-green-600/20 text-green-400 border-green-600/30";
      case "rejected":
        return "bg-red-600/20 text-red-400 border-red-600/30";
      case "revision_requested":
        return "bg-orange-600/20 text-orange-400 border-orange-600/30";
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/30";
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Submitted Projects</h2>
          <p className="text-gray-400">
            Manage and track your project submissions
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg">
          {[
            { key: "all", label: "All" },
            { key: "submitted", label: "Submitted" },
            { key: "under_review", label: "In Review" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
          ].map((filterOption) => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key)}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                filter === filterOption.key
                  ? "bg-green-600 text-black font-medium"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No Projects Found
          </h3>
          <p className="text-gray-400 mb-6">
            {filter === "all"
              ? "You haven't submitted any projects yet."
              : `No projects with status "${filter}" found.`}
          </p>
          <Button
            onClick={() => setFilter("all")}
            className="bg-green-600 hover:bg-green-700 text-black"
          >
            View All Projects
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {projects.map((project) => (
            <Card
              key={project._id}
              className="bg-gray-900/50 border-gray-700/50 hover:border-gray-600/50 transition-all"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg mb-2">
                      {project.title}
                    </CardTitle>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  <Badge className={`ml-4 ${getStatusColor(project.status)}`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(project.status)}
                      <span className="capitalize">
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Project Meta Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>Submitted: {formatDate(project.submittedAt)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400">
                    <FileText className="w-4 h-4" />
                    <span>{project.files?.length || 0} files</span>
                  </div>

                  {project.gig && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="w-4 h-4" />
                      <span className="truncate">{project.gig.title}</span>
                    </div>
                  )}
                </div>

                {/* Company Feedback */}
                {project.companyFeedback && (
                  <div className="bg-gray-800/30 p-3 rounded-lg">
                    <p className="text-gray-300 text-sm font-medium mb-1">
                      Company Feedback:
                    </p>
                    <p className="text-gray-400 text-sm">
                      {project.companyFeedback}
                    </p>
                  </div>
                )}

                {/* Files */}
                {project.files && project.files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-gray-300 text-sm font-medium">
                      Submitted Files:
                    </p>
                    <div className="space-y-2">
                      {project.files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-800/30 p-2 rounded-lg"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-white text-sm truncate">
                                {file.name}
                              </p>
                              <p className="text-gray-500 text-xs">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadFile(file.url, file.name)}
                            className="text-green-400 hover:text-green-300 hover:bg-green-900/20 flex-shrink-0"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

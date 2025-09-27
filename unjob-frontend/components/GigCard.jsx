"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  MapPin,
  Star,
  Briefcase,
  Eye,
  Users,
  MousePointer2,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function GigCard({ gig, userRole, onClick, showApplyButton }) {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = () => {
    if (gig?.StartDate && gig?.EndDate) {
      const start = new Date(gig.StartDate);
      const end = new Date(gig.EndDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} days`;
    }
    return gig?.timeline || "4 days";
  };

  const getApplicationStats = () => {
    if (!gig.applications || gig.applications.length === 0) {
      return { total: 0, pending: 0, accepted: 0 };
    }

    const total = gig.applications.length;
    const pending = gig.applications.filter(
      (app) => app.applicationStatus === "pending"
    ).length;
    const accepted = gig.applications.filter(
      (app) => app.applicationStatus === "accepted"
    ).length;

    return { total, pending, accepted };
  };

  const stats = getApplicationStats();

  return (
    <Card
      className="bg-gray-900/50 border-gray-800 hover:border-gray-600 transition-all duration-300 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Hero Image */}
        <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-t-lg overflow-hidden relative">
          {gig.bannerImage ? (
            <img
              src={gig.bannerImage}
              alt={gig.title}
              className="w-full h-full object-cover  "
              onError={(e) => {
                e.target.src = "/api/placeholder/400/200";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Briefcase className="w-16 h-16 text-gray-500" />
            </div>
          )}

          {/* Applications indicator */}
          {stats.total > 0 && (
            <div className="absolute top-3 right-3">
              <div className="bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-300" />
                <span className="text-xs text-white">{stats.total}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Company Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-gray-700">
              <AvatarImage src={gig.company?.image} alt={gig.company?.name} />
              <AvatarFallback
                className="text-white text-sm font-bold"
                style={{
                  background:
                    "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                }}
              >
                {typeof gig.company?.name === 'string' ? gig.company.name.charAt(0).toUpperCase() : "C"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium text-sm truncate">
                  {gig.company?.profile?.companyName || gig.company?.name}
                </h3>
                {gig.company?.isVerified && (
                  <Badge
                    className="text-white text-xs border-0"
                    style={{
                      background:
                        "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                    }}
                  >
                    ✓
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-xs">
                <span>{gig.timeAgo || "2h ago"}</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <h4 className="text-white font-medium text-lg leading-tight line-clamp-2 group-hover:text-gray-200 transition-colors">
            {gig.title}
          </h4>

          {/* Meta Info */}
          <div className="flex items-center gap-2 text-white text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{calculateDuration()}</span>
            </div>
          </div>

          {/* Budget and Apply */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-gray-400 text-xs">Fixed Budget</div>
              <div className="text-2xl font-bold text-[#22C55E]">
                ₹{gig.budget?.toLocaleString()}
              </div>
            </div>

            {/* ✅ FIX: Removed the `showApplyButton` check to always show the button for freelancers. */}
            {userRole === "freelancer" && (
              <Button
                size="sm"
                className="text-white font-medium rounded-lg hover:scale-105 transition-transform"
                style={{
                  background:
                    "linear-gradient(180deg, #10B981 0%, #376A59 100%)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                Apply <MousePointer2 className="text-white" />
              </Button>
            )}
          </div>

          {/* Application Stats for Company Users */}
          {userRole === "company" && stats.total > 0 && (
            <div className="pt-3 border-t border-gray-800">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold text-yellow-400">
                    {stats.pending}
                  </div>
                  <div className="text-xs text-gray-400">Pending</div>
                </div>
                <div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "#10B981" }}
                  >
                    {stats.accepted}
                  </div>
                  <div className="text-xs text-gray-400">Accepted</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-300">
                    {stats.total}
                  </div>
                  <div className="text-xs text-gray-400">Total</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

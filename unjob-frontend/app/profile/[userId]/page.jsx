"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  Briefcase,
  Calendar,
  Star,
  MapPin,
  Loader2,
  Building,
  DollarSign,
  Award,
  Heart,
  ExternalLink,
  Eye,
  Github,
  Globe,
  FileText,
  Video,
  Share2,
  Copy,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const isHiringRole = user?.role === "hiring";
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.userId) {
      fetchUserProfile();
    }
  }, [params.userId]);

  useEffect(() => {
    if (user) {
      if (user.role === "hiring") {
        fetchUserGigs();
        setActiveTab("gigs");
      } else {
        fetchUserPosts();
        fetchUserPortfolios();
        setActiveTab("posts");
      }
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`/api/profile/${params.userId}`);
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      } else {
        toast.error("User not found");
        router.push("/");
      }
    } catch (e) {
      toast.error("Failed to load profile");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const res = await fetch(`/api/posts?userId=${params.userId}`);
      const data = await res.json();
      if (res.ok) setPosts(data.posts || []);
    } catch {}
  };

  const fetchUserPortfolios = async () => {
    try {
      const res = await fetch(`/api/portfolio?userId=${params.userId}`);
      const data = await res.json();
      if (res.ok) setPortfolios(data.portfolios || []);
    } catch {}
  };

  const fetchUserGigs = async () => {
    try {
      const res = await fetch(`/api/gigs?company=${params.userId}&status=all`);
      const data = await res.json();
      if (res.ok) setGigs(data.gigs || []);
    } catch {}
  };

  const handlePostClick = () => {
    const callbackUrl = encodeURIComponent(window.location.href);
    router.push(`/login?callbackUrl=${callbackUrl}`);
  };

  const handleProjectClick = () => {
    const callbackUrl = encodeURIComponent(window.location.href);
    router.push(`/login?callbackUrl=${callbackUrl}`);
  };

  const handleGigClick = (gig) => {
    router.push(`/gigs/${gig._id}`);
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths > 0) return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
    if (diffInWeeks > 0) return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
    if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    return "Today";
  };

  const publicProfileUrl = typeof window !== "undefined" ? `${window.location.origin}/profile/${params.userId}` : "";
  const shareUrl = publicProfileUrl;
  const shareText = user?.name ? `${user.profile?.companyName || user.name} on Unjob` : "Check out this profile on Unjob";
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      toast.error("Failed to copy link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl"></div>
          </div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-gray-900/50 border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4 text-white">User Not Found</h1>
          <Button onClick={() => router.push("/")} className="bg-gradient-to-r from-green-500 to-emerald-600 text-black border-0">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center gap-4 mb-6">
        
          <div className="ml-auto">
            <Button onClick={() => setShowShareModal(true)} variant="outline" className="bg-gray-900/50 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto w-full rounded-2xl mb-0">
        <div className="relative h-72 sm:h-80 rounded-b-3xl overflow-hidden">
          {user.coverImage ? (
            <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900/50 to-black flex items-center justify-center">
              {isHiringRole ? <Building className="w-16 h-16 text-gray-600" /> : <Users className="w-16 h-16 text-gray-600" />}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        <div className="absolute left-4 sm:left-10 -bottom-10 sm:-bottom-12 z-10">
          <Avatar className="w-28 h-28 sm:w-36 sm:h-36 border-4 border-green-500 bg-black shadow-lg ring-4 ring-black">
            <AvatarImage src={user.image} />
            <AvatarFallback className="bg-gray-900 text-white text-3xl font-bold">
              {(user.profile?.companyName || user.name)?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-14 lg:mt-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-4 gap-7">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl mt-4 font-extrabold text-white leading-none">
                {user.profile?.companyName || user.name}
              </h1>
              {user.isVerified && (
                <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-4">
                  <Star className="h-4 w-4 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2 mb-1">
              <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1">
                {isHiringRole ? "Company" : "Freelancer"}
              </Badge>
              <span className="flex items-center gap-1 text-gray-300 text-sm">
                <Calendar className="h-4 w-4" />
                Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              {user.profile?.location && (
                <span className="flex items-center gap-1 text-gray-300 text-sm">
                  <MapPin className="h-4 w-4" />
                  {user.profile.location}
                </span>
              )}
            </div>
            {user.profile?.bio && (
              <p className="text-gray-300 text-base mt-2 max-w-2xl">{user.profile.bio}</p>
            )}
            {isHiringRole && user.profile?.industry && (
              <p className="text-green-400 text-sm mt-1">{user.profile.industry}</p>
            )}
          </div>
        </div>

        <div className="flex justify-start mb-6 sm:mb-8 px-2">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex bg-gray-800/50 rounded-2xl p-1 border border-gray-700/50 min-w-max">
              {[
                ...(isHiringRole
                  ? [{ id: "gigs", label: "Job Posts", count: gigs.length, icon: Briefcase }]
                  : [
                      { id: "posts", label: "Posts", count: posts.length, icon: FileText },
                      { id: "projects", label: "Projects", count: portfolios.length, icon: Briefcase },
                    ]),
                { id: "about", label: isHiringRole ? "Company Info" : "Skills", icon: Users },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all duration-300 text-xs sm:text-sm font-medium whitespace-nowrap flex items-center ${
                    activeTab === tab.id ? "text-black font-semibold shadow-lg transform scale-105" : "text-gray-400 hover:text-white hover:bg-gray-700/30"
                  }`}
                  style={{
                    background: activeTab === tab.id ? "linear-gradient(135deg, #10B981 0%, #059669 100%)" : "transparent",
                  }}
                >
                  <tab.icon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-black/20 text-black" : "bg-gray-700 text-gray-300"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Card className="bg-gray-900/50 border border-gray-800">
          <CardContent className="p-6">
            {activeTab === "gigs" && isHiringRole && (
              <>
                {gigs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gigs.map((gig) => (
                      <Card key={gig._id} onClick={() => handleGigClick(gig)} className="bg-gray-900/50 border border-gray-800 hover:border-green-500/30 cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">{gig.status?.toUpperCase()}</Badge>
                            <span className="text-xs text-gray-400">{gig.postedAgo}</span>
                          </div>
                          <h3 className="font-semibold text-white mb-2 line-clamp-2">{gig.title}</h3>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-400" />
                              <span className="text-green-400 font-semibold">₹{gig.budget?.toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-gray-500 text-sm">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              <span>{gig.applicationsCount} applications</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400">No job posts yet</div>
                )}
              </>
            )}

            {activeTab === "posts" && !isHiringRole && (
              <>
                {posts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                      <Card key={post._id} onClick={handlePostClick} className="bg-gray-900/50 border border-gray-800 hover:border-green-500/30 cursor-pointer">
                        {(post.images?.length > 0 || (post.videos && post.videos.length > 0)) && (
                          <div className="aspect-video overflow-hidden rounded-t-xl relative">
                            {post.videos && post.videos.length > 0 ? (
                              <>
                                <video src={Array.isArray(post.videos) ? post.videos[0] : post.videos} className="w-full h-full object-cover" muted />
                                <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                                  <Video className="h-4 w-4 text-white" />
                                </div>
                              </>
                            ) : (
                              <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover" />
                            )}
                          </div>
                        )}
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-white mb-2 line-clamp-2">{post.title}</h3>
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{post.description}</p>
                          <div className="flex items-center justify-between text-gray-500 text-sm">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Heart className="h-4 w-4" />
                                {post.likes?.length || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4" />
                                {post.comments?.length || 0}
                              </div>
                            </div>
                            <span>{getTimeAgo(post.createdAt)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400">No posts yet</div>
                )}
              </>
            )}

            {activeTab === "projects" && !isHiringRole && (
              <>
                {portfolios.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {portfolios.map((portfolio) => (
                      <Card key={portfolio._id} onClick={handleProjectClick} className="bg-gray-900/50 border border-gray-800 hover:border-green-500/30 cursor-pointer">
                        {portfolio.images?.[0] && (
                          <div className="aspect-video overflow-hidden rounded-t-xl">
                            <img src={portfolio.images} alt={portfolio.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-white mb-2 line-clamp-2">{portfolio.title}</h3>
                          <p className="text-gray-400 text-sm mb-3 line-clamp-2">{portfolio.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-400">No projects yet</div>
                )}
              </>
            )}

            {activeTab === "about" && (
              <div className="space-y-6">
                {!isHiringRole ? (
                  <>
                    {user.profile?.skills?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><Award className="h-5 w-5 text-green-400" /> Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {user.profile.skills.map((skill, index) => (
                            <Badge key={index} className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {user.profile?.hourlyRate && (
                      <div>
                        <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5 text-green-400" /> Hourly Rate</h4>
                        <Card className="bg-gray-900/50 border border-gray-800">
                          <CardContent className="p-4">
                            <div className="text-2xl font-bold text-green-400">₹{user.profile.hourlyRate}/hour</div>
                            <div className="text-gray-400 text-sm">Starting rate</div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {user.profile?.companyName && (
                      <div>
                        <h4 className="font-semibold text-white mb-4 flex items-center gap-2"><Building className="h-5 w-5 text-green-400" /> Company Information</h4>
                        <Card className="bg-gray-900/50 border border-gray-800">
                          <CardContent className="p-4">
                            <div className="text-xl font-bold text-green-400">{user.profile.companyName}</div>
                            {user.profile?.industry && <div className="text-gray-400 text-sm mt-1">{user.profile.industry}</div>}
                            {user.profile?.companySize && <div className="text-gray-400 text-sm mt-1">Company Size: {user.profile.companySize}</div>}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="bg-white text-black max-w-md w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden">
          <div className="p-6">
            <DialogHeader className="p-0 mb-4">
              <DialogTitle className="text-xl font-bold text-black flex items-center">
                <Share2 className="h-5 w-5 mr-2" /> Share Profile
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <LinkIcon className="h-4 w-4 text-gray-500 shrink-0" />
                  <Input readOnly value={shareUrl} className="bg-transparent border-0 text-black focus-visible:ring-0 truncate" />
                </div>
                <Button onClick={handleCopyLink} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-3">Share via</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <a href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white">WhatsApp</Button>
                  </a>
                  <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-black hover:bg-gray-900 text-white">X / Twitter</Button>
                  </a>
                  <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">LinkedIn</Button>
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">Facebook</Button>
                  </a>
                  <a href={`mailto:?subject=${encodedText}&body=${encodedUrl}`} className="block">
                    <Button className="w-full bg-gray-700 hover:bg-gray-800 text-white">Email</Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



// components/profile/FollowersModal.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus, UserMinus, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

export function FollowersModal({
  isOpen,
  onClose,
  userId,
  type = "followers", // "followers" or "following"
  title,
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState({});

  useEffect(() => {
    if (isOpen && userId) {
      fetchUsers();
    }
  }, [isOpen, userId, type]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const endpoint =
        type === "followers"
          ? `/api/profile/${userId}/followers`
          : `/api/profile/${userId}/following`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (response.ok && data.success) {
        const usersList =
          type === "followers" ? data.followers : data.following;
        setUsers(usersList);

        // Initialize following status
        const status = {};
        usersList.forEach((user) => {
          status[user._id] = user.isFollowing;
        });
        setFollowingStatus(status);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId) => {
    if (!session?.user?.id) {
      toast.error("Please log in to follow users");
      return;
    }

    const wasFollowing = followingStatus[targetUserId];

    // Optimistic update
    setFollowingStatus((prev) => ({
      ...prev,
      [targetUserId]: !wasFollowing,
    }));

    try {
      const response = await fetch("/api/profile/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.isFollowing ? "User followed!" : "User unfollowed!");
      } else {
        // Revert on error
        setFollowingStatus((prev) => ({
          ...prev,
          [targetUserId]: wasFollowing,
        }));
        toast.error(data.error || "Failed to update follow status");
      }
    } catch (error) {
      // Revert on error
      setFollowingStatus((prev) => ({
        ...prev,
        [targetUserId]: wasFollowing,
      }));
      console.error("Follow error:", error);
      toast.error("Failed to update follow status");
    }
  };

  const handleUserClick = (clickedUserId) => {
    router.push(`/profile/${clickedUserId}`);
    onClose();
  };

  const handleMessageUser = (targetUserId) => {
    router.push(`/chat/new?userId=${targetUserId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {title || `${type.charAt(0).toUpperCase() + type.slice(1)}`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              {users.length > 0 ? (
                users.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-3 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => handleUserClick(user._id)}
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="bg-gray-700 text-white">
                          {user.name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-black truncate">
                            {user.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={
                              user.role === "freelancer"
                                ? "border-green-500/30 text-green-400"
                                : "border-blue-500/30 text-blue-400"
                            }
                          >
                            {user.role === "freelancer"
                              ? "Freelancer"
                              : "Company"}
                          </Badge>
                        </div>

                        {user.profile?.bio && (
                          <p className="text-gray-400 text-sm truncate mt-1">
                            {user.profile.bio}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span>{user.followersCount || 0} followers</span>
                          <span>{user.followingCount || 0} following</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons - only show if not own profile */}
                    {session?.user?.id !== user._id && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleMessageUser(user._id)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>

                        <Button
                          onClick={() => handleFollow(user._id)}
                          variant={
                            followingStatus[user._id] ? "outline" : "default"
                          }
                          size="sm"
                          className={
                            followingStatus[user._id]
                              ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                              : "bg-green-600 hover:bg-green-700"
                          }
                        >
                          {followingStatus[user._id] ? (
                            <>
                              <UserMinus className="h-4 w-4 mr-1" />
                              Unfollow
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-1" />
                              Follow
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <p>No {type} yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

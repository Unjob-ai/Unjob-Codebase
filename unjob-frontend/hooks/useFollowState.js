import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

export const useFollowState = () => {
  const { data: session } = useSession();
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [followLoading, setFollowLoading] = useState(new Set());

  // Initialize following status
  useEffect(() => {
    const initializeFollowingStatus = async () => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch(`/api/profile/${session.user.id}`);
        const data = await response.json();
        if (response.ok && data.user?.following) {
          setFollowingUsers(new Set(data.user.following));
        }
      } catch (error) {
        console.error("Error fetching following status:", error);
      }
    };

    initializeFollowingStatus();
  }, [session?.user?.id]);

  const handleFollow = useCallback(
    async (userId) => {
      if (!session?.user?.id) {
        toast.error("Please log in to follow users");
        return false;
      }

      if (followLoading.has(userId)) return false;

      setFollowLoading((prev) => new Set([...prev, userId]));

      try {
        const response = await fetch("/api/profile/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        const data = await response.json();

        if (response.ok) {
          setFollowingUsers((prev) => {
            const newSet = new Set(prev);
            if (data.isFollowing) {
              newSet.add(userId);
            } else {
              newSet.delete(userId);
            }
            return newSet;
          });

          toast.success(data.message);
          return data.isFollowing;
        } else {
          toast.error(data.error || "Failed to update follow status");
          return false;
        }
      } catch (error) {
        console.error("Follow error:", error);
        toast.error("Network error occurred");
        return false;
      } finally {
        setFollowLoading((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }
    },
    [session?.user?.id, followLoading]
  );

  return {
    followingUsers,
    followLoading,
    handleFollow,
    setFollowingUsers, // For manual updates if needed
  };
};

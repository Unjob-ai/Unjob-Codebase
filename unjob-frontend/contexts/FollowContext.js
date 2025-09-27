// contexts/FollowContext.js
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { toast } from "react-hot-toast";

const FollowContext = createContext();

export const useFollowContext = () => {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error("useFollowContext must be used within a FollowProvider");
  }
  return context;
};

export const FollowProvider = ({ children }) => {
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [followLoading, setFollowLoading] = useState(new Set());

  const updateFollowStatus = useCallback((userId, isFollowing) => {
    setFollowingUsers((prev) => {
      const newSet = new Set(prev);
      if (isFollowing) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  }, []);

  const handleFollow = useCallback(
    async (userId, sessionUserId) => {
      if (!sessionUserId) {
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
          updateFollowStatus(userId, data.isFollowing);
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
    [followLoading, updateFollowStatus]
  );

  const initializeFollowingUsers = useCallback((userIds) => {
    setFollowingUsers(new Set(userIds));
  }, []);

  return (
    <FollowContext.Provider
      value={{
        followingUsers,
        followLoading,
        handleFollow,
        updateFollowStatus,
        initializeFollowingUsers,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
};

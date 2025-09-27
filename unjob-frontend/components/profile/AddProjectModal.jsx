// components/profile/AddProjectModal.js
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, Plus, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "react-hot-toast";

export default function AddProjectModal({ isOpen, onClose, onProjectAdded }) {
  const { data: session } = useSession();
  const [projectTitle, setProjectTitle] = useState("");
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingPosts, setFetchingPosts] = useState(true);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setProjectTitle("");
      setSelectedPostIds([]);
      setUserPosts([]);
      setFetchingPosts(true);
      fetchUserPosts();
    }
  }, [isOpen]);

  const fetchUserPosts = async () => {
    try {
      const userId =
        session?.user?.userId ||
        session?.user?.id ||
        session?.user?._id ||
        session?.user?.sub;
      if (!userId) return;

      const response = await fetch(`/api/posts?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out posts that are already portfolio projects
        const availablePosts = data.posts.filter(
          (post) => post.postType !== "portfolio"
        );
        setUserPosts(availablePosts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setFetchingPosts(false);
    }
  };

  const handleClose = () => {
    setProjectTitle("");
    setSelectedPostIds([]);
    setUserPosts([]);
    setLoading(false);
    setFetchingPosts(true);
    onClose();
  };

  const togglePostSelection = (postId) => {
    setSelectedPostIds((prev) => {
      if (prev.includes(postId)) {
        return prev.filter((id) => id !== postId);
      } else {
        return [...prev, postId];
      }
    });
  };

  const selectAllPosts = () => {
    if (selectedPostIds.length === userPosts.length) {
      setSelectedPostIds([]);
    } else {
      setSelectedPostIds(userPosts.map((post) => post._id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!projectTitle.trim()) {
      toast.error("Project title is required");
      setLoading(false);
      return;
    }

    if (selectedPostIds.length === 0) {
      toast.error("Please select at least one post");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/posts/convert-multiple-to-portfolio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectTitle: projectTitle.trim(),
          postIds: selectedPostIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(
          `${data.convertedCount} post(s) converted to portfolio project!`
        );

        if (onProjectAdded) {
          onProjectAdded(data);
        }

        handleClose();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to convert posts to portfolio");
      }
    } catch (error) {
      console.error("Portfolio conversion error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white text-black max-w-4xl w-[95vw] mx-auto rounded-2xl border-0 p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 mt-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-black">
              Add Project to Portfolio
            </DialogTitle>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
            >
              <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]"
        >
          <div className="space-y-6">
            {/* Project Title */}
            <div>
              <Label className="text-sm font-medium text-black mb-3 block">
                Project Title *
              </Label>
              <Input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                required
                className="bg-gray-100 border-gray-300 text-black rounded-xl h-12"
                placeholder="Enter project title..."
              />
              <p className="text-xs text-gray-500 mt-1">
                This title will group related posts together in your portfolio
              </p>
            </div>

            {/* Posts Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-medium text-black">
                  Select Posts ({selectedPostIds.length} selected)
                </Label>
                {!fetchingPosts && userPosts.length > 0 && (
                  <Button
                    type="button"
                    onClick={selectAllPosts}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    {selectedPostIds.length === userPosts.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                )}
              </div>

              {fetchingPosts ? (
                <div className="bg-gray-100 border border-gray-300 rounded-xl p-8 text-center">
                  <span className="text-gray-500">Loading your posts...</span>
                </div>
              ) : userPosts.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-gray-500 mb-2">
                    No posts available to convert
                  </p>
                  <p className="text-xs text-gray-400">
                    Create some posts first to add them to your portfolio
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto border border-gray-200 rounded-xl p-4">
                  {userPosts.map((post) => (
                    <PostSelectionCard
                      key={post._id}
                      post={post}
                      isSelected={selectedPostIds.includes(post._id)}
                      onToggle={() => togglePostSelection(post._id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Selected Posts Summary */}
            {selectedPostIds.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">
                  Selected Posts ({selectedPostIds.length}):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPostIds.slice(0, 5).map((postId) => {
                    const post = userPosts.find((p) => p._id === postId);
                    return (
                      <span
                        key={postId}
                        className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded"
                      >
                        {post?.title || "Untitled"}
                      </span>
                    );
                  })}
                  {selectedPostIds.length > 5 && (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                      +{selectedPostIds.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 sticky bottom-0 bg-white border-t border-gray-200 -mx-6 px-6 py-4">
              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white h-12 rounded-full text-base font-medium"
                disabled={
                  loading || fetchingPosts || selectedPostIds.length === 0
                }
              >
                {loading
                  ? "Converting..."
                  : `Add ${selectedPostIds.length} Post${
                      selectedPostIds.length > 1 ? "s" : ""
                    } to Portfolio`}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Post Selection Card Component
const PostSelectionCard = ({ post, isSelected, onToggle }) => {
  const hasImages = post.images && post.images.length > 0;
  const hasVideos = post.videos && post.videos.length > 0;

  return (
    <div
      onClick={onToggle}
      className={`relative p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-green-500 bg-green-50"
          : "border-gray-200 hover:border-gray-300 bg-white"
      }`}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-2 right-2 z-10">
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-green-500 border-green-500"
              : "bg-white border-gray-300"
          }`}
        >
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>

      {/* Post Media */}
      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
        {hasImages ? (
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : hasVideos ? (
          <video
            src={post.videos}
            className="w-full h-full object-cover"
            muted
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            No Media
          </div>
        )}

        {/* Media Count Badge */}
        {(hasImages || hasVideos) && (
          <div className="absolute bottom-14 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {hasImages &&
              `${post.images.length} img${post.images.length > 1 ? "s" : ""}`}
            {hasImages && hasVideos && " + "}
            {hasVideos &&
              `${post.videos.length} vid${post.videos.length > 1 ? "s" : ""}`}
          </div>
        )}
      </div>

      {/* Post Info */}
      <div className="space-y-2">
        <h4 className="font-medium text-sm line-clamp-1">{post.title}</h4>
      </div>
    </div>
  );
};

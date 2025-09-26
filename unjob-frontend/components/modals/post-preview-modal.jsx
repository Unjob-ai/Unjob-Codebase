// components/modals/post-preview-modal.js
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Heart,
  MessageCircle,
  Share,
  Trash,
  Pencil,
  User,
  ChevronLeft,
  ChevronRight,
  Video,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PostPreviewModal({ post: initialPost, onClose }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [postState, setPostState] = useState(initialPost);
  const [commentText, setCommentText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(
    initialPost.description
  );
  // NEW: State to manage the current media item in the gallery
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const isOwner = session?.user?.id === postState?.author?._id;
  const hasLiked = postState?.likes?.some(
    (l) => l?.user?._id === session?.user?.id
  );

  // --- NEW: Combine all images and videos into a single media array ---
  const allMedia = [
    ...(postState?.videos || []).map((url) => ({ type: "video", url })),
    ...(postState?.images || []).map((url) => ({ type: "image", url })),
  ];

  useEffect(() => {
    async function fetchPost() {
      const res = await fetch(`/api/posts/${initialPost._id}`);
      if (res.ok) {
        const { post } = await res.json();
        setPostState(post);
        setEditedDescription(post.description);
      }
    }
    if (initialPost?._id) fetchPost();
  }, [initialPost?._id]);

  const handleAuthorClick = () => {
    if (postState?.author?._id) {
      router.push(`/dashboard/profile/${postState.author._id}`);
      onClose();
    }
  };

  const handleLike = async () => {
    // Optimistic UI update
    setPostState((prev) => {
      const userLiked = prev.likes?.some(
        (l) => l?.user?._id === session?.user?.id
      );
      const updatedLikes = userLiked
        ? prev.likes.filter((l) => l?.user?._id !== session?.user?.id)
        : [
            ...(prev.likes || []),
            { user: { _id: session?.user?.id, ...session?.user } },
          ];
      return { ...prev, likes: updatedLikes };
    });

    try {
      const res = await fetch(`/api/posts/${postState._id}/like`, {
        method: "POST",
      });
      if (res.ok) {
        const { post } = await res.json();
        setPostState(post); // Re-sync with the final state from server
      } else {
        setPostState(initialPost); // Revert on failure
      }
    } catch (error) {
      setPostState(initialPost);
      console.error("Network error on like:", error);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    const tempComment = {
      _id: Date.now().toString(), // temp ID
      user: {
        _id: session?.user?.id,
        name: session?.user?.name,
        image: session?.user?.image,
      },
      content: commentText,
      createdAt: new Date().toISOString(),
    };
    setPostState((prev) => ({
      ...prev,
      comments: [...(prev.comments || []), tempComment],
    }));
    setCommentText("");

    try {
      const res = await fetch(`/api/posts/${postState._id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tempComment.content }),
      });
      if (res.ok) {
        const { post } = await res.json();
        setPostState(post);
      } else {
        setPostState(initialPost);
      }
    } catch (err) {
      setPostState(initialPost);
      console.error("Comment network error:", err);
    }
  };

  const handleEdit = async () => {
    const originalDescription = postState.description;
    setPostState((prev) => ({ ...prev, description: editedDescription }));
    setIsEditing(false);
    try {
      const res = await fetch(`/api/posts/${postState._id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editedDescription }),
      });
      if (!res.ok) {
        setPostState((prev) => ({ ...prev, description: originalDescription }));
      }
    } catch (error) {
      setPostState((prev) => ({ ...prev, description: originalDescription }));
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const res = await fetch(`/api/posts/${postState._id}/delete`, {
        method: "DELETE",
      });
      if (res.ok) onClose();
    } catch (error) {
      console.error("Delete network error:", error);
    }
  };

  const handleCommentAuthorClick = (userId) => {
    if (userId && userId !== session?.user?.id) {
      router.push(`/dashboard/profile/${userId}`);
      onClose();
    }
  };

  if (!postState) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      {/* --- RESPONSIVE DIALOG CONTENT --- 
        - On mobile: overflow-y-auto to allow the whole modal to scroll
        - On desktop: lg:overflow-hidden to use the two-panel layout
      */}
      <DialogContent className="bg-black/95 backdrop-blur-xl border border-green-500/20 text-white max-w-6xl w-[95vw] h-auto max-h-[90vh] lg:h-[90vh] mx-auto rounded-2xl p-0 overflow-y-auto lg:overflow-hidden shadow-2xl shadow-green-500/10 scrollbar-thin scrollbar-thumb-green-600/30 scrollbar-track-black/50">
        <DialogHeader className="px-6 py-4 border-b border-green-500/20 bg-gradient-to-r from-black via-gray-900/80 to-black sticky top-0 z-10 lg:static">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Post Details
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row lg:h-full">
          {/* --- NEW: Interactive Media Gallery Section --- */}
          <div className="lg:flex-1 bg-gradient-to-br from-gray-900/50 to-black/80 flex flex-col items-center justify-center p-4 lg:border-r lg:border-green-500/10">
            {allMedia.length > 0 ? (
              <div className="w-full h-full flex flex-col gap-4">
                {/* Main Media Display Area */}
                <div className="flex-1 relative flex items-center justify-center min-h-[300px]">
                  {allMedia[currentMediaIndex].type === "video" ? (
                    <video
                      key={allMedia[currentMediaIndex].url} // Key ensures video re-renders on change
                      src={allMedia[currentMediaIndex].url}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl shadow-green-500/20 border border-green-500/20"
                      controls
                      autoPlay
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={allMedia[currentMediaIndex].url}
                      alt={`Post media ${currentMediaIndex + 1}`}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl shadow-green-500/20 border border-green-500/20"
                    />
                  )}
                  {/* Navigation Buttons */}
                  {allMedia.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCurrentMediaIndex(
                            (prev) =>
                              (prev - 1 + allMedia.length) % allMedia.length
                          )
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full"
                      >
                        {" "}
                        <ChevronLeft />{" "}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCurrentMediaIndex(
                            (prev) => (prev + 1) % allMedia.length
                          )
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full"
                      >
                        {" "}
                        <ChevronRight />{" "}
                      </Button>
                    </>
                  )}
                </div>
                {/* Thumbnail Strip */}
                {allMedia.length > 1 && (
                  <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-green-700/50 scrollbar-track-gray-800">
                    <div className="flex gap-3 px-2">
                      {allMedia.map((media, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentMediaIndex(index)}
                          className={cn(
                            "w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                            index === currentMediaIndex
                              ? "border-green-500 scale-105"
                              : "border-transparent opacity-60 hover:opacity-100"
                          )}
                        >
                          {media.type === "video" ? (
                            <div className="w-full h-full bg-black flex items-center justify-center relative">
                              <video
                                src={media.url}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Video className="text-white h-6 w-6" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={media.url}
                              alt={`Thumbnail ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <img
                src="/placeholder.svg"
                alt="Placeholder"
                className="max-w-full max-h-full object-contain rounded-xl opacity-30"
              />
            )}
          </div>

          {/* Details Section - Scrollable on Desktop */}
          <div className="lg:w-[400px] flex-shrink-0 bg-gradient-to-b from-gray-900/90 to-black/90 flex flex-col lg:max-h-full">
            {/* Author & Description */}
            <div className="p-6 border-b border-green-500/20">
              <div className="flex items-center space-x-3 mb-4">
                <Avatar className="h-10 w-10 ring-2 ring-green-500/30">
                  <AvatarImage src={postState?.author?.image} />
                  <AvatarFallback className="bg-gradient-to-br from-green-600 to-emerald-600 font-semibold">
                    {postState?.author?.name?.charAt(0)?.toUpperCase() || (
                      <User />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <button
                    onClick={handleAuthorClick}
                    className="text-sm font-semibold text-green-400 hover:text-green-300"
                  >
                    {postState?.author?.name || "Anonymous"}
                  </button>
                  <p className="text-xs text-gray-400">
                    {new Date(postState?.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <h2 className="text-lg font-bold text-white mb-3">
                {postState?.title}
              </h2>
              {!isEditing ? (
                <p className="text-gray-300 text-sm">
                  {postState?.description}
                </p>
              ) : (
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full text-sm bg-gray-800/50 border-green-500/30 text-gray-200"
                  rows={4}
                />
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="secondary">{postState?.category}</Badge>
                {postState?.subCategory && (
                  <Badge variant="outline">{postState?.subCategory}</Badge>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="p-6 border-b border-green-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={handleLike}
                    className="flex items-center space-x-2 text-gray-400 hover:text-red-400"
                  >
                    <Heart
                      fill={hasLiked ? "#ef4444" : "none"}
                      stroke={hasLiked ? "#ef4444" : "currentColor"}
                    />
                    <span>{postState?.likes?.length || 0}</span>
                  </button>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <MessageCircle />{" "}
                    <span>{postState?.comments?.length || 0}</span>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-green-400">
                  <Share />
                </button>
              </div>
              {isOwner && (
                <div className="flex items-center space-x-4 pt-4 mt-4 border-t border-green-500/20">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2 text-gray-400 hover:text-green-400"
                    >
                      <Pencil className="h-4 w-4" /> <span>Edit</span>
                    </button>
                  ) : (
                    <Button
                      onClick={handleEdit}
                      size="sm"
                      disabled={editedDescription === postState.description}
                    >
                      Save
                    </Button>
                  )}
                  <button
                    onClick={handleDelete}
                    className="flex items-center space-x-2 text-gray-400 hover:text-red-400"
                  >
                    <Trash className="h-4 w-4" /> <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
            {/* Comments Section */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Comments List - Scrollable on Desktop */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-green-600/50 scrollbar-track-gray-800/30">
                {postState.comments?.length > 0 ? (
                  postState.comments.map((comment, i) => (
                    <div key={i} className="flex space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user?.image} />
                      </Avatar>
                      <div>
                        <button
                          onClick={() =>
                            handleCommentAuthorClick(comment.user?._id)
                          }
                          className="text-sm font-semibold text-green-400 hover:text-green-300"
                        >
                          {comment.user?.name || "User"}
                        </button>
                        <p className="text-sm text-gray-300 mt-1">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No comments yet.
                  </div>
                )}
              </div>
              {/* Add Comment Input */}
              <div className="p-6 border-t border-green-500/20">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-gray-800/50 border-green-500/30 text-gray-200"
                    rows={2}
                  />
                  <Button
                    onClick={handleComment}
                    className="w-full"
                    disabled={!commentText.trim()}
                  >
                    Post Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

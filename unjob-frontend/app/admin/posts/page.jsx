"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Search, Filter, Eye, Edit, Trash2, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
// Simple toast notification system for admin
const showToast = (title, description, type = 'success') => {
  const alert = document.createElement('div');
  alert.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
    type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
  }`;
  alert.innerHTML = `
    <div class="font-semibold">${title}</div>
    <div class="text-sm opacity-90">${description}</div>
  `;
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.remove();
  }, 3000);
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [filters, setFilters] = useState({
    status: 'all',
    reported: false,
    search: '',
    author: 'all'
  });
  const [authors, setAuthors] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showModerateDialog, setShowModerateDialog] = useState(false);
  const [moderationAction, setModerationAction] = useState('');
  const [moderationReason, setModerationReason] = useState('');

  // Fetch posts with current filters and pagination
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: '10',
        ...filters
      });
      
      // Remove 'all' values from params as they're not needed in the API
      if (params.get('status') === 'all') params.delete('status');
      if (params.get('author') === 'all') params.delete('author');

      const response = await fetch(`/api/admin/posts?${params}`);
      const data = await response.json();

      if (data.success) {
        setPosts(data.posts);
        setPagination(data.pagination);
        setAuthors(data.authors);
      } else {
        showToast("Error", data.error || "Failed to fetch posts", "error");
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
              showToast("Error", "Failed to fetch posts", "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle search
  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  // Handle post selection
  const handlePostSelection = (postId, checked) => {
    if (checked) {
      setSelectedPosts(prev => [...prev, postId]);
    } else {
      setSelectedPosts(prev => prev.filter(id => id !== postId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPosts(posts.map(post => post._id));
    } else {
      setSelectedPosts([]);
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action, status = null) => {
    if (selectedPosts.length === 0) {
      showToast("No posts selected", "Please select posts to perform this action", "error");
      return;
    }

    try {
      const response = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          postIds: selectedPosts,
          status,
          reason: moderationReason
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast("Success", data.message);
        setSelectedPosts([]);
        setModerationReason('');
        fetchPosts(); // Refresh the list
      } else {
        showToast("Error", data.error || "Action failed", "error");
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showToast("Error", "Action failed", "error");
    }
  };

  // Handle individual post actions
  const handlePostAction = async (postId, action, status = null) => {
    try {
      const response = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          postIds: [postId],
          status,
          reason: moderationReason
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast("Success", data.message);
        setModerationReason('');
        fetchPosts(); // Refresh the list
      } else {
        showToast("Error", data.error || "Action failed", "error");
      }
    } catch (error) {
      console.error('Error performing post action:', error);
      showToast("Error", "Action failed", "error");
    }
  };

  // Get status badge variant
  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-green-600">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="destructive">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Fetch posts when component mounts or filters change
  useEffect(() => {
    fetchPosts();
  }, [filters, pagination.currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-green-200">Posts Management</h1>
          <p className="text-green-300">Manage and moderate all posts on the platform</p>
        </div>
        <div className="flex gap-2">
          {selectedPosts.length > 0 && (
            <>
              <Button
                onClick={() => setShowModerateDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Moderate ({selectedPosts.length})
              </Button>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedPosts.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search posts..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Author Filter */}
            <Select value={filters.author} onValueChange={(value) => handleFilterChange('author', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Author" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Authors</SelectItem>
                {authors.map((authorId) => {
                  const author = posts.find(post => post.author._id === authorId)?.author;
                  return author ? (
                    <SelectItem key={authorId} value={authorId}>
                      {author.name}
                    </SelectItem>
                  ) : null;
                })}
              </SelectContent>
            </Select>

            {/* Reported Filter */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="reported"
                checked={filters.reported}
                onCheckedChange={(checked) => handleFilterChange('reported', checked)}
              />
              <label htmlFor="reported" className="text-sm text-green-200">
                Reported Posts Only
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Posts ({pagination.totalPosts})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPosts.length === posts.length && posts.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post._id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPosts.includes(post._id)}
                          onCheckedChange={(checked) => handlePostSelection(post._id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium text-green-200">{post.title}</div>
                          <div className="text-sm text-gray-400 truncate">{post.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                            {post.author?.image ? (
                              <img src={post.author.image} alt={post.author.name} className="w-8 h-8 rounded-full" />
                            ) : (
                              <span className="text-xs text-white">{post.author?.name?.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-green-200">{post.author?.name}</div>
                            <div className="text-xs text-gray-400">{post.author?.role}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(post.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{post.category}</div>
                          <div className="text-gray-400">{post.subCategory}</div>
                        </div>
                      </TableCell>
                      <TableCell>{post.likes?.length || 0}</TableCell>
                      <TableCell>{formatDate(post.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/profile/${post.author._id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Select onValueChange={(value) => handlePostAction(post._id, 'updateStatus', value)}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handlePostAction(post._id, 'delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-400">
                    Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalPosts)} of {pagination.totalPosts} posts
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm text-green-200">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Moderation Dialog */}
      <Dialog open={showModerateDialog} onOpenChange={setShowModerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Moderate Selected Posts</DialogTitle>
            <DialogDescription>
              Choose an action for the {selectedPosts.length} selected posts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select onValueChange={setModerationAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve Posts</SelectItem>
                  <SelectItem value="reject">Reject Posts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (Optional)</label>
              <Input
                placeholder="Reason for moderation..."
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleBulkAction(moderationAction);
                setShowModerateDialog(false);
              }}
              disabled={!moderationAction}
            >
              Confirm Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Posts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPosts.length} posts? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleBulkAction('delete');
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



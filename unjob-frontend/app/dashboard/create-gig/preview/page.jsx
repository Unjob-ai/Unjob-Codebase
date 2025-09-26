"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"

export default function PreviewGigPage() {
  const router = useRouter()
  const [formData, setFormData] = useState(null)
  const [user, setUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Get gig ID from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const gigId = urlParams.get("id")

    if (gigId) {
      fetchGigData(gigId)
    } else {
      // Fallback to localStorage for backward compatibility
      const savedData = localStorage.getItem("gigFormData")
      if (savedData) {
        setFormData(JSON.parse(savedData))
      } else {
        router.push("/dashboard/create-gig")
      }
    }

    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/profile/cover")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  const fetchGigData = async (gigId) => {
    try {
      const response = await fetch(`/api/gigs/getGigs/${gigId}`)
      if (response.ok) {
        const data = await response.json()
        setFormData({
          title: data.gig.title,
          category: data.gig.category,
          subCategory: data.gig.subCategory,
          tags: data.gig.tags || [],
          projectOverview: data.gig.projectOverview || data.gig.description,
          skillsRequired: data.gig.skillsRequired || [],
          deliverables: data.gig.deliverables || [],
          budget: data.gig.budget,
          timeline: data.gig.timeline,
          startDate: data.gig.StartDate ? new Date(data.gig.StartDate).toISOString().split("T")[0] : "",
          endDate: data.gig.EndDate ? new Date(data.gig.EndDate).toISOString().split("T")[0] : "",
          assetDescription: data.gig.DerscribeAssets,
          bannerImageUrl: data.gig.bannerImage, // This is the URL from database
          assetUrls: data.gig.uploadAssets || [], // These are URLs from database
        })
      } else {
        console.error("Failed to fetch gig data")
        router.push("/dashboard/create-gig")
      }
    } catch (error) {
      console.error("Error fetching gig data:", error)
      router.push("/dashboard/create-gig")
    }
  }

  const handleSubmit = async () => {
    if (!formData) return

    setIsSubmitting(true)
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const gigId = urlParams.get("id")

      if (!gigId) {
        console.error("No gig ID found")
        return
      }

      const response = await fetch(`/api/gigs/createGig?id=${gigId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "active",
        }),
      })

      const result = await response.json()

      if (result.success) {
        localStorage.removeItem("gigFormData")
        router.push("/dashboard/gigs")
      } else {
        console.error("Error updating gig status:", result.error)
      }
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadAsset = async (assetUrl, index) => {
    try {
      const response = await fetch(assetUrl)
      const blob = await response.blob()

      // Extract filename from URL or create a default one
      const urlParts = assetUrl.split("/")
      const filename = urlParts[urlParts.length - 1].split("?")[0] || `asset-${index + 1}`

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading asset:", error)
    }
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const calculateDuration = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      const diffTime = Math.abs(end - start)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return `${diffDays} days`
    }
    return "4 days"
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left side - Gig details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner Image */}
            {formData.bannerImageUrl && (
              <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={formData.bannerImageUrl || "/placeholder.svg"}
                  alt="Gig banner"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "/placeholder.svg"
                  }}
                />
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl font-bold text-green-400 mb-6">
              {formData.title || "Design a Responsive Landing Page for Our SaaS Product"}
            </h1>

            {/* Company Info */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.profile?.companyName
                    ? user.profile.companyName.charAt(0).toUpperCase()
                    : user?.name?.charAt(0).toUpperCase() || "O"}
                </span>
              </div>
              <div>
                <p className="text-white font-medium">{user?.profile?.companyName || user?.name || "Odam Studio"}</p>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span>Posted 2h ago</span>
                  <span>•</span>
                  <span>Remote</span>
                  <span>•</span>
                  <span>{formData.category}</span>
                  <span>•</span>
                  <span>{formData.subCategory}</span>
                  {user?.isVerified && (
                    <>
                      <span>•</span>
                      <span className="text-blue-400">✓ Verified</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 leading-relaxed mb-6">
              {formData.projectOverview ||
                "We are building a modern, clean, and responsive landing page for a SaaS product targeting startup founders. The page should include product highlights, testimonials, CTAs, and pricing sections. The design should be built for conversion, mobile-friendly, and aligned with our existing brand style."}
            </p>

            {/* Tags */}
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {formData.tags.map((tag) => (
                  <span key={tag} className="bg-gray-800 text-gray-300 px-3 py-1 rounded text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Deliverables - Only show if we have actual deliverables */}
            {formData.deliverables && formData.deliverables.length > 0 && (
              <div className="mb-8">
                <h3 className="text-white font-bold text-xl mb-4">DELIVERABLES</h3>
                <div className="space-y-2">
                  {formData.deliverables.map((deliverable, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-green-400">→</span>
                      <span className="text-white">{deliverable}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Files */}
            <div>
              <h3 className="text-white font-bold text-xl mb-4">REFERENCE FILES</h3>
              {formData.assetDescription && <p className="text-gray-400 text-sm mb-4">{formData.assetDescription}</p>}
              <div className="space-y-3">
                {formData.assetUrls && formData.assetUrls.length > 0 ? (
                  formData.assetUrls.map((assetUrl, index) => {
                    // Extract filename from URL
                    const urlParts = assetUrl.split("/")
                    const filename = urlParts[urlParts.length - 1].split("?")[0] || `Asset ${index + 1}`

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-900 p-3 rounded hover:bg-gray-800 transition-colors border border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-green-400" />
                          <span className="text-white text-sm">{filename}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadAsset(assetUrl, index)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-gray-500 text-center py-8">No reference files uploaded</div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Budget and timeline */}
          <div className="space-y-6">
            <div className="bg-gray-900/80 rounded-lg p-6 border border-gray-700">
              <h3 className="text-white font-bold text-xl mb-6">BUDGET & PAYMENTS</h3>
              <div>
                <p className="text-gray-400 mb-2">Fixed Budget</p>
                <p className="text-green-400 text-3xl font-bold">₹{formData.budget || "2,200"}</p>
              </div>
            </div>

            <div className="bg-gray-900/80 rounded-lg p-6 border border-gray-700">
              <h3 className="text-white font-bold text-xl mb-6">TIMELINE & DEADLINE</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-green-400">Start Date :-</span>
                  <span className="text-white">
                    {formData.startDate ? formatDate(formData.startDate) : "Within 2 days"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Expected Duration :-</span>
                  <span className="text-white">{calculateDuration()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Deadline :-</span>
                  <span className="text-white">{formData.endDate ? formatDate(formData.endDate) : "July 27,2025"}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 text-lg bg-green-600 hover:bg-green-700 rounded-full"
            >
              {isSubmitting ? "Creating..." : "Post Gig"}
            </Button>

            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full py-4 text-lg border-2 border-green-600 text-green-400 hover:bg-green-800/20 bg-transparent rounded-full"
            >
              Edit Gig
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { X, Plus, ArrowRight, ArrowLeft, CheckCircle, User, Briefcase } from "lucide-react"
import { toast } from "react-hot-toast"

const STEPS = {
  SOCIAL: "social",
  PROFESSIONAL: "professional",
}

const SKILL_OPTIONS = [
  "JavaScript", "React", "Node.js", "Python", "Java", "PHP", "HTML/CSS", 
  "Vue.js", "Angular", "React Native", "Flutter", "Swift", "Kotlin",
  "UI/UX Design", "Graphic Design", "Digital Marketing", "Content Writing",
  "Data Science", "Machine Learning", "DevOps", "WordPress", "Shopify",
  "Project Management", "Business Analysis", "SEO", "Social Media Marketing"
]

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance", "Education", "E-commerce", 
  "Marketing", "Real Estate", "Manufacturing", "Entertainment", "Food & Beverage",
  "Travel & Tourism", "Fashion", "Sports", "Non-profit", "Government", "Other"
]

const COMPANY_SIZES = [
  "1-10 employees", "11-50 employees", "51-200 employees", 
  "201-500 employees", "501-1000 employees", "1000+ employees"
]

export default function ProfileCompletionForm({ profile, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(STEPS.SOCIAL)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Social fields
    bio: profile.profile?.bio || "",
    location: profile.profile?.location || "",
    website: profile.profile?.website || "",
    skills: profile.profile?.skills || [],

    // Professional fields
    hourlyRate: profile.profile?.hourlyRate || "",
    companyName: profile.profile?.companyName || "",
    companySize: profile.profile?.companySize || "",
    industry: profile.profile?.industry || "",
    description: profile.profile?.description || "",
    portfolio: profile.profile?.portfolio || [],
  })

  const [newSkill, setNewSkill] = useState("")
  const [newPortfolioItem, setNewPortfolioItem] = useState("")

  const steps = [
    {
      key: STEPS.SOCIAL,
      title: "Social Profile",
      description: "Tell us about yourself",
      icon: User,
    },
    {
      key: STEPS.PROFESSIONAL,
      title: "Professional Details",
      description: "Your work information",
      icon: Briefcase,
    },
  ]

  const currentStepIndex = steps.findIndex((step) => step.key === currentStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }))
      setNewSkill("")
    }
  }

  const removeSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }))
  }

  const addPortfolioItem = () => {
    if (newPortfolioItem.trim() && !formData.portfolio.includes(newPortfolioItem.trim())) {
      setFormData((prev) => ({
        ...prev,
        portfolio: [...prev.portfolio, newPortfolioItem.trim()],
      }))
      setNewPortfolioItem("")
    }
  }

  const removePortfolioItem = (itemToRemove) => {
    setFormData((prev) => ({
      ...prev,
      portfolio: prev.portfolio.filter((item) => item !== itemToRemove),
    }))
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case STEPS.SOCIAL:
        return formData.bio.trim().length >= 20 && formData.skills.length >= 3
      case STEPS.PROFESSIONAL:
        if (profile.role === "freelancer") {
          return formData.hourlyRate > 0 && formData.hourlyRate >= 5
        } else {
          return formData.companyName.trim().length > 0 && formData.industry
        }
      default:
        return false
    }
  }

  const nextStep = () => {
    const currentIndex = steps.findIndex((step) => step.key === currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key)
    }
  }

  const prevStep = () => {
    const currentIndex = steps.findIndex((step) => step.key === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/profile/complete", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile._id,
          profile: {
            ...formData,
            isCompleted: true
          },
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Profile completed successfully!")
        onComplete(data.user)
      } else {
        toast.error(data.error || "Failed to update profile")
      }
    } catch (error) {
      console.error("Profile completion error:", error)
      toast.error("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.SOCIAL:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="bio">Bio *</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself... (minimum 20 characters)"
                value={formData.bio}
                onChange={(e) => handleInputChange("bio", e.target.value)}
                className="bg-gray-800 border-gray-600 text-white min-h-[100px] mt-2"
                maxLength={500}
                required
              />
              <div className="text-xs text-gray-400 mt-1">
                {formData.bio.length}/500 characters (minimum 20)
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., New York, NY"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className="bg-gray-800 border-gray-600 text-white mt-2"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yourwebsite.com"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                className="bg-gray-800 border-gray-600 text-white mt-2"
              />
            </div>

            <div>
              <Label>Skills * (Add at least 3)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Enter a skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                  className="bg-gray-800 border-gray-600 text-white"
                  list="skills-datalist"
                />
                <datalist id="skills-datalist">
                  {SKILL_OPTIONS.map(skill => (
                    <option key={skill} value={skill} />
                  ))}
                </datalist>
                <Button type="button" onClick={addSkill} className="bg-green-500 hover:bg-green-600 text-black">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="bg-gray-800 text-gray-300 pr-1">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="ml-2 hover:text-red-400">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {formData.skills.length}/3+ skills required
              </div>
            </div>
          </div>
        )

      case STEPS.PROFESSIONAL:
        return (
          <div className="space-y-6">
            {profile.role === "freelancer" ? (
              <>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate (USD) *</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    placeholder="50"
                    value={formData.hourlyRate}
                    onChange={(e) => handleInputChange("hourlyRate", e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white mt-2"
                    min="5"
                    required
                  />
                  <div className="text-xs text-gray-400 mt-1">Minimum $5/hour</div>
                </div>

                <div>
                  <Label>Portfolio Links (Optional)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="https://example.com/project"
                      value={newPortfolioItem}
                      onChange={(e) => setNewPortfolioItem(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addPortfolioItem())}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <Button
                      type="button"
                      onClick={addPortfolioItem}
                      className="bg-green-500 hover:bg-green-600 text-black"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {formData.portfolio.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {formData.portfolio.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded-md">
                          <span className="text-sm text-gray-300 truncate">{item}</span>
                          <button onClick={() => removePortfolioItem(item)} className="text-red-400 hover:text-red-300">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Your Company Name"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white mt-2"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select
                    value={formData.companySize}
                    onValueChange={(value) => handleInputChange("companySize", value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-2">
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {COMPANY_SIZES.map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="industry">Industry *</Label>
                  <Select 
                    value={formData.industry} 
                    onValueChange={(value) => handleInputChange("industry", value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-2">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {INDUSTRIES.map(industry => (
                        <SelectItem key={industry} value={industry.toLowerCase()}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Company Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your company..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white min-h-[100px] mt-2"
                  />
                </div>
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-white">Complete Your Profile</CardTitle>
              <p className="text-gray-400 text-sm mt-1">{steps[currentStepIndex].description}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-6">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isCompleted
                        ? "bg-green-500 border-green-500"
                        : isActive
                          ? "border-green-500 text-green-500"
                          : "border-gray-600 text-gray-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-5 w-5 text-black" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <div className="ml-3">
                    <div className={`text-sm font-medium ${isActive ? "text-white" : "text-gray-400"}`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${isCompleted ? "bg-green-500" : "bg-gray-600"}`} />
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Step {currentStepIndex + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">{steps[currentStepIndex].title}</h3>
            {renderStepContent()}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="border-gray-600 text-white hover:bg-gray-800 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStepIndex === steps.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={loading || !canProceedToNext()}
                className="bg-green-500 hover:bg-green-600 text-black"
              >
                {loading ? (
                  "Completing..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Profile
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceedToNext()}
                className="bg-green-500 hover:bg-green-600 text-black"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

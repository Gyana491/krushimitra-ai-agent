"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Edit3, Save, Camera, Leaf, MapPin, Database, Download, RefreshCw, Trash2 } from "lucide-react"

interface UserProfileData {
  name: string
  email: string
  phone: string
  location: string
  language: string
  farmType: string
  experience: string
  mainCrops: string
  farmSize: string
  goals: string
  avatar?: string
  joinDate: string
  totalChats: number
  diseasesIdentified: number
  achievements: string[]
}

interface UserProfileProps {
  userData: UserProfileData
  onUpdate: (data: Partial<UserProfileData>) => void
  onClose?: () => void
}

export function UserProfile({ userData, onUpdate, onClose }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<UserProfileData>(userData)
  const [isFarmEditing, setIsFarmEditing] = useState(false)
  const [farmEditData, setFarmEditData] = useState({
    farmType: userData.farmType,
    farmSize: userData.farmSize,
    experience: userData.experience,
    location: userData.location,
    mainCrops: userData.mainCrops,
    goals: userData.goals
  })

  const updateEditData = (field: keyof UserProfileData, value: string | string[]) => {
    setEditData((prev) => ({ ...prev, [field]: value }))
  }

  const updateFarmEditData = (field: keyof typeof farmEditData, value: string) => {
    setFarmEditData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    onUpdate(editData)
    setIsEditing(false)
  }

  const handleFarmSave = () => {
    onUpdate(farmEditData)
    setIsFarmEditing(false)
  }

  const handleCancel = () => {
    setEditData(userData)
    setIsEditing(false)
  }

  const handleFarmCancel = () => {
    setFarmEditData({
      farmType: userData.farmType,
      farmSize: userData.farmSize,
      experience: userData.experience,
      location: userData.location,
      mainCrops: userData.mainCrops,
      goals: userData.goals
    })
    setIsFarmEditing(false)
  }

  const getExperienceBadgeColor = (experience: string) => {
    switch (experience.toLowerCase()) {
      case "beginner":
        return "bg-green-100 text-green-800"
      case "intermediate":
        return "bg-blue-100 text-blue-800"
      case "experienced":
        return "bg-purple-100 text-purple-800"
      case "expert":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getFarmSizeBadgeColor = (size: string) => {
    switch (size.toLowerCase()) {
      case "small":
        return "bg-emerald-100 text-emerald-800"
      case "medium":
        return "bg-teal-100 text-teal-800"
      case "large":
        return "bg-cyan-100 text-cyan-800"
      case "commercial":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 md:w-32 md:h-32">
                <AvatarImage src={editData.avatar || "/placeholder.svg"} alt={editData.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {editData.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-transparent"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editData.name}
                        onChange={(e) => updateEditData("name", e.target.value)}
                        className="text-xl font-bold"
                        placeholder="Full Name"
                      />
                      <Input
                        value={editData.email}
                        onChange={(e) => updateEditData("email", e.target.value)}
                        placeholder="Email"
                        type="email"
                      />
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold">{userData.name}</h1>
                      <p className="text-muted-foreground">{userData.email}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge className={getExperienceBadgeColor(userData.experience)}>{userData.experience}</Badge>
                <Badge className={getFarmSizeBadgeColor(userData.farmSize)}>{userData.farmSize} Farm</Badge>
                <Badge variant="outline">
                  <MapPin className="w-3 h-3 mr-1" />
                  {userData.location}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Farm Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-primary" />
                  Farm Information
                </div>
                {!isFarmEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsFarmEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Farm Info
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleFarmCancel}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleFarmSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isFarmEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Farm Type</Label>
                    <Select value={farmEditData.farmType} onValueChange={(value) => updateFarmEditData("farmType", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="crop">Crop Farming</SelectItem>
                        <SelectItem value="livestock">Livestock</SelectItem>
                        <SelectItem value="mixed">Mixed Farming</SelectItem>
                        <SelectItem value="organic">Organic Farming</SelectItem>
                        <SelectItem value="greenhouse">Greenhouse</SelectItem>
                        <SelectItem value="hydroponic">Hydroponic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Farm Size</Label>
                    <Select value={farmEditData.farmSize} onValueChange={(value) => updateFarmEditData("farmSize", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small (&lt; 5 acres)</SelectItem>
                        <SelectItem value="medium">Medium (5-50 acres)</SelectItem>
                        <SelectItem value="large">Large (50-500 acres)</SelectItem>
                        <SelectItem value="commercial">Commercial (&gt; 500 acres)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Experience Level</Label>
                    <Select value={farmEditData.experience} onValueChange={(value) => updateFarmEditData("experience", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner (&lt; 2 years)</SelectItem>
                        <SelectItem value="intermediate">Intermediate (2-10 years)</SelectItem>
                        <SelectItem value="experienced">Experienced (10+ years)</SelectItem>
                        <SelectItem value="expert">Expert/Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={farmEditData.location}
                      onChange={(e) => updateFarmEditData("location", e.target.value)}
                      placeholder="City, State, Country"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Main Crops</Label>
                    <Input
                      value={farmEditData.mainCrops}
                      onChange={(e) => updateFarmEditData("mainCrops", e.target.value)}
                      placeholder="e.g., Tomatoes, Corn, Wheat, Rice"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Farming Goals</Label>
                    <Textarea
                      value={farmEditData.goals}
                      onChange={(e) => updateFarmEditData("goals", e.target.value)}
                      placeholder="What are your main farming goals?"
                      rows={3}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Farm Type</Label>
                    <p className="mt-1">{userData.farmType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Farm Size</Label>
                    <p className="mt-1">{userData.farmSize}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Experience</Label>
                    <p className="mt-1">{userData.experience}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                    <p className="mt-1">{userData.location}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">Main Crops</Label>
                    <p className="mt-1">{userData.mainCrops}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">Goals</Label>
                    <p className="mt-1 text-sm leading-relaxed">{userData.goals}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats & Achievements */}
        

        {/* Data Management Section */}
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Data Management
            </CardTitle>
            <CardDescription>Manage your app data and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button variant="outline" onClick={() => {
                // Export data functionality
                const allData = {
                  userData,
                  chatHistory: JSON.parse(localStorage.getItem("cropwise-chat-threads") || "[]"),
                  settings: JSON.parse(localStorage.getItem("cropwise-settings") || "{}")
                }
                const dataStr = JSON.stringify(allData, null, 2)
                const dataBlob = new Blob([dataStr], { type: "application/json" })
                const url = URL.createObjectURL(dataBlob)
                const link = document.createElement("a")
                link.href = url
                link.download = `cropwise-data-${new Date().toISOString().split('T')[0]}.json`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
              }} className="w-full bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" onClick={() => {
                // Reset settings functionality
                localStorage.removeItem("cropwise-settings")
                window.location.reload()
              }} className="w-full bg-transparent">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset Settings
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-sm font-medium">Clear All Data</span>
                <Badge variant="destructive">Danger Zone</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                This will permanently delete all your chat history, preferences, and profile data.
              </p>
              <Button variant="destructive" onClick={() => {
                // Clear all data functionality
                if (window.confirm("Are you sure? This action cannot be undone.")) {
                  localStorage.clear()
                  window.location.reload()
                }
              }} className="w-full max-w-xs">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

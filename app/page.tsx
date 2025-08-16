"use client"

import { useState, useEffect } from "react"
import { ChatInput } from "@/components/chat-input"
import { ChatMessages } from "@/components/chat-messages"
import { MobileHeader } from "@/components/mobile-header"
import { WeatherSection } from "@/components/weather-section"
import { MarketPriceSection } from "@/components/market-price-section"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { UserProfile } from "@/components/user-profile"
import { SettingsPanel } from "@/components/settings-panel"
import { LocationLanguageSetup } from "@/components/location-language-setup"
import { useTranslation } from "@/hooks/use-translation"

interface UserData {
  name: string
  location: string
  language: string
  farmType: string
  experience: string
  mainCrops: string
  farmSize: string
  goals: string
  email?: string
  phone?: string
  avatar?: string
  joinDate?: string
  totalChats?: number
  diseasesIdentified?: number
  achievements?: string[]
}

interface SettingsData {
  notifications: {
    weatherAlerts: boolean
    diseaseOutbreaks: boolean
    marketPrices: boolean
    generalUpdates: boolean
  }
  appearance: {
    theme: "light" | "dark" | "system"
    language: string
    fontSize: "small" | "medium" | "large"
  }
  privacy: {
    dataCollection: boolean
    locationTracking: boolean
    analyticsOptIn: boolean
  }
  audio: {
    soundEnabled: boolean
    voiceResponses: boolean
    volume: number
  }
}

export default function Home() {
  const { t } = useTranslation()
  const [currentView, setCurrentView] = useState<"home" | "chat" | "profile" | "settings" | "location">("home")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isOnboarding, setIsOnboarding] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<
    Array<{
      id: string
      content: string
      sender: "user" | "bot"
      timestamp: Date
      type: "text" | "image" | "voice"
      imageUrl?: string
      audioUrl?: string
    }>
  >([])
  const [settings, setSettings] = useState<SettingsData>({
    notifications: {
      weatherAlerts: true,
      diseaseOutbreaks: true,
      marketPrices: false,
      generalUpdates: true,
    },
    appearance: {
      theme: "system",
      language: "English",
      fontSize: "medium",
    },
    privacy: {
      dataCollection: true,
      locationTracking: true,
      analyticsOptIn: false,
    },
    audio: {
      soundEnabled: true,
      voiceResponses: false,
      volume: 50,
    },
  })

  useEffect(() => {
    const savedUserData = localStorage.getItem("cropwise-user-data")
    const savedSettings = localStorage.getItem("cropwise-settings")

    if (savedUserData) {
      const parsedUserData = JSON.parse(savedUserData)
      const enhancedUserData = {
        ...parsedUserData,
        email: parsedUserData.email || `${parsedUserData.name.toLowerCase().replace(" ", ".")}@example.com`,
        phone: parsedUserData.phone || "",
        joinDate: parsedUserData.joinDate || "January 2024",
        totalChats: parsedUserData.totalChats || Math.floor(Math.random() * 50) + 10,
        diseasesIdentified: parsedUserData.diseasesIdentified || Math.floor(Math.random() * 20) + 5,
        achievements: parsedUserData.achievements || [
          "First Disease Identified",
          "Weather Alert Subscriber",
          "Active Farmer",
        ],
      }
      setUserData(enhancedUserData)
      setIsOnboarding(false)
    }

    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleOnboardingComplete = (data: UserData) => {
    const enhancedData = {
      ...data,
      email: `${data.name.toLowerCase().replace(" ", ".")}@example.com`,
      phone: "",
      joinDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      totalChats: 0,
      diseasesIdentified: 0,
      achievements: ["Welcome to CropWise!"],
    }
    setUserData(enhancedData)
    localStorage.setItem("cropwise-user-data", JSON.stringify(enhancedData))
    setIsOnboarding(false)
  }

  const handleUserUpdate = (updatedData: Partial<UserData>) => {
    if (userData) {
      const newUserData = { ...userData, ...updatedData }
      setUserData(newUserData)
      localStorage.setItem("cropwise-user-data", JSON.stringify(newUserData))
    }
  }

  const handleSettingsUpdate = (newSettings: SettingsData) => {
    setSettings(newSettings)
    localStorage.setItem("cropwise-settings", JSON.stringify(newSettings))
  }

  const handleExportData = () => {
    const dataToExport = {
      userData,
      settings,
      exportDate: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cropwise-data-export.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all data? This action cannot be undone.")) {
      localStorage.removeItem("cropwise-user-data")
      localStorage.removeItem("cropwise-settings")
      setUserData(null)
      setIsOnboarding(true)
      setCurrentView("home")
      setMessages([])
    }
  }

  const handleResetSettings = () => {
    if (confirm("Reset all settings to default values?")) {
      const defaultSettings: SettingsData = {
        notifications: {
          weatherAlerts: true,
          diseaseOutbreaks: true,
          marketPrices: false,
          generalUpdates: true,
        },
        appearance: {
          theme: "system",
          language: "English",
          fontSize: "medium",
        },
        privacy: {
          dataCollection: true,
          locationTracking: true,
          analyticsOptIn: false,
        },
        audio: {
          soundEnabled: true,
          voiceResponses: false,
          volume: 50,
        },
      }
      setSettings(defaultSettings)
      localStorage.setItem("cropwise-settings", JSON.stringify(defaultSettings))
    }
  }

  const handleLocationLanguageSave = (data: { location: string; language: string }) => {
    if (userData) {
      const updatedUserData = {
        ...userData,
        location: data.location,
        language: data.language,
      }
      setUserData(updatedUserData)
      localStorage.setItem("cropwise-user-data", JSON.stringify(updatedUserData))
    }
    setCurrentView("home")
  }

  const handleSendMessage = (message: string) => {
    console.log("[v0] Sending message:", message)
    if (currentView === "home") {
      setCurrentView("chat")
    }

    const userMessage = {
      id: Date.now().toString(),
      content: message,
      sender: "user" as const,
      timestamp: new Date(),
      type: "text" as const,
    }

    setMessages((prev) => {
      console.log("[v0] Adding user message to state")
      return [...prev, userMessage]
    })

    setIsLoading(true)

    setTimeout(() => {
      const botResponse = generateBotResponse(message, userData)
      const botMessage = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: "bot" as const,
        timestamp: new Date(),
        type: "text" as const,
      }
      console.log("[v0] Adding bot response to state:", botResponse)
      setMessages((prev) => [...prev, botMessage])
      setIsLoading(false)
    }, 1000)
  }

  const handleImageUpload = (file: File) => {
    if (currentView === "home") {
      setCurrentView("chat")
    }

    const imageUrl = URL.createObjectURL(file)
    const userMessage = {
      id: Date.now().toString(),
      content: "I've uploaded an image for analysis",
      sender: "user" as const,
      timestamp: new Date(),
      type: "image" as const,
      imageUrl,
    }

    setMessages((prev) => [...prev, userMessage])

    setIsLoading(true)

    setTimeout(() => {
      const botResponse = t("imageAnalysisResponse")
      const botMessage = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: "bot" as const,
        timestamp: new Date(),
        type: "text" as const,
      }
      setMessages((prev) => [...prev, botMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleVoiceMessage = (audioBlob: Blob) => {
    if (currentView === "home") {
      setCurrentView("chat")
    }

    const audioUrl = URL.createObjectURL(audioBlob)
    const userMessage = {
      id: Date.now().toString(),
      content: "Voice message",
      sender: "user" as const,
      timestamp: new Date(),
      type: "voice" as const,
      audioUrl,
    }

    setMessages((prev) => [...prev, userMessage])

    setIsLoading(true)

    setTimeout(() => {
      const botResponse = t("voiceMessageResponse")
      const botMessage = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: "bot" as const,
        timestamp: new Date(),
        type: "text" as const,
      }
      setMessages((prev) => [...prev, botMessage])
      setIsLoading(false)
    }, 1500)
  }

  const generateBotResponse = (message: string, userData: UserData | null) => {
    const responses = [
      `Great question about ${message.toLowerCase()}! Based on your location in ${userData?.location || "your area"}, I recommend...`,
      `For ${userData?.mainCrops || "your crops"}, regarding ${message.toLowerCase()}, here's what I suggest...`,
      `That's a common concern with ${userData?.mainCrops || "farming"}. Let me help you with ${message.toLowerCase()}...`,
      `Based on your ${userData?.experience || "farming"} experience, for ${message.toLowerCase()}, I'd recommend...`,
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const getSuggestedQueries = () => {
    if (!userData) {
      return [t("identifyCropDisease"), t("weatherAdvice"), t("pestControlTips"), t("fertilizerGuidance")]
    }

    const location = userData.location || ""

    return [
      `${userData.mainCrops} ${t("identifyCropDisease").toLowerCase()}`,
      `${t("weatherAdvice")} ${location}`,
      `${t("fertilizerGuidance")} ${userData.mainCrops}`,
      t("organicPestControl"),
      t("harvestTimingAdvice"),
      t("soilHealthTips"),
    ]
  }

  const handleResetChat = () => {
    console.log("[v0] Resetting chat messages")
    setMessages([])
    setIsLoading(false)
    if (currentView === "home") {
      setCurrentView("chat")
    }
    // If already on chat page, just reset messages and stay on chat page
  }

  if (isOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-4xl mx-auto">
      <MobileHeader
        onMenuClick={() => setCurrentView("settings")}
        onLocationClick={() => setCurrentView("location")}
        location={userData?.location || "Select Location"}
        onNewChatClick={handleResetChat}
        showBackButton={currentView !== "home"}
        onBackClick={() => setCurrentView("home")}
      />

      <main className="flex-1 flex flex-col pb-20">
        {currentView === "home" && (
          <>
            <div className="flex-1 overflow-y-auto">
              <WeatherSection location={userData?.location || "Unknown Location"} />
              <MarketPriceSection />
            </div>

            <ChatInput
              onSendMessage={handleSendMessage}
              onImageUpload={handleImageUpload}
              onVoiceMessage={handleVoiceMessage}
              suggestedQueries={getSuggestedQueries()}
              onSuggestedQueryClick={handleSendMessage}
              userData={userData || undefined}
            />
          </>
        )}

        {currentView === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto">
              <ChatMessages messages={messages} isLoading={isLoading} />
            </div>

            <ChatInput
              onSendMessage={handleSendMessage}
              onImageUpload={handleImageUpload}
              onVoiceMessage={handleVoiceMessage}
              suggestedQueries={getSuggestedQueries()}
              onSuggestedQueryClick={handleSendMessage}
              userData={userData || undefined}
            />
          </>
        )}

        {currentView === "profile" && userData && (
          <div className="flex-1 overflow-y-auto">
            <UserProfile 
              userData={{
                ...userData,
                email: userData.email || `${userData.name.toLowerCase().replace(" ", ".")}@example.com`,
                phone: userData.phone || "",
                joinDate: userData.joinDate || "January 2024",
                totalChats: userData.totalChats || Math.floor(Math.random() * 50) + 10,
                diseasesIdentified: userData.diseasesIdentified || Math.floor(Math.random() * 20) + 5,
                achievements: userData.achievements || ["First Crop", "Weather Master", "Disease Detective"]
              }} 
              onUpdate={handleUserUpdate} 
              onClose={() => setCurrentView("home")} 
            />
          </div>
        )}

        {currentView === "location" && (
          <div className="flex-1 overflow-y-auto p-4">
            <LocationLanguageSetup
              initialData={userData ? { 
                location: userData.location, 
                language: userData.language,
                timezone: "UTC",
                weatherUnit: "metric",
                currency: "USD"
              } : undefined}
              onSave={handleLocationLanguageSave}
              onCancel={() => setCurrentView("home")}
            />
          </div>
        )}
      </main>

      {currentView === "settings" && (
        <SettingsPanel
          settings={settings}
          onUpdate={handleSettingsUpdate}
          onClose={() => setCurrentView("home")}
          onExportData={handleExportData}
          onClearData={handleClearData}
          onResetSettings={handleResetSettings}
        />
      )}
    </div>
  )
}

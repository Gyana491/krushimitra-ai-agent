"use client"

import { useState, useEffect } from "react"
import { EnhancedChatMessages } from "@/components/enhanced-chat-messages"
import { EnhancedChatInput } from "@/components/enhanced-chat-input"
import { MobileHeader } from "@/components/mobile-header"
import { WeatherSection } from "@/components/weather-section"
// Market price section will be used in future features
// import { MarketPriceSection } from "@/components/market-price-section"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { UserProfile } from "@/components/user-profile"
import { LocationLanguageSetup } from "@/components/location-language-setup"
import { ConversationSidebar } from "@/components/conversation-sidebar"
import { SuggestedQueries } from "@/components/suggested-queries"
import { useTranslation } from "@/hooks/use-translation"
import { useChat } from "@/hooks/use-chat"
import { useSuggestedQueries } from "@/hooks/use-suggested-queries"
import { chatDB } from "@/lib/chat-db"

interface UserData {
  name: string
  language: string
  farmType: string
  experience: string
  mainCrops: string[]
  farmSize: string
  email?: string
  phone?: string
  avatar?: string
  joinDate?: string
  totalChats?: number
  diseasesIdentified?: number
  achievements?: string[]
}

export default function Home() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  // Translation hook retained for future localization usage (t currently unused)
  useTranslation(userData?.language)
  const [currentView, setCurrentView] = useState<"home" | "chat" | "profile" | "location">("home")
  const [isOnboarding, setIsOnboarding] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [initialSuggestedQueries, setInitialSuggestedQueries] = useState<string[]>([])
  
  // Use our custom chat hook
  const {
    // Input state
    input,
    setInput,
    
    // Messages state
    messages,
    status,
    streamingState,
    
    // Thread management
    currentThreadId,
    chatThreads,
    createNewThread,
    switchToThread,
    deleteThread,
    clearCurrentThread,
    
    // Image handling
    selectedImages,
    triggerImageUpload,
    formatFileSize,
    removeImage,
    clearImages,
    
    // Chat actions
    sendMessage,
    handleSubmit
  } = useChat();

  // Initialize suggested queries hook
  const {
    suggestedQueries,
    isLoading: isLoadingSuggestions,
    error: suggestionsError,
    // generateSuggestedQueries, // Unused but kept for future features
    refreshSuggestedQueries,
    // shouldRegenerateQueries, // Unused but kept for future features
  } = useSuggestedQueries(currentThreadId);

  // Track previous status to detect when streaming completes
  const [prevStatus, setPrevStatus] = useState<typeof status>('idle');

  // Simple suggested queries generation - only after conversation completes
  useEffect(() => {
    // Only generate when conversation completes
    const hasJustCompleted = prevStatus === 'streaming' && status === 'idle';
    
    if (hasJustCompleted && messages.length >= 2 && currentThreadId) {
      // Simple delay to ensure everything is settled
      setTimeout(() => {
        refreshSuggestedQueries(messages, currentThreadId);
      }, 500);
    }
    
    // Always update previous status
    setPrevStatus(status);
  }, [status, prevStatus, messages, currentThreadId, refreshSuggestedQueries]);

  // Simple wrapper that handles view changes
  const wrappedSendMessage = (message: string) => {
    // If sending from home page, always create a new thread regardless of current state
    if (currentView === 'home') {
      setCurrentView('chat')
      // Always create a new thread when sending from home page
      createNewThread()
    } else if (!currentThreadId) {
      // If not on home but no thread exists, create one
      createNewThread()
    }
    
    // Send the message
    sendMessage(message)
  }

  // Wrap handleSubmit to handle view changes
  const wrappedHandleSubmit = (e: React.FormEvent) => {
    // If submitting from home page, always create a new thread
    if (currentView === "home") {
      setCurrentView("chat")
      // Always create a new thread when submitting from home page
      createNewThread()
    }
    handleSubmit(e)
  }

  useEffect(() => {
    const savedUserData = localStorage.getItem("cropwise-user-data")

    if (savedUserData) {
      const parsedUserData = JSON.parse(savedUserData)
      // Migrate legacy mainCrops string -> array
      if (parsedUserData.mainCrops && !Array.isArray(parsedUserData.mainCrops)) {
        parsedUserData.mainCrops = String(parsedUserData.mainCrops).split(/[;,]/).map((c: string) => c.trim()).filter(Boolean);
      }
      const enhancedUserData: UserData = {
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
  }, [])

  const handleOnboardingComplete = async (data: UserData) => {
    const enhancedData: UserData = {
      ...data,
      email: `${data.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      phone: "",
      joinDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      totalChats: 0,
      diseasesIdentified: 0,
      achievements: ["Welcome to CropWise!"],
    mainCrops: Array.isArray(data.mainCrops)
    ? data.mainCrops
    : (typeof (data as { mainCrops?: unknown }).mainCrops === 'string'
      ? String((data as { mainCrops?: unknown }).mainCrops)
        .split(/[;,]/)
        .map((c) => c.trim())
        .filter(Boolean)
      : []),
    }
    setUserData(enhancedData)
    localStorage.setItem("cropwise-user-data", JSON.stringify(enhancedData))

    // Try to read selected location for richer context
    let locSummary = ''
    try {
      const rawLoc = localStorage.getItem('cropwise-selected-location')
      if (rawLoc) {
        const loc = JSON.parse(rawLoc)
        if (loc?.cityName && loc?.stateName) locSummary = `${loc.cityName}, ${loc.stateName}`
        else if (loc?.address) locSummary = loc.address
      }
    } catch {}

    // Generate initial suggested queries based on user context (store directly in IndexedDB)
    const buildFallback = (): string[] => {
      const primaryCrop = enhancedData.mainCrops[0] || 'crop'
      const experience = enhancedData.experience || 'beginner'
      const queries: string[] = [
        `Best current practices for ${primaryCrop} (${experience})?`,
        locSummary ? `Upcoming weather risks for ${locSummary}?` : `How to prepare for upcoming weather?`,
        `Soil or nutrient focus for ${primaryCrop} now?`,
        `Early pest or disease signs to watch in ${primaryCrop}?`
      ]
      return queries.slice(0,4)
    }
    let initialQueries: string[] = buildFallback()
    try {
      const syntheticMessages = [{
        role: 'user',
        content: `User Profile\nName: ${enhancedData.name}\nLocation: ${locSummary || 'Unknown'}\nFarm Type: ${enhancedData.farmType || 'N/A'}\nExperience: ${enhancedData.experience || 'N/A'}\nMain Crops: ${enhancedData.mainCrops.join(', ') || 'None'}\nFarm Size: ${enhancedData.farmSize || 'N/A'}\n\nGenerate 3-4 short follow-up agricultural questions this farmer is likely to ask next. Return ONLY JSON array.`
      }]
      const resp = await fetch('/api/suggested-queries', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages: syntheticMessages }) })
      if (resp.ok) {
        const dataResp = await resp.json()
        if (Array.isArray(dataResp?.suggestedQueries) && dataResp.suggestedQueries.length) {
          initialQueries = dataResp.suggestedQueries.slice(0,4)
        }
      }
    } catch (e) { console.warn('AI onboarding suggestions failed, using fallback', e) }
  // Store locally so UI can show immediately after onboarding
  setInitialSuggestedQueries(initialQueries)
  try { await chatDB.saveSuggestedQueries(initialQueries, 'onboarding') } catch (e) { console.warn('Failed saving onboarding suggestions to DB', e) }
    setIsOnboarding(false)
  }

  const handleUserUpdate = (updatedData: Partial<UserData>) => {
    if (userData) {
      const newUserData = { ...userData, ...updatedData }
      setUserData(newUserData)
      localStorage.setItem("cropwise-user-data", JSON.stringify(newUserData))
    }
  }

  // Derive location from stored selected location
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cropwise-selected-location')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.cityName && parsed?.stateName) {
          setSelectedLocation(`${parsed.cityName}, ${parsed.stateName}`)
        } else if (parsed?.address) {
          setSelectedLocation(parsed.address)
        }
      }
    } catch {}
  }, [currentView])

  const handleLocationLanguageSave = (data: { location: string; language: string }) => {
    localStorage.setItem('cropwise-language', data.language) // code
    // Map code -> full name via translations hook constant (lazy require to avoid circular import)
    let full = data.language
    try {
      // dynamic import not needed; replicate minimal map to avoid heavy import
      const map: Record<string,string> = { en:'English', hi:'हिंदी', bn:'বাংলা', mr:'मराठी', te:'తెలుగు', ta:'தமிழ்', gu:'ગુજરાતી', ur:'اردو', kn:'ಕನ್ನಡ', or:'ଓଡ଼ିଆ' }
      if (map[data.language]) full = map[data.language]
    } catch {}
    if (userData) {
      const updatedUserData = { ...userData, language: full }
      setUserData(updatedUserData)
      localStorage.setItem('cropwise-user-data', JSON.stringify(updatedUserData))
    } else {
      try {
        const raw = localStorage.getItem('cropwise-user-data')
        if (raw) {
          const parsed = JSON.parse(raw)
          parsed.language = full
          localStorage.setItem('cropwise-user-data', JSON.stringify(parsed))
        }
      } catch {}
    }
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: data.language } }))
    setCurrentView('home')
  }

  // Simplified handlers for our new chat system
  const handleSendMessage = (message: string) => {
    wrappedSendMessage(message)
  }

  // Note: These handlers are kept for future feature implementation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleImageUpload = (_file: File) => {
    if (currentView === "home") {
      setCurrentView("chat")
    }
    // For now, just trigger the image upload flow
    triggerImageUpload()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleVoiceMessage = (_audioBlob: Blob) => {
    if (currentView === "home") {
      setCurrentView("chat")
    }
    // For now, convert voice to text message
    sendMessage("Voice message received - analysis in progress")
  }

  const handleResetChat = () => {
    if (currentView === "home") {
      setCurrentView("chat")
    }
    
    // Create a new thread - this will clear the current one
    createNewThread()
    
    // Just to be safe, also clear images
    clearImages()
  }

  const handleBackToHome = () => {
    // Set view to home
    setCurrentView("home")
    
    // Unlink/clear the current thread to start fresh
    clearCurrentThread()
    
    // Clear any selected images
    clearImages()
  }

  // Simple refresh function
  const handleRefreshSuggestions = () => {
    if (messages.length >= 2 && currentThreadId) {
      refreshSuggestedQueries(messages, currentThreadId);
    }
  }

  // Clear suggestions when switching threads or starting new conversation
  useEffect(() => {
    if (currentThreadId && messages.length === 0) {
      // New conversation started, clear any existing suggestions
      console.log('New conversation detected, clearing suggestions');
    }
  }, [currentThreadId, messages.length]);

  // Function to get suggested queries - now using our AI-generated suggestions or fallback
  const getSuggestedQueries = () => {
    if (suggestedQueries && suggestedQueries.length > 0) return suggestedQueries
    if (initialSuggestedQueries.length > 0) return initialSuggestedQueries
    return []
  }

  if (isOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:pl-80">
      <MobileHeader
        onMenuClick={() => setIsSidebarOpen(true)}
        onNewChatClick={handleResetChat}
        showBackButton={currentView !== "home"}
        onBackClick={handleBackToHome}
      />      {/* Conversation Sidebar */}
      <ConversationSidebar
        isOpen={isSidebarOpen}
        threads={chatThreads
          .filter(thread => thread.messages && thread.messages.length > 0) // Only show threads with messages
          .map(thread => ({
            ...thread,
            createdAt: new Date(thread.createdAt),
            updatedAt: new Date(thread.updatedAt)
          }))}
        currentThreadId={currentThreadId}
        onThreadSelect={(threadId) => {
          switchToThread(threadId)
          setCurrentView("chat")
          setIsSidebarOpen(false)
        }}
        onNewChat={() => {
          // Create new thread and clear everything
          createNewThread()
          setCurrentView("chat")
          setIsSidebarOpen(false)
        }}
        onDeleteThread={deleteThread}
        onClose={() => setIsSidebarOpen(false)}
        onProfileClick={() => {
          setCurrentView("profile")
          setIsSidebarOpen(false)
        }}
        userName={userData?.name || "Farmer"}
      />

  <main className="flex-1 flex flex-col pb-20 max-w-4xl mx-auto w-full">
        {currentView === "home" && (
          <>
            <div className="flex-1 overflow-y-auto space-y-4">
              <WeatherSection 
                location={selectedLocation || "Unknown Location"} 
              />
              {/* Suggested queries block on home */}
              <div className="px-4">
                <SuggestedQueries
                  queries={getSuggestedQueries()}
                  isLoading={isLoadingSuggestions && suggestedQueries.length === 0}
                  error={suggestionsError}
                  onQuerySelect={handleSendMessage}
                  onRefresh={() => handleRefreshSuggestions()}
                  isAgentResponding={status === 'streaming' || status === 'submitted'}
                  className="max-w-3xl mx-auto"
                />
              </div>
            </div>

            <EnhancedChatInput
              input={input}
              setInput={setInput}
              selectedImages={selectedImages}
              triggerImageUpload={triggerImageUpload}
              removeImage={removeImage}
              clearImages={clearImages}
              formatFileSize={formatFileSize}
              handleSubmit={wrappedHandleSubmit}
              sendMessage={wrappedSendMessage}
              isLoading={status === 'streaming'}
            />
          </>
        )}

        {currentView === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto">
              <EnhancedChatMessages 
                messages={messages} 
                isLoading={status === 'streaming'} 
                streamingState={streamingState}
                suggestedQueries={status === 'idle' ? suggestedQueries : []}
                onSuggestedQueryClick={handleSendMessage}
              />
            </div>

            <EnhancedChatInput
              input={input}
              setInput={setInput}
              selectedImages={selectedImages}
              triggerImageUpload={triggerImageUpload}
              removeImage={removeImage}
              clearImages={clearImages}
              formatFileSize={formatFileSize}
              handleSubmit={wrappedHandleSubmit}
              sendMessage={sendMessage}
              isLoading={status === 'streaming'}
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
                location: selectedLocation, 
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
  </div>
  )
}

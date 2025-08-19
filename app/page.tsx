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
import { useGlobalSuggestedQueries } from "@/hooks/use-global-suggested-queries"
// chatDB import removed as currently unused

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
  const { /* t */ } = useTranslation(userData?.language) // t currently unused
  const [currentView, setCurrentView] = useState<"home" | "chat" | "profile" | "location">("home")
  const [isOnboarding, setIsOnboarding] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // Initial queries placeholder retained for future extension
  const [initialSuggestedQueries] = useState<string[]>([])
  
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
    generateNow,
    generateOnboardingQueries, // Add the new function
    clearSuggestedQueries,
    // shouldRegenerateQueries, // Unused but kept for future features
  } = useSuggestedQueries(currentThreadId);

  // Global suggested queries for homepage
  const {
    queries: globalQueries,
    isLoading: isLoadingGlobalQueries,
  // refreshGlobalQueries, // currently unused
    regenerateGlobalQueries
  } = useGlobalSuggestedQueries();

  // Track previous status to detect when streaming completes
  const [prevStatus, setPrevStatus] = useState<typeof status>('idle');

  // Simple suggested queries generation - only after conversation completes
  useEffect(() => {
    // Only generate when conversation completes
    const hasJustCompleted = prevStatus === 'streaming' && status === 'idle';
    // Clear any stale suggestions right when new streaming starts
    if (status === 'streaming' && prevStatus !== 'streaming') {
      clearSuggestedQueries(currentThreadId);
    }
    
    if (hasJustCompleted && messages.length >= 2 && currentThreadId) {
      generateNow(messages, currentThreadId);
    }
    
    // Always update previous status
    setPrevStatus(status);
  }, [status, prevStatus, messages, currentThreadId, generateNow, clearSuggestedQueries]);

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
      achievements: ["Welcome to KrushiMitra!"],
      mainCrops: Array.isArray(data.mainCrops)
        ? data.mainCrops as string[]
    : (typeof (data as unknown as { mainCrops?: unknown }).mainCrops === 'string'
      ? String((data as unknown as { mainCrops?: string }).mainCrops).split(/[;,]/).map((c: string) => c.trim()).filter(Boolean)
            : []),
    }
    setUserData(enhancedData)
    localStorage.setItem("cropwise-user-data", JSON.stringify(enhancedData))

    // Generate initial suggested queries based on user profile and location
    try {
      console.log('Generating onboarding suggested queries...');
      await generateOnboardingQueries();
    } catch (e) {
      console.warn('Failed to generate onboarding suggestions:', e);
    }

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

    regenerateGlobalQueries();
    
    // Clear any selected images
    clearImages()
  }

  // Handle language change in sidebar to regenerate suggestions
  const handleLanguageChangeInSidebar = () => {
    // Add a small delay to ensure language change is processed
    setTimeout(() => {
      // Generate new suggestions based on the current context with new language
      if (currentView === "home") {
        // For homepage, regenerate global suggestions with new language
        console.log('Language changed, regenerating global suggestions for homepage');
        regenerateGlobalQueries();
      } else if (messages.length >= 2 && currentThreadId) {
        // For chat view, regenerate suggestions for current thread
        console.log('Language changed, regenerating suggestions for current chat thread');
        generateNow(messages, currentThreadId);
      } else {
        // Fallback: just regenerate global queries
        console.log('Language changed, regenerating global suggestions as fallback');
        regenerateGlobalQueries();
      }
    }, 100); // Small delay to ensure language context is updated
  }

  // Simple refresh function
  const handleRefreshSuggestions = () => {
    if (currentView === "home") {
      // For homepage, regenerate global queries (force new generation)
      console.log('Refreshing homepage suggestions');
      regenerateGlobalQueries();
    } else if (messages.length >= 2 && currentThreadId) {
      // For chat view, refresh current thread suggestions
      console.log('Refreshing chat thread suggestions');
      refreshSuggestedQueries(messages, currentThreadId);
    } else {
      // Fallback: regenerate global queries
      console.log('Refreshing suggestions with global queries fallback');
      regenerateGlobalQueries();
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
    // For chat threads, prioritize thread-specific suggestions
    if (currentView === "chat" && suggestedQueries && suggestedQueries.length > 0) {
      return suggestedQueries;
    }
    
    // For homepage, prioritize global suggestions (always updated)
    if (currentView === "home" && globalQueries && globalQueries.length > 0) {
      return globalQueries;
    }
    
    // Fallback to thread suggestions or initial suggestions
    if (suggestedQueries && suggestedQueries.length > 0) return suggestedQueries;
    if (initialSuggestedQueries.length > 0) return initialSuggestedQueries;
    if (globalQueries && globalQueries.length > 0) return globalQueries;
    
    return [];
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
        onLanguageChange={handleLanguageChangeInSidebar}
      />

  <main className="flex-1 flex flex-col pb-20 max-w-4xl mx-auto w-full">
        {currentView === "home" && (
          <>
            <div className="flex-1 overflow-y-auto space-y-4">
              <WeatherSection 
                location={selectedLocation || "Unknown Location"}
                onGetAdvice={({ date }) => {
                  // Ensure we move to chat view and new thread similar to homepage send
                  setCurrentView('chat')
                  createNewThread()
                  const friendly = new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
                  wrappedSendMessage(`Give me weather advice for: ${friendly}`)
                }}
              />
              {/* Suggested queries block on home */}
              <div className="px-4">
                <SuggestedQueries
                  queries={getSuggestedQueries()}
                  isLoading={isLoadingGlobalQueries || (isLoadingSuggestions && suggestedQueries.length === 0)}
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
                  // Only show freshly generated suggestions (no fallback) after agent finished
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

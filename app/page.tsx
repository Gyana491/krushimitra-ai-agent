"use client"

import { useState, useEffect, useRef } from "react"
import { EnhancedChatMessages } from "@/components/enhanced-chat-messages"
import { EnhancedChatInput } from "@/components/enhanced-chat-input"
import { MobileHeader } from "@/components/mobile-header"
import { WeatherSection } from "@/components/weather-section"
import { MarketPriceSection } from "@/components/market-price-section"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { UserProfile } from "@/components/user-profile"
import { LocationLanguageSetup } from "@/components/location-language-setup"
import { ConversationSidebar } from "@/components/conversation-sidebar"
import { SuggestedQueries } from "@/components/suggested-queries"
import { useTranslation } from "@/hooks/use-translation"
import { useChat } from "@/hooks/use-chat"
import { useSuggestedQueries } from "@/hooks/use-suggested-queries"

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

export default function Home() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const { t } = useTranslation(userData?.language)
  const [currentView, setCurrentView] = useState<"home" | "chat" | "profile" | "location">("home")
  const [isOnboarding, setIsOnboarding] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
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
    generateSuggestedQueries,
  forceGenerateSuggestedQueries,
    refreshSuggestedQueries,
    shouldRegenerateQueries,
    lastUpdated
  } = useSuggestedQueries(currentThreadId);

  // Track previous status to detect when streaming completes
  const [prevStatus, setPrevStatus] = useState<typeof status>('idle');
  const lastAssistantMessageId = useRef<string | null>(null);

  // Generate suggested queries only after agent response is complete
  useEffect(() => {
    const hasJustCompleted = prevStatus === 'streaming' && status === 'idle';
    if (hasJustCompleted && messages.length >= 2 && currentThreadId) {
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistant && lastAssistant.id !== lastAssistantMessageId.current) {
        const timeoutId = setTimeout(() => {
          lastAssistantMessageId.current = lastAssistant.id || Math.random().toString(36).slice(2);
          // Force generation each assistant turn with context change logic inside the hook
          forceGenerateSuggestedQueries(messages, currentThreadId);
        }, 600);
        return () => clearTimeout(timeoutId);
      }
    }
    setPrevStatus(status);
  }, [status, messages, currentThreadId, forceGenerateSuggestedQueries, lastUpdated, prevStatus]);

  // Wrap sendMessage to handle view changes
  const wrappedSendMessage = (message: string) => {
    const startingFromHome = currentView === 'home'
    if (startingFromHome) {
      // Only create a new thread if there is no active thread or it's a pending unsent thread
      const shouldCreate = !currentThreadId || messages.length === 0;
      if (shouldCreate) {
        createNewThread()
      }
      setCurrentView('chat')
    }
    sendMessage(message)
  }

  // Wrap handleSubmit to handle view changes
  const wrappedHandleSubmit = (e: React.FormEvent) => {
    if (currentView === "home") {
      setCurrentView("chat")
    }
    handleSubmit(e)
  }

  useEffect(() => {
    const savedUserData = localStorage.getItem("cropwise-user-data")

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
      const updatedUserData = { ...userData, location: data.location, language: full }
      setUserData(updatedUserData)
      localStorage.setItem('cropwise-user-data', JSON.stringify(updatedUserData))
    } else {
      try {
        const raw = localStorage.getItem('cropwise-user-data')
        if (raw) {
          const parsed = JSON.parse(raw)
          parsed.language = full
          parsed.location = data.location
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
    createNewThread()
  }

  // Handler to refresh suggested queries
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
    // Prefer AI suggestions
    if (suggestedQueries && suggestedQueries.length > 0) return suggestedQueries;

    // Try localStorage (persisted per thread)
    try {
      const raw = localStorage.getItem('suggested-queries');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.queries?.length) return parsed.queries;
      }
    } catch {}

    // Personalized static fallback
    const crop = userData?.mainCrops || t('identifyCropDisease');
    const loc = userData?.location || '';
    const lang = userData?.language || 'en';

    const base: string[] = [
      `${crop} disease identification`,
      loc ? `Weather advice for ${loc}` : t('weatherAdvice'),
      `Fertilizer guidance for ${crop}`,
      'Organic pest control',
      'Soil health tips',
    ];

    // Light language tailoring (example: Hindi / Oriya replace some English words)
    if (lang === 'hi') {
      return [
        `${crop} की बीमारी पहचान`,
        loc ? `${loc} के मौसम की सलाह` : 'मौसम सलाह',
        `${crop} के लिए खाद मार्गदर्शन`,
        'जैविक कीट नियंत्रण',
        'मिट्टी की सेहत सुझाव'
      ];
    }
    if (lang === 'or') {
      return [
        `${crop} ରୋଗ ପରିଚୟ`,
        loc ? `${loc} ପାଗ ପରାମର୍ଶ` : 'ପାଗ ପରାମର୍ଶ',
        `${crop} ର ଖାଦ୍ୟ ସଳାହ`,
        'ଜୈ୵ କୀଟ ନିୟନ୍ତ୍ରଣ',
        'ମାଟି ସ୍ୱାସ୍ଥ୍ୟ ସୁପରିଶ'
      ];
    }

    return base.slice(0,5);
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
        onBackClick={() => setCurrentView("home")}
      />      {/* Conversation Sidebar */}
      <ConversationSidebar
        isOpen={isSidebarOpen}
        threads={chatThreads.map(thread => ({
          ...thread,
          createdAt: new Date(thread.createdAt),
          updatedAt: new Date(thread.updatedAt)
        }))}
        currentThreadId={currentThreadId}
        onThreadSelect={(threadId) => {
          // First ensure we're not in pending new thread state
          switchToThread(threadId)
          // Then update the view
          setCurrentView("chat")
          setIsSidebarOpen(false)
        }}
        onNewChat={() => {
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
                location={userData?.location || "Unknown Location"} 
                onLocationClick={() => setCurrentView("location")}
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
              suggestedQueries={getSuggestedQueries()}
              onSuggestedQueryClick={handleSendMessage}
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
              suggestedQueries={getSuggestedQueries()}
              onSuggestedQueryClick={handleSendMessage}
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
  </div>
  )
}

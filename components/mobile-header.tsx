"use client"

import { Menu, Plus, ArrowLeft, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import ChangeLocationPopup from "./change-location-popup"

interface MobileHeaderProps {
  onMenuClick?: () => void
  onNewChatClick?: () => void
  onBackClick?: () => void
  showBackButton?: boolean
}

export function MobileHeader({
  onMenuClick,
  onNewChatClick,
  onBackClick,
  showBackButton = false,
}: MobileHeaderProps) {
  const { t } = useTranslation()
  const [showLocationPopup, setShowLocationPopup] = useState(false)
  const [currentLocation, setCurrentLocation] = useState("")
  const [cityName, setCityName] = useState("")
  const [stateName, setStateName] = useState("")
  
  const handleLocationSave = (location: string) => {
    setCurrentLocation(location)
    console.log("Location updated (mobile):", location)
    // Refresh location from localStorage after save
    setTimeout(() => {
      loadLocationData()
    }, 100)
  }

  const loadLocationData = () => {
    const saved = localStorage.getItem('cropwise-selected-location')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.address) setCurrentLocation(parsed.address)
        if (parsed.cityName) setCityName(parsed.cityName)
        if (parsed.stateName) setStateName(parsed.stateName)
      } catch {}
    }
  }

  // Also refresh when popup closes
  const handlePopupClose = () => {
    setShowLocationPopup(false)
    // Check localStorage for updates
    loadLocationData()
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    loadLocationData()
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {showBackButton ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBackClick} 
            className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
            <span className="text-white text-sm font-medium">Back</span>
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMenuClick} 
            className="bg-emerald-600 hover:bg-emerald-700 p-2 rounded-lg"
          >
            <Menu className="h-6 w-6 text-white" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            onClick={() => setShowLocationPopup(true)}
          >
            <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium text-emerald-700 truncate max-w-[8rem]">
              {cityName ? `${cityName}, ${stateName}` : currentLocation || "Set Location"}
            </span>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNewChatClick}
          className="flex items-center gap-2 text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">{t("newChat")}</span>
        </Button>
      </div>
      <ChangeLocationPopup
        open={showLocationPopup}
        onClose={handlePopupClose}
        onSave={handleLocationSave}
        initialLocation={currentLocation}
      />
    </header>
  )
}

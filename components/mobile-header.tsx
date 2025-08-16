"use client"

import { Menu, MapPin, Plus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import { LanguageSelector } from "./language-selector"

interface MobileHeaderProps {
  onMenuClick?: () => void
  onLocationClick?: () => void
  location?: string
  onNewChatClick?: () => void
  onBackClick?: () => void
  showBackButton?: boolean
}

export function MobileHeader({
  onMenuClick,
  onLocationClick,
  location = "Select Location",
  onNewChatClick,
  onBackClick,
  showBackButton = false,
}: MobileHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {showBackButton ? (
          <Button variant="ghost" size="sm" onClick={onBackClick} className="bg-emerald-600 hover:bg-emerald-700">
            <ArrowLeft className="h-6 w-6 text-white" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onMenuClick} className="bg-emerald-600 hover:bg-emerald-700">
            <Menu className="h-6 w-6 text-white" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLocationClick}
            className="flex items-center gap-2 text-white bg-emerald-600 hover:bg-emerald-700"
          >
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium truncate max-w-32">{location}</span>
          </Button>

          <LanguageSelector variant="header" />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNewChatClick}
          className="flex items-center gap-2 text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">{t("newChat")}</span>
        </Button>
      </div>
    </header>
  )
}

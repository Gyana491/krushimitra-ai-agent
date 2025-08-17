"use client"

import { Menu, Plus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"

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

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {showBackButton ? (
          <Button variant="ghost" size="sm" onClick={onBackClick} className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2">
            <ArrowLeft className="h-6 w-6 text-white" />
            <span className="text-white text-sm font-medium">Back</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onMenuClick} className="bg-emerald-600 hover:bg-emerald-700">
            <Menu className="h-6 w-6 text-white" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          {/* Language selector removed - now in sidebar */}
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

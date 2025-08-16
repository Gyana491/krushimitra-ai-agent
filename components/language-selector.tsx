"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import { useTranslation, type Language } from "@/hooks/use-translation"

interface LanguageSelectorProps {
  variant?: "header" | "settings"
}

export function LanguageSelector({ variant = "header" }: LanguageSelectorProps) {
  const { language, changeLanguage, languages } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const handleLanguageChange = (newLanguage: Language) => {
    changeLanguage(newLanguage)
    setIsOpen(false)
  }

  if (variant === "settings") {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Language / भाषा</label>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between bg-white hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                <span>{languages[language]}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {Object.entries(languages).map(([code, name]) => (
              <DropdownMenuItem
                key={code}
                onClick={() => handleLanguageChange(code as Language)}
                className={`cursor-pointer ${language === code ? "bg-emerald-50 text-emerald-700" : ""}`}
              >
                <span className="font-medium">{name}</span>
                {language === code && <span className="ml-auto text-emerald-600">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(languages).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleLanguageChange(code as Language)}
            className={`cursor-pointer ${language === code ? "bg-emerald-50 text-emerald-700" : ""}`}
          >
            <span className="font-medium">{name}</span>
            {language === code && <span className="ml-auto text-emerald-600">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

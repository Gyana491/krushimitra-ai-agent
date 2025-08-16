"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { MapPin, Loader2, Navigation } from "lucide-react"
import { useLocationSuggestions, useLocationDetection } from "@/hooks/use-location"
import { useTranslation } from "@/hooks/use-translation"

interface LocationInputProps {
  value: string
  onChange: (location: string) => void
  onLocationSelect?: (location: { display_name: string; lat: string; lon: string }) => void
}

export function LocationInput({ value, onChange, onLocationSelect }: LocationInputProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const { suggestions, isLoading, fetchLocations, clearSuggestions } = useLocationSuggestions()
  const { detectLocation, isDetecting, error: detectionError } = useLocationDetection()

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchLocations(searchQuery)
        setShowSuggestions(true)
      } else {
        clearSuggestions()
        setShowSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, fetchLocations, clearSuggestions])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLocationSelect = (location: { display_name: string; lat: string; lon: string }) => {
    const selectedData = {
      display_name: location.display_name,
      lat: location.lat,
      lon: location.lon,
    }

    onChange(location.display_name)
    onLocationSelect?.(selectedData)
    setSearchQuery("")
    setShowSuggestions(false)
    clearSuggestions()
  }

  const handleAutoDetect = async () => {
    const location = await detectLocation()
    if (location) {
      handleLocationSelect(location)
    }
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={t("searchLocation")}
            value={searchQuery || value}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (!e.target.value) onChange("")
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
            className="pr-10"
          />
          <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoDetect}
          disabled={isDetecting}
          className="bg-emerald-100 hover:bg-emerald-200 border-emerald-300"
          title={t("detectLocation")}
        >
          {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
        </Button>
      </div>

      {/* Location Suggestions */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <Card ref={suggestionsRef} className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto">
          {isLoading && (
            <div className="p-3 flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{t("searchingLocations")}</span>
            </div>
          )}

          {suggestions.map((location, index) => (
            <button
              key={index}
              onClick={() => handleLocationSelect(location)}
              className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start gap-2"
            >
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{location.display_name.split(",")[0]}</div>
                <div className="text-xs text-gray-500 truncate">{location.display_name}</div>
              </div>
            </button>
          ))}
        </Card>
      )}

      {/* Detection Error */}
      {detectionError && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <Card className="p-3 bg-red-50 border-red-200">
            <p className="text-red-600 text-sm">{detectionError}</p>
          </Card>
        </div>
      )}
    </div>
  )
}

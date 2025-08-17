"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Globe, Check, Loader2 } from "lucide-react"
import { useLocationDetection } from "@/hooks/use-location"
import { useSelectedLocation } from "@/hooks/use-selected-location"
import { GoogleLocationPicker, SelectedLocationData } from "@/components/google-location-picker"

interface LocationLanguageData {
  location: string
  language: string
  timezone: string
  weatherUnit: string
  currency: string
}

interface LocationLanguageSetupProps {
  initialData?: LocationLanguageData
  onSave: (data: LocationLanguageData) => void
  onCancel?: () => void
}

export function LocationLanguageSetup({ initialData, onSave, onCancel }: LocationLanguageSetupProps) {
  const { address } = useSelectedLocation()
  const [data, setData] = useState<LocationLanguageData>({
    location: initialData?.location || address || "",
    language: initialData?.language || "English",
    timezone: initialData?.timezone || "",
    weatherUnit: initialData?.weatherUnit || "metric",
    currency: initialData?.currency || "USD",
  })
  // Detection UI state removed (not currently displayed)
  const [/* isDetectingLocation */] = useState(false)
  const [isSavingLocation, setIsSavingLocation] = useState(false)
  const [isSavingLanguage, setIsSavingLanguage] = useState(false)
  const { /* detectLocation, error: detectError, isDetecting */ } = useLocationDetection()

  // Handle location picker changes
  const handleLocationChange = useCallback((locationData: SelectedLocationData) => {
    setData(prev => ({ ...prev, location: locationData.address }))
  }, [])

  const updateData = (field: keyof LocationLanguageData, value: string) => {
    if (field === 'location') return; // location is derived
    setData((prev) => ({ ...prev, [field]: value }))
  }

  // Keep derived location in sync
  useEffect(() => {
    if (address && address !== data.location) {
      setData(prev => ({ ...prev, location: address }))
    }
  }, [address, data.location])

  // Auto-detect handler currently unused; retained logic commented for future enablement
  // const handleAutoDetect = useCallback(async () => { ... }, [])

  const handleSaveLocation = async () => {
    setIsSavingLocation(true)
    setTimeout(() => {
      onSave(data)
      setIsSavingLocation(false)
    }, 1000)
  }

  const handleSaveLanguage = async () => {
    setIsSavingLanguage(true)
    setTimeout(() => {
      onSave(data)
      setIsSavingLanguage(false)
    }, 1000)
  }

  const languages = [
    { code: "English", name: "English", flag: "🇺🇸" },
    { code: "Spanish", name: "Español", flag: "🇪🇸" },
    { code: "French", name: "Français", flag: "🇫🇷" },
    { code: "Portuguese", name: "Português", flag: "🇧🇷" },
    { code: "Hindi", name: "हिन्दी", flag: "🇮🇳" },
    { code: "Chinese", name: "中文", flag: "🇨🇳" },
    { code: "Arabic", name: "العربية", flag: "🇸🇦" },
    { code: "Russian", name: "Русский", flag: "🇷🇺" },
    { code: "Japanese", name: "日本語", flag: "🇯🇵" },
    { code: "German", name: "Deutsch", flag: "🇩🇪" },
  ]

  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  ]

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Location Settings
          </CardTitle>
          <CardDescription>Set your location to get localized farming advice and weather information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Farm Location</Label>
            <GoogleLocationPicker
              value={data.location}
              onChange={handleLocationChange}
              placeholder="Search or autodetect your farm location"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={data.timezone} onValueChange={(value) => updateData("timezone", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="Europe/London">Greenwich Mean Time (GMT)</SelectItem>
                  <SelectItem value="Europe/Paris">Central European Time (CET)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Japan Standard Time (JST)</SelectItem>
                  <SelectItem value="Asia/Kolkata">India Standard Time (IST)</SelectItem>
                  <SelectItem value="Australia/Sydney">Australian Eastern Time (AET)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weatherUnit">Weather Units</Label>
              <Select value={data.weatherUnit} onValueChange={(value) => updateData("weatherUnit", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric (°C, km/h, mm)</SelectItem>
                  <SelectItem value="imperial">Imperial (°F, mph, in)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveLocation} disabled={isSavingLocation || !data.location.trim()} size="sm">
              {isSavingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Location
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Language & Regional Settings
          </CardTitle>
          <CardDescription>
            Choose your preferred language and regional settings for the best experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="language">Preferred Language</Label>
            <Select value={data.language} onValueChange={(value) => updateData("language", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    <div className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={data.currency} onValueChange={(value) => updateData("currency", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{curr.symbol}</span>
                      <span>
                        {curr.name} ({curr.code})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-medium text-primary mb-2">Localized Features</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Weather forecasts in your local units</li>
              <li>• Seasonal farming advice for your region</li>
              <li>• Local pest and disease information</li>
              <li>• Regional crop recommendations</li>
              <li>• Market prices in your currency</li>
            </ul>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveLanguage} disabled={isSavingLanguage} size="sm">
              {isSavingLanguage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Language
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {onCancel && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

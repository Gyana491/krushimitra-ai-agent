"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Bell, Globe, Moon, Sun, Volume2, Shield, Database, Download, Trash2, RefreshCw, X } from "lucide-react"

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

interface SettingsPanelProps {
  settings: SettingsData
  onUpdate: (settings: SettingsData) => void
  onClose: () => void
  onExportData: () => void
  onClearData: () => void
  onResetSettings: () => void
}

export function SettingsPanel({
  settings,
  onUpdate,
  onClose,
  onExportData,
  onClearData,
  onResetSettings,
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<SettingsData>(settings)

  const updateSettings = (section: keyof SettingsData, field: string, value: boolean | string) => {
    const newSettings = {
      ...localSettings,
      [section]: {
        ...localSettings[section],
        [field]: value,
      },
    }
    setLocalSettings(newSettings)
    onUpdate(newSettings)
  }

  const languages = [
    { code: "English", name: "English" },
    { code: "Spanish", name: "Español" },
    { code: "French", name: "Français" },
    { code: "Portuguese", name: "Português" },
    { code: "Hindi", name: "हिन्दी" },
    { code: "Chinese", name: "中文" },
  ]

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="weather-alerts">Weather Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified about severe weather conditions</p>
                </div>
                <Switch
                  id="weather-alerts"
                  checked={localSettings.notifications.weatherAlerts}
                  onCheckedChange={(checked) => updateSettings("notifications", "weatherAlerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="disease-outbreaks">Disease Outbreaks</Label>
                  <p className="text-sm text-muted-foreground">Alerts about crop diseases in your area</p>
                </div>
                <Switch
                  id="disease-outbreaks"
                  checked={localSettings.notifications.diseaseOutbreaks}
                  onCheckedChange={(checked) => updateSettings("notifications", "diseaseOutbreaks", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="market-prices">Market Prices</Label>
                  <p className="text-sm text-muted-foreground">Updates on crop prices and market trends</p>
                </div>
                <Switch
                  id="market-prices"
                  checked={localSettings.notifications.marketPrices}
                  onCheckedChange={(checked) => updateSettings("notifications", "marketPrices", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="general-updates">General Updates</Label>
                  <p className="text-sm text-muted-foreground">App updates and farming tips</p>
                </div>
                <Switch
                  id="general-updates"
                  checked={localSettings.notifications.generalUpdates}
                  onCheckedChange={(checked) => updateSettings("notifications", "generalUpdates", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-primary" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how the app looks and feels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select
                  value={localSettings.appearance.theme}
                  onValueChange={(value: "light" | "dark" | "system") => updateSettings("appearance", "theme", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select
                  value={localSettings.appearance.language}
                  onValueChange={(value) => updateSettings("appearance", "language", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select
                  value={localSettings.appearance.fontSize}
                  onValueChange={(value: "small" | "medium" | "large") =>
                    updateSettings("appearance", "fontSize", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Audio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-primary" />
                Audio
              </CardTitle>
              <CardDescription>Configure sound and voice settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sound-enabled">Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">Enable notification sounds and UI feedback</p>
                </div>
                <Switch
                  id="sound-enabled"
                  checked={localSettings.audio.soundEnabled}
                  onCheckedChange={(checked) => updateSettings("audio", "soundEnabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="voice-responses">Voice Responses</Label>
                  <p className="text-sm text-muted-foreground">Enable text-to-speech for bot responses</p>
                </div>
                <Switch
                  id="voice-responses"
                  checked={localSettings.audio.voiceResponses}
                  onCheckedChange={(checked) => updateSettings("audio", "voiceResponses", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Privacy & Data
              </CardTitle>
              <CardDescription>Control how your data is used</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="data-collection">Data Collection</Label>
                  <p className="text-sm text-muted-foreground">Allow anonymous usage data collection</p>
                </div>
                <Switch
                  id="data-collection"
                  checked={localSettings.privacy.dataCollection}
                  onCheckedChange={(checked) => updateSettings("privacy", "dataCollection", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="location-tracking">Location Services</Label>
                  <p className="text-sm text-muted-foreground">Use location for weather and local advice</p>
                </div>
                <Switch
                  id="location-tracking"
                  checked={localSettings.privacy.locationTracking}
                  onCheckedChange={(checked) => updateSettings("privacy", "locationTracking", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics-opt-in">Analytics</Label>
                  <p className="text-sm text-muted-foreground">Help improve the app with usage analytics</p>
                </div>
                <Switch
                  id="analytics-opt-in"
                  checked={localSettings.privacy.analyticsOptIn}
                  onCheckedChange={(checked) => updateSettings("privacy", "analyticsOptIn", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Data Management
              </CardTitle>
              <CardDescription>Manage your app data and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="outline" onClick={onExportData} className="flex-1 bg-transparent">
                  <Download className="w-4 h-4 mr-2" />
                  Export Data
                </Button>
                <Button variant="outline" onClick={onResetSettings} className="flex-1 bg-transparent">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Settings
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Clear All Data</span>
                  <Badge variant="destructive">Danger Zone</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  This will permanently delete all your chat history, preferences, and profile data.
                </p>
                <Button variant="destructive" onClick={onClearData} className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

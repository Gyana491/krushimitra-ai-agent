"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Database, Download, Trash2, RefreshCw, X } from "lucide-react"

interface SettingsData {
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

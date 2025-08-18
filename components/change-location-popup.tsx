"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, X, Loader2, Check } from "lucide-react"
import GoogleLocationPicker, { SelectedLocationData } from "./google-location-picker"

interface ChangeLocationPopupProps {
  open: boolean
  onClose: () => void
  onSave: (location: string) => void
  initialLocation?: string
}

export const ChangeLocationPopup: React.FC<ChangeLocationPopupProps> = ({
  open,
  onClose,
  onSave,
  initialLocation = ""
}) => {
  const [location, setLocation] = useState(initialLocation)
  const [hasLocationData, setHasLocationData] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Update location state when picker changes
  const handleLocationChange = useCallback((data: SelectedLocationData) => {
    setLocation(data.address)
    setHasLocationData(true)
  }, [])

  // Check localStorage on mount for existing data
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('cropwise-selected-location')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.address) {
            setLocation(parsed.address)
            setHasLocationData(true)
          }
        } catch {}
      }
    }
  }, [open])

  const handleSave = useCallback(() => {
    setIsSaving(true)
    
    // Call the global save function exposed by GoogleLocationPicker
    if (typeof window !== 'undefined' && (window as unknown as { saveLocationData?: () => void }).saveLocationData) {
      (window as unknown as { saveLocationData: () => void }).saveLocationData()
    }
    
    // Ensure data is saved to localStorage before calling onSave
    const saved = localStorage.getItem('cropwise-selected-location')
    let finalLocation = location
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.address) {
          finalLocation = parsed.address
        }
      } catch {}
    }
    
    setTimeout(() => {
      onSave(finalLocation)
      setIsSaving(false)
      onClose()
    }, 400)
  }, [location, onSave, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background w-full max-w-lg rounded-lg shadow-lg border relative">
        <button aria-label="Close" onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Change Location</CardTitle>
            <CardDescription>Update your farm location for localized advice & weather</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleLocationPicker
              value={location}
              onChange={handleLocationChange}
              autoSaveToLocalStorage={true}
            />

            {/* Timezone & unit selectors removed per requirements */}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
              <Button type="button" onClick={handleSave} disabled={isSaving || (!location.trim() && !hasLocationData)}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                {isSaving ? "Saving" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ChangeLocationPopup

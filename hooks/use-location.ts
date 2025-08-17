"use client"

import { useState, useCallback } from "react"

interface LocationSuggestion {
  display_name: string
  lat: string
  lon: string
}

interface LocationData {
  display_name: string
  lat: string
  lon: string
}

export function useLocationSuggestions() {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLocations = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`,
      )

      if (!response.ok) throw new Error("Failed to fetch locations")

      const data = await response.json()
      setSuggestions(data)
    } catch (err) {
      setError("Failed to fetch locations")
      console.error(err)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return {
    suggestions,
    isLoading,
    error,
    fetchLocations,
    clearSuggestions,
  }
}

export function useLocationDetection() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const detectLocation = useCallback(async (): Promise<LocationData | null> => {
    setIsDetecting(true)
    setError(null)

    try {
      // Request location permission
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        })
      })

      const { latitude, longitude } = position.coords

      // Fetch location details from Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      )

      if (!response.ok) throw new Error("Failed to fetch location details")

      const data = await response.json()

      console.log("Location data:", data)

      // Create location object
      const detectedLocation: LocationData = {
        display_name: data.display_name,
        lat: latitude.toString(),
        lon: longitude.toString(),
      }

      return detectedLocation
    } catch (err: any) {
      console.error("Location detection error:", err)
      if (err.code === 1) {
        setError("Location permission denied. Please enable location access.")
      } else if (err.code === 2) {
        setError("Location unavailable. Please try again.")
      } else if (err.code === 3) {
        setError("Location request timed out. Please try again.")
      } else {
        setError("Failed to detect location. Please try again.")
      }
      return null
    } finally {
      setIsDetecting(false)
    }
  }, [])

  return {
    detectLocation,
    isDetecting,
    error,
  }
}

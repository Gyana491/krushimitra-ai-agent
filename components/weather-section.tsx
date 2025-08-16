"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Cloud, Wind, Droplets, Compass, Loader2 } from "lucide-react"
import { LocationInput } from "./location-input"
import { useTranslation } from "@/hooks/use-translation"

interface WeatherSectionProps {
  location: string
}

interface WeatherData {
  location: string
  currentWeather: {
    temperature: number
    feelsLike: number
    humidity: number
    windSpeed: number
    windGust: number
    conditions: string
  }
  forecast: Array<{
    date: string
    maxTemp: number
    minTemp: number
    maxFeelsLike: number
    minFeelsLike: number
    precipitation: number
    precipitationChance: number
    maxWindSpeed: number
    maxWindGust: number
    conditions: string
  }>
}

export function WeatherSection({ location: initialLocation }: WeatherSectionProps) {
  const { t } = useTranslation()
  const [selectedDay, setSelectedDay] = useState(0)
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState(initialLocation)
  const [showLocationInput, setShowLocationInput] = useState(false)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`)

        if (!response.ok) {
          throw new Error("Failed to fetch weather data")
        }

        const data = await response.json()
        setWeatherData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load weather")
        console.error("Weather fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    if (location) {
      fetchWeather()
    }
  }, [location])

  const handleLocationChange = (newLocation: string) => {
    setLocation(newLocation)
    setShowLocationInput(false)
  }

  const handleLocationSelect = (locationData: { display_name: string; lat: string; lon: string }) => {
    setLocation(locationData.display_name)
    setShowLocationInput(false)
    localStorage.setItem("cropwise-location", locationData.display_name)
  }

  const days =
    weatherData?.forecast.slice(0, 6).map((day, index) => {
      const date = new Date(day.date)
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
      const dayName = dayNames[date.getDay()]

      return {
        day: t(dayName as "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"),
        date: date.getDate(),
        fullDate: day.date,
        index,
      }
    }) || []

  const currentDayWeather = weatherData?.forecast[selectedDay] || weatherData?.currentWeather

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <span className="ml-2 text-gray-600">{t("loadingWeather")}</span>
        </div>
      </div>
    )
  }

  if (error || !weatherData) {
    return (
      <div className="p-4 space-y-4">
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-600 text-center">{error || t("failedToLoadWeatherData")}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Date Picker */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day.index}
            onClick={() => setSelectedDay(day.index)}
            className={`flex-shrink-0 flex flex-col items-center p-3 rounded-full min-w-[60px] ${
              selectedDay === day.index ? "bg-emerald-500 text-white" : "bg-white text-gray-600"
            }`}
          >
            <span className="text-xs font-medium">{day.day}</span>
            <span className="text-lg font-bold">{day.date}</span>
          </button>
        ))}
      </div>

      {/* Weather Info */}
      <Card className="p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            {showLocationInput ? (
              <LocationInput value={location} onChange={handleLocationChange} onLocationSelect={handleLocationSelect} />
            ) : (
              <button
                onClick={() => setShowLocationInput(true)}
                className="text-left hover:text-emerald-600 transition-colors"
              >
                <h3 className="font-medium text-gray-900">{weatherData?.location || location}</h3>
              </button>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">
                {selectedDay === 0
                  ? `${Math.round(weatherData?.currentWeather.temperature || 0)}°C`
                  : `${Math.round(weatherData?.forecast[selectedDay]?.maxTemp || 0)}°C`}
              </span>
              <span className="text-gray-600">
                {selectedDay === 0 ? weatherData?.currentWeather.conditions : currentDayWeather?.conditions}
              </span>
            </div>
          </div>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">{t("getWeatherAdvice")}</Button>
        </div>

        {/* Weather Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <Cloud className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <div className="text-xs text-gray-600">{t("rainfall")}</div>
            <div className="font-bold text-sm">
              {selectedDay === 0
                ? `${Math.round(weatherData?.forecast[0]?.precipitationChance || 0)}%`
                : `${Math.round(weatherData?.forecast[selectedDay]?.precipitationChance || 0)}%`}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <Wind className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <div className="text-xs text-gray-600">{t("windSpeed")}</div>
            <div className="font-bold text-sm">
              {selectedDay === 0
                ? `${Math.round(weatherData?.currentWeather.windSpeed || 0)} km/h`
                : `${Math.round(weatherData?.forecast[selectedDay]?.maxWindSpeed || 0)} km/h`}
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <Droplets className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <div className="text-xs text-gray-600">{t("humidity")}</div>
            <div className="font-bold text-sm">
              {selectedDay === 0
                ? `${Math.round(weatherData?.currentWeather.humidity || 0)}%`
                : `${Math.round(weatherData?.currentWeather.humidity || 0)}%`}
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg text-center">
            <Compass className="h-6 w-6 text-orange-500 mx-auto mb-1" />
            <div className="text-xs text-gray-600">{t("feelsLike")}</div>
            <div className="font-bold text-sm">
              {selectedDay === 0
                ? `${Math.round(weatherData?.currentWeather.feelsLike || 0)}°C`
                : `${Math.round(weatherData?.forecast[selectedDay]?.maxFeelsLike || 0)}°C`}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

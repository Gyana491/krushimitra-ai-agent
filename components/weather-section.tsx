"use client"

import { useState, useEffect, useCallback } from "react"
import { useSelectedLocation } from "@/hooks/use-selected-location"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Cloud, Wind, Droplets, Compass, Loader2, Sun, CloudSun, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, CloudFog } from "lucide-react"
// Location input will be used in future features
// import { LocationInput } from "./location-input"
import { useTranslation } from "@/hooks/use-translation"

interface WeatherSectionProps {
  location?: string // deprecated: kept for backward compatibility, ignored if selected-location exists
  onGetAdvice?: (payload: { date: string; index: number; label: string }) => void
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

export function WeatherSection({ location: initialLocation, onGetAdvice }: WeatherSectionProps) {
  const { t } = useTranslation()
  const { address, city, state } = useSelectedLocation()
  const [selectedDay, setSelectedDay] = useState(0)
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState(initialLocation)
  const [cityName, setCityName] = useState<string>('')
  const [stateName, setStateName] = useState<string>('')

  const fetchWeather = useCallback(async () => {
    if (!location) return
    
    setLoading(true)
    setError(null)
    
    try {
      let weatherUrl = ''
      
      // First try to get coordinates from localStorage
      const savedLocation = localStorage.getItem('cropwise-selected-location')
      
      if (savedLocation) {
        try {
          const locationData = JSON.parse(savedLocation)
          if (locationData.lat && locationData.lng && locationData.address) {
            // Use stored coordinates for precise weather data
            weatherUrl = `/api/weather?lat=${locationData.lat}&lng=${locationData.lng}`
            console.log("Fetching weather for stored location:", locationData.address, locationData.lat, locationData.lng)
          } else {
            // Fallback to location name only
            weatherUrl = `/api/weather?location=${encodeURIComponent(location)}`
          }
        } catch {
          // If localStorage parsing fails, use location name
          weatherUrl = `/api/weather?location=${encodeURIComponent(location)}`
        }
      } else {
        // No stored location, use provided location name
        weatherUrl = `/api/weather?location=${encodeURIComponent(location)}`
      }

      const response = await fetch(weatherUrl)

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
  }, [location])

  useEffect(() => {
    const effective = address || initialLocation || location
    if (effective && effective !== location) {
      setLocation(effective)
    }
    if (city) setCityName(city)
    if (state) setStateName(state)
    if (effective) fetchWeather()
  }, [address, city, state, initialLocation, location, fetchWeather])

  // Listen for localStorage changes to update weather automatically
  // Storage listener handled by useSelectedLocation

  const days =
    weatherData?.forecast.slice(0, 10).map((day, index) => {
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

  // Map condition keys (from API) to icons
  const getConditionIcon = (key?: string) => {
    if (!key) return <Cloud className="h-8 w-8 text-emerald-500" />
    const k = key.toLowerCase()
    if (k.includes('thunder')) return <CloudLightning className="h-8 w-8 text-yellow-500" />
    if (k.includes('violent')) return <CloudLightning className="h-8 w-8 text-yellow-600" />
    if (k.includes('hail')) return <CloudLightning className="h-8 w-8 text-yellow-500" />
    if (k.includes('snow') || k.includes('freezing')) return <CloudSnow className="h-8 w-8 text-sky-500" />
    if (k.includes('drizzle')) return <CloudDrizzle className="h-8 w-8 text-sky-500" />
    if (k.includes('shower')) return <CloudRain className="h-8 w-8 text-blue-500" />
    if (k.includes('rain')) return <CloudRain className="h-8 w-8 text-blue-500" />
    if (k.includes('fog')) return <CloudFog className="h-8 w-8 text-gray-500" />
    if (k.includes('clear')) return <Sun className="h-8 w-8 text-amber-400" />
    if (k.includes('partly') || k.includes('mainly')) return <CloudSun className="h-8 w-8 text-amber-300" />
    if (k.includes('overcast') || k.includes('cloud')) return <Cloud className="h-8 w-8 text-gray-500" />
    return <Cloud className="h-8 w-8 text-emerald-500" />
  }

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
      {/* Date Picker: single-line scroll on small, multiline grid on large */}
      <div className="w-full">
        <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin sm:scrollbar-none lg:grid lg:grid-cols-10 lg:gap-2 lg:overflow-visible">
          {days.map((day) => {
            const fc = weatherData?.forecast[day.index]
            return (
              <button
                key={day.index}
                onClick={() => setSelectedDay(day.index)}
                className={`snap-start flex-shrink-0 w-[66px] sm:w-[72px] lg:w-auto flex flex-col items-center justify-center py-2 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-1 ${
                  selectedDay === day.index ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                }`}
                aria-label={`${day.day} ${day.date}`}
              >
                <div className="mb-1 sm:mb-2 scale-90 sm:scale-100">{getConditionIcon(fc?.conditions)}</div>
                <span className="text-sm sm:text-base font-semibold leading-none">{day.date}</span>
                <span className="text-[10px] sm:text-xs font-medium truncate w-full text-center leading-tight mt-1">{day.day}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Weather Info */}
      <Card className="p-5 bg-white border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg tracking-tight">{cityName || weatherData?.location || location}</h3>
                {stateName && cityName && (
                  <p className="text-sm text-gray-500">{stateName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                {getConditionIcon(selectedDay === 0 ? weatherData?.currentWeather.conditions : currentDayWeather?.conditions)}
                <span className="text-4xl font-bold leading-none">
                  {selectedDay === 0
                    ? `${Math.round(weatherData?.currentWeather.temperature || 0)}°C`
                    : `${Math.round(weatherData?.forecast[selectedDay]?.maxTemp || 0)}°C`}
                </span>
              </div>
              <span className="text-gray-600 text-sm font-medium capitalize">
                {(() => {
                  const key = selectedDay === 0 ? weatherData?.currentWeather.conditions : currentDayWeather?.conditions;
                  if (!key) return '';
                  
                  // Create a mapping function to handle weather conditions
                  const getWeatherTranslation = (condition: string): string => {
                    // Convert condition to lowercase and check for known patterns
                    const lowerCondition = condition.toLowerCase();
                    
                    // Map common weather conditions to translation keys
                    if (lowerCondition.includes('clear')) return t('clearSky');
                    if (lowerCondition.includes('rain') && lowerCondition.includes('light')) return t('lightRain');
                    if (lowerCondition.includes('rain') && lowerCondition.includes('heavy')) return t('heavyRain');
                    if (lowerCondition.includes('rain')) return t('moderateRain');
                    if (lowerCondition.includes('cloud') && lowerCondition.includes('partly')) return t('partlyCloudy');
                    if (lowerCondition.includes('cloud')) return t('cloudy');
                    if (lowerCondition.includes('overcast')) return t('overcast');
                    if (lowerCondition.includes('fog')) return t('foggy');
                    if (lowerCondition.includes('drizzle')) return t('lightDrizzle');
                    if (lowerCondition.includes('snow')) return t('slightSnow');
                    if (lowerCondition.includes('thunder')) return t('thunderstorm');
                    
                    // Fallback to the original condition string if no translation found
                    return condition;
                  };
                  
                  return getWeatherTranslation(key);
                })()}
              </span>
            </div>
          </div>
          <div className="flex md:flex-col gap-2 items-stretch w-full md:w-auto">
            <Button
              onClick={() => {
                if (!weatherData) return
                const target = weatherData.forecast[selectedDay]
                const date = target?.date || new Date().toISOString().split('T')[0]
                const label = `${date}`
                onGetAdvice?.({ date, index: selectedDay, label })
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1 md:flex-none whitespace-nowrap shadow"
            >
              {t("getWeatherAdvice")}
            </Button>
          </div>
        </div>
        {/* Weather Metrics */}
        <div className="flex flex-row flex-wrap sm:grid sm:grid-cols-4 gap-2 mt-2 justify-between">
          <div className="relative rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100/40 p-2 flex flex-col items-center text-center min-w-[70px] max-w-[80px] flex-1">
            <Cloud className="h-6 w-6 text-blue-500 mb-1" />
            <div className="text-[10px] font-medium text-blue-700 tracking-wide uppercase">{t("rainfall")}</div>
            <div className="font-semibold text-xs mt-0.5">
              {selectedDay === 0
                ? `${Math.round(weatherData?.forecast[0]?.precipitationChance || 0)}%`
                : `${Math.round(weatherData?.forecast[selectedDay]?.precipitationChance || 0)}%`}
            </div>
          </div>
          <div className="relative rounded-lg border border-green-100 bg-gradient-to-br from-green-50 to-green-100/40 p-2 flex flex-col items-center text-center min-w-[70px] max-w-[80px] flex-1">
            <Wind className="h-6 w-6 text-green-600 mb-1" />
            <div className="text-[10px] font-medium text-green-700 tracking-wide uppercase">{t("windSpeed")}</div>
            <div className="font-semibold text-xs mt-0.5">
              {selectedDay === 0
                ? `${Math.round(weatherData?.currentWeather.windSpeed || 0)} km/h`
                : `${Math.round(weatherData?.forecast[selectedDay]?.maxWindSpeed || 0)} km/h`}
            </div>
          </div>
          <div className="relative rounded-lg border border-sky-100 bg-gradient-to-br from-sky-50 to-sky-100/40 p-2 flex flex-col items-center text-center min-w-[70px] max-w-[80px] flex-1">
            <Droplets className="h-6 w-6 text-sky-600 mb-1" />
            <div className="text-[10px] font-medium text-sky-700 tracking-wide uppercase">{t("humidity")}</div>
            <div className="font-semibold text-xs mt-0.5">
              {selectedDay === 0
                ? `${Math.round(weatherData?.currentWeather.humidity || 0)}%`
                : `${Math.round(weatherData?.currentWeather.humidity || 0)}%`}
            </div>
          </div>
          <div className="relative rounded-lg border border-orange-100 bg-gradient-to-br from-orange-50 to-orange-100/40 p-2 flex flex-col items-center text-center min-w-[70px] max-w-[80px] flex-1">
            <Compass className="h-6 w-6 text-orange-600 mb-1" />
            <div className="text-[10px] font-medium text-orange-700 tracking-wide uppercase">{t("feelsLike")}</div>
            <div className="font-semibold text-xs mt-0.5">
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

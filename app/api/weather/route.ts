import { type NextRequest, NextResponse } from "next/server"

interface GeocodingResponse {
  results: {
    latitude: number
    longitude: number
    name: string
  }[]
}

interface WeatherResponse {
  current: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    relative_humidity_2m: number
    wind_speed_10m: number
    wind_gusts_10m: number
    weather_code: number
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    apparent_temperature_max: number[]
    apparent_temperature_min: number[]
    precipitation_sum: number[]
    precipitation_probability_max: number[]
    wind_speed_10m_max: number[]
    wind_gusts_10m_max: number[]
    weather_code: number[]
  }
}

// Returns translation key for condition; front-end translates
function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'clearSky',
    1: 'mainlyClear',
    2: 'partlyCloudy',
    3: 'overcast',
    45: 'foggy',
    48: 'rimeFog',
    51: 'lightDrizzle',
    53: 'moderateDrizzle',
    55: 'denseDrizzle',
    56: 'lightFreezingDrizzle',
    57: 'denseFreezingDrizzle',
    61: 'slightRain',
    63: 'moderateRain',
    65: 'heavyRain',
    66: 'lightFreezingRain',
    67: 'heavyFreezingRain',
    71: 'slightSnow',
    73: 'moderateSnow',
    75: 'heavySnow',
    77: 'snowGrains',
    80: 'slightRainShowers',
    81: 'moderateRainShowers',
    82: 'violentRainShowers',
    85: 'slightSnowShowers',
    86: 'heavySnowShowers',
    95: 'thunderstorm',
    96: 'thunderstormSlightHail',
    99: 'thunderstormHeavyHail',
  };
  return conditions[code] || 'unknownCondition';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get("location")
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")

    let latitude: number
    let longitude: number
    let locationName: string

    // If lat/lng provided directly, use them
    if (lat && lng) {
      latitude = parseFloat(lat)
      longitude = parseFloat(lng)
      locationName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    } else if (location) {
      // Fallback to geocoding if only location name provided
      const cleanLocation = location.split(",")[0].trim()

      // Get coordinates from location name
      const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanLocation)}&count=1`
      const geocodingResponse = await fetch(geocodingUrl)
      const geocodingData = (await geocodingResponse.json()) as GeocodingResponse

      if (!geocodingData.results?.[0]) {
        return NextResponse.json({ error: `Location '${cleanLocation}' not found` }, { status: 404 })
      }

      const geocodingResult = geocodingData.results[0]
      latitude = geocodingResult.latitude
      longitude = geocodingResult.longitude
      locationName = geocodingResult.name
    } else {
      return NextResponse.json({ error: "Either location name or lat/lng parameters are required" }, { status: 400 })
    }

    // Get weather data
  // Request 10 day forecast (Open-Meteo supports up to 16 days for daily forecasts)
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,weather_code&timezone=auto&forecast_days=10`

    const weatherResponse = await fetch(weatherUrl)
    const weatherData = (await weatherResponse.json()) as WeatherResponse

    // Process the data
    const forecast = weatherData.daily.time.map((date, index) => ({
      date,
      maxTemp: weatherData.daily.temperature_2m_max[index],
      minTemp: weatherData.daily.temperature_2m_min[index],
      maxFeelsLike: weatherData.daily.apparent_temperature_max[index],
      minFeelsLike: weatherData.daily.apparent_temperature_min[index],
      precipitation: weatherData.daily.precipitation_sum[index],
      precipitationChance: weatherData.daily.precipitation_probability_max[index],
      maxWindSpeed: weatherData.daily.wind_speed_10m_max[index],
      maxWindGust: weatherData.daily.wind_gusts_10m_max[index],
      conditions: getWeatherCondition(weatherData.daily.weather_code[index]),
    }))

    const result = {
      location: locationName,
      currentWeather: {
        temperature: weatherData.current.temperature_2m,
        feelsLike: weatherData.current.apparent_temperature,
        humidity: weatherData.current.relative_humidity_2m,
        windSpeed: weatherData.current.wind_speed_10m,
        windGust: weatherData.current.wind_gusts_10m,
        conditions: getWeatherCondition(weatherData.current.weather_code),
      },
      forecast,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Weather API error:", error)
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 })
  }
}

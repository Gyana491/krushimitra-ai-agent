import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}
interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    weather_code: number[];
  };
}

interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  maxFeelsLike: number;
  minFeelsLike: number;
  precipitation: number;
  precipitationChance: number;
  maxWindSpeed: number;
  maxWindGust: number;
  conditions: string;
}

export const weatherTool = createTool({
  id: 'get-weather-forecast',
  description: 'Get 7-day weather forecast for a location. Input should be ONLY the city name (e.g., "New York", not "New York, NY, USA")',
  inputSchema: z.object({
    location: z.string().describe('City name only - no state codes, country names, or extra details'),
  }),
  outputSchema: z.object({
    location: z.string(),
    currentWeather: z.object({
      temperature: z.number(),
      feelsLike: z.number(),
      humidity: z.number(),
      windSpeed: z.number(),
      windGust: z.number(),
      conditions: z.string(),
    }),
    forecast: z.array(z.object({
      date: z.string(),
      maxTemp: z.number(),
      minTemp: z.number(),
      maxFeelsLike: z.number(),
      minFeelsLike: z.number(),
      precipitation: z.number(),
      precipitationChance: z.number(),
      maxWindSpeed: z.number(),
      maxWindGust: z.number(),
      conditions: z.string(),
    })),
  }),
  execute: async ({ context }) => {
    return await getWeatherForecast(context.location);
  },
});

const getWeatherForecast = async (location: string) => {
  // Clean the location input to extract only the city name
  const cleanLocation = location.split(',')[0].trim();
  
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanLocation)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${cleanLocation}' not found. Please provide only the city name.`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  // Get both current weather and 7-day forecast
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,weather_code&timezone=auto&forecast_days=7`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  // Process daily forecast
  const forecast: DailyForecast[] = data.daily.time.map((date, index) => ({
    date,
    maxTemp: data.daily.temperature_2m_max[index],
    minTemp: data.daily.temperature_2m_min[index],
    maxFeelsLike: data.daily.apparent_temperature_max[index],
    minFeelsLike: data.daily.apparent_temperature_min[index],
    precipitation: data.daily.precipitation_sum[index],
    precipitationChance: data.daily.precipitation_probability_max[index],
    maxWindSpeed: data.daily.wind_speed_10m_max[index],
    maxWindGust: data.daily.wind_gusts_10m_max[index],
    conditions: getWeatherCondition(data.daily.weather_code[index]),
  }));

  return {
    location: name,
    currentWeather: {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      windGust: data.current.wind_gusts_10m,
      conditions: getWeatherCondition(data.current.weather_code),
    },
    forecast,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[code] || 'Unknown';
}

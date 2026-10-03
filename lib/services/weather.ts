import { stationBible } from '../data/station';
import { WeatherRegion } from '../types/station';

export interface RegionalWeatherReport {
  region: WeatherRegion;
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationMm: number;
  weatherCode: number;
  conditionDescription: string;
  windSpeedKmh: number;
  isMockFallback?: boolean;
}

export interface GautengWeatherSummary {
  timestamp: string;
  reports: RegionalWeatherReport[];
  promptSummary: string;
}

// WMO Weather interpretation codes
function interpretWmoCode(code: number): string {
  switch (code) {
    case 0: return 'Clear sky / scorching sun';
    case 1:
    case 2:
    case 3: return 'Partly cloudy with highveld haze';
    case 45:
    case 48: return 'Heavy smog and early morning mist';
    case 51:
    case 53:
    case 55: return 'Drizzle and slick tarmac';
    case 61:
    case 63:
    case 65: return 'Highveld rain shower';
    case 80:
    case 81:
    case 82: return 'Violent afternoon thunderstorm';
    case 95:
    case 96:
    case 99: return 'Severe electrical storm with golf-ball hail';
    default: return 'Variable highveld weather';
  }
}

/**
 * Fetches real-time weather from Open-Meteo for all 5 Gauteng station regions.
 * Falls back to realistic seasonal weather if offline.
 */
export async function getGautengWeather(): Promise<GautengWeatherSummary> {
  const regions = stationBible.station.weatherRegions;
  const reports: RegionalWeatherReport[] = [];

  for (const region of regions) {
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Africa%2FJohannesburg`;
      const res = await fetch(url, { next: { revalidate: 900 } }); // Cache 15 mins
      
      if (!res.ok) throw new Error(`OpenMeteo returned ${res.status}`);
      const data = await res.json();
      const current = data.current;

      reports.push({
        region,
        temperatureC: Math.round(current.temperature_2m),
        apparentTemperatureC: Math.round(current.apparent_temperature),
        precipitationMm: current.precipitation,
        weatherCode: current.weather_code,
        conditionDescription: interpretWmoCode(current.weather_code),
        windSpeedKmh: Math.round(current.wind_speed_10m),
      });
    } catch {
      // Offline / network failure fallback with realistic highveld numbers
      reports.push({
        region,
        temperatureC: region.id === 'pretoria' ? 26 : 22,
        apparentTemperatureC: region.id === 'pretoria' ? 28 : 23,
        precipitationMm: 0,
        weatherCode: 1,
        conditionDescription: region.id === 'sasolburg' 
          ? 'Heavy sulfur smog and 24°C chemical haze' 
          : 'Partly cloudy with highveld haze',
        windSpeedKmh: 14,
        isMockFallback: true,
      });
    }
  }

  // Generate a compressed one-paragraph summary for Gemini prompts
  const promptSummary = reports
    .map(r => `${r.region.name}: ${r.temperatureC}°C (${r.conditionDescription}, winds ${r.windSpeedKmh}km/h)`)
    .join(' | ');

  return {
    timestamp: new Date().toISOString(),
    reports,
    promptSummary,
  };
}

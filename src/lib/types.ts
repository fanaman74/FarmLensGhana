export type ProviderErrorCode =
  | 'invalid_request'
  | 'unauthorized'
  | 'rate_limited'
  | 'timeout'
  | 'unavailable'
  | 'missing_data';

export type ProviderResult<T> =
  | { ok: true; data: T; source: string; fetchedAt: string }
  | { ok: false; error: { code: ProviderErrorCode; message: string; retryable: boolean } };

export type TaskState<T> =
  | { status: 'pending'; taskId: string }
  | { status: 'processing'; taskId: string; progress?: number }
  | { status: 'done'; taskId: string; result: T }
  | { status: 'error'; taskId: string; message: string };

export interface DailyForecast {
  date: string;
  weatherCode: number;
  maxTemperature: number;
  minTemperature: number;
  precipitationProbability: number;
  rainfall: number;
  et0: number;
  windSpeed: number;
  windGusts: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number | null;
  humidity: number | null;
  precipitationProbability: number | null;
  rainfall: number | null;
  soilTemperature: number | null;
  soilMoisture: number | null;
}

export interface WeatherData {
  location: { latitude: number; longitude: number; timezone: string };
  current: {
    time: string;
    temperature: number;
    apparentTemperature: number;
    humidity: number;
    precipitation: number;
    weatherCode: number;
    windSpeed: number;
    windGusts: number;
  };
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  observedAt: string;
}

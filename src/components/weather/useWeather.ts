import { useEffect, useState } from 'react';
import type { WeatherData } from '../../lib/types';

export interface ActiveLocation { name: string; region?: string; latitude: number; longitude: number; }

export function useWeather(initial: ActiveLocation) {
  const [location, setLocationState] = useState<ActiveLocation>(initial);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [source, setSource] = useState('Open-Meteo');
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('farmlens-location');
    if (saved) {
      try { setLocationState(JSON.parse(saved)); } catch { /* Ignore malformed visitor preference. */ }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setWeather(null);
    fetch(`/api/weather?latitude=${location.latitude}&longitude=${location.longitude}`, { signal: controller.signal })
      .then(async (response) => { const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error?.message ?? 'Weather unavailable'); return result; })
      .then((result) => { setWeather(result.data); setSource(result.source); setUpdatedAt(result.fetchedAt); })
      .catch((cause) => { if ((cause as Error).name !== 'AbortError') setError((cause as Error).message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [location.latitude, location.longitude, revision]);

  const setLocation = (next: ActiveLocation) => {
    setLocationState(next);
    localStorage.setItem('farmlens-location', JSON.stringify(next));
  };

  return { location, setLocation, weather, source, updatedAt, loading, error, retry: () => setRevision((value) => value + 1) };
}

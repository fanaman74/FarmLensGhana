import { useEffect, useState } from 'react';
import type { WeatherData } from '../../lib/types';
import { fetchWeather } from '../../lib/api/fetchWeather';

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
    try {
      const saved = JSON.parse(localStorage.getItem('farmlens-location') ?? 'null');
      if (saved && typeof saved.name === 'string' && Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude) && saved.latitude >= 4.5 && saved.latitude <= 11.5 && saved.longitude >= -3.5 && saved.longitude <= 1.5) setLocationState(saved);
    } catch { /* Storage is optional; preserve the working default. */ }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setWeather(null);
    fetchWeather(location.latitude, location.longitude, controller.signal)
      .then((result) => { if (!controller.signal.aborted) { setWeather(result.data); setSource(result.source); setUpdatedAt(result.fetchedAt); } })
      .catch((cause) => { if (!controller.signal.aborted) setError((cause as Error).message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [location.latitude, location.longitude, revision]);

  useEffect(() => {
    if (!error) return;
    const recover = () => setRevision(value => value + 1);
    window.addEventListener('online', recover);
    window.addEventListener('focus', recover);
    return () => { window.removeEventListener('online', recover); window.removeEventListener('focus', recover); };
  }, [error]);

  const setLocation = (next: ActiveLocation) => {
    setLocationState(next);
    try { localStorage.setItem('farmlens-location', JSON.stringify(next)); } catch { /* Browsing without persistent storage is supported. */ }
  };

  return { location, setLocation, weather, source, updatedAt, loading, error, retry: () => setRevision((value) => value + 1) };
}

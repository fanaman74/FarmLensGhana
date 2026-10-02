import { useEffect, useRef, useState } from 'react';
import type { WeatherData } from '../../lib/types';
import { fetchWeather } from '../../lib/api/fetchWeather';

export interface ActiveLocation { name: string; region?: string; latitude: number; longitude: number; }
export interface GridComparison {
  previous: WeatherData['location'];
  current: WeatherData['location'];
}

const locationKey = (latitude: number, longitude: number) => `${latitude},${longitude}`;
const sameGrid = (a: WeatherData['location'], b: WeatherData['location']) => a.latitude === b.latitude && a.longitude === b.longitude;

export function useWeather(initial: ActiveLocation) {
  const [location, setLocationState] = useState<ActiveLocation>(initial);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [source, setSource] = useState('Open-Meteo');
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [gridComparison, setGridComparison] = useState<GridComparison | null>(null);
  const requestId = useRef(0);
  const currentLocationKey = useRef(locationKey(initial.latitude, initial.longitude));
  const lastSuccessfulRequest = useRef<{ grid: WeatherData['location']; selection: Pick<ActiveLocation, 'latitude' | 'longitude'> } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('farmlens-location') ?? 'null');
      if (saved && typeof saved.name === 'string' && Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude) && saved.latitude >= 4.5 && saved.latitude <= 11.5 && saved.longitude >= -3.5 && saved.longitude <= 1.5) { currentLocationKey.current = locationKey(saved.latitude, saved.longitude); setLocationState(saved); }
    } catch { /* Storage is optional; preserve the working default. */ }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const currentRequest = ++requestId.current;
    const requestedLocationKey = locationKey(location.latitude, location.longitude);
    setLoading(true); setError(''); setWeather(null); setUpdatedAt(''); setGridComparison(null);
    fetchWeather(location.latitude, location.longitude, controller.signal)
      .then((result) => {
        if (controller.signal.aborted || currentRequest !== requestId.current || currentLocationKey.current !== requestedLocationKey) return;
        const currentSelection = { latitude: location.latitude, longitude: location.longitude };
        const previous = lastSuccessfulRequest.current;
        const selectionChanged = previous !== null && (previous.selection.latitude !== currentSelection.latitude || previous.selection.longitude !== currentSelection.longitude);
        setWeather(result.data); setSource(result.source); setUpdatedAt(result.fetchedAt);
        setGridComparison(selectionChanged && previous && sameGrid(previous.grid, result.data.location) ? { previous: previous.grid, current: result.data.location } : null);
        lastSuccessfulRequest.current = { grid: result.data.location, selection: currentSelection };
      })
      .catch((cause) => { if (!controller.signal.aborted && currentRequest === requestId.current && currentLocationKey.current === requestedLocationKey) setError((cause as Error).message); })
      .finally(() => { if (!controller.signal.aborted && currentRequest === requestId.current && currentLocationKey.current === requestedLocationKey) setLoading(false); });
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
    const nextLocationKey = locationKey(next.latitude, next.longitude);
    const coordinatesChanged = currentLocationKey.current !== nextLocationKey;
    currentLocationKey.current = nextLocationKey;
    ++requestId.current;
    setWeather(null); setUpdatedAt(''); setError(''); setGridComparison(null); setLoading(true);
    setLocationState(next);
    if (!coordinatesChanged) setRevision((value) => value + 1);
    try { localStorage.setItem('farmlens-location', JSON.stringify(next)); } catch { /* Browsing without persistent storage is supported. */ }
  };

  return { location, setLocation, weather, source, updatedAt, loading, error, gridComparison, retry: () => setRevision((value) => value + 1) };
}

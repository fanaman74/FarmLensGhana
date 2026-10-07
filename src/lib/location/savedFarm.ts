import { isInGhana, saveLocation } from './savedLocation';

// The farm a visitor drew last, kept in this browser so every workspace can use the same boundary.
export interface SavedFarm {
  name: string;
  coordinates: number[][];
  areaHectares: number;
  perimeterKm: number;
  vertexCount: number;
  centroid: { latitude: number; longitude: number };
  savedAt: string;
}

const KEY = 'farmlens-farm';
export const FARM_CHANGED = 'farmlens-farm-changed';

const isPoint = (point: unknown) => Array.isArray(point) && point.length >= 2 && point.every(Number.isFinite);

export function readSavedFarm(): SavedFarm | null {
  try {
    const farm = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (!farm || typeof farm.name !== 'string' || !Array.isArray(farm.coordinates) || farm.coordinates.length < 4 || !farm.coordinates.every(isPoint)) return null;
    if (![farm.areaHectares, farm.perimeterKm, farm.vertexCount, farm.centroid?.latitude, farm.centroid?.longitude].every(Number.isFinite)) return null;
    if (!isInGhana(farm.centroid.latitude, farm.centroid.longitude)) return null;
    return farm;
  } catch { return null; }
}

export function saveFarm(boundary: Omit<SavedFarm, 'name' | 'savedAt'>, name = readSavedFarm()?.name ?? 'My farm'): SavedFarm {
  const farm: SavedFarm = { ...boundary, name, savedAt: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(farm)); } catch { /* Browsing without persistent storage still works for this page. */ }
  saveLocation({ name: farm.name, region: 'Your farm', latitude: farm.centroid.latitude, longitude: farm.centroid.longitude });
  window.dispatchEvent(new Event(FARM_CHANGED));
  return farm;
}

export function renameFarm(name: string) {
  const farm = readSavedFarm();
  if (!farm) return null;
  const renamed = { ...farm, name: name.trim() || 'My farm' };
  try { localStorage.setItem(KEY, JSON.stringify(renamed)); } catch { /* Keep the name for this visit only. */ }
  saveLocation({ name: renamed.name, region: 'Your farm', latitude: renamed.centroid.latitude, longitude: renamed.centroid.longitude });
  window.dispatchEvent(new Event(FARM_CHANGED));
  return renamed;
}

export function forgetFarm() {
  try { localStorage.removeItem(KEY); } catch { /* Nothing stored. */ }
  window.dispatchEvent(new Event(FARM_CHANGED));
}

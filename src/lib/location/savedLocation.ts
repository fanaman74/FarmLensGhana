// One location shared by every workspace, so a place chosen on one page is ready on the next.
export interface SavedLocation { name: string; region?: string; latitude: number; longitude: number; }

const KEY = 'farmlens-location';

export function isInGhana(latitude: number, longitude: number) {
  return latitude >= 4.5 && latitude <= 11.5 && longitude >= -3.5 && longitude <= 1.5;
}

export function readSavedLocation(): SavedLocation | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved && typeof saved.name === 'string' && Number.isFinite(saved.latitude) && Number.isFinite(saved.longitude) && isInGhana(saved.latitude, saved.longitude)) return saved;
  } catch { /* Storage is optional; callers keep their working default. */ }
  return null;
}

export function saveLocation(location: SavedLocation) {
  try { localStorage.setItem(KEY, JSON.stringify(location)); } catch { /* Browsing without persistent storage is supported. */ }
}

export function locateUser(onFound: (latitude: number, longitude: number) => void, onError: (message: string) => void) {
  if (!navigator.geolocation) { onError('This browser cannot share your location. Search for a town instead.'); return; }
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      if (!isInGhana(coords.latitude, coords.longitude)) { onError('Your location appears to be outside Ghana. Search for a Ghanaian town instead.'); return; }
      onFound(coords.latitude, coords.longitude);
    },
    (error) => onError(error.code === error.PERMISSION_DENIED ? 'Location access was blocked. Allow it in your browser settings or search for a town.' : 'Your location could not be found. Search for a town instead.'),
    { enableHighAccuracy: true, timeout: 15000 },
  );
}

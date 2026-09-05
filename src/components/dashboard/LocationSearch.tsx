import { useEffect, useState } from 'react';
import { LoaderCircle, MapPin, Search } from 'lucide-react';

export interface Place { id: number; name: string; region: string; latitude: number; longitude: number; }

export default function LocationSearch({ onSelect, compact = false }: { onSelect: (place: Place) => void; compact?: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setResults(data.results ?? []);
      } catch (cause) { if ((cause as Error).name !== 'AbortError') setError('Search is unavailable right now.'); }
      finally { setLoading(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  return <div className={`location-search ${compact ? 'compact' : ''}`}>
    <Search size={18} aria-hidden="true" />
    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search town or district" aria-label="Search Ghanaian town or district" autoComplete="off" />
    {loading && <LoaderCircle className="spin" size={18} aria-label="Searching" />}
    {(results.length > 0 || error) && <div className="search-results" role="listbox">
      {error && <p>{error}</p>}
      {results.map((place) => <button key={place.id} type="button" onClick={() => { onSelect(place); setQuery(''); setResults([]); }}>
        <MapPin size={15} /><span><strong>{place.name}</strong><small>{place.region}</small></span>
      </button>)}
    </div>}
  </div>;
}

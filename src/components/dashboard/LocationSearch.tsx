import { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, MapPin, Search, X } from 'lucide-react';

export interface Place { id: number; name: string; region: string; latitude: number; longitude: number; }

export default function LocationSearch({ onSelect, compact = false, current }: { onSelect: (place: Place) => void; compact?: boolean; current?: string }) {
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<Place>();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [results, setResults] = useState<Place[]>([]);
  const [searched, setSearched] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (selection) { setResults([]); setError(''); setLoading(false); return; }
    if (query.trim().length < 2) { setResults([]); setSearched(''); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        setResults(data.results ?? []); setSearched(query.trim()); setActive(-1); setOpen(true);
      } catch (cause) { if ((cause as Error).name !== 'AbortError') { setError('Search is unavailable right now.'); setOpen(true); } }
      finally { setLoading(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, selection]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = (place: Place) => { onSelect(place); setSelection(place); setQuery(`${place.name}, ${place.region}`); setResults([]); setOpen(false); };
  const clear = () => { setSelection(undefined); setQuery(''); setResults([]); setError(''); setOpen(false); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (!results.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((index) => (index + 1) % results.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); setActive((index) => (index <= 0 ? results.length - 1 : index - 1)); }
    else if (event.key === 'Enter' && open) { event.preventDefault(); choose(results[Math.max(active, 0)]); }
  };
  const showList = open && !selection && (results.length > 0 || Boolean(error) || (Boolean(searched) && !loading));

  return <div ref={root} className={`location-search ${compact ? 'compact' : ''}`}>
    <Search size={18} aria-hidden="true" />
    <input disabled={!ready} value={query} onFocus={(event) => { if (selection) event.currentTarget.select(); else if (results.length) setOpen(true); }} onChange={(event) => { setSelection(undefined); setSearched(''); setQuery(event.target.value); }} onKeyDown={onKeyDown} placeholder={current ? `${current} · search to change` : 'Search town or district'} aria-label="Search Ghanaian town or district" autoComplete="off" role="combobox" aria-expanded={showList} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined} />
    {loading && <LoaderCircle className="spin" size={18} aria-label="Searching" />}
    {!loading && query && <button type="button" className="search-clear" onClick={clear} aria-label="Clear search"><X size={16} /></button>}
    {showList && <div className="search-results" role="listbox" id={listId}>
      {error && <p>{error}</p>}
      {!error && results.length === 0 && <p>No Ghanaian town or district matches “{searched}”. Check the spelling or try a nearby town.</p>}
      {results.map((place, index) => <button key={place.id} id={`${listId}-${index}`} type="button" role="option" aria-selected={index === active} data-active={index === active} onMouseEnter={() => setActive(index)} onClick={() => choose(place)}>
        <MapPin size={15} /><span><strong>{place.name}</strong><small>{place.region}</small></span>
      </button>)}
    </div>}
  </div>;
}

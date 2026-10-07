import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CloudRain, Droplets, Gauge, MapPin, Pause, Play, Sprout, Sun } from 'lucide-react';
import type { GhanaCity } from '../../data/ghanaCities';
import type { CitySnapshot } from '../../lib/api/openMeteo';
import { weatherIcon, weatherLabel } from '../weather/weatherUtils';

const AUTOPLAY_MS = 7000;

interface Props {
  cities: GhanaCity[];
  active: number;
  onActive: (index: number) => void;
  onUse: (city: GhanaCity) => void;
}

type Snapshots = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; byId: Map<string, CitySnapshot>; source: string; fetchedAt: string };

export default function CityCarousel({ cities, active, onActive, onUse }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshots>({ status: 'loading' });
  const [revision, setRevision] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const chips = useRef<HTMLDivElement>(null);
  const city = cities[active];
  const snapshot = snapshots.status === 'ready' ? snapshots.byId.get(city.id) : undefined;

  useEffect(() => {
    const controller = new AbortController();
    setSnapshots({ status: 'loading' });
    fetch('/api/weather/cities', { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error?.message ?? 'City weather is temporarily unavailable.');
        setSnapshots({ status: 'ready', byId: new Map((result.data as CitySnapshot[]).map((item) => [item.id, item])), source: result.source, fetchedAt: result.fetchedAt });
      })
      .catch((cause) => { if (!controller.signal.aborted) setSnapshots({ status: 'error', message: (cause as Error).message }); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || hovered) return;
    const timer = setTimeout(() => onActive((active + 1) % cities.length), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, hovered, active, cities.length]);

  useEffect(() => {
    const chip = chips.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (chip && chips.current) chips.current.scrollTo({ left: chip.offsetLeft - chips.current.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  // Any deliberate choice stops the automatic rotation so the reader keeps their place.
  const go = (index: number) => { setPlaying(false); onActive((index + cities.length) % cities.length); };

  return <section
    className="city-carousel"
    aria-roledescription="carousel"
    aria-label="Conditions across Ghana"
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onFocus={() => setHovered(true)}
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHovered(false); }}
    onKeyDown={(event) => { if (event.key === 'ArrowRight') go(active + 1); if (event.key === 'ArrowLeft') go(active - 1); }}
  >
    <div className="city-carousel-head">
      <p className="eyebrow">Across Ghana now</p>
      <div className="city-carousel-controls">
        <span className="city-count">{active + 1} / {cities.length}</span>
        <button type="button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? 'Pause city rotation' : 'Play city rotation'} title={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
        <button type="button" onClick={() => go(active - 1)} aria-label="Previous city" title="Previous city"><ChevronLeft size={17} /></button>
        <button type="button" onClick={() => go(active + 1)} aria-label="Next city" title="Next city"><ChevronRight size={17} /></button>
      </div>
    </div>

    <div className="city-chips" ref={chips} role="group" aria-label="Jump to a city">
      {cities.map((item, index) => <button type="button" key={item.id} data-index={index} aria-current={index === active ? 'true' : undefined} onClick={() => go(index)}>{item.name}</button>)}
    </div>

    <article className="city-slide" key={city.id} aria-roledescription="slide" aria-label={`${active + 1} of ${cities.length}: ${city.name}`} aria-live={playing ? 'off' : 'polite'}>
      <div className="city-title">
        <div><h2>{city.name}</h2><p><MapPin size={12} /> {city.region} Region</p></div>
        {snapshot && <div className="city-temp"><span role="img" aria-label={weatherLabel(snapshot.weatherCode)}>{weatherIcon(snapshot.weatherCode)}</span><strong>{Math.round(snapshot.temperature)}°</strong></div>}
      </div>
      <p className="city-note">{city.note}</p>

      {snapshots.status === 'loading' && <div className="city-metrics" aria-label="Loading city weather">{[1, 2, 3, 4, 5, 6].map((n) => <div className="skeleton city-skeleton" key={n} />)}</div>}
      {snapshots.status === 'error' && <div className="city-error"><span>{snapshots.message}</span><button type="button" className="btn" onClick={() => setRevision((value) => value + 1)}>Try again</button></div>}
      {snapshots.status === 'ready' && !snapshot && <div className="city-error"><span>No reading for {city.name} right now.</span></div>}
      {snapshot && <>
        <p className="city-condition">{weatherLabel(snapshot.weatherCode)}{snapshot.maxTemperature != null && snapshot.minTemperature != null && <> · H {Math.round(snapshot.maxTemperature)}° L {Math.round(snapshot.minTemperature)}°</>} · wind {snapshot.windSpeed.toFixed(0)} km/h</p>
        <dl className="city-metrics">
          <CityMetric icon={<CloudRain />} label="Rain chance" value={snapshot.rainChance == null ? '—' : `${snapshot.rainChance}%`} />
          <CityMetric icon={<Droplets />} label="Rain today" value={snapshot.rainToday == null ? '—' : `${snapshot.rainToday.toFixed(1)} mm`} />
          <CityMetric icon={<CloudRain />} label="Rain 7 days" value={snapshot.rainWeek == null ? '—' : `${snapshot.rainWeek.toFixed(0)} mm`} />
          <CityMetric icon={<Gauge />} label="Humidity" value={`${snapshot.humidity}%`} />
          <CityMetric icon={<Sun />} label="ET₀ demand" value={snapshot.et0 == null ? '—' : `${snapshot.et0.toFixed(1)} mm`} />
          <CityMetric icon={<Sprout />} label="Soil moisture" value={snapshot.soilMoisture == null ? '—' : `${snapshot.soilMoisture.toFixed(2)} m³/m³`} />
        </dl>
      </>}

      <button type="button" className="btn btn-primary city-use" onClick={() => { setPlaying(false); onUse(city); }}>Show {city.name} forecast</button>
    </article>

    <p className="city-source">
      {snapshots.status === 'ready'
        ? <>Open-Meteo model estimates for each town's grid cell · updated {new Intl.DateTimeFormat('en-GH', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' }).format(new Date(snapshots.fetchedAt))}</>
        : <>Open-Meteo model estimates for each town's grid cell</>}
    </p>
  </section>;
}

function CityMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div><dt>{icon}{label}</dt><dd>{value}</dd></div>;
}

import { useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { crops } from '../../data/crops';

export default function CropLibrary() {
  const [query, setQuery] = useState(''); const [category, setCategory] = useState('All');
  const categories = ['All', ...new Set(crops.map((crop) => crop.category))];
  const visible = useMemo(() => crops.filter((crop) => (category === 'All' || crop.category === category) && [crop.name, crop.scientificName, ...crop.localNames].join(' ').toLowerCase().includes(query.toLowerCase())), [query, category]);
  return <div>
    <div className="crop-filters panel panel-pad"><div className="location-search"><Search/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search common, local or scientific name" aria-label="Search crops"/></div><div className="filter-pills">{categories.map((item)=><button key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div></div>
    <p className="result-count">{visible.length} crop{visible.length === 1 ? '' : 's'} in the library</p>
    <div className="crop-grid">{visible.map((crop)=><a className="crop-card panel" href={`/crops/${crop.slug}`} key={crop.slug}><div className="crop-art" style={{background: `linear-gradient(145deg, ${crop.colour}, color-mix(in srgb, ${crop.colour}, #173b2a 42%))`}}><span>{crop.icon}</span><em>{crop.category}</em></div><div className="crop-card-body"><div><p>{crop.scientificName}</p><h2>{crop.name}</h2></div><ArrowUpRight/><p>{crop.summary}</p><div className="crop-tags"><span>{crop.temperature[0]}–{crop.temperature[1]}°C</span><span>{crop.rainfall[0]}–{crop.rainfall[1]} mm/year</span></div></div></a>)}</div>
    {!visible.length && <div className="panel panel-pad empty-state"><span>🌱</span><h2>No crop found</h2><p>Try a broader name or choose another category.</p></div>}
  </div>;
}

import { useEffect, useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import type { ImageryLayer } from '../../data/imageryLayers';

interface Props {
  layers: ImageryLayer[];
  selected: ImageryLayer | null;
  zoom: number;
  onSelect: (layer: ImageryLayer | null) => void;
}

export default function ImageryLayerPicker({ layers, selected, zoom, onSelect }: Props) {
  const [open, setOpen] = useState(true);
  const [legendFailed, setLegendFailed] = useState<string | null>(null);
  const tooFar = selected?.minzoom != null && zoom < selected.minzoom;

  // On phones the guide would cover most of the map, so it starts folded away.
  useEffect(() => { if (window.matchMedia?.('(max-width: 540px)').matches) setOpen(false); }, []);

  return <div className="layer-card">
    <label className="layer-select">
      <span><Layers size={14} /> Map layer</span>
      <select value={selected?.id ?? ''} onChange={(event) => onSelect(layers.find((layer) => layer.id === event.target.value) ?? null)}>
        <option value="">Satellite photo only</option>
        <optgroup label="Updated every few days">
          {layers.filter((layer) => !layer.minzoom).map((layer) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}
        </optgroup>
        <optgroup label="Africa-wide products">
          {layers.filter((layer) => layer.minzoom).map((layer) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}
        </optgroup>
      </select>
    </label>
    {!selected && <p className="layer-note">Esri satellite photo. Choose a layer to see crop health, water stress or a cloud-free view.</p>}
    {selected && <>
      <button type="button" className="layer-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        How to read this <ChevronDown size={14} />
      </button>
      {open && <div className="layer-details">
        {tooFar && <p className="layer-warning" role="status">Zoom in to district or field level to load this layer.</p>}
        <p>{selected.howToRead}</p>
        {selected.legend && <div className="layer-legend">
          <span className="layer-ramp" style={{ background: `linear-gradient(90deg, ${selected.legend.colours.join(', ')})` }} />
          <span className="layer-ramp-labels"><small>{selected.legend.low}</small><small>{selected.legend.high}</small></span>
        </div>}
        {selected.legendImage && legendFailed !== selected.id && <img className="layer-legend-image" src={selected.legendImage} alt={`${selected.name} legend`} onError={() => setLegendFailed(selected.id)} />}
        <p className="layer-source"><strong>{selected.provider}.</strong> {selected.freshness} Satellite estimates, not a field inspection.</p>
      </div>}
    </>}
  </div>;
}

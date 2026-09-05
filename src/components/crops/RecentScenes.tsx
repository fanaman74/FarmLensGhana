import { useEffect, useState } from 'react';
export default function RecentScenes({ latitude, longitude }: { latitude: number; longitude: number }) {
  const [scenes, setScenes] = useState<{ id: string; date: string; cloud: number | null }[]>();
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setScenes(undefined); setError('');
    fetch(`/api/satellite/recent?latitude=${latitude}&longitude=${longitude}`, { signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then(data => { if (!controller.signal.aborted) setScenes(data.scenes); }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [latitude, longitude]);
  return <section><h3>Recent satellite acquisitions</h3><p className="meta">Last 30 days near your selected place · Sentinel-2 L2A / Earth Search. Catalogue records only; these scenes are not rendered on the map. Whole-scene cloud cover may differ at your field.</p>
    {error ? <p role="alert">{error}</p> : !scenes ? <p role="status">Checking recent imagery…</p> : scenes.length === 0 ? <p>No matching acquisitions in the last 30 days.</p> : scenes.map(scene => <p className="meta" key={scene.id}><strong>{new Date(scene.date).toLocaleDateString('en-GH')}</strong> · cloud {scene.cloud == null ? 'unknown' : `${scene.cloud.toFixed(0)}%`}<br/>{scene.id}</p>)}
  </section>;
}

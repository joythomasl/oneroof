import { sceneSVG } from '../../demo/photos';
import { DEMO_AREAS } from '../../demo/seed';
import { useUIStore } from '../../stores/uiStore';

export default function Lightbox() {
  const { lightboxIdx, photoSet, photoDistrict, openLightbox, closeLightbox, toast } = useUIStore();
  if (lightboxIdx === null || !photoSet.length) return null;

  const index = Math.max(0, Math.min(lightboxIdx, photoSet.length - 1));
  const photo = photoSet[index];
  const area = DEMO_AREAS.find(item => item.id === photoDistrict);
  const previous = () => openLightbox((index - 1 + photoSet.length) % photoSet.length);
  const next = () => openLightbox((index + 1) % photoSet.length);

  return (
    <section className="lb" role="dialog" aria-modal="true" aria-label="Photo evidence viewer">
      <header className="lb-hd">
        <div>
          <h4>{photo.note}</h4>
          <div className="sub">{area?.name || photoDistrict} · photo {index + 1} of {photoSet.length}</div>
        </div>
        <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={closeLightbox}>Close</button>
      </header>
      <div className="lb-body">
        <div className="lb-img">
          <div className="lb-canvas" dangerouslySetInnerHTML={{ __html: sceneSVG(photo.scene, index) }} />
          {photoSet.length > 1 && <button className="lb-nav prev" onClick={previous} aria-label="Previous photo">‹</button>}
          {photoSet.length > 1 && <button className="lb-nav next" onClick={next} aria-label="Next photo">›</button>}
        </div>
        <aside className="lb-meta">
          <h5>Capture metadata</h5>
          <div className="kv"><span>Incident</span><b>{photo.inc}</b></div>
          <div className="kv"><span>Captured</span><b>{photo.t}</b></div>
          <div className="kv"><span>Coordinates</span><b>{photo.ll}</b></div>
          <div className="kv"><span>GPS accuracy</span><b>{photo.acc}</b></div>
          <div className="kv"><span>Unit</span><b>{photo.unit}</b></div>
          <div className="kv"><span>Agency</span><b>{photo.agency}</b></div>
          <div className="kv"><span>District</span><b>{area?.name || photoDistrict}</b></div>
          <div className="kv"><span>Payload hash</span><b>{photo.hash}</b></div>
          <div className="kv"><span>Geo-fence</span><b style={{ color: 'var(--st-resolved)' }}>within tolerance</b></div>
          <div className="chain">Captured in-app and signed with the device key at capture time. Any later alteration invalidates the hash.</div>
          <div className="lightbox-actions">
            <button className="btn sm" onClick={() => toast('Evidence added to the CPOC verification queue.')}>Send to verify</button>
            <button className="btn sm" onClick={() => toast('Full-resolution copy queued behind live P0–P3 traffic.')}>Full resolution</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

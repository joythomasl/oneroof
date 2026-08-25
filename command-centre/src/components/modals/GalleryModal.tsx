import { useEffect, useMemo } from 'react';
import { PHOTOS, sceneSVG } from '../../demo/photos';
import { DEMO_AREAS } from '../../demo/seed';
import { useUIStore } from '../../stores/uiStore';

export default function GalleryModal() {
  const { galModalArea, galModalIncident, closeGallery, openLightbox, setPhotoSet } = useUIStore();
  const area = DEMO_AREAS.find(item => item.id === galModalArea);
  const photos = useMemo(() => {
    if (!galModalArea) return [];
    const source = [...(PHOTOS[galModalArea] || [])];
    if (!galModalIncident) return source;
    return source.sort((a, b) => Number(b.inc === galModalIncident) - Number(a.inc === galModalIncident));
  }, [galModalArea, galModalIncident]);

  useEffect(() => {
    if (galModalArea) setPhotoSet(photos, galModalArea);
  }, [galModalArea, photos, setPhotoSet]);

  if (!galModalArea || !area) return null;

  return (
    <div className="scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) closeGallery(); }}>
      <section className="modal lg" role="dialog" aria-modal="true" aria-labelledby="gallery-title">
        <header className="modal-hd">
          <div>
            <h3 id="gallery-title">Photo evidence — {area.name}</h3>
            <p>{photos.length ? `${photos.length} geotagged captures · signed at capture · hashes verified on sync` : 'No evidence uploaded from this district yet'}</p>
          </div>
          <button className="x" onClick={closeGallery} aria-label="Close photo gallery">×</button>
        </header>
        <div className="modal-bd">
          {photos.length ? (
            <div className="gal">
              {photos.map((photo, index) => (
                <button className="shot" key={`${photo.hash}-${index}`} onClick={() => openLightbox(index)}>
                  <span className="img">
                    <span className="scene" dangerouslySetInnerHTML={{ __html: sceneSVG(photo.scene, index) }} />
                    <span className="badge">{photo.agency} · {photo.unit}</span>
                    <span className="vf">✓ signed</span>
                  </span>
                  <span className="cap">
                    <span className="t">{photo.t}</span>
                    <span className="c">{photo.ll} · {photo.acc}</span>
                    <span className="u"><span className="agy">{photo.inc}</span>{photo.note}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty">No photo evidence has been uploaded from {area.name}. Captures appear here when a responder device synchronizes.</div>
          )}
        </div>
      </section>
    </div>
  );
}

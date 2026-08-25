import { useUIStore } from '../../stores/uiStore';

export default function MapControls() {
  const { mapK, mapTx, mapTy, setMapTransform } = useUIStore();

  const zoomIn = () => {
    const nk = Math.min(6, mapK * 1.35);
    const f = nk / mapK;
    setMapTransform(nk, 500 - (500 - mapTx) * f, 360 - (360 - mapTy) * f);
  };
  const zoomOut = () => {
    const nk = Math.max(0.65, mapK / 1.35);
    const f = nk / mapK;
    setMapTransform(nk, 500 - (500 - mapTx) * f, 360 - (360 - mapTy) * f);
  };
  const reset = () => setMapTransform(1, 0, 0);

  return (
    <div className="ov mapctl">
      <button onClick={zoomIn} aria-label="Zoom in" title="Zoom in">
        <svg viewBox="0 0 18 18"><path d="M9 3v12M3 9h12" /></svg>
      </button>
      <button onClick={zoomOut} aria-label="Zoom out" title="Zoom out">
        <svg viewBox="0 0 18 18"><path d="M3 9h12" /></svg>
      </button>
      <button onClick={reset} aria-label="Reset map view" title="Reset view">
        <svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="2.6" /><path d="M9 3v2M9 13v2M3 9h2M13 9h2" /></svg>
      </button>
    </div>
  );
}

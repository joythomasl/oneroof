interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export default function MapControls({ onZoomIn, onZoomOut, onReset }: MapControlsProps) {
  return (
    <div className="ov mapctl">
      <button onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
        <svg viewBox="0 0 18 18"><path d="M9 3v12M3 9h12" /></svg>
      </button>
      <button onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
        <svg viewBox="0 0 18 18"><path d="M3 9h12" /></svg>
      </button>
      <button onClick={onReset} aria-label="Reset map view" title="Reset view">
        <svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="2.6" /><path d="M9 3v2M9 13v2M3 9h2M13 9h2" /></svg>
      </button>
    </div>
  );
}

function VerificationCard({ item, onApprove, onReject, processing }) {
  const { incident, original, resolution, geo, integrity } = item;

  return (
    <article
      className={`verification-card ${
        !geo.valid ? "verification-warning" : ""
      }`}
    >
      {/* Header */}

      <div className="verification-header">
        <div className="incident-heading">
          <span className={`severity ${incident.severity.toLowerCase()}`}>
            {incident.severity}
          </span>

          <div>
            <strong>{incident.id}</strong>
            <span>{incident.title}</span>
          </div>
        </div>

        <div className="verification-meta">
          <span>{incident.age}</span>
          <span>{resolution.unit}</span>
        </div>
      </div>

      {/* Evidence comparison */}

      <div className="evidence-section">
        <EvidencePanel
          label="ORIGINAL REPORT"
          type="original"
          data={original}
        />

        <div className="evidence-arrow">
          →
        </div>

        <EvidencePanel
          label="RESOLUTION EVIDENCE"
          type="resolution"
          data={resolution}
        />
      </div>

      {/* Geo check */}

      <div className={`geo-check ${geo.valid ? "valid" : "invalid"}`}>
        <div className="geo-icon">
          {geo.valid ? "✓" : "⚠"}
        </div>

        <div>
          <strong>
            {geo.valid
              ? "LOCATION VERIFIED"
              : "LOCATION MISMATCH"}
          </strong>

          <span>
            {geo.distance}m from incident location ·
            allowed radius {geo.allowed}m
          </span>
        </div>
      </div>

      {/* Integrity */}

      <div className="integrity-section">
        <div className="integrity-heading">
          EVIDENCE INTEGRITY
        </div>

        <div className="integrity-grid">
          <IntegrityCheck
            label="Camera"
            valid={integrity.camera}
          />

          <IntegrityCheck
            label="GPS"
            valid={integrity.gps}
          />

          <IntegrityCheck
            label="Timestamp"
            valid={integrity.timestamp}
          />

          <IntegrityCheck
            label="Device"
            valid={integrity.device}
          />

          <IntegrityCheck
            label="Incident binding"
            valid={integrity.incidentBinding}
          />

          <IntegrityCheck
            label="Signature"
            valid={integrity.signature}
          />
        </div>
      </div>

      {/* Actions */}

      <div className="verification-actions">
        <button
  type="button"
  className="secondary-button"
  onClick={() => {
    console.log("Reject button clicked:", item.id);
    onReject(item);
  }}
>
  Reject
</button>

        <button
  className="approve-button"
  onClick={() => onApprove(item)}
  disabled={processing}
>
  {processing
    ? "VERIFYING..."
    : "✓ Approve & Close"}
</button>
      </div>
    </article>
  );
}

function EvidencePanel({ label, type, data }) {
  return (
    <div className="evidence-panel">
      <div className="evidence-label">
        {label}
      </div>

      <div className={`evidence-image ${type}`}>
  <img
    src={data.image}
    alt={
      type === "original"
        ? "Original incident report"
        : "Resolution evidence"
    }
  />

  <div className="image-overlay">
    <span>
      {type === "original"
        ? "ORIGINAL"
        : "RESOLUTION"}
    </span>
  </div>
</div>

      <div className="evidence-details">
        <div>
          <span>GPS</span>
          <strong>
            {data.latitude.toFixed(5)},{" "}
            {data.longitude.toFixed(5)}
          </strong>
        </div>

        <div>
          <span>CAPTURED</span>
          <strong>{data.capturedAt}</strong>
        </div>
      </div>
    </div>
  );
}

function IntegrityCheck({ label, valid }) {
  return (
    <div className={`integrity-check ${valid ? "valid" : "invalid"}`}>
      <span>{valid ? "✓" : "!"}</span>
      {label}
    </div>
  );
}

export default VerificationCard;
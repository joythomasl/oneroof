export default function Legend() {
  return (
    <div className="ov legend">
      <div className="lbl">Incident risk scale</div>

      <div className="grp">
        <div className="lgd"><span className="sw" style={{ background: 'var(--p0)' }} /><b>P0</b> Life at immediate risk</div>
        <div className="lgd"><span className="sw" style={{ background: 'var(--p1)' }} /><b>P1</b> Serious, not immediate</div>
        <div className="lgd"><span className="sw" style={{ background: 'var(--p2)' }} /><b>P2</b> Infrastructure / access</div>
        <div className="lgd"><span className="sw" style={{ background: 'var(--p3)' }} /><b>P3</b> Logistics / welfare</div>
      </div>

      <div className="grp">
        <div className="lgd"><span className="rng" style={{ borderStyle: 'dashed', borderWidth: '1.6px' }} /> Open / triaged</div>
        <div className="lgd"><span className="rng" style={{ borderStyle: 'solid', borderWidth: '1.6px' }} /> Assigned / in progress</div>
        <div className="lgd"><span className="rng" style={{ borderColor: 'var(--marker-ring-strong)', borderWidth: '2px' }} /> Resolved pending verification</div>
      </div>
    </div>
  );
}

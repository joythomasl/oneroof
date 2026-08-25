import { useEffect, useState } from 'react';
import { DEMO_AREAS, DEMO_INCIDENTS } from '../../demo/seed';
import { api } from '../../services/api';
import { logEvent } from '../../services/audit';
import { useUIStore } from '../../stores/uiStore';
import type { CpocRecord } from '../../types/domain';

function initials(value: string) {
  return value
    .replace(/,.*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

export default function CpocModal() {
  const {
    cpocModalArea,
    cpocModalIncident,
    closeCpocModal,
    openChanModal,
    toast,
  } = useUIStore();
  const [record, setRecord] = useState<CpocRecord | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const area = DEMO_AREAS.find(item => item.id === cpocModalArea);
  const incident = DEMO_INCIDENTS.find(item => item.id === cpocModalIncident);

  useEffect(() => {
    if (!cpocModalArea) return;
    let alive = true;
    setRecord(undefined);
    setFailed(false);
    setMessageOpen(false);
    api.getCpoc(cpocModalArea)
      .then(value => { if (alive) setRecord(value); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [cpocModalArea, refreshKey]);

  useEffect(() => {
    if (!cpocModalArea) return;
    setMessage(incident
      ? `Re ${incident.id} (${incident.title}): confirm tasking and expected time on scene.`
      : 'Confirm current rescue-phase status, open P0 count, and available resources.');
  }, [cpocModalArea, incident]);

  if (!cpocModalArea || !area) return null;

  const person = record ? record.name || record.deputy.name : '';
  const phone = record?.channels.find(channel => channel.kind === 'phone');
  const email = record?.channels.find(channel => channel.kind === 'email');
  const radio = record?.channels.find(channel => channel.kind === 'radio');
  const acting = !!record && !record.name;

  const retry = () => {
    api.invalidateCpoc(cpocModalArea);
    setRefreshKey(value => value + 1);
  };

  const sendMessage = () => {
    const target = incident?.id || `AREA-${area.id}`;
    logEvent(target, 'CONTACT_CPOC', `District-net message · ${person}`);
    setMessageOpen(false);
    toast(`Message queued to ${area.name} district net.`);
  };

  const handover = () => {
    const promoted = api.promoteDeputy(area.id);
    if (!promoted) {
      toast('A deputy must be designated before handover.');
      return;
    }
    logEvent(incident?.id || `AREA-${area.id}`, 'CPOC_HANDOVER', `Area handed to ${promoted.name}`);
    toast(`${area.name} handed over to ${promoted.name}.`);
    setRefreshKey(value => value + 1);
  };

  return (
    <div className="scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCpocModal(); }}>
      <section className="modal sm" role="dialog" aria-modal="true" aria-labelledby="cpoc-title">
        <header className="modal-hd">
          <div>
            <h3 id="cpoc-title">Contact CPOC</h3>
            <p>{area.name} district · {area.state}{incident ? ` · ${incident.id}` : ''}</p>
          </div>
          <button className="x" onClick={closeCpocModal} aria-label="Close CPOC dialog">×</button>
        </header>

        <div className="modal-bd">
          {record === undefined && !failed && (
            <div className="cpoc-top" aria-busy="true">
              <div className="sk sk-av" />
              <div style={{ flex: 1 }}><div className="sk sk-row w60" /><div className="sk sk-row w80" /><div className="sk sk-row w40" /></div>
            </div>
          )}

          {failed && (
            <div className="err">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.01" /></svg>
              <span>CPOC lookup failed. The area record could not be reached.</span>
              <button className="btn sm" onClick={retry}>Retry</button>
            </div>
          )}

          {record === null && !failed && (
            <div className="notice warn">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16v.01" /></svg>
              <span><b>Not yet assigned.</b> No CPOC is designated for {area.name}.</span>
            </div>
          )}

          {record && (
            <>
              {acting && (
                <div className="notice warn" style={{ marginBottom: 13 }}>
                  <svg viewBox="0 0 24 24"><path d="M12 4l9 16H3zM12 10v4M12 17.6v.01" /></svg>
                  <span><b>CPOC post vacant.</b> The deputy is acting under the succession chain.</span>
                </div>
              )}

              <div className="cpoc-top">
                <span className="cpoc-av">{initials(person)}</span>
                <div>
                  <h4>{person}</h4>
                  <p>{acting ? record.deputy.designation : record.designation}</p>
                  <span className="live" style={{ color: record.online ? 'var(--st-resolved)' : 'var(--st-rejected)' }}>
                    <span className="pulse-dot" style={{ background: record.online ? 'var(--st-resolved)' : 'var(--st-rejected)', margin: 0 }} />
                    {record.online ? `Device online · heartbeat ${record.heartbeat}` : `Unreachable ${record.heartbeat}`}
                  </span>
                </div>
              </div>

              {incident && (
                <div className="notice" style={{ marginBottom: 12 }}>
                  <svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 3z" /></svg>
                  <span>Contacting about <b>{incident.id}</b> — {incident.title}</span>
                </div>
              )}

              <div className="phone">
                <div>
                  <div className="l">{phone?.available ? 'PRIMARY LINE' : 'PRIMARY LINE — UNREACHABLE'}</div>
                  <div className="num" style={!phone?.available ? { color: 'var(--text-disabled)', textDecoration: 'line-through' } : undefined}>
                    {phone?.value || '—'}
                  </div>
                </div>
                <span className="agy lead">{record.link}</span>
              </div>

              <div className="cpoc-actions">
                <button className="btn primary" disabled={!record.channels.some(channel => channel.available && channel.kind !== 'radio')}
                  onClick={() => openChanModal(area.id, incident?.id)}>
                  Choose channel
                </button>
                <button className="btn" disabled={!record.channels.some(channel => channel.kind === 'net' && channel.available)}
                  onClick={() => setMessageOpen(value => !value)}>
                  District-net message
                </button>
              </div>

              <div className="cpoc-kv">
                <div><span>Department</span><b>{record.department}</b></div>
                <div><span>Jurisdiction</span><b>{record.jurisdiction}</b></div>
                <div><span>Email</span><b>{email?.value || '—'}</b></div>
                <div><span>Deputy CPOC</span><b>{acting ? '— acting in post —' : record.deputy.name}</b></div>
                <div><span>Radio</span><b>{radio?.value || '—'}</b></div>
                <div><span>Link</span><b>{record.link}</b></div>
                <div><span>Record updated</span><b>{new Date(record.updatedAt).toLocaleString('en-IN')}</b></div>
                <div><span>Succession</span><b>CPOC → Deputy → senior agency lead</b></div>
              </div>

              {messageOpen && (
                <div className="msgbox">
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} aria-label="Message to the CPOC" />
                  <div className="msg-foot">
                    <span className="note">Queues as P1 and drains over mesh when required.</span>
                    <button className="btn primary sm" onClick={sendMessage} disabled={!message.trim()}>Send</button>
                  </div>
                </div>
              )}

              <div className="handover-row">
                <span>Transfer authority to the deputy for shift change or loss of contact.</span>
                <button className="btn sm" disabled={acting || !record.deputy.phone} onClick={handover}>Transfer to deputy</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

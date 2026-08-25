import { useEffect, useState } from 'react';
import { DEMO_AREAS, DEMO_INCIDENTS } from '../../demo/seed';
import { api } from '../../services/api';
import { logEvent } from '../../services/audit';
import { useUIStore } from '../../stores/uiStore';
import type { Channel, CpocRecord } from '../../types/domain';

function ChannelIcon({ kind }: { kind: Channel['kind'] }) {
  if (kind === 'phone') return <svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>;
  if (kind === 'email') return <svg viewBox="0 0 24 24"><path d="M3 6h18v12H3zM3 6l9 7 9-7" /></svg>;
  return <svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 3z" /></svg>;
}

export default function ChannelChooser() {
  const { chanModalArea, chanModalIncident, closeChanModal, closeCpocModal, toast } = useUIStore();
  const [result, setResult] = useState<{ areaId: string; record: CpocRecord | null } | null>(null);

  const area = DEMO_AREAS.find(item => item.id === chanModalArea);
  const incident = DEMO_INCIDENTS.find(item => item.id === chanModalIncident);

  useEffect(() => {
    if (!chanModalArea) return;
    let alive = true;
    const areaId = chanModalArea;
    api.getCpoc(areaId)
      .then(record => { if (alive) setResult({ areaId, record }); })
      .catch(() => { if (alive) setResult({ areaId, record: null }); });
    return () => { alive = false; };
  }, [chanModalArea]);

  const record = result?.areaId === chanModalArea ? result.record : null;
  if (!chanModalArea || !area || !record) return null;

  const person = record.name || record.deputy.name;
  const channels = record.channels.filter(channel => channel.available && channel.kind !== 'radio');

  const selectChannel = (channel: Channel) => {
    logEvent(incident?.id || `AREA-${area.id}`, 'CONTACT_CPOC', `${channel.label} · ${person} · ${channel.value}`);
    closeChanModal();
    closeCpocModal();
    if (channel.kind === 'net') {
      toast(`District-net message route opened for ${person}.`);
      return;
    }
    toast(`${channel.kind === 'phone' ? 'Call' : 'Email'} opened for ${person}; attempt recorded in the activity trail.`);
  };

  return (
    <div className="scrim channel-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) closeChanModal(); }}>
      <section className="modal xs" role="dialog" aria-modal="true" aria-labelledby="channel-title">
        <header className="modal-hd">
          <div>
            <h3 id="channel-title">Contact CPOC</h3>
            <p>{person} · {area.name}{incident ? ` · ${incident.id}` : ''}</p>
          </div>
          <button className="x" onClick={closeChanModal} aria-label="Close channel chooser">×</button>
        </header>
        <div className="modal-bd">
          {channels.map(channel => {
            const href = channel.kind === 'phone'
              ? `tel:${channel.value.replace(/\s/g, '')}`
              : channel.kind === 'email'
                ? `mailto:${channel.value}?subject=${encodeURIComponent(incident ? `[${incident.id}] ${incident.title}` : `UNIRES update · ${area.name}`)}`
                : undefined;
            const content = (
              <>
                <span className="chan-ic"><ChannelIcon kind={channel.kind} /></span>
                <span>
                  <span className="nm">{channel.kind === 'phone' ? 'Call' : channel.kind === 'email' ? 'Email' : 'Message on district net'}</span>
                  <span className="vl">{channel.value}</span>
                </span>
                <span className="go" aria-hidden="true">›</span>
              </>
            );
            return href
              ? <a key={channel.kind} className="chan-opt" href={href} onClick={() => selectChannel(channel)}>{content}</a>
              : <button key={channel.kind} className="chan-opt" onClick={() => selectChannel(channel)}>{content}</button>;
          })}
          <p className="modal-note">Radio remains available on {record.channels.find(channel => channel.kind === 'radio')?.value || 'the district net'}. Every contact attempt is appended to the activity trail.</p>
        </div>
      </section>
    </div>
  );
}

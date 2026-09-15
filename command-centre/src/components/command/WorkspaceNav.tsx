import { useCommandStore } from '../../stores/commandStore';
import type { WorkspaceId } from '../../types/operations';

const items: Array<{ id: WorkspaceId; label: string; short: string }> = [
  { id: 'attention', label: 'Attention', short: 'Command action' },
  { id: 'situation', label: 'Situation', short: 'Hazard & impact' },
  { id: 'operations', label: 'Operations', short: 'Tasks & decisions' },
  { id: 'resources', label: 'Resources', short: 'People & assets' },
  { id: 'coordination', label: 'Coordination', short: 'Command & liaison' },
  { id: 'planning', label: 'Planning & Log', short: 'IAP, SITREP & audit' },
];

export default function WorkspaceNav() {
  const { workspace, setWorkspace } = useCommandStore();
  return (
    <nav className="workspace-nav" aria-label="Primary workspaces">
      {items.map((item) => (
        <button key={item.id} type="button" className={workspace === item.id ? 'active' : ''} aria-current={workspace === item.id ? 'page' : undefined} onClick={() => setWorkspace(item.id)}>
          <strong>{item.label}</strong><span>{item.short}</span>
        </button>
      ))}
    </nav>
  );
}

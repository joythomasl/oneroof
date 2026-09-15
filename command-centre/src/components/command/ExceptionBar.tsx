import { scenarioNow, taskNeedsAttention } from '../../services/commandLogic';
import { formatCountdown, minutesUntil } from '../../services/format';
import { useCommandStore, type SavedView } from '../../stores/commandStore';
import type { WorkspaceId } from '../../types/operations';

export default function ExceptionBar() {
  const { data, setWorkspace, setFilters } = useCommandStore();
  const now = scenarioNow(data.scenario);
  const criticalUnassigned = data.incidents.filter((item) => item.severity === 0 && !item.leadAgency).length;
  const awaitingAck = data.tasks.filter((item) => item.acknowledgement === 'awaiting').length;
  const overdue = data.tasks.filter((item) => new Date(item.dueAt).getTime() < now).length;
  const requests = data.resourceRequests.filter((item) => item.status !== 'fulfilled').length;
  const comms = data.districts.filter((item) => item.communications === 'degraded' || item.communications === 'offline').length;
  const unverified = data.reports.filter((item) => item.status !== 'verified').length;
  const conflicts = data.reports.filter((item) => item.status === 'conflicting').length;
  const planMinutes = minutesUntil(data.scenario.operationalPeriod.end, now);

  const activate = (workspace: WorkspaceId, savedView?: SavedView) => {
    setWorkspace(workspace);
    if (savedView) setFilters({ savedView });
  };

  const metrics = [
    { label: `${criticalUnassigned} critical unassigned`, tone: 'danger', workspace: 'attention' as const, view: 'unassigned' as const },
    { label: `${awaitingAck} awaiting acknowledgement`, tone: 'warning', workspace: 'operations' as const },
    { label: `${overdue} overdue`, tone: 'danger', workspace: 'operations' as const, view: 'overdue' as const },
    { label: `${requests} requests unfulfilled`, tone: 'warning', workspace: 'resources' as const },
    { label: `${comms} comms degraded`, tone: 'warning', workspace: 'attention' as const, view: 'communications-degraded' as const },
    { label: `${unverified} unverified`, tone: 'neutral', workspace: 'situation' as const, view: 'awaiting-verification' as const },
    { label: `${conflicts} count conflict`, tone: 'warning', workspace: 'situation' as const },
    { label: `Plan ends in ${formatCountdown(planMinutes)}`, tone: planMinutes < 60 ? 'warning' : 'neutral', workspace: 'planning' as const },
  ];

  return (
    <section className="exception-bar" aria-label="Operational exceptions">
      <span className="exception-title">Requires command attention</span>
      <div className="exception-metrics">
        {metrics.map((metric) => (
          <button key={metric.label} type="button" className={metric.tone} onClick={() => activate(metric.workspace, 'view' in metric ? metric.view : undefined)}>
            {metric.label}
          </button>
        ))}
      </div>
      <span className="sr-only">{data.tasks.filter((task) => taskNeedsAttention(task, data.scenario)).length} tasks currently require attention.</span>
    </section>
  );
}

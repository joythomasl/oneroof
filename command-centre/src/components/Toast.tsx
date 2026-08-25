import { useUIStore } from '../stores/uiStore';

export default function Toast() {
  const { toastMsg, toastVisible } = useUIStore();
  return (
    <div className={`toast${toastVisible ? ' show' : ''}`}>
      <span className="ok" />
      <span>{toastMsg}</span>
    </div>
  );
}

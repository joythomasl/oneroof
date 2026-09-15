import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { failed: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('UNIRES render failure', error, info); }
  render() {
    if (this.state.failed) return <main className="fatal-error"><strong>UNIRES could not render this workspace.</strong><p>Cached operational data has not been changed. Reload the interface or contact the duty systems officer.</p><button type="button" onClick={() => window.location.reload()}>Reload interface</button></main>;
    return this.props.children;
  }
}

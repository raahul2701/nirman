import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class AiErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('AI UI boundary caught error', {
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
          AI tools are temporarily unavailable. Continue working and try the action again later.
        </div>
      );
    }

    return this.props.children;
  }
}

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { logger } from '../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log the error
    logger.critical('React Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A0A0A' }}>
          <div className="max-w-md w-full rounded-2xl p-8 text-center" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <AlertTriangle size={32} style={{ color: '#ef4444' }} />
            </div>

            <h1 className="text-white text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-[#606060] text-sm mb-6">
              We encountered an unexpected error. Our team has been notified and is working to fix it.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="text-left mb-6 p-4 rounded-xl" style={{ background: '#111111', border: '1px solid #2A2A2A' }}>
                <p className="text-[#A0A0A0] text-xs font-mono mb-2">Error Details:</p>
                <p className="text-red-400 text-xs font-mono break-all">{this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="text-[#606060] text-xs font-mono mt-2 overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={this.handleRetry} className="flex-1">
                Try Again
              </Button>
              <Button variant="primary" icon={<Home size={14} />} onClick={this.handleGoHome} className="flex-1">
                Go Home
              </Button>
            </div>

            <p className="text-[#404040] text-xs mt-4">
              If the problem persists, please contact support with error details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    logger.error('Error caught by useErrorHandler', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack
    });
    throw error; // Re-throw to trigger ErrorBoundary
  };
};
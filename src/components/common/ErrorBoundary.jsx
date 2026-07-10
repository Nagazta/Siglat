import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * React error boundary — catches unhandled render errors and shows a
 * graceful fallback instead of a white screen.
 *
 * Usage: Wrap any page or section that might throw:
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center">
            <AlertTriangle size={28} className="text-danger" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-muted max-w-sm">
              An unexpected error occurred. Try refreshing, or come back later.
            </p>
            {this.state.error?.message && (
              <p className="mt-2 text-xs text-muted/70 font-mono bg-slate-50 rounded-lg px-3 py-2 max-w-sm mx-auto">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white
                       font-semibold text-sm hover:bg-primary-dark transition-all active:scale-95"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

import { AlertCircle } from 'lucide-react';
import { Component } from 'react';
import { getSentry } from '../../utils/core/sentryLoader';

import logger from '../../utils/core/logger';
/**
 * Enterprise-grade Error Boundary with:
 * - Sentry error reporting
 * - Retry mechanism
 * - Graceful fallback UI
 * - Error classification
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    logger.error('ErrorBoundary caught:', error, errorInfo);

    getSentry().then((Sentry) => {
      if (Sentry) {
        Sentry.captureException(error, {
          contexts: { react: { componentStack: errorInfo?.componentStack } },
        });
      }
    });
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError =
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Failed to fetch dynamically imported module');

      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center pt-32 sm:pt-40 pb-[calc(var(--bottom-nav-height,65px)+4rem)] sm:pb-20 px-4 sm:px-6 text-center bg-[#faf8f5] relative overflow-x-hidden"
          role="alert"
          aria-live="assertive"
        >
          {/* Subtle warm glow backdrop */}
          <div className="absolute top-1/4 -right-20 w-80 h-80 bg-[#f7bb0e]/10 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-[#283618]/5 rounded-full blur-[90px] pointer-events-none" />

          <div className="max-w-md w-full mx-auto bg-white border border-[#283618]/10 rounded-3xl p-6 sm:p-8 shadow-xs relative z-10">
            {/* Warning icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shadow-2xs">
              <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" strokeWidth={1.75} />
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#283618] mb-2 tracking-tight">
              {isChunkError ? 'Update Available' : 'Something went wrong'}
            </h2>

            <p className="font-sans text-xs sm:text-sm text-[#4b5563] mb-6 leading-relaxed max-w-xs mx-auto">
              {isChunkError
                ? 'A new version of the app is available. Please refresh to get the latest experience.'
                : "Something went wrong on our side. We've been notified and are working on it."}
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full">
              {this.state.retryCount < 3 && (
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#283618] hover:bg-[#1f2b13] text-white rounded-full font-sans text-xs uppercase tracking-wider font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  aria-label="Try again"
                >
                  {isChunkError ? 'Refresh App' : 'Try Again'}
                </button>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-6 py-2.5 bg-white border border-[#283618]/20 hover:bg-stone-50 text-[#283618] rounded-full font-sans text-xs uppercase tracking-wider font-bold transition-all cursor-pointer active:scale-95"
                aria-label="Reload page"
              >
                Reload Page
              </button>
            </div>

            {/* Navigation fallback */}
            <div className="mt-6 pt-5 border-t border-[#283618]/10">
              <p className="text-[10px] uppercase tracking-widest text-[#71717a] mb-2.5 font-semibold">
                Or navigate to:
              </p>
              <div className="flex items-center justify-center gap-3 text-xs font-semibold text-[#283618]">
                <a href="/" className="hover:underline hover:text-[#7a5a00] transition-colors">
                  Home
                </a>
                <span className="text-stone-300">·</span>
                <a
                  href="/collections"
                  className="hover:underline hover:text-[#7a5a00] transition-colors"
                >
                  Collections
                </a>
                <span className="text-stone-300">·</span>
                <a
                  href="/contact"
                  className="hover:underline hover:text-[#7a5a00] transition-colors"
                >
                  Contact
                </a>
              </div>
            </div>

            {/* Dev-only error details */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-5 text-left bg-[#faf8f5] border border-[#283618]/10 rounded-xl p-3 text-[10px]">
                <summary className="cursor-pointer font-bold text-stone-600 uppercase tracking-wider text-[9px] select-none">
                  Error Details (dev only)
                </summary>
                <pre className="whitespace-pre-wrap text-rose-600 mt-2 overflow-auto max-h-28 font-mono text-[9px] leading-relaxed break-all">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

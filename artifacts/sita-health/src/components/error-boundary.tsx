import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#fcf8fa] p-6">
      <div className="max-w-md w-full text-center rounded-3xl bg-white/80 p-8 shadow-[0_8px_30px_rgb(180,120,150,0.08)] backdrop-blur-md border border-[#f0e2ea]">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-[#faebf2] text-[#c9688d]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-bold text-[#442b3e]">
          Something went wrong
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#7d6074]">
          SITA encountered an unexpected state. Your personal health memory and logs remain safe and secure.
        </p>
        {import.meta.env.DEV && error?.message ? (
          <pre className="mt-4 max-h-32 overflow-x-auto rounded-xl bg-[#fdf2f7] p-3 text-left text-[11px] text-[#864c70] border border-[#f9d6e5]">
            {error.message}
          </pre>
        ) : null}
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={resetError}
            className="rounded-full bg-gradient-to-r from-[#d65f8a] to-[#b3426e] px-6 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:opacity-90 active:scale-95"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="rounded-full bg-[#f4eaf0] px-5 py-2.5 text-xs font-semibold text-[#6d4d62] transition-all hover:bg-[#ede0e9]"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const err = toError(error);
    console.error(
      'ErrorBoundary caught an error:',
      err,
      info.componentStack,
    );
    // Send to backend for debugging
    fetch('/api/debug-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: err.message, stack: err.stack, componentStack: info.componentStack })
    }).catch(console.error);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}

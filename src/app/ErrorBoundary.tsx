import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/shared/ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Ловить помилки рендеру, щоб застосунок не падав у білий екран. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled error', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto max-w-xl p-10">
        <h1 className="mb-2 text-xl font-semibold">Something went wrong</h1>
        <p className="mb-4 text-ink2">{error.message}</p>
        <Button variant="primary" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    );
  }
}

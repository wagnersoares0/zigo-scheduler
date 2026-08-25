"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  resetKeys: readonly unknown[];
  onError?: (error: Error) => void;
};

type State = { error: Error | null };

/** Contains renderer failures so an invalid host callback cannot blank the page. */
export class AgendaErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    try {
      this.props.onError?.(error);
    } catch {
      // Error reporting must not defeat the boundary that contains the error.
    }
  }

  componentDidUpdate(previousProps: Props): void {
    const changed = previousProps.resetKeys.length !== this.props.resetKeys.length ||
      previousProps.resetKeys.some((key, index) => !Object.is(key, this.props.resetKeys[index]));
    if (this.state.error && changed) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" aria-live="assertive" className="zigo-scheduler-error">
        Unable to render the agenda.
      </div>
    );
  }
}

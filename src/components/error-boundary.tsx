"use client";

import React from "react";
import { reporter } from "@/lib/error-reporter";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  source?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reporter.error({
      source: this.props.source ?? "ErrorBoundary",
      action: "render",
      error,
      meta: {
        componentStack: info.componentStack?.slice(0, 500) ?? "",
      },
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-16 text-center">
          <p className="text-sm font-medium text-destructive">
            Something went wrong
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 rounded-lg border border-border/40 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

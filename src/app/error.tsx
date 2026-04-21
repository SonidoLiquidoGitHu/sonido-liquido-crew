"use client";

import { useEffect, useState } from "react";
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { reporter } from "@/lib/error-reporter";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const errors = reporter.getErrors();

  useEffect(() => {
    reporter.error({
      source: "route:error-page",
      action: "boundary-caught",
      error,
      meta: { digest: error.digest ?? "" },
    });
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>

        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Digest: {error.digest}
          </p>
        )}

        <button
          onClick={() => reset()}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>

        {errors.length > 0 && (
          <div className="mt-6 border-t border-border/40 pt-4 text-left">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>Error log ({errors.length} entries)</span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {showDetails && (
              <div className="mt-3 max-h-64 overflow-y-auto rounded-lg bg-background p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {errors.map((entry, i) => (
                  <div key={i} className="mb-2 last:mb-0">
                    <span className="text-destructive">
                      [{entry.severity.toUpperCase()}]
                    </span>{" "}
                    <span className="text-foreground">{entry.source}</span>
                    {entry.action && (
                      <span className="text-muted-foreground">
                        {" "}
                        @ {entry.action}
                      </span>
                    )}
                    <br />
                    {entry.message}
                    {entry.meta && (
                      <span className="text-muted-foreground/60">
                        {" "}
                        {JSON.stringify(entry.meta)}
                      </span>
                    )}
                    <br />
                    <span className="text-muted-foreground/40">
                      {entry.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

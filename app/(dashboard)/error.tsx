"use client";

import { Button } from "@shared/ui/controls";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4 sm:p-8">
      <section className="max-w-lg rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] p-6 text-center sm:p-8">
        <h2 className="mb-3 text-xl font-semibold">Something went wrong</h2>
        <p role="alert" className="mb-6 break-words text-sm text-[var(--kma-danger)]">{error.message || "An unexpected error occurred."}</p>
        <Button type="button" fullWidth={false} onClick={reset}>Try again</Button>
      </section>
    </div>
  );
}

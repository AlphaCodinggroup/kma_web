type Props = {
  text?: string;
};

export const Loading: React.FC<Props> = ({ text }) => {
  return (
    <div role="status" aria-label={text ?? "Loading"} aria-live="polite" className="w-full py-4">
      <p className="mb-4 text-sm text-[var(--kma-muted)]">{text ?? "Loading…"}</p>
      <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
        {[0, 1, 2].map(row => <div key={row} className="flex min-h-16 items-center gap-4 rounded-lg bg-[var(--kma-subtle)] px-4"><div className="h-8 w-8 shrink-0 rounded-md bg-[var(--kma-border)]" /><div className="min-w-0 flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-[var(--kma-border)]" /><div className="h-2 w-1/3 rounded bg-[var(--kma-border)]" /></div></div>)}
      </div>
    </div>
  );
};

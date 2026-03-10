"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-center">
        <h2 className="mb-2 text-lg font-semibold text-red-800">
          Something went wrong
        </h2>
        <p className="mb-4 text-sm text-red-600">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "oklch(97.8% 0 0)", color: "oklch(22% 0 0)", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center", padding: "24px", boxSizing: "border-box" }}>
          <div style={{ maxWidth: "480px", textAlign: "center" }}>
            <h1 style={{ fontSize: "28px", marginBottom: "16px" }}>Something went wrong</h1>
            <p role="alert" style={{ color: "#62655f", marginBottom: "24px", overflowWrap: "anywhere" }}>{error.message || "An unexpected error occurred."}</p>
            <button type="button" onClick={reset} style={{ minHeight: "44px", padding: "8px 24px", borderRadius: "4px", backgroundColor: "oklch(84% .19 80.46)", color: "oklch(22% 0 0)", border: "none", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}

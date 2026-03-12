"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const themeScript = `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: `
          :root { --bg: #0a0a0a; --fg: #ededed; --muted: #737373; }
          :root.light { --bg: #fafafa; --fg: #171717; --muted: #525252; }
        `}} />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--fg)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 400, textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#8B5CF6",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}

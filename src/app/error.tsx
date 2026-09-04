"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="shell">
      <p className="eyebrow">Something went wrong</p>
      <h1>We couldn’t load the visitor workspace.</h1>
      <p className="sub">Please check the database connection and try again.</p>
      <button className="primary" style={{ marginTop: 18 }} onClick={reset}>
        Try again
      </button>
    </main>
  );
}

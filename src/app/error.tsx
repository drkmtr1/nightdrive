"use client";

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="workspace statePage" id="main-content">
      <p className="eyebrow">Application error</p>
      <h1>The Nightdrive shell could not load</h1>
      <p>Your work has not been changed. Try loading this view again.</p>
      <button className="primaryAction" onClick={reset} type="button">
        Try again
      </button>
    </main>
  );
}

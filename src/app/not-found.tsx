import Link from "next/link";

export default function NotFound() {
  return (
    <main className="workspace statePage" id="main-content">
      <p className="eyebrow">Not found</p>
      <h1>This Nightdrive page does not exist</h1>
      <p>The application shell is available from the workspace home.</p>
      <Link className="primaryAction" href="/">
        Return to workspace
      </Link>
    </main>
  );
}

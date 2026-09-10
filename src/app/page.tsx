export default function HomePage() {
  return (
    <main className="workspace" id="main-content">
      <section aria-labelledby="workspace-title" className="emptyState">
        <p className="eyebrow">Local shell ready</p>
        <h1 id="workspace-title">Nightdrive workspace</h1>
        <p className="lead">
          The application foundation is available. Composition tools have not been implemented yet.
        </p>
        <p className="supportingCopy">
          This stage validates the web, TypeScript, testing, and accessibility baseline without
          simulating music features.
        </p>
      </section>

      <aside aria-labelledby="foundation-status-title" className="statusPanel">
        <h2 id="foundation-status-title">Foundation status</h2>
        <dl className="statusList">
          <div>
            <dt>Application shell</dt>
            <dd>Available locally</dd>
          </div>
          <div>
            <dt>Composition tools</dt>
            <dd>Not implemented</dd>
          </div>
          <div>
            <dt>Persistence and accounts</dt>
            <dd>Not implemented</dd>
          </div>
        </dl>
      </aside>
    </main>
  );
}

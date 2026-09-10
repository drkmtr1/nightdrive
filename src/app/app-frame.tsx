import type { ReactNode } from "react";

type AppFrameProps = Readonly<{
  children: ReactNode;
}>;

export function AppFrame({ children }: AppFrameProps) {
  return (
    <>
      <a className="skipLink" href="#main-content">
        Skip to main content
      </a>
      <div className="appFrame">
        <header className="appHeader">
          <div>
            <p className="appIdentity">Nightdrive</p>
            <p className="appDescriptor">Composition workstation</p>
          </div>
          <span className="stageBadge">Foundation</span>
        </header>
        {children}
        <footer className="appFooter">
          <p>Stage 2A application foundation</p>
        </footer>
      </div>
    </>
  );
}

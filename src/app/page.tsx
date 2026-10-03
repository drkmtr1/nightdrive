import { getHarmonyTemplatesForProfile, HARMONY_PROFILE_IDS } from "../music-domain/harmony";
import { GenerateSection } from "./generate-section";
import { generateSectionAction } from "./generate-section-action";

export default function HomePage() {
  const choices = Object.values(HARMONY_PROFILE_IDS).map((profile) => ({
    profile,
    templates: getHarmonyTemplatesForProfile(profile).map(({ id, scale }) => ({ id, scale })),
  }));
  return (
    <main className="workspace" id="main-content">
      <section aria-labelledby="workspace-title" className="emptyState">
        <p className="eyebrow">Audible complete section · in development</p>
        <h1 id="workspace-title">Nightdrive workspace</h1>
        <p className="lead">
          Generate Harmony, Bass, Arpeggiator and Lead from one eight-bar section request.
        </p>
        <p className="supportingCopy">
          Inspect the four roles below. Audio transport is the next product slice; no playback is
          claimed here.
        </p>
      </section>

      <GenerateSection choices={choices} generateAction={generateSectionAction} />
    </main>
  );
}

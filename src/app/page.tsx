import { getHarmonyTemplatesForProfile, HARMONY_PROFILE_IDS } from "../music-domain/harmony";
import { GenerateSection } from "./generate-section";
import {
  generateSectionAction,
  redoSectionEditAction,
  setLeadPitchAction,
  undoSectionEditAction,
} from "./generate-section-action";

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
          Inspect and audition the four roles below. Browser audio is a derived internal preview.
        </p>
      </section>

      <GenerateSection
        choices={choices}
        generateAction={generateSectionAction}
        setLeadPitchAction={setLeadPitchAction}
        undoSectionEditAction={undoSectionEditAction}
        redoSectionEditAction={redoSectionEditAction}
      />
    </main>
  );
}

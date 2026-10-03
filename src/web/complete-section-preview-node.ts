import type { CompleteSectionRequestV1 } from "../composition/complete-section";
import { V1_SECTION_LENGTH_TICKS, V1_TICKS_PER_BAR } from "../music-domain/musical-time";
import { generateCompleteSectionForAuditionV1 } from "./complete-section-node";

export type PreviewRole = "harmony" | "bass" | "arpeggiator" | "lead";
export type PreviewNote = Readonly<{
  pitch: number;
  startTick: number;
  durationTicks: number;
}>;
export type PreviewTrack = Readonly<{
  role: PreviewRole;
  notes: readonly PreviewNote[];
}>;

/** Derived application data only: not canonical state or a trusted replay format. */
export type CompleteSectionPreview = Readonly<{
  sourceResultHash: string;
  section: Readonly<{
    ppq: number;
    barCount: number;
    timeSignature: Readonly<{ numerator: number; denominator: number }>;
    tempo: Readonly<{ microsecondsPerQuarter: number }>;
    endTick: number;
  }>;
  tracks: readonly PreviewTrack[];
}>;

function track(role: PreviewRole, notes: readonly PreviewNote[]): PreviewTrack {
  return Object.freeze({
    role,
    notes: Object.freeze(
      notes.map(({ pitch, startTick, durationTicks }) =>
        Object.freeze({ pitch, startTick, durationTicks }),
      ),
    ),
  });
}

/** Node-only generation. Browser consumers receive data, never this operation. */
export async function generateCompleteSectionPreviewForAuditionV1(
  request: CompleteSectionRequestV1,
): Promise<CompleteSectionPreview> {
  // The accepted adapter validates before delivering its immutable result.
  // This operation accepts no caller-supplied result or replacement generator.
  const result = await generateCompleteSectionForAuditionV1(request);
  const harmony: PreviewNote[] = [];
  let startTick = 0;
  for (const slot of result.components.harmony.slots) {
    const durationTicks = slot.bars * V1_TICKS_PER_BAR;
    for (const pitch of slot.voicing.midiPitches) {
      harmony.push({ pitch, startTick, durationTicks });
    }
    startTick += durationTicks;
  }

  return Object.freeze({
    sourceResultHash: result.resultHash,
    section: Object.freeze({
      ppq: result.section.ppq,
      barCount: result.section.barCount,
      timeSignature: Object.freeze({
        numerator: result.section.timeSignature.numerator,
        denominator: result.section.timeSignature.denominator,
      }),
      tempo: Object.freeze({
        microsecondsPerQuarter: result.section.tempo.microsecondsPerQuarter,
      }),
      endTick: V1_SECTION_LENGTH_TICKS,
    }),
    tracks: Object.freeze([
      track("harmony", harmony),
      track("bass", result.components.bass),
      track("arpeggiator", result.components.arpeggiator),
      track("lead", result.components.lead.events),
    ]),
  });
}

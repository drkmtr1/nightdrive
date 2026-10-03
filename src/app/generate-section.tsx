"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import type { CompleteSectionRequestV1 } from "../composition/complete-section";
import type { HarmonyProfileId } from "../music-domain/harmony";
import { createKey } from "../music-domain/key";
import { createTempoFromBpm } from "../music-domain/musical-time";
import { createPitchClass } from "../music-domain/pitch";
import type { ScaleType } from "../music-domain/scale";
import type { CompleteSectionPreview } from "../web/complete-section-preview-node";
import {
  type AuditionSnapshot,
  BrowserAudition,
  type BrowserAuditionDependencies,
} from "./browser-audition";
import { SectionTimeline } from "./section-timeline";

export type GenerationChoice = Readonly<{
  profile: HarmonyProfileId;
  templates: readonly Readonly<{ id: string; scale: ScaleType }>[];
}>;
type Props = Readonly<{
  choices: readonly GenerationChoice[];
  generateAction: (request: CompleteSectionRequestV1) => Promise<CompleteSectionPreview>;
}>;
const ROLE_LABELS = { harmony: "Harmony", bass: "Bass", arpeggiator: "Arpeggiator", lead: "Lead" };

export function createBrowserAuditionDependencies(): BrowserAuditionDependencies {
  return {
    createContext: () => {
      if (!window.AudioContext) throw new Error("Web Audio unavailable");
      return new window.AudioContext();
    },
    setInterval: (callback, milliseconds) =>
      window.setInterval(callback, milliseconds) as unknown as ReturnType<typeof setInterval>,
    clearInterval: (handle) => window.clearInterval(handle as unknown as number),
  };
}

export function GenerateSection({ choices, generateAction }: Props) {
  const [profile, setProfile] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [preview, setPreview] = useState<CompleteSectionPreview | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const generationEpoch = useRef(0);
  const audition = useRef<BrowserAudition | null>(null);
  const [transport, setTransport] = useState<AuditionSnapshot | null>(null);
  const [muted, setMuted] = useState<Record<keyof typeof ROLE_LABELS, boolean>>({
    harmony: false,
    bass: false,
    arpeggiator: false,
    lead: false,
  });
  const [solo, setSolo] = useState<keyof typeof ROLE_LABELS | "">("");
  const [volume, setVolume] = useState("0.5");
  const selected = choices.find((choice) => choice.profile === profile);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.visibilityState === "hidden") audition.current?.stop();
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopWhenHidden);
      audition.current?.stop();
    };
  }, []);
  function ensureAudition() {
    if (audition.current) return audition.current;
    audition.current = new BrowserAudition(createBrowserAuditionDependencies(), setTransport);
    return audition.current;
  }
  function invalidatePlayback() {
    audition.current?.invalidate();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    invalidatePlayback();
    setPreview(null);
    setError("");
    const form = new FormData(event.currentTarget);
    const template = selected?.templates.find((item) => item.id === templateId);
    let request: CompleteSectionRequestV1;
    try {
      const tonic = form.get("tonic"),
        bpm = form.get("bpm"),
        seed = form.get("seed");
      if (
        !selected ||
        !template ||
        typeof tonic !== "string" ||
        !/^\d+$/.test(tonic) ||
        typeof seed !== "string" ||
        !/^\d+$/.test(seed) ||
        typeof bpm !== "string" ||
        !/^\d+(?:\.\d+)?$/.test(bpm)
      )
        throw new Error("Invalid controls.");
      const rootSeed = Number(seed);
      if (!Number.isSafeInteger(rootSeed) || rootSeed > 0xffffffff)
        throw new Error("Invalid seed.");
      request = {
        schema: "nightdrive.complete-section-request.v1",
        engineVersion: "nightdrive.engine.complete-section.v1",
        generatorVersion: "nightdrive.generator.complete-section.v1",
        composition: {
          schema: "nightdrive.first-playable-composition-request.v1",
          engineVersion: "nightdrive.engine.first-playable-composition.v1",
          generatorVersion: "nightdrive.generator.first-playable-composition.v1",
          profile: { id: selected.profile },
          harmony: {
            templateId: template.id,
            templateVersion: "v1",
            key: createKey(createPitchClass(Number(tonic)), template.scale),
          },
          section: { tempo: createTempoFromBpm(Number(bpm)) },
          intent: {
            energy: form.get(
              "energy",
            ) as CompleteSectionRequestV1["composition"]["intent"]["energy"],
            complexity: form.get(
              "complexity",
            ) as CompleteSectionRequestV1["composition"]["intent"]["complexity"],
          },
          rootSeed,
          arpeggiator: {
            range: {
              minMidiPitch: 36,
              maxMidiPitch: 84,
            } as CompleteSectionRequestV1["composition"]["arpeggiator"]["range"],
            profile: { version: "nightdrive.genre-profile.arpeggiator.v2" },
            policy: { version: "nightdrive.arpeggiator-policy.v2" },
            seedDerivation: { version: "nightdrive.seed-derivation.component.v1" },
            prng: { version: "nightdrive.prng.mulberry32.v1" },
          },
        },
        motif: {
          schema: "nightdrive.motif-generation-request.v1",
          generatorVersion: "nightdrive.generator.motif.v1",
          profile: { version: "nightdrive.genre-profile.motif.v1" },
          policyVersion: "nightdrive.motif-policy.v1",
        },
      };
    } catch {
      setError(
        "Choose a profile and template, a valid key and tempo, and a seed from 0 to 4294967295.",
      );
      return;
    }
    inFlight.current = true;
    const invocationEpoch = generationEpoch.current;
    startTransition(async () => {
      try {
        const result = await generateAction(request);
        if (generationEpoch.current === invocationEpoch) setPreview(result);
      } catch {
        if (generationEpoch.current === invocationEpoch)
          setError(
            "Generation could not complete. Check your inputs and the local Node runtime, then try again.",
          );
      } finally {
        inFlight.current = false;
      }
    });
  }

  return (
    <>
      <section className="statusPanel" aria-labelledby="generate-title">
        <h2 id="generate-title">Generate an eight-bar section</h2>
        <form
          onSubmit={submit}
          onChange={() => {
            invalidatePlayback();
            generationEpoch.current += 1;
            setPreview(null);
            setError("");
          }}
          aria-busy={pending}
        >
          <fieldset className="generatorFields">
            <legend>Section inputs</legend>
            <label>
              Profile
              <select
                value={profile}
                required
                onChange={(event) => {
                  setProfile(event.target.value);
                  setTemplateId("");
                }}
              >
                <option value="">Choose a profile</option>
                {choices.map((choice) => (
                  <option key={choice.profile} value={choice.profile}>
                    {choice.profile}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Harmony template
              <select
                value={templateId}
                required
                disabled={!selected}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">Choose a template</option>
                {selected?.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.id} ({template.scale})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Key tonic
              <input
                name="tonic"
                type="number"
                min="0"
                max="11"
                step="1"
                required
                defaultValue="0"
                aria-describedby="tonic-help"
              />
            </label>
            <label>
              Tempo (BPM)
              <input name="bpm" type="number" min="1" step="any" required defaultValue="120" />
            </label>
            <label>
              Seed
              <input
                name="seed"
                type="number"
                min="0"
                max="4294967295"
                step="1"
                required
                defaultValue="0"
              />
            </label>
            <label>
              Energy
              <select name="energy" defaultValue="medium">
                {["low", "medium", "high"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Complexity
              <select name="complexity" defaultValue="medium">
                {["low", "medium", "high"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={pending}>
              {pending ? "Generating…" : "Generate"}
            </button>
          </fieldset>
        </form>
        <p id="tonic-help" className="supportingCopy">
          Tonic is a pitch class: 0 is C, 1 is one semitone higher, through 11. The template
          supplies the scale.
        </p>
        <p className="supportingCopy">
          Bass uses its accepted sustained default. Arpeggiator range: MIDI 36–84. Lead uses Motif
          V1. The same explicit seed replays the same section.
        </p>
        {error ? <p role="alert">{error}</p> : null}
        <p role="status">
          {pending
            ? "Generating all four roles on Node…"
            : preview
              ? "Section generated. Four roles are ready to inspect."
              : "Choose your inputs and Generate. No section is loaded."}
        </p>
      </section>
      {preview ? (
        <section className="statusPanel" aria-labelledby="tracks-title">
          <h2 id="tracks-title">Generated section</h2>
          <p>
            {preview.section.barCount} bars · {preview.section.ppq} PPQ · {preview.section.endTick}{" "}
            ticks
          </p>
          <section className="transport" aria-labelledby="transport-title">
            <h3 id="transport-title">Preview transport</h3>
            <div className="transportControls">
              <button
                type="button"
                onClick={() => void ensureAudition().play(preview)}
                disabled={transport?.state === "starting" || transport?.state === "playing"}
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => ensureAudition().stop()}
                disabled={!transport || transport.state === "stopped"}
              >
                Stop
              </button>
              <label>
                <input
                  type="checkbox"
                  checked={transport?.loop ?? false}
                  onChange={(event) => ensureAudition().setLoop(event.target.checked)}
                />{" "}
                Loop
              </label>
              <label>
                Volume
                <input
                  aria-label="Preview volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(event) => {
                    setVolume(event.target.value);
                    ensureAudition().setVolume(Number(event.target.value));
                  }}
                />
              </label>
            </div>
            <fieldset>
              <legend>Role isolation</legend>
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <label key={role}>
                  <input
                    type="checkbox"
                    checked={muted[role as keyof typeof muted]}
                    onChange={(event) => {
                      const next = event.target.checked;
                      setMuted((prior) => ({ ...prior, [role]: next }));
                      ensureAudition().setMute(role as keyof typeof ROLE_LABELS, next);
                    }}
                  />{" "}
                  Mute {label}
                </label>
              ))}
              <label>
                Solo{" "}
                <select
                  value={solo}
                  onChange={(event) => {
                    const next = event.target.value as keyof typeof ROLE_LABELS | "";
                    setSolo(next);
                    ensureAudition().setSolo(next || null);
                  }}
                >
                  <option value="">None</option>
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            <p role="status">
              {transport?.message ?? "Press Play to audition the generated section."}
            </p>
          </section>
          <SectionTimeline preview={preview} />
          <div className="previewRoles">
            {preview.tracks.map((track) => (
              <article key={track.role} aria-labelledby={`role-${track.role}`}>
                <h3 id={`role-${track.role}`}>{ROLE_LABELS[track.role]}</h3>
                <p>{track.notes.length} notes</p>
                <details>
                  <summary>Inspect {ROLE_LABELS[track.role]} notes</summary>
                  <table>
                    <caption>{ROLE_LABELS[track.role]} note timing</caption>
                    <thead>
                      <tr>
                        <th scope="col">MIDI pitch</th>
                        <th scope="col">Start tick</th>
                        <th scope="col">Duration ticks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {track.notes.map((note) => (
                        <tr key={`${note.startTick}-${note.pitch}-${note.durationTicks}`}>
                          <td>{note.pitch}</td>
                          <td>{note.startTick}</td>
                          <td>{note.durationTicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </article>
            ))}
          </div>
          <p className="supportingCopy">
            This is derived preview data. Browser audition is an internal composition preview, not
            production sound design.
          </p>
        </section>
      ) : null}
    </>
  );
}

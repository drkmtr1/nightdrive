import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import type { CompleteSectionPreview } from "../web/complete-section-preview-node";
import { GenerateSection, type GenerationChoice } from "./generate-section";

const CHOICES: readonly GenerationChoice[] = [
  {
    profile: "dark-synthwave",
    templates: [{ id: "degree-0654-natural-minor-v1", scale: "natural-minor" }],
  },
  { profile: "darkwave", templates: [{ id: "degree-0364-phrygian-v1", scale: "phrygian" }] },
];
// Consumer fixture only, not a canonical result or musical oracle.
const PREVIEW: CompleteSectionPreview = {
  sourceResultHash: "a".repeat(64),
  section: {
    ppq: 960,
    barCount: 8,
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: { microsecondsPerQuarter: 500000 },
    endTick: 30720,
  },
  tracks: ["harmony", "bass", "arpeggiator", "lead"].map((role) => ({
    role: role as CompleteSectionPreview["tracks"][number]["role"],
    notes: [{ pitch: 60, startTick: 0, durationTicks: 960 }],
  })),
};
function choose() {
  fireEvent.change(screen.getByLabelText("Profile"), { target: { value: "dark-synthwave" } });
  fireEvent.change(screen.getByLabelText("Harmony template"), {
    target: { value: "degree-0654-natural-minor-v1" },
  });
}
function submit() {
  const form = screen.getByRole("button", { name: "Generate" }).closest("form");
  if (!form) throw new Error("Missing form.");
  fireEvent.submit(form);
}

describe("Generate section consumer", () => {
  it("starts empty with explicit profile/template selection", () => {
    const generate = vi.fn();
    render(<GenerateSection choices={CHOICES} generateAction={generate} />);
    expect(screen.getByLabelText("Profile")).toHaveValue("");
    expect(screen.getByLabelText("Harmony template")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("No section is loaded");
    submit();
    expect(generate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Play" })).not.toBeInTheDocument();
  });
  it("submits one explicit accepted request and displays existing four-role data", async () => {
    const generate = vi.fn().mockResolvedValue(PREVIEW);
    render(<GenerateSection choices={CHOICES} generateAction={generate} />);
    choose();
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText("Key tonic"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Tempo (BPM)"), { target: { value: "80" } });
    fireEvent.change(screen.getByLabelText("Energy"), { target: { value: "high" } });
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0]?.[0]).toEqual({
      schema: "nightdrive.complete-section-request.v1",
      engineVersion: "nightdrive.engine.complete-section.v1",
      generatorVersion: "nightdrive.generator.complete-section.v1",
      composition: {
        schema: "nightdrive.first-playable-composition-request.v1",
        engineVersion: "nightdrive.engine.first-playable-composition.v1",
        generatorVersion: "nightdrive.generator.first-playable-composition.v1",
        profile: { id: "dark-synthwave" },
        harmony: {
          templateId: "degree-0654-natural-minor-v1",
          templateVersion: "v1",
          key: { tonic: 2, scale: "natural-minor" },
        },
        section: { tempo: { microsecondsPerQuarter: 750000 } },
        intent: { energy: "high", complexity: "medium" },
        rootSeed: 42,
        arpeggiator: {
          range: { minMidiPitch: 36, maxMidiPitch: 84 },
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
    });
    for (const role of ["Harmony", "Bass", "Arpeggiator", "Lead"])
      expect(screen.getByRole("heading", { name: role })).toBeVisible();
    expect(screen.getAllByText("1 notes")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Play" })).toBeVisible();
    expect(screen.getByText(/internal composition preview/i)).toBeVisible();
  });
  it("prevents duplicate submissions and clears stale output on control changes", async () => {
    let resolve: ((value: CompleteSectionPreview) => void) | undefined;
    const generate = vi.fn(
      () =>
        new Promise<CompleteSectionPreview>((done) => {
          resolve = done;
        }),
    );
    render(<GenerateSection choices={CHOICES} generateAction={generate} />);
    choose();
    const form = screen.getByRole("button", { name: "Generate" }).closest("form");
    if (!form) throw new Error("Missing form.");
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();
    expect(screen.getByLabelText("Seed")).toBeEnabled();
    await act(async () => {
      if (!resolve) throw new Error("No pending invocation.");
      resolve(PREVIEW);
    });
    await screen.findByRole("heading", { name: "Generated section" });
    fireEvent.change(screen.getByLabelText("Profile"), { target: { value: "darkwave" } });
    expect(screen.getByLabelText("Harmony template")).toHaveValue("");
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
  });
  it("ignores a stale success after inputs change and waits for an explicit Generate", async () => {
    let resolveFirst: ((value: CompleteSectionPreview) => void) | undefined;
    const generate = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<CompleteSectionPreview>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(PREVIEW);
    render(<GenerateSection choices={CHOICES} generateAction={generate} />);
    choose();
    submit();
    expect(generate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Generating…" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "43" } });
    expect(screen.getByLabelText("Seed")).toHaveValue(43);

    await act(async () => {
      if (!resolveFirst) throw new Error("No pending invocation.");
      resolveFirst(PREVIEW);
    });

    expect(screen.getByLabelText("Seed")).toHaveValue(43);
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    expect(generate).toHaveBeenCalledTimes(1);

    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[0]?.[0].composition.rootSeed).toBe(0);
    expect(generate.mock.calls[1]?.[0].composition.rootSeed).toBe(43);
  });
  it("ignores a stale rejection after inputs change", async () => {
    let rejectFirst: ((reason: Error) => void) | undefined;
    const generate = vi.fn(
      () =>
        new Promise<CompleteSectionPreview>((_resolve, reject) => {
          rejectFirst = reject;
        }),
    );
    render(<GenerateSection choices={CHOICES} generateAction={generate} />);
    choose();
    submit();
    fireEvent.change(screen.getByLabelText("Energy"), { target: { value: "high" } });

    await act(async () => {
      if (!rejectFirst) throw new Error("No pending invocation.");
      rejectFirst(new Error("stale secret diagnostic"));
    });

    expect(screen.getByLabelText("Energy")).toHaveValue("high");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("shows a safe error without stale data or automatic retries, then allows explicit recovery", async () => {
    const generate = vi
      .fn()
      .mockResolvedValueOnce(PREVIEW)
      .mockRejectedValueOnce(new Error("secret diagnostic"))
      .mockResolvedValueOnce(PREVIEW);
    render(<GenerateSection choices={CHOICES} generateAction={generate} />);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled());
    submit();
    await screen.findByRole("alert");
    expect(screen.queryByText(/secret diagnostic/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Generated section" })).not.toBeInTheDocument();
    expect(generate).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled());
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    expect(generate).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("rejects an out-of-domain seed before invoking Node", () => {
    const generate = vi.fn();
    render(<GenerateSection choices={CHOICES} generateAction={generate} />);
    choose();
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "4294967296" } });
    submit();
    expect(generate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeVisible();
  });
  it("has no detectable empty/ready accessibility violations", async () => {
    const { container } = render(
      <main>
        <GenerateSection choices={CHOICES} generateAction={vi.fn().mockResolvedValue(PREVIEW)} />
      </main>,
    );
    expect(
      (await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
    choose();
    submit();
    await screen.findByRole("heading", { name: "Generated section" });
    expect(
      (await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});

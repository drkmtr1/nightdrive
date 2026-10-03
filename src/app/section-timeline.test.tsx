import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import type { CompleteSectionPreview } from "../web/complete-section-preview-node";
import { SectionTimeline } from "./section-timeline";

const PREVIEW: CompleteSectionPreview = {
  sourceResultHash: "a".repeat(64),
  section: {
    ppq: 960,
    barCount: 8,
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: { microsecondsPerQuarter: 500000 },
    endTick: 30720,
  },
  tracks: [
    { role: "harmony", notes: [{ pitch: 64, startTick: 3840, durationTicks: 1920 }] },
    { role: "bass", notes: [{ pitch: 36, startTick: 0, durationTicks: 3840 }] },
    { role: "arpeggiator", notes: [{ pitch: 72, startTick: 960, durationTicks: 240 }] },
    { role: "lead", notes: [{ pitch: 67, startTick: 26880, durationTicks: 960 }] },
  ],
};

describe("SectionTimeline", () => {
  it("projects all four roles and note start/duration ticks across the eight-bar grid without editing preview data", async () => {
    const before = JSON.stringify(PREVIEW);
    const { container } = render(<SectionTimeline preview={PREVIEW} />);

    const timeline = screen.getByRole("table", {
      name: "Four-role notes positioned across the generated eight-bar section",
    });
    expect(within(timeline).getAllByText(/^Bar \d$/)).toHaveLength(8);
    expect(within(timeline).getByText("Bar 1")).toBeVisible();
    expect(within(timeline).getByText("Bar 8")).toBeVisible();

    for (const role of ["Harmony", "Bass", "Arpeggiator", "Lead"])
      expect(within(timeline).getByRole("rowheader", { name: new RegExp(role) })).toBeVisible();

    const harmonyNote = within(timeline).getByRole("listitem", {
      name: "Harmony note, MIDI pitch 64, start tick 3840, duration 1920 ticks",
    });
    expect(harmonyNote).toHaveAttribute("data-note-pitch", "64");
    expect(harmonyNote).toHaveAttribute("data-start-tick", "3840");
    expect(harmonyNote).toHaveAttribute("data-duration-ticks", "1920");
    expect(harmonyNote).toHaveStyle({ left: "12.5%", width: "6.25%" });

    const arpeggiatorNote = within(timeline).getByRole("listitem", {
      name: "Arpeggiator note, MIDI pitch 72, start tick 960, duration 240 ticks",
    });
    expect(arpeggiatorNote).toHaveStyle({ left: "3.125%", width: "0.78125%" });

    const leadNote = within(timeline).getByRole("listitem", {
      name: "Lead note, MIDI pitch 67, start tick 26880, duration 960 ticks",
    });
    expect(leadNote).toHaveStyle({ left: "87.5%", width: "3.125%" });

    expect(
      container.querySelectorAll("button, input, select, textarea, [draggable='true']"),
    ).toHaveLength(0);
    expect(JSON.stringify(PREVIEW)).toBe(before);
    expect(
      (
        await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});

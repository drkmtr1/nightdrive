import { describe, expect, it, vi } from "vitest";
import type { CompleteSectionPreview } from "../web/complete-section-preview-node";
import { type AudioContextLike, BrowserAudition, INITIAL_LEAD_SECONDS } from "./browser-audition";

const preview: CompleteSectionPreview = {
  sourceResultHash: "a".repeat(64),
  section: {
    ppq: 960,
    barCount: 8,
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: { microsecondsPerQuarter: 500000 },
    endTick: 30720,
  },
  tracks: ["harmony", "bass", "arpeggiator", "lead"].map((role) => ({
    role: role as "harmony",
    notes: [{ pitch: 60, startTick: 0, durationTicks: 960 }],
  })),
};
function fakeContext() {
  let time = 0;
  const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const gain = () => ({
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  const mutable = {
    get currentTime() {
      return time;
    },
    set currentTime(value: number) {
      time = value;
    },
    state: "running",
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => {
      const source = {
        type: "sine",
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    }),
    createGain: vi.fn(gain),
    destination: {},
  };
  const context = mutable as unknown as AudioContextLike & typeof mutable;
  return { context, sources };
}
describe("BrowserAudition", () => {
  it("uses the accepted initial lead and schedules every role from AudioContext time", async () => {
    const fake = fakeContext();
    const changed = vi.fn();
    const interval = vi.fn();
    const audition = new BrowserAudition(
      { createContext: () => fake.context, setInterval: interval, clearInterval: vi.fn() },
      changed,
    );
    await audition.play(preview);
    expect(fake.context.resume).toHaveBeenCalledOnce();
    expect(fake.sources).toHaveLength(4);
    for (const source of fake.sources)
      expect(source.start).toHaveBeenCalledWith(INITIAL_LEAD_SECONDS);
    expect(interval).toHaveBeenCalledWith(expect.any(Function), 25);
    expect(audition.current().state).toBe("playing");
  });
  it("accepts Loop at exactly 0.100 seconds and rejects a later activation", async () => {
    const exact = fakeContext();
    const first = new BrowserAudition(
      { createContext: () => exact.context, setInterval: vi.fn(), clearInterval: vi.fn() },
      vi.fn(),
    );
    await first.play(preview);
    exact.context.currentTime = 16;
    first.setLoop(true);
    expect(first.current().message).toBe("Loop enabled.");
    const late = fakeContext();
    const second = new BrowserAudition(
      { createContext: () => late.context, setInterval: vi.fn(), clearInterval: vi.fn() },
      vi.fn(),
    );
    await second.play(preview);
    late.context.currentTime = 16.001;
    second.setLoop(true);
    expect(second.current().message).toMatch(/enabled too late/);
  });
  it("stops idempotently and prevents a late resume from starting audio", async () => {
    const fake = fakeContext();
    let resume!: () => void;
    fake.context.resume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resume = resolve;
        }),
    );
    const audition = new BrowserAudition(
      { createContext: () => fake.context, setInterval: vi.fn(), clearInterval: vi.fn() },
      vi.fn(),
    );
    const playing = audition.play(preview);
    audition.stop();
    resume();
    await playing;
    expect(fake.sources).toHaveLength(0);
    expect(audition.current().state).toBe("stopped");
    audition.stop();
    expect(audition.current().state).toBe("stopped");
  });
  it("applies mute and solo changes to scheduled role gains without new sources", async () => {
    const fake = fakeContext();
    const audition = new BrowserAudition(
      { createContext: () => fake.context, setInterval: vi.fn(), clearInterval: vi.fn() },
      vi.fn(),
    );
    await audition.play(preview);
    const initialSources = fake.sources.length;
    audition.setMute("lead", true);
    audition.setSolo("bass");
    expect(fake.sources).toHaveLength(initialSources);
    expect(fake.context.createGain).toHaveBeenCalledTimes(initialSources);
  });
});

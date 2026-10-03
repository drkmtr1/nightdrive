import { describe, expect, it, vi } from "vitest";
import type { CompleteSectionPreview, PreviewRole } from "../web/complete-section-preview-node";
import {
  type AudioContextLike,
  BrowserAudition,
  INITIAL_LEAD_SECONDS,
  SCHEDULING_HORIZON_SECONDS,
  SCHEDULING_PUMP_MILLISECONDS,
} from "./browser-audition";

type Source = ReturnType<typeof source>;
type Gain = ReturnType<typeof gain>;
const roles: readonly PreviewRole[] = ["harmony", "bass", "arpeggiator", "lead"];

function preview(
  notes: readonly Readonly<{ pitch: number; startTick: number; durationTicks: number }>[] = [
    { pitch: 60, startTick: 960, durationTicks: 480 },
  ],
  microsecondsPerQuarter = 500000,
): CompleteSectionPreview {
  return {
    sourceResultHash: "a".repeat(64),
    section: {
      ppq: 960,
      barCount: 8,
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: { microsecondsPerQuarter },
      endTick: 30720,
    },
    tracks: roles.map((role) => ({ role, notes })),
  };
}
function gain() {
  return {
    gain: {
      value: 0,
      cancelScheduledValues: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}
function source() {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
    start: vi.fn(),
    stop: vi.fn(),
    type: "sine",
  };
}
function fakeContext() {
  let time = 0;
  let failNextStart = false;
  const sources: Source[] = [];
  const gains: Gain[] = [];
  let callback: (() => void) | undefined;
  const mutable = {
    get currentTime() {
      return time;
    },
    set currentTime(value: number) {
      time = value;
    },
    state: "running",
    onstatechange: null as ((event: Event) => void) | null,
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => {
      const next = source();
      next.start.mockImplementation(() => {
        if (!failNextStart) return;
        failNextStart = false;
        throw new Error("scheduled start failed");
      });
      sources.push(next);
      return next;
    }),
    createGain: vi.fn(() => {
      const next = gain();
      gains.push(next);
      return next;
    }),
    destination: {},
  };
  return {
    context: mutable as unknown as AudioContextLike & typeof mutable,
    gains,
    sources,
    trigger: () => callback?.(),
    failNextStart: () => {
      failNextStart = true;
    },
    transition(state: string) {
      mutable.state = state;
      mutable.onstatechange?.(new Event("statechange"));
    },
    dependencies: {
      createContext: () => mutable as unknown as AudioContextLike,
      setInterval: vi.fn((next: () => void) => {
        callback = next;
        return 1 as unknown as ReturnType<typeof setInterval>;
      }),
      clearInterval: vi.fn(),
    },
  };
}
function transport(fake: ReturnType<typeof fakeContext>) {
  return new BrowserAudition(fake.dependencies, vi.fn());
}

describe("BrowserAudition", () => {
  it("uses independently calculated absolute start/end times and aligned role onsets", async () => {
    const fake = fakeContext();
    const audition = transport(fake);
    await audition.play(preview());
    fake.context.currentTime = 0.5;
    fake.trigger();
    // 960 ticks = 0.5 seconds and 480 ticks = 0.25 seconds at 120 BPM.
    for (const item of fake.sources) {
      expect(item.start).toHaveBeenCalledWith(0.6);
      expect(item.stop).toHaveBeenCalledWith(0.85);
    }
    expect(SCHEDULING_HORIZON_SECONDS).toBe(0.15);
    expect(fake.dependencies.setInterval).toHaveBeenCalledWith(
      expect.any(Function),
      SCHEDULING_PUMP_MILLISECONDS,
    );
  });

  it("uses absolute cycle origins without accumulated drift and schedules each occurrence once", async () => {
    const fake = fakeContext();
    const audition = transport(fake);
    audition.setLoop(true);
    await audition.play(preview([{ pitch: 60, startTick: 0, durationTicks: 960 }]));
    fake.context.currentTime = 16;
    fake.trigger();
    fake.context.currentTime = 32;
    fake.trigger();
    expect(fake.sources.map((item) => item.start.mock.calls[0]?.[0])).toEqual([
      0.1, 0.1, 0.1, 0.1, 16.1, 16.1, 16.1, 16.1, 32.1, 32.1, 32.1, 32.1,
    ]);
  });

  it("handles Loop ON at, above and below the accepted 0.100 second cutoff", async () => {
    const exact = fakeContext();
    const atBoundary = transport(exact);
    await atBoundary.play(preview([{ pitch: 60, startTick: 0, durationTicks: 960 }]));
    exact.context.currentTime = 16;
    atBoundary.setLoop(true);
    expect(atBoundary.current().message).toBe("Loop enabled.");

    const early = fakeContext();
    const above = transport(early);
    await above.play(preview([{ pitch: 60, startTick: 0, durationTicks: 960 }]));
    early.context.currentTime = 15.9;
    above.setLoop(true);
    expect(above.current().message).toBe("Loop enabled.");

    const late = fakeContext();
    const below = transport(late);
    await below.play(preview([{ pitch: 60, startTick: 0, durationTicks: 960 }]));
    late.context.currentTime = 16.001;
    below.setLoop(true);
    expect(below.current().message).toMatch(/enabled too late/);
    late.context.currentTime = 16.1;
    late.trigger();
    expect(below.current().message).toMatch(/interrupted/);
  });

  it("cancels prefetched next-cycle sources and stops at the audible current-cycle boundary", async () => {
    const fake = fakeContext();
    const audition = transport(fake);
    audition.setLoop(true);
    await audition.play(preview([{ pitch: 60, startTick: 0, durationTicks: 1 }], 1000));
    expect(fake.sources.length).toBeGreaterThan(4);
    audition.setLoop(false);
    // A cycle is 32 ms; source starts at or beyond its 32 ms boundary are cancelled.
    expect(fake.sources.some((item) => item.stop.mock.calls.some(([at]) => at === 0.132))).toBe(
      true,
    );
    fake.context.currentTime = 0.132;
    fake.trigger();
    expect(audition.current().state).toBe("stopped");
  });

  it("fails closed when a pump discovers an unscheduled late onset", async () => {
    const fake = fakeContext();
    const audition = transport(fake);
    await audition.play(
      preview([
        { pitch: 60, startTick: 0, durationTicks: 960 },
        { pitch: 62, startTick: 3000, durationTicks: 480 },
      ]),
    );
    fake.context.currentTime = 2;
    fake.trigger();
    expect(audition.current().state).toBe("error");
    expect(audition.current().message).toMatch(/fell behind/);
  });

  it("uses role buses for mix/isolation without changing note envelopes or rescheduling", async () => {
    const fake = fakeContext();
    const audition = transport(fake);
    await audition.play(preview());
    fake.context.currentTime = 0.5;
    fake.trigger();
    // master then four role buses, followed by one envelope per source.
    const [master, harmonyBus, bassBus, arpeggiatorBus, leadBus, ...envelopes] = fake.gains;
    expect(master.gain.setValueAtTime).toHaveBeenCalledWith(0.5, 0);
    expect(harmonyBus.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.25, 0.005);
    expect(fake.sources[0]?.connect).toHaveBeenCalledWith(envelopes[0]);
    // Equal onsets are declared-order sorted; Arpeggiator is the first scheduled role.
    expect(envelopes[0]?.connect).toHaveBeenCalledWith(arpeggiatorBus);
    const envelopeCancels = envelopes.map(
      (item) => item.gain.cancelScheduledValues.mock.calls.length,
    );
    const count = fake.sources.length;
    audition.setMute("lead", true);
    audition.setSolo("bass");
    expect(bassBus.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.25, 0.505);
    expect(leadBus.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.505);
    expect(harmonyBus.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.505);
    expect(arpeggiatorBus.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.505);
    audition.setSolo(null);
    expect(fake.sources).toHaveLength(count);
    expect(leadBus.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.505);
    expect(bassBus.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.25, 0.505);
    expect(envelopes.map((item) => item.gain.cancelScheduledValues.mock.calls.length)).toEqual(
      envelopeCancels,
    );
    audition.setVolume(0.75);
    expect(master.gain.setValueAtTime).toHaveBeenCalledWith(0.75, 0.5);
    for (const role of roles) audition.setMute(role, true);
    expect(
      fake.gains
        .slice(1, 5)
        .every((bus) => bus.gain.linearRampToValueAtTime.mock.calls.some(([value]) => value === 0)),
    ).toBe(true);
  });

  it("makes Stop win over pending loop work and ignores stale resume/scheduler work", async () => {
    const fake = fakeContext();
    let resolve!: () => void;
    fake.context.resume = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const audition = transport(fake);
    const pending = audition.play(preview());
    audition.setLoop(true);
    audition.stop();
    resolve();
    await pending;
    fake.trigger();
    expect(fake.sources).toHaveLength(0);
    expect(audition.current().state).toBe("stopped");
  });

  it("reports context failure and treats replacement invalidation as an immediate stop", async () => {
    const failure = fakeContext();
    failure.dependencies.createContext = () => {
      throw new Error("unavailable");
    };
    const unavailable = transport(failure);
    await unavailable.play(preview());
    expect(unavailable.current().state).toBe("error");
    const fake = fakeContext();
    const audition = transport(fake);
    await audition.play(preview());
    audition.invalidate();
    expect(audition.current().state).toBe("stopped");
    expect(fake.sources.every((item) => item.stop.mock.calls.length > 0)).toBe(true);
  });

  it("reports a rejected resume without scheduling audio", async () => {
    const fake = fakeContext();
    fake.context.resume = vi.fn().mockRejectedValue(new Error("permission denied"));
    const audition = transport(fake);

    await audition.play(preview());

    expect(audition.current().state).toBe("error");
    expect(audition.current().message).toMatch(/Audio is unavailable/);
    expect(fake.sources).toHaveLength(0);
  });

  it.each(["suspended", "interrupted", "closed"])(
    "stops the current session when the owned context becomes %s",
    async (state) => {
      const fake = fakeContext();
      const audition = transport(fake);
      await audition.play(preview());
      const before = fake.sources.length;

      fake.transition(state);
      fake.trigger();

      expect(audition.current().state).toBe("error");
      expect(audition.current().message).toMatch(/interrupted/i);
      expect(fake.dependencies.clearInterval).toHaveBeenCalledOnce();
      expect(fake.sources.every((item) => item.stop.mock.calls.length > 0)).toBe(true);
      expect(fake.sources).toHaveLength(before);
    },
  );

  it("fails closed and cleans partial nodes when later scheduling throws", async () => {
    const fake = fakeContext();
    const audition = transport(fake);
    await audition.play(
      preview([
        { pitch: 60, startTick: 0, durationTicks: 960 },
        { pitch: 62, startTick: 3000, durationTicks: 480 },
      ]),
    );
    fake.context.currentTime = 0.5;
    fake.trigger();
    const ownedBeforeFailure = fake.sources.length;
    fake.failNextStart();

    fake.context.currentTime = 1.55;
    fake.trigger();
    fake.trigger();

    expect(audition.current().state).toBe("error");
    expect(audition.current().message).toMatch(/scheduling failed/i);
    expect(fake.dependencies.clearInterval).toHaveBeenCalledOnce();
    expect(fake.sources).toHaveLength(ownedBeforeFailure + 1);
    const partial = fake.sources.at(-1);
    expect(partial?.stop).toHaveBeenCalled();
    expect(partial?.disconnect).toHaveBeenCalled();
    expect(fake.gains.at(-1)?.disconnect).toHaveBeenCalled();
    expect(
      fake.sources.slice(0, ownedBeforeFailure).every((item) => item.stop.mock.calls.length > 0),
    ).toBe(true);
  });

  it("keeps the accepted initial lead constant", () => {
    expect(INITIAL_LEAD_SECONDS).toBe(0.1);
  });
});

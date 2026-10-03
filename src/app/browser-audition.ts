import type { CompleteSectionPreview, PreviewRole } from "../web/complete-section-preview-node";

export const INITIAL_LEAD_SECONDS = 0.1;
export const SCHEDULING_HORIZON_SECONDS = 0.15;
export const SCHEDULING_PUMP_MILLISECONDS = 25;
const ROLES: readonly PreviewRole[] = ["harmony", "bass", "arpeggiator", "lead"];

export type AuditionState = "stopped" | "starting" | "playing" | "error";
export type AudioContextLike = Readonly<{
  currentTime: number;
  state: string;
  resume(): Promise<void>;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
  destination: AudioNode;
}>;
export type BrowserAuditionDependencies = Readonly<{
  createContext(): AudioContextLike;
  setInterval(callback: () => void, milliseconds: number): ReturnType<typeof setInterval>;
  clearInterval(handle: ReturnType<typeof setInterval>): void;
}>;
export type AuditionSnapshot = Readonly<{
  state: AuditionState;
  message: string;
  loop: boolean;
  muted: Readonly<Record<PreviewRole, boolean>>;
  solo: PreviewRole | null;
}>;

type OwnedSource = Readonly<{
  role: PreviewRole;
  start: number;
  source: OscillatorNode;
  gain: GainNode;
}>;
const waves: Readonly<Record<PreviewRole, OscillatorType>> = {
  harmony: "triangle",
  bass: "sine",
  arpeggiator: "triangle",
  lead: "sawtooth",
};

function seconds(preview: CompleteSectionPreview, tick: number): number {
  return (tick * preview.section.tempo.microsecondsPerQuarter) / (preview.section.ppq * 1_000_000);
}
function blankMuted(): Record<PreviewRole, boolean> {
  return { harmony: false, bass: false, arpeggiator: false, lead: false };
}
function validPreview(preview: CompleteSectionPreview): boolean {
  if (
    preview.section.ppq !== 960 ||
    preview.section.barCount !== 8 ||
    preview.section.timeSignature.numerator !== 4 ||
    preview.section.timeSignature.denominator !== 4 ||
    preview.section.endTick !== 30720 ||
    !Number.isSafeInteger(preview.section.tempo.microsecondsPerQuarter) ||
    preview.section.tempo.microsecondsPerQuarter <= 0 ||
    preview.tracks.length !== 4
  )
    return false;
  const names = preview.tracks.map((track) => track.role);
  if (new Set(names).size !== 4 || !ROLES.every((role) => names.includes(role))) return false;
  return preview.tracks.every(
    (track) =>
      track.notes.length > 0 &&
      track.notes.every(
        (note) =>
          Number.isSafeInteger(note.pitch) &&
          note.pitch >= 0 &&
          note.pitch <= 127 &&
          Number.isSafeInteger(note.startTick) &&
          note.startTick >= 0 &&
          Number.isSafeInteger(note.durationTicks) &&
          note.durationTicks > 0 &&
          note.startTick + note.durationTicks <= preview.section.endTick,
      ),
  );
}

/** A bounded, derived-preview-only Web Audio session. It never changes canonical data. */
export class BrowserAudition {
  private context: AudioContextLike | null = null;
  private preview: CompleteSectionPreview | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private owned: OwnedSource[] = [];
  private origin = 0;
  private epoch = 0;
  private nextCycle = 0;
  private nextNote = 0;
  private loop = false;
  private muted = blankMuted();
  private solo: PreviewRole | null = null;
  private volume = 0.5;
  private boundaryInterruption = false;
  private snapshot: AuditionSnapshot = {
    state: "stopped",
    message: "Playback stopped.",
    loop: false,
    muted: blankMuted(),
    solo: null,
  };

  constructor(
    private readonly dependencies: BrowserAuditionDependencies,
    private readonly changed: (snapshot: AuditionSnapshot) => void,
  ) {}
  current(): AuditionSnapshot {
    return this.snapshot;
  }
  private publish(state: AuditionState, message: string) {
    this.snapshot = Object.freeze({
      state,
      message,
      loop: this.loop,
      muted: Object.freeze({ ...this.muted }),
      solo: this.solo,
    });
    this.changed(this.snapshot);
  }
  async play(preview: CompleteSectionPreview) {
    if (this.snapshot.state === "starting" || this.snapshot.state === "playing") return;
    if (!validPreview(preview)) {
      this.publish("error", "Preview data is unavailable for safe playback.");
      return;
    }
    const epoch = ++this.epoch;
    this.preview = preview;
    this.publish("starting", "Starting playback…");
    try {
      this.context ??= this.dependencies.createContext();
      await this.context.resume();
      if (epoch !== this.epoch || this.context.state !== "running")
        throw new Error("Audio context unavailable");
      this.origin = this.context.currentTime + INITIAL_LEAD_SECONDS;
      this.nextCycle = 0;
      this.nextNote = 0;
      this.publish("playing", "Playing all four roles.");
      this.pump(epoch);
      this.timer = this.dependencies.setInterval(
        () => this.pump(epoch),
        SCHEDULING_PUMP_MILLISECONDS,
      );
    } catch {
      if (epoch === this.epoch) {
        this.stop();
        this.publish(
          "error",
          "Audio is unavailable. Check browser audio permissions, then press Play to try again.",
        );
      }
    }
  }
  stop() {
    ++this.epoch;
    if (this.timer) this.dependencies.clearInterval(this.timer);
    this.timer = null;
    this.boundaryInterruption = false;
    for (const { source, gain } of this.owned) {
      try {
        gain.gain.cancelScheduledValues(this.context?.currentTime ?? 0);
        gain.gain.setValueAtTime(0, this.context?.currentTime ?? 0);
        source.stop();
        source.disconnect();
        gain.disconnect();
      } catch {
        /* best-effort owned cleanup must not throw */
      }
    }
    this.owned = [];
    this.publish("stopped", "Playback stopped.");
  }
  setLoop(loop: boolean) {
    this.loop = loop;
    if (!loop) {
      this.cancelFutureCycle();
      this.publish(this.snapshot.state, "Loop will stop at the current section boundary.");
      return;
    }
    if (this.snapshot.state !== "playing" || !this.context || !this.preview) {
      this.publish(this.snapshot.state, "Loop enabled for the next Play.");
      return;
    }
    const boundary =
      this.origin + (this.nextCycle + 1) * seconds(this.preview, this.preview.section.endTick);
    if (boundary - this.context.currentTime < INITIAL_LEAD_SECONDS) {
      this.loop = false;
      this.boundaryInterruption = true;
      this.publish(
        "playing",
        "Playback will stop at the section boundary because Loop was enabled too late.",
      );
    } else this.publish("playing", "Loop enabled.");
  }
  setMute(role: PreviewRole, mute: boolean) {
    this.muted[role] = mute;
    this.updateGains();
    this.publish(this.snapshot.state, "Role isolation updated.");
  }
  setSolo(role: PreviewRole | null) {
    this.solo = role;
    this.updateGains();
    this.publish(this.snapshot.state, "Role isolation updated.");
  }
  setVolume(volume: number) {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      this.publish("error", "Volume must be between 0 and 1.");
      return;
    }
    this.volume = volume;
    this.updateGains();
    this.publish(this.snapshot.state, "Preview volume updated.");
  }
  invalidate() {
    this.stop();
  }
  private pump(epoch: number) {
    if (epoch !== this.epoch || !this.context || !this.preview || this.snapshot.state !== "playing")
      return;
    const cycleSeconds = seconds(this.preview, this.preview.section.endTick);
    const now = this.context.currentTime;
    const horizon = now + SCHEDULING_HORIZON_SECONDS;
    const ordered = this.preview.tracks
      .flatMap((track) => track.notes.map((note) => ({ ...note, role: track.role })))
      .sort(
        (a, b) => a.startTick - b.startTick || a.role.localeCompare(b.role) || a.pitch - b.pitch,
      );
    while (true) {
      const note = ordered[this.nextNote];
      if (!note) {
        if (!this.loop) {
          if (now >= this.origin + (this.nextCycle + 1) * cycleSeconds) {
            const interrupted = this.boundaryInterruption;
            this.stop();
            if (interrupted)
              this.publish("error", "Playback interrupted because Loop was enabled too late.");
          }
          return;
        }
        this.nextCycle += 1;
        this.nextNote = 0;
        continue;
      }
      const start =
        this.origin + this.nextCycle * cycleSeconds + seconds(this.preview, note.startTick);
      if (start >= horizon) return;
      if (start < now) {
        this.stop();
        this.publish("error", "Playback interrupted because safe scheduling fell behind.");
        return;
      }
      this.schedule(
        note.role,
        note.pitch,
        start,
        seconds(this.preview, note.startTick + note.durationTicks),
      );
      this.nextNote += 1;
    }
  }
  private schedule(role: PreviewRole, pitch: number, start: number, end: number) {
    if (!this.context) return;
    const source = this.context.createOscillator();
    const gain = this.context.createGain();
    const duration = end - start;
    source.type = waves[role];
    source.frequency.setValueAtTime(440 * 2 ** ((pitch - 69) / 12), start);
    const level = this.level(role);
    const ramp = Math.min(0.005, duration / 4);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + ramp);
    gain.gain.setValueAtTime(level, end - ramp);
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain);
    gain.connect(this.context.destination);
    source.start(start);
    source.stop(end);
    this.owned.push({ role, start, source, gain });
  }
  private cancelFutureCycle() {
    if (!this.context || !this.preview || this.snapshot.state !== "playing") return;
    const boundary =
      this.origin + (this.nextCycle + 1) * seconds(this.preview, this.preview.section.endTick);
    for (const owned of this.owned) {
      if (owned.start >= boundary) {
        try {
          owned.source.stop(boundary);
        } catch {
          /* owned scheduled cleanup remains fail-safe */
        }
      }
    }
  }
  private maximumSimultaneous(role: PreviewRole): number {
    const notes = this.preview?.tracks.find((track) => track.role === role)?.notes ?? [];
    const points = notes
      .flatMap((note) => [
        { tick: note.startTick, delta: 1 },
        { tick: note.startTick + note.durationTicks, delta: -1 },
      ])
      .sort((a, b) => a.tick - b.tick || a.delta - b.delta);
    let current = 0;
    let maximum = 0;
    for (const point of points) {
      current += point.delta;
      maximum = Math.max(maximum, current);
    }
    return maximum;
  }
  private level(role: PreviewRole): number {
    const active = this.solo ? this.solo === role : !this.muted[role];
    return active ? (0.25 * this.volume) / this.maximumSimultaneous(role) : 0;
  }
  private updateGains() {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const owned of this.owned) {
      owned.gain.gain.cancelScheduledValues(now);
      owned.gain.gain.setValueAtTime(owned.gain.gain.value, now);
      owned.gain.gain.linearRampToValueAtTime(this.level(owned.role), now + 0.005);
    }
  }
}

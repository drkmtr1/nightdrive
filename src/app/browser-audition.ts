import type { CompleteSectionPreview, PreviewRole } from "../web/complete-section-preview-node";

export const INITIAL_LEAD_SECONDS = 0.1;
export const SCHEDULING_HORIZON_SECONDS = 0.15;
export const SCHEDULING_PUMP_MILLISECONDS = 25;
const ROLES: readonly PreviewRole[] = ["harmony", "bass", "arpeggiator", "lead"];

export type AuditionState = "stopped" | "starting" | "playing" | "error";
export type AudioContextLike = {
  currentTime: number;
  state: string;
  onstatechange: ((event: Event) => void) | null;
  resume(): Promise<void>;
  createOscillator(): OscillatorNode;
  createGain(): GainNode;
  destination: AudioNode;
};
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
  end: number;
  envelope: GainNode;
  role: PreviewRole;
  source: OscillatorNode;
  start: number;
}>;
type SessionGraph = Readonly<{
  master: GainNode;
  roles: Readonly<Record<PreviewRole, GainNode>>;
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

/** Derived-preview-only, bounded Web Audio transport. It never changes canonical state. */
export class BrowserAudition {
  private boundaryInterruption = false;
  private context: AudioContextLike | null = null;
  private epoch = 0;
  private graph: SessionGraph | null = null;
  private loop = false;
  private muted = blankMuted();
  private nextCycle = 0;
  private nextNote = 0;
  private origin = 0;
  private owned: OwnedSource[] = [];
  private preview: CompleteSectionPreview | null = null;
  private solo: PreviewRole | null = null;
  private stopAfterCycle = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private volume = 0.5;
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

  async play(preview: CompleteSectionPreview) {
    if (this.snapshot.state === "starting" || this.snapshot.state === "playing") return;
    if (!validPreview(preview)) {
      this.publish("error", "Preview data is unavailable for safe playback.");
      return;
    }
    const epoch = ++this.epoch;
    this.preview = preview;
    this.stopAfterCycle = this.loop ? Number.POSITIVE_INFINITY : 0;
    this.boundaryInterruption = false;
    this.publish("starting", "Starting playback…");
    try {
      this.context ??= this.dependencies.createContext();
      this.observeContext();
      await this.context.resume();
      if (epoch !== this.epoch || this.context.state !== "running")
        throw new Error("Audio context unavailable");
      this.graph = this.createGraph();
      this.origin = this.context.currentTime + INITIAL_LEAD_SECONDS;
      this.nextCycle = 0;
      this.nextNote = 0;
      this.publish("playing", "Playing all four roles.");
      this.pumpSafely(epoch);
      this.timer = this.dependencies.setInterval(
        () => this.pumpSafely(epoch),
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
    const now = this.context?.currentTime ?? 0;
    for (const owned of this.owned) {
      this.cleanupNodes(owned.source, owned.envelope, now);
    }
    this.owned = [];
    if (this.graph) {
      for (const role of ROLES) this.bestEffort(() => this.graph?.roles[role].disconnect());
      this.bestEffort(() => this.graph?.master.disconnect());
    }
    this.graph = null;
    this.publish("stopped", "Playback stopped.");
  }

  invalidate() {
    this.stop();
  }

  setLoop(loop: boolean) {
    this.loop = loop;
    if (this.snapshot.state !== "playing" || !this.context || !this.preview) {
      this.publish(
        this.snapshot.state,
        loop ? "Loop enabled for the next Play." : "Loop disabled.",
      );
      return;
    }
    const currentCycle = this.audibleCycle(this.context.currentTime);
    const boundary = this.boundaryAfter(currentCycle);
    if (!loop) {
      this.stopAfterCycle = currentCycle;
      this.cancelFrom(boundary);
      this.publish("playing", "Loop will stop at the current section boundary.");
      return;
    }
    if (boundary - this.context.currentTime < INITIAL_LEAD_SECONDS) {
      this.loop = false;
      this.stopAfterCycle = currentCycle;
      this.boundaryInterruption = true;
      this.cancelFrom(boundary);
      this.publish(
        "playing",
        "Playback will stop at the section boundary because Loop was enabled too late.",
      );
      return;
    }
    this.stopAfterCycle = Number.POSITIVE_INFINITY;
    this.publish("playing", "Loop enabled.");
    this.pumpSafely(this.epoch);
  }

  setMute(role: PreviewRole, mute: boolean) {
    this.muted[role] = mute;
    this.updateRoleBuses();
    this.publish(
      this.snapshot.state,
      this.isAllMuted() ? "All roles are muted." : "Role isolation updated.",
    );
  }

  setSolo(role: PreviewRole | null) {
    this.solo = role;
    this.updateRoleBuses();
    this.publish(
      this.snapshot.state,
      this.isAllMuted() ? "All roles are muted." : "Role isolation updated.",
    );
  }

  setVolume(volume: number) {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      this.publish(this.snapshot.state, "Volume must be between 0 and 1.");
      return;
    }
    this.volume = volume;
    if (this.context && this.graph) {
      const now = this.context.currentTime;
      this.graph.master.gain.cancelScheduledValues(now);
      this.graph.master.gain.setValueAtTime(volume, now);
    }
    this.publish(this.snapshot.state, "Preview volume updated.");
  }

  private createGraph(): SessionGraph {
    if (!this.context) throw new Error("Missing context");
    const master = this.context.createGain();
    const roles = Object.fromEntries(
      ROLES.map((role) => [role, this.context?.createGain()]),
    ) as Record<PreviewRole, GainNode>;
    const now = this.context.currentTime;
    master.gain.setValueAtTime(this.volume, now);
    master.connect(this.context.destination);
    for (const role of ROLES) roles[role].connect(master);
    const graph = Object.freeze({ master, roles: Object.freeze(roles) });
    this.graph = graph;
    this.updateRoleBuses();
    return graph;
  }

  private observeContext() {
    if (!this.context) return;
    const context = this.context;
    context.onstatechange = () => {
      if (this.context !== context) return;
      if (this.snapshot.state !== "starting" && this.snapshot.state !== "playing") return;
      if (context.state === "running") return;
      this.interrupt("Audio playback was interrupted. Press Play to start again.");
      if (context.state === "closed" && this.context === context) this.context = null;
    };
  }

  private interrupt(message: string) {
    this.stop();
    this.publish("error", message);
  }

  private bestEffort(operation: () => void) {
    try {
      operation();
    } catch {
      /* individual cleanup failures must not block later cleanup */
    }
  }

  private cleanupNodes(source: OscillatorNode | null, envelope: GainNode | null, now: number) {
    this.bestEffort(() => envelope?.gain.cancelScheduledValues(now));
    this.bestEffort(() => envelope?.gain.setValueAtTime(0, now));
    this.bestEffort(() => source?.stop());
    this.bestEffort(() => source?.disconnect());
    this.bestEffort(() => envelope?.disconnect());
  }

  private pumpSafely(epoch: number) {
    try {
      this.pump(epoch);
    } catch {
      if (epoch === this.epoch)
        this.interrupt("Playback interrupted because audio scheduling failed.");
    }
  }

  private pump(epoch: number) {
    if (epoch !== this.epoch || !this.context || !this.preview || this.snapshot.state !== "playing")
      return;
    const now = this.context.currentTime;
    const currentCycle = this.audibleCycle(now);
    if (
      currentCycle > this.stopAfterCycle ||
      (currentCycle === this.stopAfterCycle && now >= this.boundaryAfter(currentCycle))
    ) {
      const interrupted = this.boundaryInterruption;
      this.stop();
      if (interrupted)
        this.publish("error", "Playback interrupted because Loop was enabled too late.");
      return;
    }
    const horizon = now + SCHEDULING_HORIZON_SECONDS;
    const ordered = this.orderedNotes();
    while (this.nextCycle <= this.stopAfterCycle) {
      const note = ordered[this.nextNote];
      if (!note) {
        this.nextCycle += 1;
        this.nextNote = 0;
        continue;
      }
      const start =
        this.origin + this.nextCycle * this.cycleSeconds() + seconds(this.preview, note.startTick);
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
        start + seconds(this.preview, note.durationTicks),
      );
      this.nextNote += 1;
    }
  }

  private schedule(role: PreviewRole, pitch: number, start: number, end: number) {
    if (!this.context || !this.graph) return;
    let source: OscillatorNode | null = null;
    let envelope: GainNode | null = null;
    try {
      source = this.context.createOscillator();
      envelope = this.context.createGain();
      const maximum = this.maximumSimultaneous(role);
      const ramp = Math.min(0.005, (end - start) / 4);
      source.type = waves[role];
      source.frequency.setValueAtTime(440 * 2 ** ((pitch - 69) / 12), start);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(1 / maximum, start + ramp);
      envelope.gain.setValueAtTime(1 / maximum, end - ramp);
      envelope.gain.linearRampToValueAtTime(0, end);
      source.connect(envelope);
      envelope.connect(this.graph.roles[role]);
      source.start(start);
      source.stop(end);
      this.owned.push({ role, start, end, source, envelope });
    } catch (error) {
      this.cleanupNodes(source, envelope, this.context.currentTime);
      throw error;
    }
  }

  private orderedNotes() {
    return this.requirePreview()
      .tracks.flatMap((track) => track.notes.map((note) => ({ ...note, role: track.role })))
      .sort(
        (a, b) => a.startTick - b.startTick || a.role.localeCompare(b.role) || a.pitch - b.pitch,
      );
  }
  private cycleSeconds() {
    const preview = this.requirePreview();
    return seconds(preview, preview.section.endTick);
  }
  private audibleCycle(now: number) {
    return Math.max(0, Math.floor((now - this.origin) / this.cycleSeconds()));
  }
  private boundaryAfter(cycle: number) {
    return this.origin + (cycle + 1) * this.cycleSeconds();
  }
  private cancelFrom(boundary: number) {
    for (const owned of this.owned) {
      if (owned.start >= boundary) {
        try {
          owned.source.stop(boundary);
        } catch {
          /* scheduled owned source is already stopped */
        }
      }
    }
  }
  private maximumSimultaneous(role: PreviewRole): number {
    const track = this.requirePreview().tracks.find((item) => item.role === role);
    if (!track) throw new Error("Missing preview role");
    const notes = track.notes;
    const points = notes
      .flatMap((note) => [
        { tick: note.startTick, delta: 1 },
        { tick: note.startTick + note.durationTicks, delta: -1 },
      ])
      .sort((a, b) => a.tick - b.tick || a.delta - b.delta);
    let active = 0;
    let maximum = 0;
    for (const point of points) {
      active += point.delta;
      maximum = Math.max(maximum, active);
    }
    return maximum;
  }
  private updateRoleBuses() {
    if (!this.context || !this.graph) return;
    const now = this.context.currentTime;
    for (const role of ROLES) {
      const active = this.solo ? this.solo === role : !this.muted[role];
      const gain = this.graph.roles[role].gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(active ? 0.25 : 0, now + 0.005);
    }
  }
  private isAllMuted() {
    return this.solo === null && ROLES.every((role) => this.muted[role]);
  }
  private requirePreview(): CompleteSectionPreview {
    if (!this.preview) throw new Error("Missing preview");
    return this.preview;
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
}

# Milestone 1 browser audition transport specification

## Lifecycle and authority

CANDIDATE. This exact specification becomes accepted implementation authority only after consequential independent exact-head review PASS, explicit Product Owner acceptance of the reviewed tuple, and protected integration. Before those conditions are satisfied, it is not implementation authority. Review PASS alone does not accept these proposed timing, voice, or interaction decisions.

This is one bounded SPECIFY task completing ADR-011 only for Milestone 1 under ADR-026, FR-003, AC-014, A11Y-004 and the functional direction in [UX design](../UX_DESIGN.md). It introduces no audio implementation, canonical format, generation algorithm, dependency or formal qualification. Existing accepted contracts prevail outside this bounded preview surface.

## Producer capability and input ownership

The producer can explicitly Play the currently generated eight-bar section, Stop it, repeat it with Loop, hear all four roles together, and isolate Lead or another role. The existing `CompleteSectionPreview` is the only application input; no intermediate representation, browser generation, hash authentication or persistence is added. Pitches, ticks, tempo and source identity remain unchanged.

Before allocating voices, reject a preview unless it has the four unique declared roles, 960 PPQ, eight bars of 4/4, endTick 30720, a positive finite integer microsecondsPerQuarter, and notes with integer MIDI pitches 0..127, nonnegative integer startTick, positive integer durationTicks, and ends no later than endTick. Reject nonfinite arithmetic or an empty role. Rejection leaves transport stopped with a safe diagnostic; never repair, clip, transpose, omit or substitute notes. These checks protect this derived boundary and do not establish canonical verification authority.

## Clock and scheduling proposal

Use native Web Audio, with one lazily created AudioContext owned by the mounted audition consumer. Create/resume it only from explicit Play. AudioContext.currentTime owns scheduling; wall-clock time and animation frames never own note timing. Convert ticks using `seconds(t) = t * microsecondsPerQuarter / (960 * 1000000)`. For cycle index k, onset is `origin + k * seconds(endTick) + seconds(startTick)`, and note end uses the same origin plus seconds(startTick + durationTicks). Do not accumulate rounded cycle lengths or change canonical ticks.

After successful resume and confirmation of a running context, choose origin = currentTime + 0.10 seconds. Pump immediately, then every 25 milliseconds, scheduling starts strictly before currentTime + 0.15 seconds. Maintain a monotonic cycle/note cursor with each occurrence scheduled exactly once; equal onsets share the same audio timestamp. Timers only replenish the horizon. The 100 ms start lead and 150 ms horizon are proposed scheduling parameters, not audible latency guarantees.

If an unscheduled onset is already earlier than currentTime, stop the session and report interrupted playback. Do not bunch late notes, skip them silently, accelerate, retry or restart automatically. Stop on hidden document, context suspension/interruption/closure, unexpected scheduler failure or unmount. Returning to the tab requires another explicit Play from tick zero. This intentionally bounds internal desktop foreground audition; it makes no background, mobile or supported-platform claim.

## Transport and stale ownership

States are stopped, starting, playing and error. No pause/seek behavior is introduced. Play is available only for a ready current preview and when not starting/playing. A repeated Play while starting/playing does nothing. Resume rejection or unavailable Web Audio preserves the preview for inspection and displays a safe audio-unavailable message.

Stop invalidates the session epoch immediately, cancels the pump, silences the session output, stops and disconnects every owned scheduled/active source and resets position to zero. It is idempotent, including while resume is pending. Any later resume completion or source callback from that epoch cannot schedule audio or install state. Output is silenced on the audio clock immediately; hardware output buffering is not claimed to disappear instantly. Cleanup errors cannot permit remaining output to become audible.

Changing a generation-relevant control or submitting Generate stops playback and invalidates its session before the existing preview is cleared/replaced. Generation remains explicit and retains the reviewed request-epoch behavior. A newly returned preview never autoplays. Do not continue playing stale notes against changed visible inputs.

Loop defaults off. A loop toggle during playing takes effect at the next section boundary; already scheduled occurrences must reflect that decision without duplicate starts or overlap from a previous session. With Loop off, finish the current cycle and stop at its exact boundary. With Loop on, schedule the next cycle from the original origin formula. No tail extends past the boundary. Stop always wins over pending loop transitions. When Loop is turned off, cancel owned future-cycle sources at or beyond the next boundary, retaining current-cycle sources. When Loop is turned ON during playback, the next cycle may begin only if the next section boundary is at least 0.100 seconds after AudioContext.currentTime at the moment the toggle is processed. At exactly 0.100 seconds remaining or more, turning Loop on replenishes the next-cycle horizon immediately. If less than 0.100 seconds remains, do not attempt a late loop start: finish/stop at the current section boundary and report the interrupted-playback diagnostic. This cutoff reuses the existing 0.100-second initial start-lead constant; no separate loop safety threshold is introduced. Cancellation and replenishment retain one occurrence per cycle/note; no automatic restart is permitted.

## Voices, volume and isolation proposal

Use one oscillator and gain envelope per note, without samples, network assets, effects or third-party synths. MIDI frequency is `440 * 2 ** ((pitch - 69) / 12)`. Proposed waveforms: Harmony triangle, Bass sine, Arpeggiator triangle, Lead sawtooth. These are distinguishable placeholder audition voices, not production sound design or musical acceptance.

Use a linear attack/release of min(5 ms, one quarter of the note duration), with sustain between them; the source stops at the exact note end. At each role bus, divide voice amplitude by that role's maximum simultaneous note count computed from half-open note intervals across the supplied section, so its summed peak is bounded by one. Mix each of four buses at 0.25; master volume defaults to 0.5 and is constrained to 0..1. Invalid volume changes are rejected. This conservative bound avoids relying on a limiter or clipping repair.

Provide independent labeled Mute toggles and one exclusive Solo selector (none or one role). Solo takes precedence over mute: the selected role is audible alone even if its mute toggle was set; leaving Solo restores stored mute states. Isolation changes only bus gains with a 5 ms linear ramp from the current gain, canceling obsolete ramps. It does not alter voices, note timing, canonical data or generation. No rescheduling or fresh seed is introduced. All muted is a valid silent state with an explicit status.

## UI and evidence gate

Use labeled keyboard-operable Play, Stop, Loop, volume, Mute and Solo controls; show starting/playing/stopped/error and source identity. Never announce every playback tick through a live region. Position display may use animation frames as a derived view and respects reduced motion. It cannot control the audio clock. Preserve the accepted dark functional surface without brand work.

Implementation evidence must cover exact independently calculated tick/second fixtures, equal-time role alignment, cycle arithmetic over many loops without accumulation, one-time scheduling, late-pump failure, loop toggles around boundaries, Stop during resume, stale callbacks, replacement/unmount/hidden cleanup, unavailable/resume-failed context, all isolation combinations, envelope ends, gain bounds and keyboard states. Use existing test tooling with a small injected fake audio clock/context; no new framework or dependency is authorized.

Loop-activation tests must prove that Loop ON with exactly 0.100 seconds remaining is eligible to continue, and with more than 0.100 seconds remaining is eligible. With less than 0.100 seconds remaining, prove no next-cycle start, completion/stop at the current section boundary and interrupted-playback handling. Preserve evidence for unchanged Loop OFF behavior and Stop winning over loop transitions, including an already pending boundary stop/diagnostic.

Before claiming AC-014, run internal desktop-browser formative checks with real Web Audio: explicit start, all roles, isolated Lead, Stop, several loops, visibility interruption and recovery. Record observed onset/boundary skew against the scheduled clock; proposed tolerance is 20 ms for foreground synchronization, with no drift trend across ten cycles. A fake-clock PASS alone is not real-browser timing evidence. Failure requires a bounded correction or contract disposition, not invented tolerance. Listening confirms functional audibility only; structured musical acceptance and wider browser/device qualification remain separate.

## Build vs. Buy, execution and limits

Classification is mixed: Nightdrive owns preview ownership and musical tick mapping; browser-native Web Audio supplies commodity audio mechanisms. ADR-026 already favors a small Web Audio implementation. A library would add runtime surface without supplying needed canonical semantics or solving browser interruption policies. No package research/adoption or generalized scheduler is needed for this bounded proposal; revisit only on concrete implementation evidence.

Task recommendation: a capable coding model at high reasoning effort for timing and asynchronous ownership. The current model/effort selector is not observable or changeable through this task; no model switch is claimed. Escalate to a consequential decision if correct implementation requires relaxing the stated behavior or expanding scope.

Validation of this SPECIFY candidate is documentation validation, diff checks and authority/scope inspection, not runtime tests or audio measurement. No browser implementation, deployment, Supabase, persistence, authentication, database, AI, MIDI export, Stage 8 capture/freeze/comparison or qualification is included. S8-QUAL-002/003 remain OPEN. Milestone 1 remains incomplete until the producer can actually hear the four-role section and isolate Lead.

Technical API basis: [W3C Web Audio 1.0](https://www.w3.org/TR/webaudio-1.0/) defines AudioContext-relative scheduled times and source start/stop. It supplies browser API behavior, not acceptance of Nightdrive's proposed policy parameters.

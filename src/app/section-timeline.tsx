import type { CompleteSectionPreview, PreviewRole } from "../web/complete-section-preview-node";

const ROLE_LABELS: Readonly<Record<PreviewRole, string>> = {
  harmony: "Harmony",
  bass: "Bass",
  arpeggiator: "Arpeggiator",
  lead: "Lead",
};

type Props = Readonly<{ preview: CompleteSectionPreview }>;

/** A read-only visual projection of the validated preview's tick positions. */
export function SectionTimeline({ preview }: Props) {
  const { barCount, endTick } = preview.section;
  const bars = Array.from({ length: barCount }, (_, index) => index + 1);
  const barLines = Array.from({ length: barCount + 1 }, (_, index) => index);

  return (
    <section className="sectionTimeline" aria-labelledby="timeline-title">
      <h3 id="timeline-title">Eight-bar note timeline</h3>
      <p className="supportingCopy">
        Read-only view of the generated preview. Note position and length follow its start and
        duration ticks; MIDI pitch and exact tick values are available in each role’s note details.
      </p>
      <div className="timelineViewport">
        <table className="timelineTable">
          <caption>Four-role notes positioned across the generated eight-bar section</caption>
          <thead>
            <tr>
              <th scope="col">Role</th>
              <th scope="col">
                <div className="timelineBars">
                  {bars.map((bar) => (
                    <span key={bar}>Bar {bar}</span>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {preview.tracks.map((track) => {
              const roleLabel = ROLE_LABELS[track.role];
              return (
                <tr key={track.role}>
                  <th scope="row">{roleLabel}</th>
                  <td>
                    <ul
                      className="timelineLane"
                      data-role={track.role}
                      aria-label={`${roleLabel} note positions`}
                    >
                      {barLines.map((bar) => (
                        <span
                          key={bar}
                          className="timelineBarLine"
                          style={{ left: `${(bar / barCount) * 100}%` }}
                          aria-hidden="true"
                        />
                      ))}
                      {track.notes.map((note) => (
                        <li
                          key={`${note.startTick}-${note.pitch}-${note.durationTicks}`}
                          className="timelineNote"
                          aria-label={`${roleLabel} note, MIDI pitch ${note.pitch}, start tick ${note.startTick}, duration ${note.durationTicks} ticks`}
                          title={`${roleLabel}: MIDI ${note.pitch}, start ${note.startTick} ticks, duration ${note.durationTicks} ticks`}
                          data-note-pitch={note.pitch}
                          data-start-tick={note.startTick}
                          data-duration-ticks={note.durationTicks}
                          style={{
                            left: `${(note.startTick / endTick) * 100}%`,
                            width: `${(note.durationTicks / endTick) * 100}%`,
                          }}
                        />
                      ))}
                    </ul>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

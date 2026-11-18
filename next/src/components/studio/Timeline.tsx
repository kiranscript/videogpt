"use client";
import { useRef, useState } from "react";
import type { TimelineEvent, VideoProject } from "@/lib/rendering";
import { frontToBack } from "@/lib/project/layers";
import { elementName } from "@/lib/project/elementName";
import { retimeEvent } from "@/lib/project/edit";
import { Frame } from "./Canvas";
import { Icon } from "./Icon";
const label = elementName;
const precise = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

export function Timeline({
  hidden,
  expanded,
  expand,
  project,
  time,
  seek,
  selected,
  select,
  commit,
}: {
  hidden: boolean;
  expanded: boolean;
  expand: (value: boolean) => void;
  project: VideoProject;
  time: number;
  seek: (time: number) => void;
  selected: string | null;
  select: (id: string | null) => void;
  commit: (project: VideoProject) => void;
}) {
  const chapters = project.chapters?.length
    ? project.chapters
    : [{ name: "Scene 1", time: 0 }];
  const active = Math.max(
    0,
    chapters.findLastIndex((chapter) => time >= chapter.time),
  );
  const sceneStart = chapters[active].time;
  const sceneEnd = chapters[active + 1]?.time ?? project.duration;
  const elements = frontToBack(
    project.events.filter(
      (event) =>
        event.type !== "background" &&
        event.start < sceneEnd &&
        event.end > sceneStart,
    ),
  );
  const [tracksOpen, setTracksOpen] = useState(false);
  const [rename, setRename] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<TimelineEvent | null>(null);
  const drag = useRef<{
    event: TimelineEvent;
    kind: "move" | "start" | "end";
    x: number;
    width: number;
    next: TimelineEvent;
  } | null>(null);
  const ruler = useRef<HTMLDivElement>(null);
  const sceneStrip = useRef<HTMLDivElement>(null);
  const renameScene = () => {
    if (rename !== null && name.trim())
      commit({
        ...project,
        chapters: chapters.map((chapter, index) =>
          index === rename ? { ...chapter, name: name.trim() } : chapter,
        ),
      });
    setRename(null);
  };
  const apply = (event: TimelineEvent) =>
    commit({
      ...project,
      events: project.events.map((item) =>
        item.id === event.id ? event : item,
      ),
    });
  const begin = (
    pointer: React.PointerEvent<HTMLDivElement>,
    event: TimelineEvent,
    kind: "move" | "start" | "end",
  ) => {
    const width = pointer.currentTarget
      .closest(".element-track")!
      .getBoundingClientRect().width;
    drag.current = { event, kind, x: pointer.clientX, width, next: event };
    pointer.currentTarget.focus();
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
  };
  const move = (pointer: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const delta =
      Math.round(
        ((pointer.clientX - current.x) / current.width) *
          project.duration *
          100,
      ) / 100;
    const original = current.event;
    const start =
      current.kind === "move"
        ? clamp(
            original.start + delta,
            0,
            project.duration - (original.end - original.start),
          )
        : current.kind === "start"
          ? clamp(original.start + delta, 0, original.end - 0.1)
          : original.start;
    const end =
      current.kind === "move"
        ? start + original.end - original.start
        : current.kind === "end"
          ? clamp(original.end + delta, original.start + 0.1, project.duration)
          : original.end;
    current.next = retimeEvent(original, start, end);
    setDraft(current.next);
  };
  const finish = () => {
    if (
      drag.current &&
      (drag.current.next.start !== drag.current.event.start ||
        drag.current.next.end !== drag.current.event.end)
    )
      apply(drag.current.next);
    drag.current = null;
    setDraft(null);
  };
  const keyboard = (
    key: React.KeyboardEvent<HTMLDivElement>,
    event: TimelineEvent,
    kind: "move" | "start" | "end",
  ) => {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(key.key)
    )
      return;
    key.preventDefault();
    key.stopPropagation();
    if (key.key === "Home" || key.key === "End") {
      const high = key.key === "End";
      const duration = event.end - event.start;
      const start =
        kind === "start"
          ? high
            ? event.end - 0.1
            : 0
          : kind === "move"
            ? high
              ? project.duration - duration
              : 0
            : event.start;
      const end =
        kind === "end"
          ? high
            ? project.duration
            : event.start + 0.1
          : kind === "move"
            ? start + duration
            : event.end;
      apply(retimeEvent(event, start, end));
      return;
    }
    const delta =
      (["ArrowLeft", "ArrowDown"].includes(key.key) ? -1 : 1) *
      (key.shiftKey ? 0.5 : 0.1);
    const start =
      kind === "move"
        ? clamp(
            event.start + delta,
            0,
            project.duration - (event.end - event.start),
          )
        : kind === "start"
          ? clamp(event.start + delta, 0, event.end - 0.1)
          : event.start;
    const end =
      kind === "move"
        ? start + event.end - event.start
        : kind === "end"
          ? clamp(event.end + delta, event.start + 0.1, project.duration)
          : event.end;
    apply(
      retimeEvent(
        event,
        Math.round(start * 100) / 100,
        Math.round(end * 100) / 100,
      ),
    );
  };
  return (
    <section
      id="story-timeline"
      hidden={hidden}
      className={`timeline-panel ${tracksOpen ? "tracks-open" : ""}`}
      aria-label="Scene timeline"
    >
      <div className="timeline-heading">
        <div>
          <strong>Your story</strong>
          <span>
            {chapters.length} scenes · {project.duration}s
          </span>
        </div>
        <div className="timeline-actions">
          <button
            className="icon-button timeline-expand"
            aria-label={expanded ? "Collapse timeline" : "Expand timeline"}
            title={expanded ? "Collapse timeline" : "Expand timeline"}
            onClick={() => {
              expand(!expanded);
              if (!expanded) setTracksOpen(true);
            }}
          >
            <Icon name={expanded ? "collapse" : "expand"} size={16} />
          </button>
          <button
            className={`timing-toggle ${tracksOpen ? "active" : ""}`}
            onClick={() => setTracksOpen(!tracksOpen)}
            aria-expanded={tracksOpen}
          >
            <Icon name="layers" size={15} />
            Element timing
          </button>
        </div>
      </div>
      <div className="scene-strip-heading">
        <span>{tracksOpen ? "Scenes" : "Scene previews"}</span>
        <small>Choose a scene to jump to it</small>
      </div>
      <div className="scene-strip-wrap">
        <div className="scene-track" ref={sceneStrip}>
          {chapters.map((chapter, index) => {
            const end = chapters[index + 1]?.time ?? project.duration;
            return (
              <div
                key={`${index}-${chapter.time}`}
                className={`scene-card ${active === index ? "active" : ""}`}
              >
                <button
                  className="scene-preview-button"
                  hidden={tracksOpen}
                  onClick={() => {
                    seek(chapter.time);
                    select(null);
                  }}
                  aria-label={`Go to scene ${index + 1}: ${chapter.name}`}
                  aria-current={active === index ? "true" : undefined}
                >
                  <div className="scene-thumbnail">
                    <Frame project={project} time={(chapter.time + end) / 2} />
                  </div>
                </button>
                <div className="scene-caption">
                  <span className="scene-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {rename === index ? (
                    <input
                      className="scene-rename"
                      aria-label="Scene name"
                      value={name}
                      autoFocus
                      maxLength={50}
                      onChange={(event) => setName(event.target.value)}
                      onBlur={renameScene}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") renameScene();
                        if (event.key === "Escape") setRename(null);
                      }}
                    />
                  ) : (
                    <button
                      className="scene-name"
                      aria-current={tracksOpen && active === index ? "true" : undefined}
                      onClick={() => {
                        seek(chapter.time);
                        select(null);
                      }}
                      onDoubleClick={() => {
                        setRename(index);
                        setName(chapter.name);
                      }}
                      title="Double-click to rename"
                    >
                      {chapter.name}
                    </button>
                  )}
                  <small>{(end - chapter.time).toFixed(1)}s</small>
                  <button
                    className="scene-rename-button icon-button"
                    aria-label={`Rename ${chapter.name}`}
                    onClick={() => {
                      setRename(index);
                      setName(chapter.name);
                    }}
                  >
                    <Icon name="pencil" size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="scene-scroll-navigation">
        <span>Swipe for more scenes</span>
        <button
          className="scene-scroll-next"
          aria-label="Scroll to more scenes"
          onClick={() =>
            sceneStrip.current?.scrollBy({ left: 286, behavior: "smooth" })
          }
        >
          <Icon name="chevron" size={17} />
        </button>
      </div>
      <div className={tracksOpen ? "timing-section" : "ruler-section"}>
        <div className="ruler-heading">
          <span>Time ruler</span>
          <small>Seconds</small>
        </div>
        {tracksOpen && (
          <div className="timing-guidance">
            <p>
              Drag a bar to move it. Drag its edges to trim. Arrow keys adjust
              by 0.1s.
            </p>
            <div className="timing-scroll-hint">
              Scroll horizontally for precise timing{" "}
              <Icon name="arrow" size={13} />
            </div>
          </div>
        )}
        <div className={tracksOpen ? "timing-viewport" : ""}>
          <div className={tracksOpen ? "timing-surface" : ""}>
            <div
              className="time-ruler-wrap"
              ref={ruler}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.querySelector("input")?.focus();
                const rect = event.currentTarget.getBoundingClientRect();
                seek(
                  clamp(
                    ((event.clientX - rect.left) / rect.width) *
                      project.duration,
                    0,
                    project.duration,
                  ),
                );
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  const rect = event.currentTarget.getBoundingClientRect();
                  seek(
                    clamp(
                      ((event.clientX - rect.left) / rect.width) *
                        project.duration,
                      0,
                      project.duration,
                    ),
                  );
                }
              }}
              onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId))
                  event.currentTarget.releasePointerCapture(event.pointerId);
              }}
            >
              <div className="timeline-ruler" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <span key={index} style={{ left: `${index * 20}%` }}>
                    {Number(((index * project.duration) / 5).toFixed(1))}s
                  </span>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={project.duration}
                step={0.01}
                value={time}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label="Timeline playhead"
                aria-valuetext={`${time.toFixed(1)} of ${project.duration.toFixed(1)} seconds`}
                className="ruler-input"
              />
              <div
                className="ruler-playhead"
                style={{ left: `${(time / project.duration) * 100}%` }}
                aria-hidden="true"
              >
                <span />{" "}
              </div>
            </div>
            {tracksOpen && (
              <div className="element-timing">
                <div className="element-rows">
                  {elements.map((original) => {
                    const event = draft?.id === original.id ? draft : original;

                    return (
                      <div
                        className={`element-row ${selected === event.id ? "selected" : ""}`}
                        key={event.id}
                      >
                        <button
                          aria-pressed={selected === event.id}
                          className="element-label"
                          onClick={() => {
                            seek(clamp(time, event.start, event.end - 0.01));
                            select(event.id);
                          }}
                          title={label(event)}
                        >
                          <Icon
                            name={event.type === "text" ? "text" : "shape"}
                            size={13}
                          />
                          <span>{label(event)}</span>
                        </button>
                        <div className="element-track">
                          <span
                            className="track-playhead"
                            style={{
                              left: `${(time / project.duration) * 100}%`,
                            }}
                          />
                          <div
                            className={`event-bar event-${event.type} ${selected === event.id ? "is-selected" : ""}`}
                            style={{
                              left: `${(event.start / project.duration) * 100}%`,
                              width: `${((event.end - event.start) / project.duration) * 100}%`,
                            }}
                          >
                            <div
                              tabIndex={0}
                              className="trim-handle start"
                              role="slider"
                              aria-orientation="horizontal"
                              aria-valuemin={0}
                              aria-valuemax={precise(event.end - 0.1)}
                              aria-valuenow={precise(event.start)}
                              aria-valuetext={`Starts at ${event.start.toFixed(1)} seconds, ends at ${event.end.toFixed(1)} seconds`}
                              aria-label={`Trim start of ${label(event)}`}
                              title={`${event.start.toFixed(1)}s start — drag or use arrow keys`}
                              onPointerDown={(pointer) =>
                                begin(pointer, original, "start")
                              }
                              onPointerMove={move}
                              onPointerUp={finish}
                              onPointerCancel={() => {
                                drag.current = null;
                                setDraft(null);
                              }}
                              onKeyDown={(key) =>
                                keyboard(key, original, "start")
                              }
                            />
                            <div
                              tabIndex={0}
                              className="event-bar-body"
                              role="slider"
                              aria-orientation="horizontal"
                              aria-valuemin={0}
                              aria-valuemax={precise(
                                project.duration - (event.end - event.start),
                              )}
                              aria-valuenow={precise(event.start)}
                              aria-valuetext={`${event.start.toFixed(1)} to ${event.end.toFixed(1)} seconds, duration ${(event.end - event.start).toFixed(1)} seconds`}
                              aria-label={`Move timing of ${label(event)}`}
                              title={`${event.start.toFixed(1)}s – ${event.end.toFixed(1)}s`}
                              onPointerDown={(pointer) =>
                                begin(pointer, original, "move")
                              }
                              onPointerMove={move}
                              onPointerUp={finish}
                              onPointerCancel={() => {
                                drag.current = null;
                                setDraft(null);
                              }}
                              onKeyDown={(key) =>
                                keyboard(key, original, "move")
                              }
                            >
                              {selected === event.id && (
                                <Icon name="check" size={12} />
                              )}
                              <span className="bar-name">{label(event)}</span>
                              <small>
                                {(event.end - event.start).toFixed(1)}s
                              </small>
                            </div>
                            <div
                              tabIndex={0}
                              className="trim-handle end"
                              role="slider"
                              aria-orientation="horizontal"
                              aria-valuemin={precise(event.start + 0.1)}
                              aria-valuemax={project.duration}
                              aria-valuenow={precise(event.end)}
                              aria-valuetext={`Ends at ${event.end.toFixed(1)} seconds, starts at ${event.start.toFixed(1)} seconds`}
                              aria-label={`Trim end of ${label(event)}`}
                              title={`${event.end.toFixed(1)}s end — drag or use arrow keys`}
                              onPointerDown={(pointer) =>
                                begin(pointer, original, "end")
                              }
                              onPointerMove={move}
                              onPointerUp={finish}
                              onPointerCancel={() => {
                                drag.current = null;
                                setDraft(null);
                              }}
                              onKeyDown={(key) =>
                                keyboard(key, original, "end")
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

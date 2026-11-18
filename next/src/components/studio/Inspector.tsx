"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { visibleEvents } from "@/lib/rendering";
import type { TimelineEvent, VideoProject } from "@/lib/rendering";
import type { CSSProperties } from "react";
import { frontToBack } from "@/lib/project/layers";
import { elementName } from "@/lib/project/elementName";
import { moveEvent, retimeEvent } from "@/lib/project/edit";
import { useViewportHeight } from "./useViewportHeight";
import { Icon } from "./Icon";
function NumberField({
  label,
  value,
  onChange,
  min = -10000,
  max = 10000,
  unit = "px",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const format = (number: number) =>
    unit === "s" ? number.toFixed(1) : String(Math.round(number * 100) / 100);
  const [previous, setPrevious] = useState(value);
  const [draft, setDraft] = useState(format(value));
  if (previous !== value) {
    setPrevious(value);
    setDraft(format(value));
  }
  return (
    <label className="property-field">
      <span>{label}</span>
      <span className="number-input">
        <input
          aria-label={label}
          type="number"
          value={draft}
          min={min}
          max={max}
          step={unit === "s" ? 0.1 : 1}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            const number = Number(draft);
            if (draft.trim() && Number.isFinite(number)) {
              const next = Math.min(max, Math.max(min, number));
              setDraft(format(next));
              if (next !== value) onChange(next);
            } else setDraft(format(value));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        {unit && <span>{unit}</span>}
      </span>
    </label>
  );
}
function ColorField({
  label,
  color,
  change,
}: {
  label: string;
  color: string;
  change: (value: string) => void;
}) {
  const [previous, setPrevious] = useState(color);
  const [draft, setDraft] = useState(color);
  if (previous !== color) {
    setPrevious(color);
    setDraft(color);
  }
  return (
    <label className="color-field">
      <span>{label}</span>
      <span className="color-input">
        <input
          aria-label={`${label} picker`}
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff"}
          onChange={(event) => change(event.target.value)}
        />
        <input
          className="hex-input"
          aria-label={`${label} hex`}
          value={draft}
          maxLength={9}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (/^#[0-9a-f]{6}$/i.test(draft)) change(draft);
            else setDraft(color);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </span>
    </label>
  );
}
export function Inspector({
  project,
  selected,
  select,
  commit,
  time,
  seek,
  close,
  modal,
  sheet,
}: {
  project: VideoProject;
  selected: string | null;
  select: (id: string | null) => void;
  commit: (video: VideoProject, group?: string) => void;
  time: number;
  seek: (time: number) => void;
  close: () => void;
  modal: boolean;
  sheet: boolean;
}) {
  const viewportHeight = useViewportHeight();
  const [tab, setTab] = useState<"design" | "layers">(
    selected ? "design" : "layers",
  );
  const [previousSelected, setPreviousSelected] = useState(selected);
  if (previousSelected !== selected) {
    setPreviousSelected(selected);
    if (selected) setTab("design");
  }
  const root = useRef<HTMLElement>(null);
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const currentSheetHeight =
    sheetHeight ??
    Math.max(160, Math.min(viewportHeight * 0.43, viewportHeight - 405));
  const sheetDrag = useRef<{ y: number; height: number } | null>(null);
  const closePanel = useEffectEvent(close);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    root.current
      ?.querySelector<HTMLButtonElement>(
        'button[aria-label="Close properties"]',
      )
      ?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
      if (event.key !== "Tab") return;
      const items = [
        ...(root.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,textarea,select",
        ) ?? []),
      ].filter((item) => item.getClientRects().length > 0);
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [modal]);
  const event = project.events.find((event) => event.id === selected);
  const update = (change: object, group?: string) => {
    if (event)
      commit(
        {
          ...project,
          events: project.events.map((item) =>
            item.id === event.id
              ? ({ ...item, ...change } as TimelineEvent)
              : item,
          ),
        },
        group ? `${event.id}:${group}` : undefined,
      );
  };
  const visible = visibleEvents(project, time);
  const color =
    event &&
    ("color" in event
      ? event.color
      : "fill" in event && typeof event.fill === "string"
        ? event.fill
        : "stroke" in event
          ? event.stroke
          : undefined);
  return (
    <aside
      ref={root}
      className={`inspector panel ${sheet ? "inspector-sheet" : ""} `}
      style={
        sheetHeight
          ? ({ "--sheet-height": `${sheetHeight}px` } as CSSProperties)
          : undefined
      }
      role={modal ? "dialog" : undefined}
      aria-modal={modal || undefined}
      aria-label="Element properties"
    >
      {sheet && (
        <div
          className="sheet-grip"
          tabIndex={0}
          role="slider"
          aria-label="Drag to adjust properties"
          aria-orientation="vertical"
          aria-valuemin={Math.round((160 / viewportHeight) * 100)}
          aria-valuemax={Math.round(
            ((viewportHeight - 140) / viewportHeight) * 100,
          )}
          aria-valuenow={Math.round(
            (currentSheetHeight / viewportHeight) * 100,
          )}
          aria-valuetext={`${Math.round((currentSheetHeight / viewportHeight) * 100)}% of screen height. Use Up or Down to adjust.`}
          onKeyDown={(event) => {
            if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            event.stopPropagation();
            const current = currentSheetHeight;
            setSheetHeight(
              event.key === "Home"
                ? 160
                : event.key === "End"
                  ? viewportHeight - 140
                  : Math.max(
                      160,
                      Math.min(
                        viewportHeight - 140,
                        current + (event.key === "ArrowUp" ? 20 : -20),
                      ),
                    ),
            );
          }}
          onPointerDown={(event) => {
            sheetDrag.current = {
              y: event.clientY,
              height: root.current!.getBoundingClientRect().height,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = sheetDrag.current;
            if (drag)
              setSheetHeight(
                Math.max(
                  160,
                  Math.min(
                    window.innerHeight - 140,
                    drag.height + drag.y - event.clientY,
                  ),
                ),
              );
          }}
          onPointerUp={() => {
            sheetDrag.current = null;
          }}
          onPointerCancel={() => {
            sheetDrag.current = null;
          }}
        >
          <span />
          <small>Drag to adjust</small>
        </div>
      )}
      <div className="panel-heading">
        <span>
          {sheet && event ? (
            <span className="sheet-layer-title">
              <Icon name="pencil" size={14} />
              <input
                aria-label="Layer name"
                title="Rename selected layer"
                maxLength={80}
                value={event.name ?? elementName(event)}
                onChange={(change) =>
                  update({ name: change.target.value }, "name")
                }
              />
            </span>
          ) : (
            <>
              Properties <kbd className="shortcut">Key I</kbd>
            </>
          )}
        </span>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close properties"
        >
          <Icon name="close" size={17} />
        </button>
      </div>
      <div
        className="inspector-tabs"
        role="tablist"
        aria-label="Properties view"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          event.stopPropagation();
          const next =
            event.key === "Home"
              ? "design"
              : event.key === "End"
                ? "layers"
                : tab === "design"
                  ? "layers"
                  : "design";
          setTab(next);
          root.current
            ?.querySelector<HTMLButtonElement>(`#${next}-tab`)
            ?.focus();
        }}
      >
        <button
          role="tab"
          id="design-tab"
          tabIndex={tab === "design" ? 0 : -1}
          aria-controls="design-panel"
          aria-selected={tab === "design"}
          onClick={() => setTab("design")}
        >
          Design
        </button>
        <button
          role="tab"
          id="layers-tab"
          tabIndex={tab === "layers" ? 0 : -1}
          aria-controls="layers-panel"
          aria-selected={tab === "layers"}
          onClick={() => setTab("layers")}
        >
          Layers <span>{visible.length}</span>
        </button>
      </div>
      {sheet && (
        <div className="sheet-scene-context">
          <label>
            Scene
            <select
              aria-label="Scene while editing"
              value={Math.max(
                0,
                (
                  project.chapters ?? [{ name: "Scene 1", time: 0 }]
                ).findLastIndex((chapter) => time >= chapter.time),
              )}
              onChange={(change) => {
                const chapter = project.chapters?.[Number(change.target.value)];
                if (chapter) {
                  select(null);
                  seek(chapter.time);
                }
              }}
            >
              {(project.chapters ?? [{ name: "Scene 1", time: 0 }]).map(
                (chapter, index) => (
                  <option key={index} value={index}>
                    {String(index + 1).padStart(2, "0")} {chapter.name}
                  </option>
                ),
              )}
            </select>
          </label>
          <NumberField
            label="Playhead"
            value={time}
            unit="s"
            min={0}
            max={project.duration}
            onChange={seek}
          />
        </div>
      )}
      <div
        role="tabpanel"
        id="design-panel"
        aria-labelledby="design-tab"
        hidden={tab !== "design"}
      >
        {event ? (
          <>
            <div className="selected-label">
              <span className="element-icon">
                <Icon name={event.type === "text" ? "text" : "shape"} />
              </span>
              <div>
                <strong>
                  {event.type === "text"
                    ? "Text"
                    : event.type === "shape"
                      ? event.shapeType.charAt(0).toUpperCase() +
                        event.shapeType.slice(1)
                      : event.type.charAt(0).toUpperCase() +
                        event.type.slice(1)}
                </strong>
                <label className="selected-layer-editor">
                  <input
                    className="selected-layer-name"
                    aria-label="Layer name"
                    title="Rename selected layer"
                    maxLength={80}
                    value={event.name ?? elementName(event)}
                    onChange={(change) =>
                      update({ name: change.target.value }, "name")
                    }
                  />
                  <Icon name="pencil" size={11} />
                </label>
              </div>
              <button
                className="done-button"
                aria-label="Done editing element"
                onClick={() => select(null)}
              >
                Done <Icon name="check" size={14} />
              </button>
            </div>
            <details className="property-section" open>
              <summary>
                <span>Content & appearance</span>
                <Icon name="chevron" size={14} />
              </summary>
              {"text" in event && (
                <label className="stacked-field">
                  Text
                  <textarea
                    value={event.text}
                    rows={3}
                    maxLength={500}
                    onChange={(e) => update({ text: e.target.value }, "text")}
                  />
                </label>
              )}
              {"fontSize" in event && (
                <details className="typography-options">
                  <summary>
                    Typography{" "}
                    <span>{"fontSize" in event ? event.fontSize : ""}px</span>
                    <Icon name="chevron" size={14} />
                  </summary>
                  {"fontSize" in event && (
                    <NumberField
                      label="Font size"
                      value={event.fontSize ?? 24}
                      onChange={(fontSize) => update({ fontSize })}
                      min={8}
                      max={300}
                    />
                  )}
                  {event.type === "text" && (
                    <div className="segmented">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          aria-pressed={(event.align ?? "left") === align}
                          onClick={() => update({ align })}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  )}
                </details>
              )}
              {event.type === "background" && (
                <ColorField
                  label="Background"
                  color={
                    event.background.kind === "solid"
                      ? event.background.color
                      : event.background.from
                  }
                  change={(color) =>
                    update({ background: { kind: "solid", color } })
                  }
                />
              )}
              {event.type === "shape" &&
                "fill" in event &&
                typeof event.fill === "object" && (
                  <>
                    {(["from", "to"] as const).map((stop) => (
                      <ColorField
                        key={stop}
                        label={`Gradient ${stop}`}
                        color={
                          typeof event.fill === "object"
                            ? event.fill[stop]
                            : "#ffffff"
                        }
                        change={(color) =>
                          update({
                            fill: {
                              ...(typeof event.fill === "object"
                                ? event.fill
                                : {}),
                              [stop]: color,
                            },
                          })
                        }
                      />
                    ))}
                  </>
                )}
              {color && (
                <ColorField
                  label="Color"
                  color={color}
                  change={(value) =>
                    update(
                      event.type === "text" || event.type === "particle"
                        ? { color: value }
                        : "fill" in event
                          ? { fill: value }
                          : { stroke: value },
                    )
                  }
                />
              )}
            </details>
            <details className="property-section">
              <summary>
                <span>Position & size</span>
                <Icon name="chevron" size={14} />
              </summary>
              <div className="property-grid">
                {"x" in event && (
                  <>
                    <NumberField
                      label="X"
                      value={event.x}
                      onChange={(x) => update(moveEvent(event, x - event.x, 0))}
                    />
                    <NumberField
                      label="Y"
                      value={event.y}
                      onChange={(y) => update(moveEvent(event, 0, y - event.y))}
                    />
                  </>
                )}
                {"cx" in event && (
                  <>
                    <NumberField
                      label="X"
                      value={event.cx}
                      onChange={(cx) =>
                        update(moveEvent(event, cx - event.cx, 0))
                      }
                    />
                    <NumberField
                      label="Y"
                      value={event.cy}
                      onChange={(cy) =>
                        update(moveEvent(event, 0, cy - event.cy))
                      }
                    />
                  </>
                )}
                {"width" in event && (
                  <NumberField
                    label="Width"
                    value={event.width}
                    min={1}
                    max={3840}
                    onChange={(width) => update({ width })}
                  />
                )}
                {"height" in event && (
                  <NumberField
                    label="Height"
                    value={event.height}
                    min={1}
                    max={2160}
                    onChange={(height) => update({ height })}
                  />
                )}
                {"radius" in event && (
                  <NumberField
                    label="Radius"
                    value={event.radius ?? 0}
                    min={0}
                    max={2000}
                    onChange={(radius) => update({ radius })}
                  />
                )}
                {"maxWidth" in event && (
                  <NumberField
                    label="Width"
                    value={event.maxWidth}
                    min={20}
                    max={3840}
                    onChange={(maxWidth) => update({ maxWidth })}
                  />
                )}
                <NumberField
                  label="Layer"
                  unit=""
                  value={event.layer}
                  min={0}
                  onChange={(layer) => update({ layer: Math.round(layer) })}
                />
              </div>
            </details>
            <details className="property-section">
              <summary>
                <span>Timing</span>
                <Icon name="chevron" size={14} />
              </summary>
              <div className="property-grid">
                <NumberField
                  label="Start"
                  unit="s"
                  value={event.start}
                  min={0}
                  max={event.end - 0.05}
                  onChange={(start) =>
                    update(retimeEvent(event, start, event.end))
                  }
                />
                <NumberField
                  label="End"
                  unit="s"
                  value={event.end}
                  min={event.start + 0.05}
                  max={project.duration}
                  onChange={(end) =>
                    update(retimeEvent(event, event.start, end))
                  }
                />
              </div>
              <button className="text-button" onClick={() => seek(event.start)}>
                Jump to element <Icon name="arrow" size={14} />
              </button>
            </details>
            <button
              className="delete-element"
              onClick={() => {
                commit({
                  ...project,
                  events: project.events.filter((item) => item.id !== event.id),
                });
                select(null);
              }}
            >
              <Icon name="trash" size={15} /> Delete element
            </button>
          </>
        ) : (
          <div className="inspector-empty">
            <span className="selection-glyph">↖</span>
            <h3>Choose a layer to begin</h3>
            <p>
              Select something on the canvas, or browse the layer list to edit
              it.
            </p>
            <button
              className="secondary-button"
              onClick={() => setTab("layers")}
            >
              Browse layers <Icon name="layers" size={15} />
            </button>
          </div>
        )}
      </div>
      <div
        role="tabpanel"
        id="layers-panel"
        aria-labelledby="layers-tab"
        hidden={tab !== "layers"}
      >
        <div className="layer-heading">
          <span>
            <Icon name="layers" size={14} /> Visible layers
          </span>
          <small>Top → bottom</small>
        </div>
        <div className="layer-list">
          {frontToBack(visible).map((item, index) => (
            <button
              aria-pressed={selected === item.id}
              key={item.id}
              className={selected === item.id ? "selected" : ""}
              onClick={() => select(item.id)}
            >
              <Icon name={item.type === "text" ? "text" : "shape"} size={14} />
              <span>{elementName(item)}</span>
              <small
                title={`Stack position ${index + 1} of ${visible.length}; paint layer ${item.layer}`}
                aria-label={`Stack position ${index + 1} of ${visible.length}`}
              >
                {index + 1}
              </small>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

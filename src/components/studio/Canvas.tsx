"use client";
import { useEffect, useRef, useState } from "react";
import { renderProjectFrame, visibleEvents } from "@/lib/rendering";
import { BRAND } from "@/lib/project/brand";
import { moveEvent } from "@/lib/project/edit";
import {
  selectionBounds,
  resizeFromCorner,
  type Corner,
} from "@/lib/project/selection";
import type { VideoProject, TimelineEvent } from "@/lib/rendering";
// Keep text selection chrome clear of the glyphs without changing geometry.
function outlineBounds(event: TimelineEvent, time: number) {
  const bounds = selectionBounds(event, time);
  if (!bounds || event.type !== "text") return bounds;
  const padding = 12;
  return {
    left: bounds.left - padding,
    right: bounds.right + padding,
    top: bounds.top - padding,
    bottom: bounds.bottom + padding,
  };
}
export function Frame({
  project,
  time,
  className,
}: {
  project: VideoProject;
  time: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    const draw = () => {
      const ctx = ref.current?.getContext("2d");
      if (ctx && active) {
        ctx.setTransform(480 / project.width, 0, 0, 480 / project.width, 0, 0);
        renderProjectFrame(ctx, project, time);
      }
    };
    draw();
    void document.fonts.ready.then(draw);
    return () => {
      active = false;
    };
  }, [project, time]);
  return (
    <canvas
      ref={ref}
      width={480}
      height={Math.round((480 * project.height) / project.width)}
      className={className}
      aria-hidden="true"
    />
  );
}
function ResizeHandle({
  corner,
  box,
  project,
  start,
  adjust,
}: {
  corner: Corner;
  box: { left: number; right: number; top: number; bottom: number };
  project: VideoProject;
  start: (event: React.PointerEvent<HTMLButtonElement>, corner: Corner) => void;
  adjust: (corner: Corner, dx: number, dy: number) => void;
}) {
  return (
    <button
      className={`resize-handle ${corner}`}
      aria-label={`Resize element from ${corner === "nw" ? "top left" : corner === "ne" ? "top right" : corner === "se" ? "bottom right" : "bottom left"}`}
      title="Drag to resize · Shift keeps proportions · Arrow keys adjust size"
      style={{
        left: `clamp(12px, ${((corner.includes("w") ? box.left : box.right) / project.width) * 100}%, calc(100% - 12px))`,
        top: `clamp(12px, ${((corner.includes("n") ? box.top : box.bottom) / project.height) * 100}%, calc(100% - 12px))`,
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        start(event, corner);
      }}
      onKeyDown={(event) => {
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key,
          )
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const amount = event.shiftKey ? 10 : 2;
        adjust(
          corner,
          event.key === "ArrowRight"
            ? amount
            : event.key === "ArrowLeft"
              ? -amount
              : 0,
          event.key === "ArrowDown"
            ? amount
            : event.key === "ArrowUp"
              ? -amount
              : 0,
        );
      }}
    />
  );
}
export function EditorCanvas({
  project,
  time,
  selected,
  select,
  commit,
  pause,
}: {
  project: VideoProject;
  time: number;
  selected: string | null;
  select: (id: string | null) => void;
  commit: (video: VideoProject) => void;
  pause: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<{
    original: TimelineEvent;
    x: number;
    y: number;
    rect: DOMRect;
    corner?: Corner;
    next: TimelineEvent;
  } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [draft, setDraft] = useState<TimelineEvent | null>(null);
  const chosen = selected
    ? visibleEvents(project, time).find((event) => event.id === selected)
    : undefined;
  const activeChosen = draft?.id === chosen?.id ? draft : chosen;
  const chosenBounds = activeChosen && outlineBounds(activeChosen, time);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const frame = draft
      ? {
          ...project,
          events: project.events.map((event) =>
            event.id === draft.id ? draft : event,
          ),
        }
      : project;
    renderProjectFrame(ctx, frame, time);
    const outlined = selected ?? hovered;
    const event = outlined
      ? visibleEvents(frame, time).find((event) => event.id === outlined)
      : undefined;
    const box = event && outlineBounds(event, time);
    if (box) {
      ctx.save();
      ctx.strokeStyle = selected ? BRAND.teal : "#176B6C80";
      ctx.lineWidth =
        (project.width /
          Math.max(1, ref.current!.getBoundingClientRect().width)) *
        1.5;
      ctx.strokeRect(
        box.left,
        box.top,
        box.right - box.left,
        box.bottom - box.top,
      );
      ctx.restore();
    }
  }, [project, draft, selected, hovered, time]);
  const hitTest = (x: number, y: number) =>
    [...visibleEvents(project, time)].reverse().find((event) => {
      if (event.type === "background" || event.type === "particle")
        return false;
      const box = selectionBounds(event, time);
      return (
        box &&
        x >= box.left &&
        x <= box.right &&
        y >= box.top &&
        y <= box.bottom
      );
    });
  const point = (x: number, y: number, rect: DOMRect) => ({
    x: ((x - rect.left) / rect.width) * project.width,
    y: ((y - rect.top) / rect.height) * project.height,
  });
  const begin = (
    event: React.PointerEvent<HTMLElement>,
    element: TimelineEvent,
    corner?: Corner,
  ) => {
    pause();
    const rect = ref.current!.getBoundingClientRect();
    const origin = point(event.clientX, event.clientY, rect);
    gesture.current = {
      original: element,
      ...origin,
      rect,
      corner,
      next: element,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    select(element.id);
  };
  const startResize = (
    event: React.PointerEvent<HTMLButtonElement>,
    corner: Corner,
  ) => {
    const original = project.events.find((item) => item.id === selected);
    if (original) begin(event, original, corner);
  };
  const keyboardResize = (corner: Corner, dx: number, dy: number) => {
    const original = project.events.find((item) => item.id === selected);
    if (original)
      commit({
        ...project,
        events: project.events.map((item) =>
          item.id === original.id
            ? resizeFromCorner(original, time, corner, dx, dy)
            : item,
        ),
      });
  };
  return (
    <div
      className="canvas-editor"
      onPointerMove={(event) => {
        const current = gesture.current;
        if (!current) return;
        const position = point(event.clientX, event.clientY, current.rect);
        const dx = Math.round(position.x - current.x),
          dy = Math.round(position.y - current.y);
        current.next = current.corner
          ? resizeFromCorner(
              current.original,
              time,
              current.corner,
              dx,
              dy,
              event.shiftKey,
            )
          : moveEvent(current.original, dx, dy);
        setDraft(current.next);
      }}
      onPointerUp={() => {
        const current = gesture.current;
        if (current && current.next !== current.original)
          commit({
            ...project,
            events: project.events.map((event) =>
              event.id === current.original.id ? current.next : event,
            ),
          });
        gesture.current = null;
        setDraft(null);
      }}
      onPointerCancel={() => {
        gesture.current = null;
        setDraft(null);
      }}
    >
      <canvas
        ref={ref}
        width={project.width}
        height={project.height}
        className="editor-canvas"
        tabIndex={0}
        role="group"
        style={{ cursor: hovered ? "move" : "default" }}
        aria-label="Video canvas. Tab to focus. Use brackets to cycle elements, then arrow keys to move."
        onKeyDown={(event) => {
          if (!["[", "]", "Enter"].includes(event.key)) return;
          event.preventDefault();
          const elements = visibleEvents(project, time).filter(
            (item) => item.type !== "background" && item.type !== "particle",
          );
          const current = elements.findIndex((item) => item.id === selected);
          const next =
            event.key === "["
              ? (current - 1 + elements.length) % elements.length
              : (current + 1) % elements.length;
          select(elements[next]?.id ?? null);
        }}
        onPointerDown={(event) => {
          const position = point(
            event.clientX,
            event.clientY,
            event.currentTarget.getBoundingClientRect(),
          );
          const hit = hitTest(position.x, position.y);
          if (hit) begin(event, hit);
          else {
            pause();
            select(null);
          }
        }}
        onPointerMove={(event) => {
          if (gesture.current) return;
          const position = point(
            event.clientX,
            event.clientY,
            event.currentTarget.getBoundingClientRect(),
          );
          setHovered(hitTest(position.x, position.y)?.id ?? null);
        }}
        onPointerLeave={() => setHovered(null)}
      />
      {chosen &&
        chosenBounds &&
        (["nw", "ne", "se", "sw"] as Corner[]).map((corner) => (
          <ResizeHandle
            key={corner}
            corner={corner}
            box={chosenBounds}
            project={project}
            start={startResize}
            adjust={keyboardResize}
          />
        ))}
    </div>
  );
}

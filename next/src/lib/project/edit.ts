import { BRAND } from "./brand";
import type { TimelineEvent, VideoProject } from "@/lib/rendering";
export function moveEvent(
  event: TimelineEvent,
  dx: number,
  dy: number,
): TimelineEvent {
  const next = { ...event };
  if (next.type === "text" || (next.type === "shape" && "x" in next)) {
    next.x += dx;
    next.y += dy;
  } else if (next.type === "shape" && next.shapeType === "line") {
    next.x1 += dx;
    next.x2 += dx;
    next.y1 += dy;
    next.y2 += dy;
  } else if (next.type === "shape" && "cx" in next) {
    next.cx += dx;
    next.cy += dy;
  } else if (next.type === "particle")
    next.origin = { x: next.origin.x + dx, y: next.origin.y + dy };
  if (next.path)
    next.path = {
      ...next.path,
      points: next.path.points.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      })),
    };
  return next;
}
export function addElement(
  project: VideoProject,
  type: "text" | "shape",
  time: number,
): VideoProject {
  const start = Math.max(0, Math.min(time, project.duration - 0.25));
  const scale = Math.min(project.width / 1920, project.height / 1080);
  const common = {
    id: crypto.randomUUID(),
    start,
    end: project.duration,
    layer: Math.max(0, ...project.events.map((event) => event.layer)) + 1,
  };
  const event: TimelineEvent =
    type === "text"
      ? {
          ...common,
          type: "text",
          text: "Your text",
          x: project.width / 2,
          y: project.height / 2 - 40 * scale,
          maxWidth: 1000 * scale,
          fontSize: 64 * scale,
          fontWeight: 700,
          color: BRAND.ink,
          align: "center",
        }
      : {
          ...common,
          type: "shape",
          shapeType: "rect",
          x: project.width / 2 - 200 * scale,
          y: project.height / 2 - 120 * scale,
          width: 400 * scale,
          height: 240 * scale,
          radius: 24 * scale,
          fill: BRAND.cyan,
        };
  return { ...project, events: [...project.events, event] };
}

/** Preserve the relative position of authored keyframes when timing changes. */
export function retimeEvent(
  event: TimelineEvent,
  start: number,
  end: number,
): TimelineEvent {
  const next = { ...event, start, end };
  const fields = [
    "opacity",
    "translateX",
    "translateY",
    "scale",
    "scaleX",
    "scaleY",
    "rotate",
    "drawProgress",
  ] as const;
  for (const field of fields) {
    const value = event[field];
    if (value && "keyframes" in value)
      next[field] = {
        keyframes: value.keyframes.map((frame) => ({
          ...frame,
          time:
            start +
            ((frame.time - event.start) / (event.end - event.start)) *
              (end - start),
        })),
      };
  }
  return next;
}

/** Resize an element around its authored origin. Animation values remain intact. */
export function resizeEvent(
  event: TimelineEvent,
  sx: number,
  sy: number,
): TimelineEvent {
  sx = Math.max(0.05, Math.min(20, sx));
  sy = Math.max(0.05, Math.min(20, sy));
  if (event.type === "text")
    return {
      ...event,
      maxWidth: Math.max(40, event.maxWidth * sx),
      fontSize: Math.max(8, Math.min(400, event.fontSize * sy)),
    };
  if (event.type !== "shape") return event;
  if (event.shapeType === "circle")
    return { ...event, radius: Math.max(4, event.radius * Math.max(sx, sy)) };
  if (event.shapeType === "icon")
    return { ...event, size: Math.max(8, event.size * Math.max(sx, sy)) };
  if (event.shapeType === "badge")
    return {
      ...event,
      fontSize: Math.max(8, (event.fontSize ?? 20) * Math.max(sx, sy)),
    };
  if (event.shapeType === "line")
    return {
      ...event,
      x2: event.x1 + (event.x2 - event.x1) * sx,
      y2: event.y1 + (event.y2 - event.y1) * sy,
    };
  return {
    ...event,
    width: Math.max(8, event.width * sx),
    height: Math.max(8, event.height * sy),
  };
}

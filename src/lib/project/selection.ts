import { getStaticEventBounds, getEventCenter } from "@/lib/rendering";
import { getAnimatedStyle } from "@/lib/rendering/animation";
import type { TimelineEvent } from "@/lib/rendering";
import { moveEvent, resizeEvent } from "./edit";
export function selectionBounds(event: TimelineEvent, time: number) {
  const box = getStaticEventBounds(event);
  if (!box) return null;
  const animation = getAnimatedStyle(event, time);
  const center = getEventCenter(event);
  const dx = animation.pathOffset
    ? animation.pathOffset.x - center.x
    : animation.offsetX;
  const dy = animation.pathOffset
    ? animation.pathOffset.y - center.y
    : animation.offsetY;
  const angle = (animation.rotation * Math.PI) / 180;
  const corners = [box.left, box.right].flatMap((x) =>
    [box.top, box.bottom].map((y) => {
      const sx = (x - center.x) * animation.scale * animation.scaleX;
      const sy = (y - center.y) * animation.scale * animation.scaleY;
      return {
        x: center.x + dx + sx * Math.cos(angle) - sy * Math.sin(angle),
        y: center.y + dy + sx * Math.sin(angle) + sy * Math.cos(angle),
      };
    }),
  );
  return {
    left: Math.min(...corners.map((p) => p.x)),
    right: Math.max(...corners.map((p) => p.x)),
    top: Math.min(...corners.map((p) => p.y)),
    bottom: Math.max(...corners.map((p) => p.y)),
  };
}

export type Corner = "nw" | "ne" | "se" | "sw";
export function resizeFromCorner(
  event: TimelineEvent,
  time: number,
  corner: Corner,
  dx: number,
  dy: number,
  proportional = false,
): TimelineEvent {
  const box = selectionBounds(event, time);
  if (!box) return event;
  const width = Math.max(8, box.right - box.left),
    height = Math.max(8, box.bottom - box.top);
  const west = corner.includes("w"),
    north = corner.includes("n");
  let sx = Math.max(16, width + (west ? -dx : dx)) / width;
  let sy = Math.max(16, height + (north ? -dy : dy)) / height;
  if (proportional) sx = sy = Math.max(sx, sy);
  const resized = resizeEvent(event, sx, sy);
  const actual = selectionBounds(resized, time);
  if (!actual) return resized;
  return moveEvent(
    resized,
    (west ? box.right - (actual.right - actual.left) : box.left) - actual.left,
    (north ? box.bottom - (actual.bottom - actual.top) : box.top) - actual.top,
  );
}

import type { AnimatedValue, EasingName, ShapeEvent, TimelineEvent } from "@/lib/schema/timeline";

export function tween(
  start: number, end: number, from: number, to: number, easing: EasingName = "easeOut",
): AnimatedValue {
  return { keyframes: [
    { time: start, value: from, easing: "linear" },
    { time: end, value: to, easing },
  ] };
}

function isFadeIn(opacity: AnimatedValue | undefined): boolean {
  return Boolean(opacity && "from" in opacity && opacity.from === 0 && opacity.to === 1);
}

export function settleEntrance(event: TimelineEvent) {
  if ((event.type === "shape" || event.type === "text") && isFadeIn(event.opacity)) {
    const duration = Math.min(0.32, (event.end - event.start) / 2);
    event.opacity = tween(event.start, event.start + duration, 0, 1);
  }
}

/** Compiles the flow cue into a line reveal and an editable marker. */
export function animateArrow(
  line: ShapeEvent & { shapeType: "line" },
  flow: boolean,
  sceneEnd: number,
): ShapeEvent | undefined {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const lifetime = line.end - line.start;
  const hasAuthoredMotion = [
    line.path, line.translateX, line.translateY, line.scale, line.scaleX, line.scaleY, line.rotate, line.drawProgress,
  ].some(Boolean);
  const showMarker = flow && !hasAuthoredMotion && Math.hypot(dx, dy) >= 40 && lifetime >= 0.35;
  const travel = Math.min(showMarker ? 1 : 0.35, lifetime * 0.8);
  const arrival = line.start + travel;
  const easing = showMarker ? "easeInOut" : "easeOut";

  if (!hasAuthoredMotion && (showMarker || line.start > 0)) {
    line.drawProgress = tween(line.start, arrival, 0, 1, easing);
    if (showMarker && (!line.opacity || isFadeIn(line.opacity))) {
      line.end = sceneEnd;
      line.opacity = tween(arrival, Math.min(sceneEnd, arrival + 0.28), 1, 0.55);
    }
  }
  if (!showMarker) return;

  return {
    id: `${line.id}-marker`,
    type: "shape",
    shapeType: "circle",
    start: line.start,
    end: arrival,
    layer: line.layer + 1,
    x: line.x1,
    y: line.y1,
    radius: Math.max(14, Math.min(22, line.lineWidth * 1.6)),
    fill: "#ffffff",
    stroke: line.stroke,
    strokeWidth: 5,
    translateX: tween(line.start, arrival, 0, dx, easing),
    translateY: tween(line.start, arrival, 0, dy, easing),
    opacity: { keyframes: [
      { time: line.start, value: 0, easing: "linear" },
      { time: line.start + travel * 0.12, value: 1, easing: "easeOut" },
      { time: line.start + travel * 0.86, value: 1, easing: "linear" },
      { time: arrival, value: 0, easing: "easeIn" },
    ] },
  };
}

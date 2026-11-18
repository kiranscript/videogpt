import {
  buildDirectSceneProject,
  DIRECT_TIMELINE_HEIGHT,
  DIRECT_TIMELINE_WIDTH,
} from "@/lib/generation/directTimeline";
import { tween } from "@/lib/generation/motion";
import type { AuthoredVideoPart } from "@/lib/generation/schemas";
import type { VideoPartTheme } from "@/lib/generation/theme";
import { DEFAULT_PALETTE, PALETTES } from "@/lib/catalog/palettes";
import { seededHash } from "@/lib/timeline/utils";
import type { TimelineEvent, VideoProject } from "@/lib/rendering";

function themedBackground(
  id: string,
  duration: number,
  theme: VideoPartTheme,
): TimelineEvent {
  const palette = PALETTES[theme.palette] ?? PALETTES[DEFAULT_PALETTE];
  return {
    id,
    type: "background",
    start: 0,
    end: duration,
    layer: 0,
    background: {
      kind: "gradient",
      from: palette.bgFrom,
      to: palette.bgTo,
      angle: palette.bgAngle,
    },
  };
}

function buildTitleEvents(
  content: Extract<AuthoredVideoPart, { part: "title" }>["content"],
  duration: number,
  theme: VideoPartTheme,
): TimelineEvent[] {
  const palette = PALETTES[theme.palette] ?? PALETTES[DEFAULT_PALETTE];
  const centered = theme.titleAlign === "center";
  const x = centered ? DIRECT_TIMELINE_WIDTH / 2 : 180;
  const align = centered ? "center" as const : "left" as const;
  const titleSize = theme.titleSize === "hero" ? 76 : 64;
  const entranceEnd = duration * 0.28;
  const events: TimelineEvent[] = [
    themedBackground("background", duration, theme),
    {
      id: "accent-line",
      type: "shape",
      shapeType: "line",
      start: 0,
      end: duration,
      layer: 3,
      x1: centered ? 610 : 180,
      y1: 382,
      x2: centered ? 1310 : 760,
      y2: 382,
      stroke: palette.accent1,
      lineWidth: 8,
      drawProgress: tween(0, entranceEnd, 0, 1),
    },
    {
      id: "title",
      type: "text",
      start: 0,
      end: duration,
      layer: 8,
      text: content.title,
      x,
      y: 515,
      maxWidth: centered ? 1500 : 1450,
      color: palette.text,
      fontSize: titleSize,
      fontWeight: 800,
      align,
      verticalAlign: "middle",
      opacity: tween(0, entranceEnd, 0, 1),
      translateY: tween(0, entranceEnd, 22, 0),
    },
  ];
  if (content.subtitle) {
    const start = duration * 0.12;
    events.push({
      id: "subtitle",
      type: "text",
      start,
      end: duration,
      layer: 8,
      text: content.subtitle,
      x,
      y: 640,
      maxWidth: centered ? 1300 : 1250,
      color: palette.muted,
      fontSize: 32,
      fontWeight: 600,
      align,
      opacity: tween(start, start + entranceEnd, 0, 1),
    });
  }
  return events;
}

function buildConclusionEvents(
  content: Extract<AuthoredVideoPart, { part: "conclusion" }>["content"],
  duration: number,
  theme: VideoPartTheme,
): TimelineEvent[] {
  const palette = PALETTES[theme.palette] ?? PALETTES[DEFAULT_PALETTE];
  const entranceEnd = duration * 0.3;
  return [
    themedBackground("background", duration, theme),
    {
      id: "closing-accent",
      type: "shape",
      shapeType: "line",
      start: 0,
      end: duration,
      layer: 2,
      x1: DIRECT_TIMELINE_WIDTH / 2 - 120,
      y1: DIRECT_TIMELINE_HEIGHT / 2 + 105,
      x2: DIRECT_TIMELINE_WIDTH / 2 + 120,
      y2: DIRECT_TIMELINE_HEIGHT / 2 + 105,
      stroke: palette.accent2,
      lineWidth: 6,
      drawProgress: tween(0, entranceEnd, 0, 1),
    },
    {
      id: "closing-line",
      type: "text",
      start: 0,
      end: duration,
      layer: 8,
      text: content.closingLine,
      x: DIRECT_TIMELINE_WIDTH / 2,
      y: DIRECT_TIMELINE_HEIGHT / 2,
      maxWidth: 1320,
      color: palette.text,
      fontSize: 48,
      fontWeight: 800,
      align: "center",
      verticalAlign: "middle",
      opacity: tween(0, entranceEnd, 0, 1),
      translateY: tween(0, entranceEnd, 18, 0),
    },
  ];
}

export function buildStandaloneVideoPartProject(
  artifact: AuthoredVideoPart,
  duration: number,
  theme: VideoPartTheme,
): VideoProject {
  if (artifact.part === "summary" || artifact.part === "main-diagram") {
    return buildDirectSceneProject(artifact.content, duration);
  }

  const events = artifact.part === "title"
    ? buildTitleEvents(artifact.content, duration, theme)
    : buildConclusionEvents(artifact.content, duration, theme);
  const hash = seededHash(JSON.stringify({ artifact, duration, theme })).toString(16);
  return {
    id: `direct-${artifact.part}-${hash}`,
    name: artifact.part === "title" ? artifact.content.title : artifact.content.closingLine,
    width: DIRECT_TIMELINE_WIDTH,
    height: DIRECT_TIMELINE_HEIGHT,
    duration,
    events,
  };
}



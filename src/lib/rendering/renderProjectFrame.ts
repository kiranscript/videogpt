import {
  drawBackground,
  fillFallbackBackground,
} from "@/lib/rendering/background";
import { drawParticles } from "@/lib/rendering/particle";
import { drawShape } from "@/lib/rendering/shape";
import { drawText } from "@/lib/rendering/text";
import { visibleEvents } from "@/lib/rendering/visibleEvents";
import type { BackgroundEvent, TimelineEvent, VideoProject } from "@/lib/schema/timeline";

function drawForegroundEvent(
  context: CanvasRenderingContext2D,
  event: Exclude<TimelineEvent, BackgroundEvent>,
  time: number,
) {
  if (event.type === "text") {
    drawText(context, event, time);
    return;
  }

  if (event.type === "particle") {
    drawParticles(context, event, time);
    return;
  }

  drawShape(context, event, time);
}

export function renderProjectFrame(
  context: CanvasRenderingContext2D,
  project: VideoProject,
  time: number,
) {
  context.clearRect(0, 0, project.width, project.height);

  const events = visibleEvents(project, time);
  const backgroundEvent = events.find((event) => event.type === "background");

  if (backgroundEvent) {
    drawBackground(context, backgroundEvent, project);
  } else {
    fillFallbackBackground(context, project);
  }

  for (const event of events) {
    if (event.type === "background") {
      continue;
    }

    drawForegroundEvent(context, event, time);
  }
}

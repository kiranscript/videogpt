import type { BackgroundEvent, VideoProject } from "@/lib/schema/timeline";

export function fillFallbackBackground(
  context: CanvasRenderingContext2D,
  project: VideoProject,
) {
  context.fillStyle = "#020617";
  context.fillRect(0, 0, project.width, project.height);
}

function createBackgroundFill(
  context: CanvasRenderingContext2D,
  event: BackgroundEvent,
  project: VideoProject,
) {
  if (event.background.kind === "solid") {
    return event.background.color;
  }

  const radians = (event.background.angle * Math.PI) / 180;
  const x = Math.cos(radians) * project.width;
  const y = Math.sin(radians) * project.height;
  const gradient = context.createLinearGradient(0, 0, x, y);
  gradient.addColorStop(0, event.background.from);
  gradient.addColorStop(1, event.background.to);
  return gradient;
}

export function drawBackground(
  context: CanvasRenderingContext2D,
  event: BackgroundEvent,
  project: VideoProject,
) {
  context.fillStyle = createBackgroundFill(context, event, project);
  context.fillRect(0, 0, project.width, project.height);

}

import type { VideoProject } from "@/lib/schema/timeline";

export function visibleEvents(project: VideoProject, time: number) {
  return project.events
    .filter((event) => time >= event.start && (time < event.end || (time === project.duration && event.end === project.duration)))
    .sort((left, right) => left.layer - right.layer);
}

import { z } from "zod";
import { VideoProjectSchema } from "@/lib/schema/timeline";
import type { VideoProject } from "@/lib/rendering";

export const ProjectDocumentSchema = z
  .object({
    version: z.literal(1),
    project: VideoProjectSchema.extend({
      width: z.number().int().min(1).max(3840),
      height: z.number().int().min(1).max(2160),
      duration: z.number().positive().max(120),
      events: VideoProjectSchema.shape.events.max(2000),
    }),
  })
  .superRefine(({ project }, context) => {
    const ids = new Set<string>();
    for (const event of project.events) {
      if (
        ids.has(event.id) ||
        event.start >= event.end ||
        event.end > project.duration ||
        event.start < 0
      ) {
        context.addIssue({
          code: "custom",
          message: "Events need unique IDs and valid times within the project.",
        });
      }
      ids.add(event.id);
    }
  });

export function parseProjectDocument(input: unknown): VideoProject {
  return ProjectDocumentSchema.parse(input).project as VideoProject;
}

export function downloadProject(project: VideoProject) {
  const document = ProjectDocumentSchema.parse({ version: 1, project });
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }),
  );
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${project.name.replace(/[^a-z0-9_-]/gi, "_") || "project"}.videogpt.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

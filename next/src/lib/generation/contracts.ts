import { z } from "zod";
const MAX_SCENE_ID_LENGTH = 24;
export const VideoSceneRoleSchema = z.enum([
  "overview",
  "mechanism",
  "example",
  "comparison",
]);
export type VideoSceneRole = z.infer<typeof VideoSceneRoleSchema>;

export const VideoSceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).min(1).max(MAX_SCENE_ID_LENGTH),
  role: VideoSceneRoleSchema,
  name: z.string().min(1).max(40),
  goal: z.string().min(1).max(300),
  share: z.number().positive().max(1),
}).strict();
export type VideoScene = z.infer<typeof VideoSceneSchema>;

export const VideoPlanSchema = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(120).optional(),
  closingLine: z.string().min(1).max(100),
  logline: z.string().min(1).max(160),
  scenes: z.array(VideoSceneSchema).min(1).max(4),
}).strict();
export type VideoPlan = z.infer<typeof VideoPlanSchema>;


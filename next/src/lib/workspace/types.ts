import type { VideoProject } from "@/lib/rendering";
import type { VideoPlan } from "@/lib/generation/contracts";

export type Checkpoint = { plan: VideoPlan; completed: Record<string, VideoProject> };
export type StudioProject = {
  id: string;
  title: string;
  prompt: string;
  duration: number;
  updatedAt: string;
  video?: VideoProject;
  checkpoint?: Checkpoint;
  warnings: string[];
};
export type Workspace = { version: 1; projects: StudioProject[]; activeId: string | null };
export type Job = { projectId: string; stage: string; finished: number; total: number; error?: string };

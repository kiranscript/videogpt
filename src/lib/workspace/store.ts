import { elementName } from "@/lib/project/elementName";
import { createLaunchProject } from "@/lib/project/templates";
import { create } from "zustand";
import type { VideoProject } from "@/lib/rendering";
import type { StudioProject, Workspace, Job } from "./types";
import { loadWorkspace, saveWorkspace } from "./storage";
import { generateVideo } from "./generate";

const id = () => crypto.randomUUID();
const controllers = new Map<string, AbortController>();
type History = {
  undo: VideoProject[];
  redo: VideoProject[];
  group?: string;
  at?: number;
};
type State = {
  projects: StudioProject[];
  activeId: string | null;
  ready: boolean;
  storageError: string | null;
  announcement: string;
  saveState: "saved" | "saving" | "error";
  histories: Record<string, History>;
  job: Job | null;
  initialize: () => Promise<void>;
  open: (id: string) => void;
  remove: (id: string) => void;
  add: (video: VideoProject) => string;
  restore: (project: StudioProject) => void;
  edit: (projectId: string, video: VideoProject, group?: string) => void;
  undo: (id: string) => void;
  redo: (id: string) => void;
  generate: (
    prompt: string,
    duration: number,
    retryId?: string,
  ) => Promise<void>;
  cancel: () => void;
};
function describeChange(next: VideoProject, previous: VideoProject): string {
  const changed = next.events.find((event) => {
    const old = previous.events.find((item) => item.id === event.id);
    return old && old !== event;
  });
  if (changed) {
    const old = previous.events.find((item) => item.id === changed.id)!;
    if (old.start !== changed.start || old.end !== changed.end)
      return `${elementName(changed)} timing: ${changed.start.toFixed(1)} to ${changed.end.toFixed(1)} seconds.`;
    return `Updated ${elementName(changed)}.`;
  }
  if (next.events.length < previous.events.length)
    return "Element deleted. Undo is available.";
  return `Updated ${next.name}.`;
}
let initialization: Promise<void> | undefined;
export const useStudio = create<State>((set, get) => ({
  projects: [],
  activeId: null,
  ready: false,
  storageError: null,
  saveState: "saved",
  announcement: "",
  histories: {},
  job: null,
  initialize: () =>
    (initialization ??= (async () => {
      try {
        const data = await loadWorkspace();
        set({
          ...(data ? { projects: data.projects, activeId: data.activeId } : {}),
          ready: true,
        });
        if (!data) get().add(createLaunchProject());
      } catch (error) {
        set({ ready: true, storageError: String(error), saveState: "error" });
      }
    })()),
  open: (activeId) => set({ activeId }),
  remove: (projectId) => {
    controllers.get(projectId)?.abort();
    set((state) => {
      const projects = state.projects.filter(
        (project) => project.id !== projectId,
      );
      const histories = { ...state.histories };
      delete histories[projectId];
      return {
        projects,
        histories,
        activeId:
          state.activeId === projectId
            ? (projects[0]?.id ?? null)
            : state.activeId,
        job: state.job?.projectId === projectId ? null : state.job,
      };
    });
  },
  restore: (project) =>
    set((state) => ({
      projects: [
        project,
        ...state.projects.filter((item) => item.id !== project.id),
      ],
      activeId: project.id,
    })),
  add: (video) => {
    const projectId = id();
    const project: StudioProject = {
      id: projectId,
      title: video.name,
      prompt: "",
      duration: video.duration,
      video,
      warnings: [],
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      projects: [project, ...state.projects],
      activeId: projectId,
    }));
    return projectId;
  },
  edit: (projectId, video, group) =>
    set((state) => {
      const previous = state.projects.find(
        (project) => project.id === projectId,
      )?.video;
      if (!previous || previous === video) return state;
      const history = state.histories[projectId] ?? { undo: [], redo: [] };
      const now = Date.now();
      const coalesce =
        group &&
        history.group === group &&
        now - (history.at ?? 0) < 1500 &&
        history.redo.length === 0;
      return {
        announcement: group
          ? state.announcement
          : describeChange(video, previous),
        projects: state.projects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                video,
                title: video.name,
                updatedAt: new Date().toISOString(),
              }
            : project,
        ),
        histories: {
          ...state.histories,
          [projectId]: {
            undo: coalesce
              ? history.undo
              : [...history.undo.slice(-49), previous],
            redo: [],
            group,
            at: now,
          },
        },
      };
    }),
  undo: (projectId) =>
    set((state) => {
      const history = state.histories[projectId];
      const current = state.projects.find(
        (project) => project.id === projectId,
      )?.video;
      const previous = history?.undo.at(-1);
      if (!previous || !current) return state;
      return {
        announcement: `Undid change. ${describeChange(previous, current)}`,
        projects: state.projects.map((project) =>
          project.id === projectId
            ? { ...project, video: previous, title: previous.name }
            : project,
        ),
        histories: {
          ...state.histories,
          [projectId]: {
            undo: history.undo.slice(0, -1),
            redo: [...history.redo, current],
          },
        },
      };
    }),
  redo: (projectId) =>
    set((state) => {
      const history = state.histories[projectId];
      const current = state.projects.find(
        (project) => project.id === projectId,
      )?.video;
      const next = history?.redo.at(-1);
      if (!next || !current) return state;
      return {
        announcement: `Redid change. ${describeChange(next, current)}`,
        projects: state.projects.map((project) =>
          project.id === projectId
            ? { ...project, video: next, title: next.name }
            : project,
        ),
        histories: {
          ...state.histories,
          [projectId]: {
            undo: [...history.undo, current],
            redo: history.redo.slice(0, -1),
          },
        },
      };
    }),
  generate: async (prompt, duration, retryId) => {
    if (get().job && !get().job?.error) return;
    const projectId = retryId ?? id();
    const existing = get().projects.find((project) => project.id === projectId);
    const controller = new AbortController();
    controllers.set(projectId, controller);
    if (!existing)
      set((state) => ({
        projects: [
          {
            id: projectId,
            title: prompt.slice(0, 48),
            prompt,
            duration,
            warnings: [],
            updatedAt: new Date().toISOString(),
          },
          ...state.projects,
        ],
      }));
    set({
      activeId: projectId,
      job: {
        projectId,
        stage: "planning",
        finished: Object.keys(existing?.checkpoint?.completed ?? {}).length,
        total: existing?.checkpoint?.plan.scenes.length ?? 0,
      },
    });
    const patch = (change: Partial<StudioProject>) =>
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === projectId
            ? { ...project, ...change, updatedAt: new Date().toISOString() }
            : project,
        ),
      }));
    try {
      await generateVideo(
        { prompt, duration, checkpoint: existing?.checkpoint },
        controller.signal,
        (event) => {
          if (controller.signal.aborted) return;
          if (event.type === "stage")
            set((state) => ({
              job: state.job ? { ...state.job, stage: event.stage } : null,
            }));
          if (event.type === "plan") {
            patch({
              title: event.plan.title,
              checkpoint: {
                plan: event.plan,
                completed: existing?.checkpoint?.completed ?? {},
              },
            });
            set((state) => ({
              job: state.job
                ? { ...state.job, total: event.plan.scenes.length }
                : null,
            }));
          }
          if (event.type === "scene") {
            const current = get().projects.find(
              (project) => project.id === projectId,
            )!;
            if (current.checkpoint) {
              const completed = {
                ...current.checkpoint.completed,
                [event.id]: event.project,
              };
              patch({
                checkpoint: { ...current.checkpoint, completed },
                warnings: [...current.warnings, ...event.warnings],
              });
              set((state) => ({
                job: state.job
                  ? { ...state.job, finished: Object.keys(completed).length }
                  : null,
              }));
            }
          }
          if (event.type === "done") {
            patch({ video: event.project, title: event.project.name });
            set({ job: null });
          }
        },
      );
    } catch (error) {
      if (get().job?.projectId === projectId)
        set((state) => ({
          job: state.job
            ? {
                ...state.job,
                error: controller.signal.aborted
                  ? "Generation paused. Completed scenes are saved."
                  : error instanceof Error
                    ? error.message
                    : "Generation failed.",
              }
            : null,
        }));
    } finally {
      controllers.delete(projectId);
    }
  },
  cancel: () => {
    const job = get().job;
    if (job) controllers.get(job.projectId)?.abort();
  },
}));

let revision = 0;
useStudio.subscribe((state, previous) => {
  if (
    !state.ready ||
    (state.projects === previous.projects &&
      state.activeId === previous.activeId)
  )
    return;
  const current = ++revision;
  const workspace: Workspace = {
    version: 1,
    projects: state.projects,
    activeId: state.activeId,
  };
  useStudio.setState({ saveState: "saving" });
  void saveWorkspace(workspace)
    .then(() => {
      if (current === revision)
        useStudio.setState({ storageError: null, saveState: "saved" });
    })
    .catch((error: unknown) => {
      if (current === revision)
        useStudio.setState({
          storageError:
            error instanceof Error ? error.message : "Autosave failed.",
          saveState: "error",
        });
    });
});

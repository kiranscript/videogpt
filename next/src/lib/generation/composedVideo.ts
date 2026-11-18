import { z } from "zod";
import {
  callOpenRouter,
  type OpenRouterOptions,
  type ModelCaller,
  type Usage,
} from "@/lib/generation/openrouter";
import {
  planSceneWindows,
  planVideoScenes,
  type VideoPlan,
} from "@/lib/generation/planner";
import { buildStandaloneVideoPartProject } from "@/lib/generation/project";
import {
  generateVideoScene,
  type GeneratedVideoScene,
} from "@/lib/generation/scenes";
import { resolveVideoPartTheme } from "@/lib/generation/theme";
import { DEFAULT_PALETTE, PALETTES } from "@/lib/catalog/palettes";
import type { SupportedDuration } from "@/lib/schema/duration";
import { seededHash } from "@/lib/timeline/utils";
import type { AnimatedValue, TimelineEvent, VideoProject } from "@/lib/rendering";

export type ComposedVideoModelCaller = ModelCaller;

export type GenerateComposedVideoRequest = {
  prompt: string;
  duration: SupportedDuration;
  checkpoint?: { plan: VideoPlan; completed: Record<string, VideoProject> };
};

export type ComposedVideoResult = {
  project: VideoProject;
  projectName: string;
  summary: string;
  plan: VideoPlan;
  scenes: GeneratedVideoScene[];
};

export type ComposedVideoDependencies = {
  callModel: ComposedVideoModelCaller;
  onPhase?: (phase: "planning" | "generating-sections" | "composing") => void;
  onPlan?: (plan: VideoPlan) => void;
  onScene?: (scene: GeneratedVideoScene) => void;
  onModelProgress?: (
    part: string,
    progress: { characterCount: number },
  ) => void;
  onModelUsage?: (
    part: string,
    usage: Usage,
  ) => void;
  onModelComplete?: (part: string) => void;
  signal?: AbortSignal;
};

const DEFAULT_DEPENDENCIES: ComposedVideoDependencies = {
  callModel: callOpenRouter,
};

const ANIMATED_FIELDS = [
  "opacity",
  "translateX",
  "translateY",
  "scale",
  "scaleX",
  "scaleY",
  "rotate",
  "drawProgress",
] as const;

export class ComposedVideoGenerationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ComposedVideoGenerationError";
  }
}

function roundTime(value: number): number {
  return Number(value.toFixed(3));
}

function validationMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .slice(0, 8)
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
}

function shiftAnimatedValue(value: AnimatedValue | undefined, offset: number) {
  if (!value || !("keyframes" in value)) return value;
  return {
    keyframes: value.keyframes.map((keyframe) => ({
      ...keyframe,
      time: roundTime(keyframe.time + offset),
    })),
  };
}

function shiftEvent(event: TimelineEvent, prefix: string, offset: number): TimelineEvent {
  const shifted = {
    ...event,
    id: `${prefix}-${event.id}`,
    start: roundTime(event.start + offset),
    end: roundTime(event.end + offset),
  } as TimelineEvent;
  const mutable = shifted as unknown as Record<string, unknown>;
  for (const field of ANIMATED_FIELDS) {
    const value = event[field];
    if (value) mutable[field] = shiftAnimatedValue(value, offset);
  }
  return shifted;
}

function prefixProjectEvents(
  project: VideoProject,
  prefix: string,
  offset: number,
): TimelineEvent[] {
  return project.events.map((event) => shiftEvent(event, prefix, offset));
}

function failedSectionMessage(
  section: string,
  reason: PromiseRejectedResult,
): ComposedVideoGenerationError {
  return new ComposedVideoGenerationError(
    `${section} generation failed: ${validationMessage(reason.reason)}`,
    { cause: reason.reason },
  );
}

export async function generateComposedVideo(
  request: GenerateComposedVideoRequest,
  dependencies: ComposedVideoDependencies = DEFAULT_DEPENDENCIES,
): Promise<ComposedVideoResult> {
  const theme = resolveVideoPartTheme(request.prompt);
  const palette = PALETTES[theme.palette] ?? PALETTES[DEFAULT_PALETTE];
  const visualContext = JSON.stringify({
    palette: theme.palette,
    background: { from: palette.bgFrom, to: palette.bgTo },
    text: palette.text,
    primaryAccent: palette.accent1,
    secondaryAccent: palette.accent2,
  });

  const callForPart = (part: string): ComposedVideoModelCaller => (
    systemPrompt: string,
    userPrompt: string,
    options: OpenRouterOptions = {},
  ) => {
    const nextOptions: OpenRouterOptions = { ...options, signal: dependencies.signal };
    if (dependencies.onModelProgress) nextOptions.onChunk = (chunk) => {
      options.onChunk?.(chunk);
      dependencies.onModelProgress?.(part, chunk);
    };
    if (dependencies.onModelUsage) nextOptions.onUsage = (usage) => {
      options.onUsage?.(usage);
      dependencies.onModelUsage?.(part, usage);
    };
    return dependencies.callModel(systemPrompt, userPrompt, nextOptions);
  };

  const completePart = <T,>(part: string, promise: Promise<T>) => promise.then((value) => {
    dependencies.onModelComplete?.(part);
    return value;
  });

  dependencies.onPhase?.("planning");
  const plan = request.checkpoint?.plan ?? await completePart(
    "plan", planVideoScenes(request, { callModel: callForPart("plan") }),
  );
  dependencies.onPlan?.(plan);
  const windows = planSceneWindows(plan, request.duration);

  dependencies.onPhase?.("generating-sections");
  const results = await Promise.allSettled(windows.scenes.map(async (window) => {
    const cached = request.checkpoint?.completed[window.scene.id];
    let generated: GeneratedVideoScene;
    if (cached && cached.duration === window.duration && cached.width === 1920 && cached.height === 1080) {
      generated = {
        scene: window.scene, project: cached, diagnostics: [],
        content: { mode: window.scene.role === "overview" ? "direct-summary-timeline" : "direct-timeline",
          name: window.scene.name, visualIntent: window.scene.goal, events: cached.events },
      };
    } else {
      generated = await completePart(window.scene.id, generateVideoScene({
        plan, scene: window.scene, prompt: request.prompt,
        duration: window.duration, visualContext,
      }, { callModel: callForPart(window.scene.id) }));
    }
    dependencies.onScene?.(generated);
    return generated;
  }));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      throw failedSectionMessage(windows.scenes[index].scene.id, result);
    }
  });
  const scenes = results.map(
    (result) => (result as PromiseFulfilledResult<GeneratedVideoScene>).value,
  );

  dependencies.onPhase?.("composing");
  const introProject = buildStandaloneVideoPartProject({
    part: "title",
    content: { title: plan.title, subtitle: plan.subtitle },
  }, windows.intro.duration, theme);
  const conclusionProject = buildStandaloneVideoPartProject({
    part: "conclusion",
    content: { closingLine: plan.closingLine },
  }, windows.conclusion.duration, theme);

  const events = [
    ...prefixProjectEvents(introProject, "intro", windows.intro.start),
    ...scenes.flatMap((generated, index) =>
      prefixProjectEvents(generated.project, generated.scene.id, windows.scenes[index].start)
    ),
    ...prefixProjectEvents(conclusionProject, "conclusion", windows.conclusion.start),
  ].sort((first, second) => (first.start - second.start) || (first.layer - second.layer));
  const hash = seededHash(JSON.stringify({
    request,
    plan,
    scenes: scenes.map((generated) => generated.content),
  }));
  const chapters = [
    { name: "Introduction", time: windows.intro.start },
    ...scenes.map((generated, index) => ({
      name: generated.scene.name,
      time: windows.scenes[index].start,
    })),
    { name: "Conclusion", time: windows.conclusion.start },
  ];
  const project: VideoProject = {
    id: `composed-${hash.toString(16)}`,
    name: plan.title,
    width: 1920,
    height: 1080,
    duration: request.duration,
    events,
    chapters,
  };

  return {
    project,
    projectName: plan.title,
    summary: plan.logline,
    plan,
    scenes,
  };
}

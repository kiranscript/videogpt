import { classifyProjectDiagnostics } from "@/lib/evaluation/diagnostics";
import { z } from "zod";
import { generateComposedVideo } from "@/lib/generation/composedVideo";
import { callOpenRouter } from "@/lib/generation/openrouter";
import { SupportedDurationSchema } from "@/lib/schema/duration";
import { CheckpointSchema } from "@/lib/workspace/storage";

export const runtime = "nodejs";
const RequestSchema = z.object({
  prompt: z.string().trim().min(3).max(8000), duration: SupportedDurationSchema,
  checkpoint: CheckpointSchema.optional(),
});
export async function POST(request: Request) {
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > 2_000_000) return Response.json({ error: "Project request is too large." }, { status: 413 });
    raw = JSON.parse(text);
  } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Choose a supported duration and enter a prompt." }, { status: 422 });
  if (!process.env.OPENROUTER_API_KEY || !process.env.DEFAULT_MODEL) {
    return Response.json({ error: "AI generation is not configured on this server. You can still create and edit projects from a template." }, { status: 503 });
  }
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(180_000)]);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let cancelled = false;
      const send = (event: object) => {
        if (cancelled || signal.aborted) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); }
        catch { cancelled = true; }
      };
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 10000);
      const abort = () => { cancelled = true; };
      signal.addEventListener("abort", abort, { once: true });
      try {
        const result = await generateComposedVideo(parsed.data, {
          callModel: callOpenRouter, signal,
          onPhase: (stage) => send({ type: "stage", stage }),
          onPlan: (plan) => send({ type: "plan", plan }),
          onScene: (scene) => send({ type: "scene", id: scene.scene.id, project: scene.project,
            warnings: [...scene.diagnostics.map((item) => `${scene.scene.name}: ${item.reason}`), ...classifyProjectDiagnostics(scene.project).filter((item) => item.severity >= 4).map((item) => `${scene.scene.name}: ${item.message}`)] }),
        });
        send({ type: "done", project: result.project });
      } catch (error) {
        console.error("Generation failed", error);
        send({ type: "error", message: "Generation stopped. Completed scenes are saved; retry to finish the remaining scenes." });
      } finally {
        clearInterval(heartbeat); signal.removeEventListener("abort", abort);
        try { controller.close(); } catch { /* The browser may have disconnected. */ }
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}

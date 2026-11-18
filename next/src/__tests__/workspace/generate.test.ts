import { afterEach, expect, it, vi } from "vitest";
import { generateVideo } from "@/lib/workspace/generate";
import { createLaunchProject } from "@/lib/project/templates";
afterEach(() => vi.unstubAllGlobals());
it("accepts chunked SSE and a final line without trailing whitespace", async () => {
  const payload = `data: ${JSON.stringify({ type: "stage", stage: "planning" })}\n\ndata: ${JSON.stringify({ type: "done", project: createLaunchProject() })}`;
  const bytes = new TextEncoder().encode(payload);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0, 30)); controller.enqueue(bytes.slice(30)); controller.close(); } }))));
  const update = vi.fn();
  await generateVideo({ prompt: "An idea", duration: 10 }, new AbortController().signal, update);
  expect(update.mock.calls.map(([event]) => event.type)).toEqual(["stage", "done"]);
});
it("surfaces server configuration errors", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "AI is not configured" }, { status: 503 })));
  await expect(generateVideo({ prompt: "An idea", duration: 10 }, new AbortController().signal, vi.fn())).rejects.toThrow("AI is not configured");
});
it("rejects interrupted streams while preserving emitted scene updates", async () => {
  const event = { type: "scene", id: "first", project: createLaunchProject(), warnings: [] };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`data: ${JSON.stringify(event)}\n\n`)));
  const update = vi.fn();
  await expect(generateVideo({ prompt: "An idea", duration: 10 }, new AbortController().signal, update)).rejects.toThrow("Connection interrupted");
  expect(update).toHaveBeenCalledWith(event);
});

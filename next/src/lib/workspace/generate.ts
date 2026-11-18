import { z } from "zod";
import { VideoPlanSchema } from "@/lib/generation/contracts";
import { VideoProjectSchema } from "@/lib/schema/timeline";
import type { Checkpoint } from "./types";
const UpdateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heartbeat") }),
  z.object({ type: z.literal("stage"), stage: z.string() }),
  z.object({ type: z.literal("plan"), plan: VideoPlanSchema }),
  z.object({ type: z.literal("scene"), id: z.string(), project: VideoProjectSchema, warnings: z.array(z.string()) }),
  z.object({ type: z.literal("done"), project: VideoProjectSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type GenerationUpdate = z.infer<typeof UpdateSchema>;
export async function generateVideo(input: { prompt: string; duration: number; checkpoint?: Checkpoint }, signal: AbortSignal, update: (event: GenerationUpdate) => void) {
  const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not connect to generation. Please retry.");
  }
  if (!response.body) throw new Error("The server returned an empty response.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminal = false;
  const consume = (line: string) => {
    if (!line.startsWith("data:") || terminal) return;
    const event = UpdateSchema.parse(JSON.parse(line.slice(5).trim()));
    if (event.type === "error") throw new Error(event.message);
    update(event);
    if (event.type === "done") terminal = true;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
      lines.forEach(consume);
    }
    buffer += decoder.decode(); if (buffer.trim()) consume(buffer);
    if (!terminal) throw new Error("Connection interrupted. Your completed scenes are saved; retry to continue.");
  } finally { reader.releaseLock(); }
}

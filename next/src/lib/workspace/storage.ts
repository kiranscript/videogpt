import { z } from "zod";
import { VideoProjectSchema } from "@/lib/schema/timeline";
import { VideoPlanSchema } from "@/lib/generation/contracts";
import type { Workspace } from "./types";
export const CheckpointSchema = z.object({ plan: VideoPlanSchema, completed: z.record(z.string(), VideoProjectSchema) });
export const WorkspaceSchema = z.object({
  version: z.literal(1), activeId: z.string().nullable(),
  projects: z.array(z.object({
    id: z.string(), title: z.string(), prompt: z.string(), duration: z.number().positive(), updatedAt: z.string(),
    video: VideoProjectSchema.optional(), checkpoint: CheckpointSchema.optional(), warnings: z.array(z.string()),
  })),
});
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("videogpt-studio", 1);
    let failed = false;
    request.onupgradeneeded = () => request.result.createObjectStore("workspace");
    request.onsuccess = () => { if (failed) request.result.close(); else resolve(request.result); };
    request.onerror = () => reject(new Error("Browser storage is unavailable. Download a project backup before closing."));
    request.onblocked = () => { failed = true; reject(new Error("Close other Studio tabs to open project storage.")); };
  });
}
export async function loadWorkspace(): Promise<Workspace | null> {
  const db = await database();
  try {
    const data = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction("workspace").objectStore("workspace").get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Could not load projects from this browser."));
    });
    return data === undefined ? null : WorkspaceSchema.parse(data) as Workspace;
  } finally { db.close(); }
}
let queue: Promise<void> = Promise.resolve();
export function saveWorkspace(workspace: Workspace): Promise<void> {
  const snapshot = structuredClone(workspace);
  const next = queue.catch(() => {}).then(async () => {
    const value = WorkspaceSchema.parse(snapshot);
    const db = await database();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("workspace", "readwrite");
        transaction.objectStore("workspace").put(value, "current");
        transaction.oncomplete = () => resolve();
        transaction.onerror = transaction.onabort = () => reject(new Error("Autosave failed. Download a JSON backup and free some storage."));
      });
    } finally { db.close(); }
  });
  queue = next;
  return next;
}

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace/storage";
import { createLaunchProject } from "@/lib/project/templates";
import type { Workspace } from "@/lib/workspace/types";
beforeEach(() => vi.stubGlobal("indexedDB", new IDBFactory()));
afterEach(() => vi.unstubAllGlobals());
it("saves the latest edit even when writes are requested concurrently", async () => {
  const video = createLaunchProject();
  const initial: Workspace = { version: 1, projects: [{ id: "one", title: video.name, prompt: "", duration: 10, updatedAt: "today", video, warnings: [] }], activeId: "one" };
  const latest = { ...initial, projects: [{ ...initial.projects[0], title: "Latest edit" }] };
  await Promise.all([saveWorkspace(initial), saveWorkspace(latest)]);
  expect(await loadWorkspace()).toEqual(latest);
});
it("takes an immutable snapshot before asynchronous saving", async () => {
  const workspace: Workspace = { version: 1, projects: [], activeId: null };
  const write = saveWorkspace(workspace); workspace.activeId = "changed";
  await write;
  expect((await loadWorkspace())?.activeId).toBeNull();
});

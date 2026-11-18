import { beforeEach, describe, expect, it, vi } from "vitest";
import { moveEvent, retimeEvent } from "@/lib/project/edit";
import { createLaunchProject } from "@/lib/project/templates";
import { parseProjectDocument } from "@/lib/project/document";
import { visibleEvents } from "@/lib/rendering";
vi.mock("@/lib/workspace/storage", () => ({ loadWorkspace: vi.fn().mockResolvedValue(null), saveWorkspace: vi.fn().mockResolvedValue(undefined) }));
import { useStudio } from "@/lib/workspace/store";
beforeEach(() => useStudio.setState({ projects: [], activeId: null, histories: {}, ready: false, job: null }));
describe("studio editing", () => {
  it("undoes and redoes edits without changing other projects", () => {
    const initial = createLaunchProject();
    const id = useStudio.getState().add(initial);
    const other = useStudio.getState().add(createLaunchProject());
    useStudio.getState().edit(id, { ...initial, name: "Edited" });
    expect(useStudio.getState().projects.find((project) => project.id === id)?.title).toBe("Edited");
    useStudio.getState().undo(id);
    expect(useStudio.getState().projects.find((project) => project.id === id)?.video).toEqual(initial);
    useStudio.getState().redo(id);
    expect(useStudio.getState().projects.find((project) => project.id === id)?.title).toBe("Edited");
    expect(useStudio.getState().projects.find((project) => project.id === other)?.title).toBe("A little idea");
    useStudio.getState().undo(id);
    useStudio.getState().edit(id, { ...initial, name: "A new branch" });
    expect(useStudio.getState().histories[id].redo).toEqual([]);
  });
  it("moves absolute paths together with their source geometry", () => {
    const event = { id: "shape", type: "shape" as const, shapeType: "circle" as const, x: 50, y: 60, radius: 10, fill: "#fff", start: 0, end: 3, layer: 1, path: { points: [{ x: 50, y: 60 }, { x: 90, y: 100 }], easing: "linear" as const } };
    expect(moveEvent(event, 10, 20)).toMatchObject({ x: 60, y: 80, path: { points: [{ x: 60, y: 80 }, { x: 100, y: 120 }] } });
    expect(event.x).toBe(50);
  });
  it("renders only the new scene at an exact boundary", () => {
    const video = createLaunchProject();
    const events = visibleEvents(video, 3);
    expect(events.every((event) => event.start === 3)).toBe(true);
    expect(visibleEvents(video, 10).length).toBeGreaterThan(0);
  });
  it("round-trips a template and rejects corrupt timing and duplicate IDs", () => {
    const video = createLaunchProject();
    expect(parseProjectDocument({ version: 1, project: video })).toEqual(video);
    expect(() => parseProjectDocument({ version: 1, project: { ...video, events: [...video.events, video.events[0]] } })).toThrow();
    expect(() => parseProjectDocument({ version: 1, project: { ...video, events: [{ ...video.events[0], end: 11 }] } })).toThrow();
  });
  it("retimes absolute keyframes with a trimmed element", () => {
    const event = { ...createLaunchProject().events[0], start: 2, end: 4, opacity: { keyframes: [{ time: 2, value: 0, easing: "linear" as const }, { time: 4, value: 1, easing: "linear" as const }] } };
    const changed = retimeEvent(event, 3, 7);
    expect(changed.opacity).toEqual({ keyframes: [{ time: 3, value: 0, easing: "linear" }, { time: 7, value: 1, easing: "linear" }] });
    expect(event.start).toBe(2);
  });
  it("can restore a deleted project with its original identity", () => {
    const id = useStudio.getState().add(createLaunchProject());
    const original = useStudio.getState().projects[0];
    useStudio.getState().remove(id);
    useStudio.getState().restore(original);
    expect(useStudio.getState().projects).toEqual([original]);
    expect(useStudio.getState().activeId).toBe(id);
  });

  it("treats continuous text edits as one undo step", () => {
    const original = createLaunchProject();
    const id = useStudio.getState().add(original);
    useStudio.getState().edit(id, { ...original, name: "A" }, "title");
    useStudio.getState().edit(id, { ...original, name: "An idea" }, "title");
    useStudio.getState().undo(id);
    expect(useStudio.getState().projects[0].video?.name).toBe(original.name);
  });

});

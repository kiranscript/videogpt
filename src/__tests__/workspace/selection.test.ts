import { describe, expect, it } from "vitest";
import { selectionBounds, resizeFromCorner } from "@/lib/project/selection";
import { elementName } from "@/lib/project/elementName";
import type { TimelineEvent } from "@/lib/rendering";
const rect: TimelineEvent = { id: "scene-panel-1", name: "Data panel", type: "shape", shapeType: "rect", x: 100, y: 200, width: 300, height: 100, fill: "#90F1EF", layer: 2, start: 0, end: 5 };
describe("canvas resize", () => {
  it("keeps the opposite corner fixed when resizing from the top left", () => {
    const changed = resizeFromCorner(rect, 1, "nw", -60, -20);
    expect(selectionBounds(changed, 1)).toEqual({ left: 40, top: 180, right: 400, bottom: 300 });
    expect(selectionBounds(rect, 1)).toEqual({ left: 100, top: 200, right: 400, bottom: 300 });
  });
  it("preserves proportions when requested", () => {
    const changed = resizeFromCorner(rect, 1, "se", 60, 0, true);
    expect(changed).toMatchObject({ width: 360, height: 120 });
  });
  it("keeps resize dimensions positive when the pointer crosses the origin", () => {
    const changed = resizeFromCorner(rect, 1, "se", -2000, -2000);
    const box = selectionBounds(changed, 1)!;
    expect(box.right - box.left).toBeGreaterThanOrEqual(8);
    expect(box.bottom - box.top).toBeGreaterThanOrEqual(8);
  });
  it("honors human-readable layer names", () => {
    expect(elementName(rect)).toBe("Data panel");
    expect(elementName({ ...rect, name: undefined })).toBe("Panel");
  });
});

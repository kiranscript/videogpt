import { afterEach, describe, expect, it, vi } from "vitest";
import { captureCanvasToBlob } from "@/lib/export/MediaRecorderExporter";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("video recording timing", () => {
  it("records a ten-second project for ten seconds and releases its tracks", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("performance", { now: () => Date.now() });
    const stopTrack = vi.fn();
    const render = vi.fn();
    const removeListener = vi.fn();
    vi.stubGlobal("document", {
      fonts: { ready: Promise.resolve() },
      createElement: () => ({ getContext: () => ({}), captureStream: () => ({ getTracks: () => [{ stop: stopTrack }] }) }),
      addEventListener: vi.fn(), removeEventListener: removeListener,
    });
    class Recorder {
      static isTypeSupported() { return true; }
      state = "inactive";
      ondataavailable?: (event: { data: Blob }) => void;
      onstop?: () => void;
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["video"]) }); this.onstop?.(); }
    }
    vi.stubGlobal("MediaRecorder", Recorder);
    let completed = false;
    const result = captureCanvasToBlob({ renderFn: render, width: 1920, height: 1080, duration: 10 }).then((blob) => { completed = true; return blob; });
    await vi.advanceTimersByTimeAsync(9999);
    expect(completed).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    expect((await result).size).toBeGreaterThan(0);
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(removeListener).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(render.mock.calls.at(-1)?.[1]).toBeLessThan(10);
  });
});

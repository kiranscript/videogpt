/** Browser recording is paced by elapsed wall time; it cannot be fast-forwarded. */
export async function captureCanvasToBlob({
  renderFn, width, height, duration, fps = 30, onProgress, signal,
}: {
  renderFn: (ctx: CanvasRenderingContext2D, t: number) => void;
  width: number; height: number; duration: number; fps?: number;
  onProgress?: (progress: number) => void; signal?: AbortSignal;
}): Promise<Blob> {
  if (!Number.isFinite(duration) || duration <= 0 || fps <= 0 || !Number.isFinite(fps)) throw new Error("Invalid export timing.");
  signal?.throwIfAborted();
  const mimeType = pickMimeType();
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot create an export canvas.");
  await document.fonts?.ready;
  renderFn(ctx, 0);
  const stream = canvas.captureStream(fps);
  let recorder: MediaRecorder;
  try { recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 }); }
  catch (error) { stream.getTracks().forEach((track) => track.stop()); throw error; }
  const chunks: BlobPart[] = [];
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    let failed = false;
    const cleanup = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibilityChanged);
      signal?.removeEventListener("abort", abort);
      stream.getTracks().forEach((track) => track.stop());
    };
    const fail = (error: unknown) => {
      failed = true;
      if (recorder.state !== "inactive") recorder.stop();
      cleanup(); reject(error);
    };
    const abort = () => fail(new DOMException("Export cancelled", "AbortError"));
    const visibilityChanged = () => {
      if (document.hidden) fail(new Error("Keep this tab visible while recording. Retry the export."));
    };
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => fail(new Error("Video recording failed."));
    recorder.onstop = () => {
      cleanup();
      if (!failed) { onProgress?.(1); resolve(new Blob(chunks, { type: mimeType })); }
    };
    document.addEventListener("visibilitychange", visibilityChanged);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    const start = performance.now();
    recorder.start();
    const step = () => {
      try {
        const elapsed = (performance.now() - start) / 1000;
        if (elapsed >= duration) { recorder.stop(); return; }
        renderFn(ctx, elapsed);
        onProgress?.(elapsed / duration);
        timer = setTimeout(step, Math.min(1000 / fps, (duration - elapsed) * 1000));
      } catch (error) { fail(error); }
    };
    step();
  });
}

export function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") throw new Error("Video recording is unavailable. Try GIF export.");
  for (const mime of ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  throw new Error("No supported video encoder. Try GIF export.");
}
export function extensionForMimeType(mimeType: string): string { return mimeType.startsWith("video/mp4") ? "mp4" : "webm"; }

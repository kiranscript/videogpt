"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useStudio } from "@/lib/workspace/store";
import { templates, createLaunchProject } from "@/lib/project/templates";
import { parseProjectDocument, downloadProject } from "@/lib/project/document";
import { addElement } from "@/lib/project/edit";
import { exportVideo, type ExportFormat } from "@/lib/export/VideoExporter";
import type { VideoProject } from "@/lib/rendering";
import type { StudioProject } from "@/lib/workspace/types";
import { EditorCanvas, Frame } from "./Canvas";
import { Inspector } from "./Inspector";
import { usePlayback } from "./usePlayback";
import { Timeline } from "./Timeline";
import { useShortcutLabel } from "./useShortcutLabel";
import { useMediaQuery } from "./useMediaQuery";
import { moveEvent } from "@/lib/project/edit";
import { Icon } from "./Icon";

export function Studio() {
  const state = useStudio();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [mobileLibrary, setMobileLibrary] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [libraryCollapsed, setLibraryCollapsed] = useState(false);
  const [deleted, setDeleted] = useState<StudioProject | null>(null);
  const isMobile = useMediaQuery("(max-width: 760px)");
  const libraryRef = useRef<HTMLElement>(null);
  const openComposer = () => {
    setLibraryCollapsed(false);
    setMobileLibrary(true);
    setComposerOpen(true);
    requestAnimationFrame(() =>
      document.getElementById("idea-prompt")?.focus(),
    );
  };
  useEffect(() => {
    if (!isMobile || !mobileLibrary) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = libraryRef.current;
    root?.querySelector<HTMLButtonElement>(".mobile-close")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileLibrary(false);
      if (event.key !== "Tab" || !root) return;
      const focusable = [
        ...root.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,textarea,select,a[href]",
        ),
      ].filter((item) => item.getClientRects().length > 0);
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [isMobile, mobileLibrary]);
  const upload = useRef<HTMLInputElement>(null);
  const initialize = state.initialize;
  useEffect(() => {
    void initialize();
  }, [initialize]);
  const active = state.projects.find(
    (project) => project.id === state.activeId,
  );
  const activeJob = state.job?.projectId === active?.id ? state.job : null;
  const running = state.job && !state.job.error;
  return (
    <div className={`studio ${libraryCollapsed ? "library-collapsed" : ""}`}>
      <div
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="editor-announcement"
      >
        {state.announcement}
      </div>
      <aside className="rail">
        <Link className="brand-mark" href="/" aria-label="VideoGPT Studio">
          <span>v</span>
          <i />
        </Link>
        <button
          className={`rail-button ${(isMobile ? mobileLibrary : !libraryCollapsed) ? "active" : ""}`}
          aria-label="Show projects"
          aria-expanded={isMobile ? mobileLibrary : !libraryCollapsed}
          aria-controls="project-library"
          onClick={() => {
            if (isMobile) setMobileLibrary((value) => !value);
            else setLibraryCollapsed((value) => !value);
          }}
        >
          <Icon name="folder" size={21} />
          <span className="rail-label">Projects</span>
        </button>
        <button
          className="rail-button"
          aria-label="New video"
          title="New video"
          onClick={openComposer}
        >
          <Icon name="sparkle" size={21} />
          <span className="rail-label">New video</span>
        </button>
        <div className="rail-spacer" />
      </aside>
      {isMobile && mobileLibrary && (
        <button
          className="drawer-backdrop"
          aria-label="Close project library"
          onClick={() => setMobileLibrary(false)}
        />
      )}
      <aside
        ref={libraryRef}
        id="project-library"
        aria-label="Project library"
        role={isMobile && mobileLibrary ? "dialog" : undefined}
        aria-modal={isMobile && mobileLibrary ? true : undefined}
        className={`library ${mobileLibrary ? "mobile-open" : ""}`}
      >
        <header className="library-brand">
          <span>
            VideoGPT<span className="studio-word">studio</span>
          </span>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileLibrary(false)}
            aria-label="Close projects"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="library-content">
          <button className="new-project-button" onClick={openComposer}>
            <Icon name="plus" size={17} /> New video{" "}
            <Icon name="arrow" size={15} />
          </button>
          <div className="composer-section" hidden={!composerOpen}>
            <div className="composer-heading">
              <strong>Create something new</strong>
              <button
                className="icon-button"
                onClick={() => setComposerOpen(false)}
                aria-label="Close composer"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
            <div className="eyebrow">FROM THOUGHT TO FRAME</div>
            <h1>
              What’s your
              <br />
              <em>next idea?</em>
            </h1>
            <p className="library-intro">Give your ideas a little motion.</p>
            <form
              className="creation-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (prompt.trim().length >= 3 && !running) {
                  void state.generate(prompt.trim(), duration);
                  setMobileLibrary(false);
                }
              }}
            >
              <textarea
                id="idea-prompt"
                placeholder="A product launch. How a heat pump works. An idea worth explaining…"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={8000}
                rows={5}
                aria-label="Describe your video"
              />
              <div className="creation-options">
                <span>Duration</span>
                <select
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  aria-label="Video duration"
                >
                  {[5, 10, 15, 20].map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds} seconds
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="generate-button"
                disabled={
                  !state.ready || Boolean(running) || prompt.trim().length < 3
                }
                type="submit"
              >
                <Icon name="sparkle" size={16} />
                {running ? "Creating your video…" : "Create video"}
                <Icon name="arrow" size={16} />
              </button>
            </form>
          </div>
          <div className="section-label">
            <span>START SOMEWHERE</span>
            <Icon name="grid" size={13} />
          </div>
          <div className="template-list">
            {templates.map((template) => (
              <button
                key={template.name}
                onClick={() => {
                  state.add(template.create());
                  setMobileLibrary(false);
                }}
                disabled={!state.ready}
              >
                <span
                  className="template-art"
                  style={{
                    background: `${template.color}22`,
                    color: template.color,
                  }}
                >
                  <Icon
                    name={
                      template.name === "A little idea" ? "sparkle" : "layers"
                    }
                  />
                </span>
                <span>
                  <strong>{template.name}</strong>
                  <small>{template.description}</small>
                </span>
                <Icon name="plus" size={14} />
              </button>
            ))}
          </div>
          <div className="section-label">
            <span>YOUR PROJECTS</span>
            <button
              className="icon-button"
              onClick={() => upload.current?.click()}
              title="Import JSON project"
              aria-label="Import JSON project"
            >
              <Icon name="upload" size={14} />
            </button>
          </div>
          <div className="project-list">
            {state.projects.map((project) => (
              <div
                key={project.id}
                className={`project-row ${active?.id === project.id ? "active" : ""}`}
              >
                <button
                  onClick={() => {
                    state.open(project.id);
                    setMobileLibrary(false);
                  }}
                >
                  <span className="project-mini">
                    {project.video ? (
                      <Frame project={project.video} time={0.5} />
                    ) : (
                      <Icon name="sparkle" size={16} />
                    )}
                  </span>
                  <span>
                    <strong>{project.title}</strong>
                    <small>
                      {project.duration}s ·{" "}
                      {project.video ? "Ready to edit" : "Draft"}
                    </small>
                  </span>
                </button>
                <button
                  className="delete-project icon-button"
                  onClick={() => {
                    setDeleted(project);
                    state.remove(project.id);
                  }}
                  aria-label={`Delete ${project.title}`}
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <footer className="library-footer">
          <Icon name="folder" size={13} /> Saved locally · export JSON to back
          up
        </footer>
      </aside>
      <main className="main-workspace">
        {state.storageError && (
          <div className="notice error" role="alert">
            {state.storageError}
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
            <button
              className="icon-button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}
        {!state.ready ? (
          <div className="workspace-empty">
            <span className="loading-orb" />
            <p>Opening your studio…</p>
          </div>
        ) : active?.video ? (
          <Editor key={active.id} document={active} setError={setError} />
        ) : active ? (
          <div className="generation-workspace">
            <div className="workspace-top">
              <span>
                Studio <Icon name="chevron" size={12} /> {active.title}
              </span>
              <span className="pill">{active.duration}s video</span>
            </div>
            <div className="generation-card">
              <span className={`generation-orb ${running ? "animating" : ""}`}>
                <Icon name="sparkle" size={38} />
              </span>
              <div className="eyebrow">A WORK IN MOTION</div>
              <h2>
                {activeJob?.error
                  ? "Let’s pick up where we left off."
                  : "Making room for your idea."}
              </h2>
              <p>
                {activeJob?.error ??
                  (!activeJob
                    ? "Your draft is saved. Resume whenever you’re ready."
                    : activeJob.stage === "planning"
                      ? "Finding the story and planning your scenes."
                      : "Designing and animating each scene.")}
              </p>
              <div className="generation-steps">
                {active.checkpoint?.plan.scenes.map((scene, index) => (
                  <div key={scene.id}>
                    <span
                      className={
                        active.checkpoint?.completed[scene.id]
                          ? "step-done"
                          : "step-wait"
                      }
                    >
                      {active.checkpoint?.completed[scene.id] ? (
                        <Icon name="check" size={13} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span>{scene.name}</span>
                    <small>
                      {active.checkpoint?.completed[scene.id]
                        ? "Saved"
                        : "In progress"}
                    </small>
                  </div>
                ))}
              </div>
              {activeJob && !activeJob.error ? (
                <button className="secondary-button" onClick={state.cancel}>
                  <Icon name="stop" size={14} /> Pause generation
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={() =>
                    void state.generate(
                      active.prompt,
                      active.duration,
                      active.id,
                    )
                  }
                >
                  <Icon name="sparkle" size={16} />
                  {active.checkpoint ? "Finish remaining scenes" : "Try again"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="workspace-empty">
            <Icon name="sparkle" size={36} />
            <h2>Your next story starts here.</h2>
            <p>Describe an idea or choose a template to begin.</p>
            <button
              className="primary-button"
              onClick={() => state.add(createLaunchProject())}
            >
              Open a starter project <Icon name="arrow" size={16} />
            </button>
          </div>
        )}
      </main>
      {deleted && (
        <div className="undo-toast" role="status">
          <span>Deleted “{deleted.title}”</span>
          <button
            onClick={() => {
              state.restore(deleted);
              setDeleted(null);
            }}
          >
            Undo
          </button>
          <button
            className="icon-button"
            aria-label="Dismiss delete notice"
            onClick={() => setDeleted(null)}
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}
      <input
        hidden
        ref={upload}
        type="file"
        accept=".json"
        aria-label="Choose project file"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          try {
            if (file.size > 5_000_000)
              throw new Error("Choose a project smaller than 5 MB.");
            state.add(parseProjectDocument(JSON.parse(await file.text())));
          } catch (error) {
            setError(
              error instanceof Error && error.message.includes("5 MB")
                ? error.message
                : "That file could not be opened. Choose a Studio JSON project.",
            );
          }
        }}
      />
    </div>
  );
}

function Editor({
  document,
  setError,
}: {
  document: StudioProject;
  setError: (message: string) => void;
}) {
  const video = document.video!;
  const state = useStudio();
  const playback = usePlayback(video.duration);
  const [selected, select] = useState<string | null>(null);
  const [exportMenu, setExportMenu] = useState(false);
  const [exporting, setExporting] = useState<number | null>(null);
  const wide = useMediaQuery("(min-width: 1100px)");
  const phone = useMediaQuery("(max-width: 760px)");
  const modifier = useShortcutLabel();
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [canvasFocused, setCanvasFocused] = useState(false);
  const canvasFocusButton = useRef<HTMLButtonElement>(null);
  const [inspectorOverride, setInspectorOverride] = useState<boolean | null>(
    null,
  );
  const showInspector = inspectorOverride ?? wide;
  const setShowInspector = (next: boolean | ((value: boolean) => boolean)) =>
    setInspectorOverride(
      typeof next === "function" ? next(showInspector) : next,
    );
  const chooseElement = (id: string | null) => {
    select(id);
    if (id) {
      setShowInspector(true);
      if (phone)
        window.document
          .querySelector(".main-workspace")
          ?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const commit = (video: VideoProject, group?: string) =>
    state.edit(document.id, video, group);
  const history = state.histories[document.id];
  const chapters = video.chapters?.length
    ? video.chapters
    : [{ name: "Scene 1", time: 0 }];
  const activeScene = Math.max(
    0,
    chapters.findLastIndex((chapter) => playback.time >= chapter.time),
  );
  const exportController = useRef<AbortController | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => exportController.current?.abort(), []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).closest(
          "input, textarea, select, [contenteditable], .time-ruler-wrap",
        )
      )
        return;
      if (
        event.code === "Space" &&
        (event.target as HTMLElement).closest("button, a")
      )
        return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) state.redo(document.id);
        else state.undo(document.id);
      } else if (event.code === "Space") {
        event.preventDefault();
        playback.toggle();
      } else if (
        ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(
          event.key,
        ) &&
        selected
      ) {
        const amount = event.shiftKey ? 10 : 1;
        event.preventDefault();
        commit({
          ...video,
          events: video.events.map((item) =>
            item.id === selected
              ? moveEvent(
                  item,
                  event.key === "ArrowRight"
                    ? amount
                    : event.key === "ArrowLeft"
                      ? -amount
                      : 0,
                  event.key === "ArrowDown"
                    ? amount
                    : event.key === "ArrowUp"
                      ? -amount
                      : 0,
                )
              : item,
          ),
        });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        playback.seek(playback.time + 0.1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        playback.seek(playback.time - 0.1);
      } else if (event.key === "Escape") {
        if (canvasFocused && !exportMenu && (wide || !showInspector)) {
          setCanvasFocused(false);
          canvasFocusButton.current?.focus();
          return;
        }
        select(null);
        setExportMenu(false);
        if (!wide) setShowInspector(false);
      } else if (event.key.toLowerCase() === "i")
        setShowInspector((value) => !value);
      else if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selected
      ) {
        event.preventDefault();
        commit({
          ...video,
          events: video.events.filter((event) => event.id !== selected),
        });
        select(null);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
  useEffect(() => {
    if (!exportMenu) return;
    const close = (event: PointerEvent) => {
      if (!exportRef.current?.contains(event.target as Node))
        setExportMenu(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [exportMenu]);
  const save = async (format: ExportFormat) => {
    setExportMenu(false);
    playback.pause();
    setExporting(0);
    const controller = new AbortController();
    exportController.current = controller;
    try {
      await exportVideo(video, {
        format,
        onProgress: setExporting,
        signal: controller.signal,
      });
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Export failed. Please retry.",
        );
    } finally {
      setExporting(null);
      exportController.current = null;
    }
  };
  return (
    <div
      className={`editor ${showInspector ? "" : "inspector-hidden"} ${canvasFocused ? "canvas-focused" : timelineExpanded ? "timeline-expanded" : ""}`}
    >
      <header className="workspace-top">
        <div className="breadcrumb">
          <span>Studio</span>
          <Icon name="chevron" size={12} />
          <div className="project-title-group">
            <input
              title="Rename project"
              aria-label="Project name"
              value={video.name}
              maxLength={80}
              onChange={(event) =>
                commit({ ...video, name: event.target.value })
              }
            />
            <span className="save-indicator">
              <span className="status-dot" />
              {state.saveState === "error"
                ? "Not saved"
                : state.saveState === "saving"
                  ? "Saving…"
                  : "Autosaved"}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            disabled={!history?.undo.length}
            onClick={() => state.undo(document.id)}
            aria-label="Undo"
            title={`Undo (${modifier} Z)`}
          >
            <Icon name="undo" />
          </button>
          <button
            className="icon-button"
            disabled={!history?.redo.length}
            onClick={() => state.redo(document.id)}
            aria-label="Redo"
            title={`Redo (${modifier} Shift Z)`}
          >
            <Icon name="redo" />
          </button>
          <span className="header-divider" />
          <div className="export-control" ref={exportRef}>
            <button
              className="primary-button export-button"
              disabled={exporting !== null}
              onClick={() => setExportMenu((value) => !value)}
            >
              <Icon name="download" size={15} />
              {exporting !== null
                ? `${Math.round(exporting * 100)}%`
                : "Export"}
            </button>
            {exportMenu && (
              <div className="export-menu">
                <strong>TAKE YOUR IDEA WITH YOU</strong>
                <button onClick={() => void save("video")}>
                  <Icon name="play" />
                  <span>
                    Video<small>MP4 / WebM · real-time capture</small>
                  </span>
                </button>
                <button onClick={() => void save("gif")}>
                  <Icon name="grid" />
                  <span>
                    Animated GIF<small>480px · ready to share</small>
                  </span>
                </button>
                <button
                  onClick={() => {
                    downloadProject(video);
                    setExportMenu(false);
                  }}
                >
                  <Icon name="folder" />
                  <span>
                    Project file<small>Editable JSON backup</small>
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {exporting !== null && (
        <div className="export-progress" role="status" aria-live="polite">
          <div>
            <strong>Exporting video · {Math.round(exporting * 100)}%</strong>
            <span>Keep this tab visible until your file is ready.</span>
          </div>
          <progress max={1} value={exporting} />
          <button
            className="secondary-button"
            onClick={() => exportController.current?.abort()}
          >
            Cancel export
          </button>
        </div>
      )}
      <section className="stage-area">
        <div className="stage-toolbar">
          <div>
            <span className="canvas-pill">Canvas</span>
            <span className="canvas-help">Select to edit · drag to move</span>
            <span className="resolution-label">
              {video.width} × {video.height}
            </span>
          </div>
          <div className="tool-group">
            <button
              className="tool-button"
              onClick={() => {
                const next = addElement(video, "text", playback.time);
                commit(next);
                chooseElement(next.events.at(-1)!.id);
              }}
            >
              <Icon name="text" size={15} />
              Text
            </button>
            <button
              className="tool-button"
              onClick={() => {
                const next = addElement(video, "shape", playback.time);
                commit(next);
                chooseElement(next.events.at(-1)!.id);
              }}
            >
              <Icon name="shape" size={15} />
              Shape
            </button>
            <span className="toolbar-divider" />
            <button
              className={`icon-button ${showInspector ? "on" : ""}`}
              onClick={() => setShowInspector((value) => !value)}
              title="Toggle properties (I)"
              aria-label="Toggle properties"
              aria-pressed={showInspector}
            >
              <Icon name="layers" size={16} />
            </button>
            <button
              ref={canvasFocusButton}
              className={`icon-button ${canvasFocused ? "on" : ""}`}
              onClick={() => setCanvasFocused((focused) => !focused)}
              title={canvasFocused ? "Restore story timeline" : "Expand canvas"}
              aria-label="Expand canvas"
              aria-pressed={canvasFocused}
              aria-controls="story-timeline"
            >
              <Icon name={canvasFocused ? "collapse" : "expand"} size={16} />
            </button>
          </div>
        </div>
        <div
          className="canvas-stage"
          style={{ "--canvas-aspect": video.width / video.height } as CSSProperties}
        >
          <div className="canvas-wrap">
            <EditorCanvas
              project={video}
              time={playback.time}
              selected={selected}
              select={chooseElement}
              commit={commit}
              pause={playback.pause}
            />
          </div>
        </div>
        <div className="playback-bar">
          <div className="scene-label">
            <span className="status-dot" />
            <span>{chapters[activeScene]?.name}</span>
          </div>
          <div className="transport">
            <button
              className="icon-button"
              onClick={() => playback.seek(0)}
              aria-label="Go to start"
            >
              <Icon name="skipStart" size={18} />
            </button>
            <button
              className="play-button"
              onClick={playback.toggle}
              aria-label={playback.playing ? "Pause" : "Play"}
            >
              <Icon name={playback.playing ? "pause" : "play"} size={16} />
            </button>
            <button
              className="icon-button"
              onClick={() => playback.seek(video.duration)}
              aria-label="Go to end"
            >
              <Icon name="skipEnd" size={18} />
            </button>
          </div>
          <div className="playback-meta">
            <span className="timecode">
              {playback.time.toFixed(1)}
              <span> / {video.duration.toFixed(1)}s</span>
            </span>
            <select
              className="speed-control"
              aria-label="Playback speed"
              value={playback.speed}
              onChange={(event) => playback.setSpeed(Number(event.target.value))}
            >
              {[0.5, 1, 1.5, 2].map((speed) => (
                <option key={speed} value={speed}>
                  {speed}×
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
      {showInspector && !wide && !phone && (
        <button
          className="inspector-backdrop"
          onClick={() => setShowInspector(false)}
          aria-label="Close properties panel"
        />
      )}
      {showInspector && (
        <Inspector
          project={video}
          selected={selected}
          select={chooseElement}
          commit={commit}
          time={playback.time}
          seek={playback.seek}
          close={() => setShowInspector(false)}
          modal={!wide && !phone}
          sheet={phone}
        />
      )}
      <Timeline
        hidden={canvasFocused}
        expanded={timelineExpanded}
        expand={setTimelineExpanded}
        project={video}
        time={playback.time}
        seek={playback.seek}
        selected={selected}
        select={chooseElement}
        commit={commit}
      />
      {document.warnings.length > 0 && (
        <details className="quality-notice">
          <summary>{document.warnings.length} generation notes</summary>
          {document.warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
        </details>
      )}
      <footer className="workspace-footer">
        <span>
          <span className="status-dot" />{" "}
          {selected
            ? "Arrow keys to nudge · Shift for 10px"
            : "Select an element on the canvas or in Properties"}
        </span>
        <span>
          <kbd>Space</kbd> to play <i>·</i>
          <kbd>{modifier} Z</kbd> to undo
        </span>
      </footer>
    </div>
  );
}

# VideoGPT Studio

A focused workspace for turning ideas into short animated videos. The original
VideoGPT is a reference for the rendering and generation techniques; this app
has a new interface, state model, and project workflow.

## Run

The app lives in `next/`, which is also the Vercel Root Directory.
Use Linux/macOS Node 22+ (Node 24 recommended):

```sh
cd next
npm ci
npm run dev
```

Open http://localhost:3000. The studio starts with an editable design. Templates,
canvas editing, playback, autosave, and exports work without an API key.

To enable AI, copy `.env.example` to `.env.local`, set `OPENROUTER_API_KEY`
and an OpenRouter `DEFAULT_MODEL`, then restart the server. Keys remain on the
server. AI creates 5, 10, 15, or 20 second animated explanations.

## Create and refine

- Choose New video to describe an idea, or start from a template.
- Select elements on the canvas or in the layer list. Drag to position them,
  or drag a corner handle to resize. Hold Shift to preserve proportions.
- Open Properties to edit text, colors, gradients, size, layer names, and timing.
  On phones, the adjustable sheet keeps the canvas visible for live edits.
- Add text and shapes; rename your project; undo or redo changes.
- Jump between scenes, rename them, seek with the timeline ruler, or change
  playback speed. Expand the timeline when you need more room for element tracks.
- Use Expand canvas in the canvas toolbar to hide the story timeline. Press
  Escape or toggle the button again to restore the timeline.
- Open Element timing to drag, trim, or keyboard-adjust an element’s visible interval.
- Recover a deleted project with the Undo notice. Cancel an export from its progress card.
- Export video, GIF, or an editable JSON project file. Import JSON from the
  project library's upload button.

Shortcuts: Space to play/pause, [ and ] to cycle elements while the canvas
is focused, arrows to nudge a selected element (Shift for 10px) or step when
nothing is selected, I for Properties, Escape to clear selection, Delete to
remove an element, Ctrl/Command Z to undo and Ctrl/Command Shift Z to redo.

Projects and generation checkpoints are autosaved to IndexedDB on this device.
If generation is interrupted, completed scenes are retained. Open the draft
and choose **Finish remaining scenes** to generate only missing scenes.
Undo history is limited to 50 edits and lasts until the page is reloaded.

## Visual system

The studio uses the supplied Soft Cyan (`#90F1EF`), Petal Frost (`#FFD6E0`),
and Light Gold (`#FFEF9F`) palette with dark teal text. Cyan marks selected
items, gold marks active controls, and timing bars use pastel colors by element
type. Design and Layers are separate inspector tabs. Typography, geometry, and
timing can be expanded as needed; the phone sheet includes layer renaming,
scene navigation, and precise time entry. Phone timing scrolls horizontally to
keep trim targets usable. Timing sliders support arrow keys and Home/End, and
announce changes and undo/redo to screen readers.

## Architecture

Paths below are relative to `next/`.

```text
src/components/studio/    New visual workspace, canvas, properties, playback
src/lib/workspace/       Project state, undo/redo, IndexedDB, streaming client
src/lib/project/         Portable document format, editing operations, templates
src/lib/generation/      One scene planner and one validated generation pipeline
src/lib/rendering/       Shared deterministic Canvas frame renderer
src/lib/schema/          Single source of runtime schemas and TypeScript types
src/lib/export/          Browser video and GIF encoders
src/lib/evaluation/      Fixed evaluation prompts and visual diagnostics
src/app/api/generate/    Single streaming API
```

The legacy chat/session model, dev routes, duplicate generation stack,
Fabric dependency, architecture viewers, obsolete scripts, compatibility
migration, and historical planning documents have been removed.

## Checks

Run these commands from `next/`.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

For browser regression tests, run the development server, then:

```sh
npx playwright install chromium
npm run test:ui
```

Set `UI_BASE_URL` to test another server or `E2E_CHROMIUM_PATH` to use an
existing Chromium executable. See [the UI review record](docs/ui-review.md)
for the Opus score and verified interaction paths.

With provider credentials, `npm run evaluate` generates the fixed eight-case
suite and writes project JSON, diagnostics, model identity, and timing into
`evaluation-artifacts/`. Visual diagnostics flag potential problems; they do
not replace reviewing rendered output. Live-model evaluation is not part of CI.

## Current limits

Storage is local to this browser; projects are portable through JSON backups.
Live AI generation was verified with a five-second OpenRouter request.
Successful encoded-file correctness has not been verified. Browser regression tests cover editing, responsive
layout, recovery, and export cancellation. Video recording uses real time and requires a visible
tab; browser support determines MP4 or WebM. GIF uses explicit frame intervals.
There is no offline MP4 worker, cloud sync, audio, or public-hosting job service.
Before a public release, add authentication/request budgets and rate limits.

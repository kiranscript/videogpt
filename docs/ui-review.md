# UI review and iteration

Reviewed on 2026-11-17 by Claude Opus 5.5 (`claude-opus-5-5`).

The first review scored the UI 6/10. After addressing its findings, a fresh
independent review scored the revised UI **8/10**, meeting the requested gate.
Both reviews used screenshots and source inspection. Opus did not personally
run browser interactions; the interaction evidence came from automated tests.

## Rounds 1–2: initial 8/10 gate

Changes made

- Bundled Geist font, readable metadata/controls, and stronger muted-text contrast.
- Full-frame 16:9 scene thumbnails with numbers in captions.
- Compact, collapsible project library and a separately opened composer.
- Wider desktop inspector, stacked field labels, units, and editable hex colors.
- Properties open on selection; keyboard selection and nudging are available.
- Plain selection outlines and hover feedback replace nonfunctional resize handles.
- Mobile bottom navigation, a working composer drawer, and a properties sheet.
- Focus management for drawers, larger touch controls, and consistent transport icons.
- Timeline playhead/seeking, scene renaming, draggable and keyboard-adjustable
  element timing bars. Retiming preserves relative animation keyframe timing.
- Project deletion recovery through an Undo notice.
- Cancellable video/GIF export with visible progress.

### Verification at the initial gate

126 unit tests pass. TypeScript, ESLint, and the production build pass.
Six isolated Chromium tests pass:

1. Canvas keyboard selection, nudging, and undo.
2. Pointer dragging and keyboard trimming of element timing, followed by undo.
3. Scene renaming and undo.
4. Project deletion and restoration.
5. Cancellation of an active browser video export without downloading a partial file.
6. Phone layout and the new-video drawer, including focus and Escape dismissal.

The shared browser's drag automation timed out. The pointer-drag check was
therefore verified in an isolated Playwright browser using real mouse events.

### Follow-ups from round 2

- Keep more of the canvas visible while editing properties on a phone.
- Add a clearer cue that the mobile scene strip scrolls horizontally.
- Consolidate the preview scrubber and timeline seek controls.
- Give geometric layers more descriptive names.
- Improve the shortcut badge and platform-specific shortcut hints.
- Consider real resize handles in a subsequent editing pass.

Live-model quality evaluation and successful encoded-file inspection remain
separate from this UI review and have not been claimed as complete.


## Attachment palette iteration (new 10/10 target)

The user subsequently supplied Soft Cyan `#90F1EF`, Petal Frost `#FFD6E0`,
and Light Gold `#FFEF9F`, and requested continued reviews toward 10/10.
The new light theme uses these exact brand colors with dark teal ink for
readability. New starter artwork uses the palette too. Existing saved artwork
is not silently recolored.

This pass adds real canvas resize handles with undo, an adjustable nonmodal
phone inspector, one seek ruler, a scene-scroll cue, human-readable layer names,
platform-specific shortcut hints, larger project previews, and an expandable
timeline. The renderer no longer adds a dark vignette to every background.

At the first palette pass, 130 unit tests, 10 Chromium browser tests, TypeScript,
ESLint, and production build passed. The browser tests include pointer resizing,
live mobile artwork edits with the canvas visible, and dragging the phone
inspector taller without snapping on release. The next review scored this pass 8.5/10.


### Opus round 3: 8.5/10

Opus inspected six screenshots, read source, and performed independent desktop
and phone browser spot-checks. It verified the supplied palette and real resize
and rename/undo behavior. It identified selection handles escaping the canvas,
inconsistent layer sorting and state colors, timing-track clarity, desktop
inspector overflow, and small mobile/context/accessibility gaps.

The next pass pins handles inside a clipped overlay, shares front-to-back layer
ordering, reserves cyan for selections and gold for toggles, and gives timing
bars type colors, names, and stronger selected styling. Ruler ticks now use
absolute time positions, with the playhead below tick labels. Properties has
Design/Layers tabs and collapsible sections; Delete remains visible at 1280×800.
Phone editing exposes layer naming, Autosaved, scene switching and time entry.
Continuous typing is grouped into one undo step. Round 4 scored this pass 8.8/10.

### Opus round 4: 8.8/10

Opus independently checked desktop and phone layouts in an incognito browser.
It confirmed the earlier fixes, keyboard trimming/undo, contained resize handles,
matching layer order, mobile rename and save status, and visible desktop Delete.
It found cramped phone timing bars, incomplete timing accessibility semantics,
label mismatches, repeated layer badges, phone page overflow, and smaller
selection, disclosure, time-format and selected-bar inconsistencies.

The next pass gives phone timing a horizontally scrollable surface with sticky
labels, readable bars and 24px trim targets. Timing sliders expose ranges,
values, selected state, and keyboard interaction; a polite live region announces
edits and undo/redo. It also uses stack positions, consistent disclosure icons,
matching visible/accessibility labels and decimal times, background scroll lock,
padded text outlines, distinct preview/ruler sections, and inverted selected bars.

### Opus round 5 scored 9/10

Opus checked the phone layout and found timing rows extending beyond the panel,
invisible focus stops for collapsed previews, an arrow overlapping a scene card,
and timing instructions scrolling out of view. It also flagged slider markup,
missing playhead units, rounded ruler ticks, and labels in the Properties sheet.

The studio now contains the timing rows in the panel, removes collapsed previews
from keyboard navigation, keeps horizontal scroll guidance visible, and places
the scene arrow below the cards. Timing controls use supported slider markup,
the playhead announces seconds, and fractional ruler ticks retain a decimal.
The phone sheet labels the playhead and reports its height as a percentage.

Playback controls share the canvas centerline. The layer list and canvas use the
same visible elements at the end of a video. Imported projects display their own
resolution and fit the stage without stretching.

The user ended Opus reviews after round 5.

The final fix pass passed 131 unit tests and 19 Chromium browser tests against
the production build. Playback alignment was checked at widths from 320 to
1640 pixels, and portrait import and placement were checked on desktop and phone.

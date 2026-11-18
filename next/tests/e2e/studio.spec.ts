import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Project name", exact: true })).toHaveValue("A little idea");
});

test("canvas selection opens properties; keyboard nudges are undoable", async ({ page }) => {
  const canvas = page.locator(".editor-canvas");
  await canvas.focus();
  await canvas.press("]");
  await expect(page.getByRole("button", { name: "Done editing element" })).toBeVisible();
  await page.getByText("Position & size", { exact: true }).click();
  const x = page.getByRole("spinbutton", { name: "X", exact: true });
  const before = Number(await x.inputValue());
  await canvas.press("ArrowRight");
  await expect(x).toHaveValue(String(before + 1));
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(x).toHaveValue(String(before));
});

test("element edges can be dragged or keyboard-trimmed, then undone", async ({ page }) => {
  await page.getByRole("button", { name: "Element timing", exact: true }).click();
  const edge = page.getByRole("slider", { name: "Trim end of Start with a spark.", exact: true });
  await edge.scrollIntoViewIfNeeded();
  const box = (await edge.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(edge).not.toHaveAttribute("title", /^3\.0s end/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(edge).toHaveAttribute("title", /^3\.0s end/);
  await edge.press("ArrowRight");
  await expect(edge).toHaveAttribute("title", /^3\.1s end/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(edge).toHaveAttribute("title", /^3\.0s end/);
});

test("scene names can be edited without losing undo", async ({ page }) => {
  await page.getByRole("button", { name: "Rename The spark", exact: true }).click();
  await page.getByRole("textbox", { name: "Scene name", exact: true }).fill("The beginning");
  await page.getByRole("textbox", { name: "Scene name", exact: true }).press("Enter");
  await expect(page.locator(".scene-name").first()).toHaveText("The beginning");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".scene-name").first()).toHaveText("The spark");
});

test("deleting a project can be undone", async ({ page }) => {
  await page.getByRole("button", { name: "Delete A little idea", exact: true }).click();
  await expect(page.locator(".project-row")).toHaveCount(0);
  await page.locator(".undo-toast").getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator(".project-row")).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "Project name", exact: true })).toHaveValue("A little idea");
});

test("an in-progress video export can be cancelled", async ({ page }) => {
  let downloaded = false;
  page.on("download", () => { downloaded = true; });
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.locator(".export-menu").getByRole("button", { name: /^Video/ }).click();
  await page.getByRole("button", { name: "Cancel export", exact: true }).click();
  await expect(page.locator(".export-progress")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Export", exact: true })).toBeEnabled();
  expect(downloaded).toBe(false);
});

test("phone layout has adjacent canvas controls and an accessible new-video drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = (await page.locator(".editor-canvas").boundingBox())!;
  const controls = (await page.locator(".playback-bar").boundingBox())!;
  expect(canvas.y).toBeLessThan(180);
  expect(controls.y - (canvas.y + canvas.height)).toBeLessThan(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "New video", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Describe your video", exact: true })).toBeFocused();
  await expect(page.getByRole("dialog", { name: "Project library", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Describe your video", exact: true }).press("Escape");
  await expect(page.getByRole("dialog", { name: "Project library", exact: true })).toHaveCount(0);
});

test("canvas corner resizing is real, updates properties, and supports undo", async ({ page }) => {
  await page.locator(".layer-list").getByRole("button", { name: /Soft cyan sphere/ }).click();
  await page.getByText("Position & size", { exact: true }).click();
  const radius = page.getByRole("spinbutton", { name: "Radius", exact: true });
  const before = Number(await radius.inputValue());
  const handle = page.getByRole("button", { name: "Resize element from bottom right", exact: true });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 24, box.y + box.height / 2 + 24, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Number(await radius.inputValue())).toBeGreaterThan(before);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(radius).toHaveValue(String(before));
});

test("phone properties keep the canvas visible while edits update the artwork", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = page.locator(".editor-canvas");
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 300 / 1920, y: box.height * 450 / 1080 } });
  await expect(page.locator(".inspector-sheet")).toBeVisible();
  const sheet = (await page.locator(".inspector-sheet").boundingBox())!;
  expect(sheet.y).toBeGreaterThanOrEqual(box.y + box.height);
  await expect(page.locator(".inspector-backdrop")).toHaveCount(0);
  const before = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
  await page.getByRole("textbox", { name: "Text", exact: true }).fill("A cyan idea");
  await expect.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL())).not.toBe(before);
  await page.getByRole("button", { name: "Close properties", exact: true }).click();
  await expect(page.getByRole("slider")).toHaveCount(1);
});

test("attachment palette is applied and a single ruler controls seeking", async ({ page }) => {
  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ["--cyan", "--pink", "--gold"].map((key) => style.getPropertyValue(key).trim().toUpperCase());
  });
  expect(colors).toEqual(["#90F1EF", "#FFD6E0", "#FFEF9F"]);
  await expect(page.getByRole("slider")).toHaveCount(1);
  const ruler = page.getByRole("slider", { name: "Timeline playhead", exact: true });
  await ruler.focus();
  await ruler.press("End");
  await expect(page.locator(".timecode")).toContainText("10.0");
});

test("phone properties sheet can be dragged taller without snapping on release", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = page.locator(".editor-canvas");
  const art = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: art.width * 300 / 1920, y: art.height * 450 / 1080 } });
  const sheet = page.locator(".inspector-sheet");
  const before = (await sheet.boundingBox())!.height;
  const grip = (await page.locator(".sheet-grip").boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 - 100, { steps: 10 });
  await page.mouse.up();
  await expect.poll(async () => (await sheet.boundingBox())!.height).toBeGreaterThan(before + 80);
  expect((await sheet.boundingBox())!.height).toBeLessThan(before + 130);
});

test("oversized selections cannot place resize targets over playback controls", async ({ page }) => {
  await page.locator(".layer-list").getByRole("button", { name: /Soft cyan sphere/ }).click();
  await page.getByText("Position & size", { exact: true }).click();
  const radius = page.getByRole("spinbutton", { name: "Radius", exact: true });
  await radius.fill("1800"); await radius.press("Enter");
  const art = (await page.locator(".editor-canvas").boundingBox())!;
  for (const handle of await page.locator(".resize-handle").all()) {
    const box = (await handle.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(art.x - 1);
    expect(box.y).toBeGreaterThanOrEqual(art.y - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(art.x + art.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(art.y + art.height + 1);
  }
});

test("layers use front-to-back order and desktop delete stays visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const indexes = await page.locator(".layer-list button small").allTextContents();
  const numbers = indexes.map(Number);
  expect(numbers).toEqual(indexes.map((_, index) => index + 1));
  await page.locator(".layer-list").getByRole("button", { name: /Start with a spark/ }).click();
  const panel = (await page.locator(".inspector").boundingBox())!;
  const deletion = (await page.getByRole("button", { name: "Delete element", exact: true }).boundingBox())!;
  expect(deletion.y + deletion.height).toBeLessThanOrEqual(panel.y + panel.height);
  await expect(page.getByRole("button", { name: "Done editing element", exact: true })).toHaveText(/Done/);
});

test("phone editing exposes save state, layer rename, scenes and time", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".save-indicator")).toBeVisible();
  const canvas = page.locator(".editor-canvas"), box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 300 / 1920, y: box.height * 450 / 1080 } });
  await expect(page.getByRole("textbox", { name: "Layer name", exact: true })).toBeVisible();
  await expect(page.locator(".inspector-sheet .shortcut")).toBeHidden();
  await page.getByRole("combobox", { name: "Scene while editing", exact: true }).selectOption("1");
  await expect(page.locator(".timecode")).toContainText("3.0");
  const time = page.getByRole("spinbutton", { name: "Playhead", exact: true });
  await time.fill("5"); await time.press("Enter");
  await expect(page.locator(".timecode")).toContainText("5.0");
});

test("timing sliders expose values and announce trimming and undo", async ({ page }) => {
  await page.getByRole("button", { name: "Element timing", exact: true }).click();
  const edge = page.getByRole("slider", { name: "Trim end of Soft cyan sphere", exact: true });
  await expect(edge).toHaveAttribute("aria-valuenow", "3");
  await edge.press("ArrowRight");
  await expect(edge).toHaveAttribute("aria-valuenow", "3.1");
  await expect(edge).toHaveAttribute("aria-valuetext", /3\.1 seconds/);
  await expect(page.getByTestId("editor-announcement")).toContainText("Soft cyan sphere timing: 0.0 to 3.1 seconds");
  await page.locator(".element-label").filter({ hasText: "Soft cyan sphere" }).click();
  await expect(page.locator(".element-label[aria-pressed=true]")).toContainText("Soft cyan sphere");
  await edge.press("Control+z");
  await expect(edge).toHaveAttribute("aria-valuenow", "3");
  await expect(page.getByTestId("editor-announcement")).toContainText("Undid change. Soft cyan sphere timing: 0.0 to 3.0 seconds");
});

test("phone timing has scrollable full-size targets without opening Properties mid-edit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Element timing", exact: true }).click();
  const edge = page.getByRole("slider", { name: "Trim end of Soft cyan sphere", exact: true });
  await edge.scrollIntoViewIfNeeded();
  const box = (await edge.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(24);
  expect(box.height).toBeGreaterThanOrEqual(24);
  const body = (await page.getByRole("slider", { name: "Move timing of Soft cyan sphere", exact: true }).boundingBox())!;
  expect(body.width).toBeGreaterThan(100);
  await edge.press("ArrowRight");
  await expect(page.locator(".inspector-sheet")).toHaveCount(0);
  await expect(edge).toHaveAttribute("aria-valuenow", "3.1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("phone Properties locks background scrolling and labels its height control", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const canvas = page.locator(".editor-canvas"), box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 300 / 1920, y: box.height * 450 / 1080 } });
  const grip = page.getByRole("slider", { name: "Drag to adjust properties", exact: true });
  await expect(grip).toHaveAttribute("aria-valuenow", /\d+/);
  await expect(grip).toHaveAttribute("aria-valuetext", /% of screen height/);
  expect(await grip.evaluate((element) => element.tagName)).toBe("DIV");
  await page.mouse.move(box.x + 30, box.y + 30); await page.mouse.wheel(0, 400);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await page.locator(".main-workspace").evaluate((element) => element.scrollTop)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});

test("phone timing stays inside its panel, hides collapsed previews, and keeps guidance in view", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Element timing", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Go to scene/ })).toHaveCount(0);
  const positions = await page.evaluate(() => {
    const panel = document.querySelector(".timeline-panel")!.getBoundingClientRect();
    const rows = document.querySelector(".element-rows")!.getBoundingClientRect();
    const button = document.querySelector(".scene-scroll-next")!.getBoundingClientRect();
    const strip = document.querySelector(".scene-track")!.getBoundingClientRect();
    return { bottom: panel.bottom, rowsBottom: rows.bottom, buttonTop: button.top, stripBottom: strip.bottom };
  });
  expect(positions.rowsBottom).toBeLessThanOrEqual(positions.bottom);
  expect(positions.buttonTop).toBeGreaterThanOrEqual(positions.stripBottom);
  const guidanceX = (await page.locator(".timing-guidance").boundingBox())!.x;
  await page.locator(".timing-viewport").evaluate((element) => { element.scrollLeft = 450; });
  expect((await page.locator(".timing-guidance").boundingBox())!.x).toBe(guidanceX);
  expect((await page.locator(".ruler-heading").boundingBox())!.x).toBeGreaterThanOrEqual(0);
  await expect(page.getByRole("slider", { name: "Timeline playhead", exact: true })).toHaveAttribute("aria-valuetext", "0.0 of 10.0 seconds");
  expect(await page.locator("button[role=slider]").count()).toBe(0);
});

test("playback stays centered on the canvas at the end of a video", async ({ page }) => {
  await page.getByRole("button", { name: /^Database replication An animated/ }).click();
  await page.getByRole("button", { name: "Go to end", exact: true }).click();
  await expect(page.locator(".scene-label")).toHaveText("Catch up");
  await expect(page.locator(".timecode")).toHaveText("10.0 / 10.0s");
  await expect(page.locator(".layer-list").getByRole("button", { name: /One write\. Two replicas/ })).toBeVisible();
  for (const width of [1640, 1280, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const canvas = (await page.locator(".editor-canvas").boundingBox())!;
    const play = (await page.getByRole("button", { name: "Play", exact: true }).boundingBox())!;
    const time = (await page.locator(".timecode").boundingBox())!;
    const controls = (await page.locator(".transport").boundingBox())!;
    expect(Math.abs(canvas.x + canvas.width / 2 - play.x - play.width / 2)).toBeLessThan(2);
    if (width <= 760) expect(time.x + time.width).toBeLessThan(controls.x);
    else expect(time.x).toBeGreaterThan(controls.x + controls.width);
  }
});

test("a portrait project keeps its proportions and places new shapes in frame", async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: "portrait.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      version: 1,
      project: { id: "portrait", name: "Portrait", width: 720, height: 1280, duration: 9.5, events: [] },
    })),
  });
  await expect(page.locator(".resolution-label")).toHaveText("720 × 1280");
  await expect(page.locator(".timeline-ruler")).toContainText("1.9s");
  await page.getByRole("button", { name: "Shape", exact: true }).click();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const canvas = (await page.locator(".editor-canvas").boundingBox())!;
    expect(canvas.width / canvas.height).toBeCloseTo(720 / 1280, 2);
    await expect(page.getByRole("button", { name: "Resize element from top left" })).toBeVisible();
    const corner = (await page.getByRole("button", { name: "Resize element from top left" }).boundingBox())!;
    expect(corner.y).toBeGreaterThan(canvas.y + canvas.height * 0.3);
    expect(corner.y).toBeLessThan(canvas.y + canvas.height * 0.55);
  }
});

test("expanding the canvas hides the story timeline and restores its state", async ({ page }) => {
  const canvas = page.locator(".editor-canvas");
  const focus = page.getByRole("button", { name: "Expand canvas", exact: true });
  const timeline = page.getByRole("region", { name: "Scene timeline" });
  const timing = page.getByRole("button", { name: "Element timing", exact: true });
  await timing.click();
  await page.getByRole("button", { name: "Go to end", exact: true }).click();
  const before = (await canvas.boundingBox())!.height;
  await focus.click();
  await expect(focus).toHaveAttribute("aria-pressed", "true");
  await expect(timeline).toBeHidden();
  await expect.poll(async () => (await canvas.boundingBox())!.height).toBeGreaterThan(before);
  await expect(page.locator(".timecode")).toHaveText("10.0 / 10.0s");
  await page.keyboard.press("Escape");
  await expect(focus).toBeFocused();
  await expect(timing).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 320, height: 700 });
  await focus.click();
  await expect(timeline).toBeHidden();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeInViewport();
  await focus.click();
  await expect(timeline).toBeVisible();
});

test("the composer opens and autosaves a generated project from a completed stream", async ({ page }) => {
  const prompt = "Animate a sunrise";
  const project = {
    id: "sunrise", name: "Morning light", width: 1920, height: 1080, duration: 5,
    events: [{ id: "sky", type: "background", start: 0, end: 5, layer: 0,
      background: { kind: "solid", color: "#FFEF9F" } }],
  };
  await page.route("**/api/generate", (route) => route.fulfill({
    contentType: "text/event-stream",
    body: `data: ${JSON.stringify({ type: "done", project })}\n\n`,
  }));
  await page.locator(".new-project-button").click();
  await page.getByRole("textbox", { name: "Describe your video" }).fill(prompt);
  await page.getByRole("combobox", { name: "Video duration" }).selectOption("5");
  const submission = page.waitForRequest("**/api/generate");
  await page.getByRole("button", { name: "Create video", exact: true }).click();
  expect((await submission).postDataJSON()).toEqual({ prompt, duration: 5 });
  const title = page.getByRole("textbox", { name: "Project name", exact: true });
  await expect(title).toHaveValue("Morning light");
  await expect(page.locator(".editor-canvas")).toBeVisible();
  await expect(page.locator(".save-indicator")).toHaveText("Autosaved");
  await page.reload();
  await expect(title).toHaveValue("Morning light");
});

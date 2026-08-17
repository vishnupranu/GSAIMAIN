import { test, expect } from "@playwright/test";

test.describe("GUIDESOFT All 12 Studios Functional Actions", () => {
  test("AI Slides Studio: navigation & theme switching", async ({ page }) => {
    await page.goto("/slides", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('AI Slide Deck Studio')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("h2:has-text('GUIDESOFT AI Presentation Suite')")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export HTML" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy Deck" })).toBeVisible();
  });

  test("AI Sheets Studio: editable spreadsheet grid & row addition", async ({ page }) => {
    await page.goto("/sheets", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('AI Spreadsheet Studio')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Total ARR ($k)")).toBeVisible();
    await expect(page.locator("text=Ending ARR")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();

    const initialRows = await page.locator("tbody tr").count();
    await page.click("button:has-text('Add Row')");
    const updatedRows = await page.locator("tbody tr").count();
    expect(updatedRows).toBe(initialRows + 1);
  });

  test("AI Docs Studio: view mode toggling", async ({ page }) => {
    await page.goto("/docs", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('AI Document Studio')")).toBeVisible({ timeout: 10000 });

    await page.click("button:has-text('Markdown Source')");
    await expect(page.locator("textarea")).toBeVisible();

    await page.click("button:has-text('Rendered View')");
    await expect(page.getByRole("heading", { name: "Product Requirements Document" })).toBeVisible();
  });

  test("AI Developer Studio: code tabs and templates", async ({ page }) => {
    await page.goto("/code", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('AI Developer Studio')")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Compile Code" })).toBeVisible();
  });

  test("AI Designer Studio: vector canvas & SVG inspector", async ({ page }) => {
    await page.goto("/designer", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('AI Designer')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=SVG Source Code")).toBeVisible();
    await expect(page.locator(".aspect-\\[3\\/2\\]")).toBeVisible();
  });

  test("AI Music Studio: synthesizer and chord arrangement", async ({ page }) => {
    await page.goto("/music", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('AI Music & Audio Synthesizer')")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Chord Progression", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play Synth Chords" })).toBeVisible();
  });

  test("AI Video Studio: storyboard scene timeline", async ({ page }) => {
    await page.goto("/video", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('AI Video Storyboard Studio')")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Camera Movement", { exact: true })).toBeVisible();
    await expect(page.getByText("Audio & Sound FX", { exact: true })).toBeVisible();
    await expect(page.getByText("Scene #1", { exact: true })).toBeVisible();
  });

  test("AI Meeting Notes Studio: transcript input and intelligence report", async ({ page }) => {
    await page.goto("/meeting-notes", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('AI Meeting Notes')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("span:has-text('Executive Summary')")).toBeVisible();
    await expect(page.locator("span:has-text('Key Decisions Made')")).toBeVisible();
    await expect(page.locator("span:has-text('Action Items & Ownership')")).toBeVisible();
  });

  test("Custom Agent Studio: agent roster and playground", async ({ page }) => {
    await page.goto("/custom-agent", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h2:has-text('Custom Agents')")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("h3:has-text('Interactive Playground')")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Agent" })).toBeVisible();
  });

  test("Multi-Agent Swarm Studio: team selection and execution", async ({ page }) => {
    await page.goto("/swarm", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('Multi-Agent Swarm Intelligence')")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Execute Swarm" })).toBeVisible();
  });

  test("Multi-Model Arena Studio: dual benchmark and model pickers", async ({ page }) => {
    await page.goto("/arena", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1:has-text('Multi-Model Arena & Cost Benchmark')")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Run Dual Benchmark" })).toBeVisible();
  });
});

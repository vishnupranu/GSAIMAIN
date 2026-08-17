import { test, expect } from "@playwright/test";

test.describe("GUIDESOFT Navigation & 404 Audit", () => {
  const routes = [
    "/",
    "/agents",
    "/chat",
    "/code",
    "/slides",
    "/sheets",
    "/docs",
    "/designer",
    "/image",
    "/music",
    "/video",
    "/meeting-notes",
    "/custom-agent",
    "/swarm",
    "/arena",
    "/pricing",
    "/helpcenter",
    "/business",
    "/dashboard",
  ];

  for (const path of routes) {
    test(`should load ${path} without 404 errors`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const notFoundHeading = page.locator("h1:has-text('404')");
      await expect(notFoundHeading).not.toBeVisible();
    });
  }

  test("should load home page with all 12 functional tool buttons", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=GUIDESOFT").first()).toBeVisible({ timeout: 15000 });

    const expectedLabels = [
      "Custom Agent",
      "AI Slides",
      "AI Sheets",
      "AI Docs",
      "AI Developer",
      "AI Designer",
      "AI Chat",
      "AI Image",
      "AI Music",
      "AI Video",
      "AI Meeting Notes",
      "All Agents",
    ];

    for (const label of expectedLabels) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible();
    }
  });
});

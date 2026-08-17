import { test, expect } from "@playwright/test";

test.describe("Payment Gateway: GPay, UPI QR, Cards & Webhooks", () => {
  test("should open payment modal from Pricing page and support GPay, UPI, and Card checkout", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Power your workflow with GUIDESOFT" })).toBeVisible({ timeout: 15000 });

    // Click 'Upgrade to Pro'
    await page.locator("button:has-text('Upgrade to Pro')").click();

    // Modal should open
    await expect(page.getByText("Secure Checkout")).toBeVisible();
    await expect(page.getByText("Pro Unlimited Subscription")).toBeVisible();

    // 1. Test GPay Tab
    await page.locator("button:has-text('Google Pay')").click();
    await expect(page.getByRole("heading", { name: "Pay with Google Pay" })).toBeVisible();

    // 2. Test UPI Tab
    await page.locator("button:has-text('UPI & QR')").click();
    await expect(page.getByText("guidesoft@upi")).toBeVisible();

    // 3. Test Cards Tab
    await page.locator("button:has-text('Cards')").click();
    await expect(page.getByText("Cardholder Name")).toBeVisible();
    await expect(page.getByText("Expiry")).toBeVisible();

    // Complete payment simulation
    await page.locator("button:has-text('Pay $19')").click();

    // Verification receipt should appear
    await expect(page.getByRole("heading", { name: "Payment Successful!" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("COMPLETED")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("WebSocket Reconnection - Essential Tests", () => {
  test("should establish WebSocket connection on page load", async ({ page }) => {
    await page.goto("/");

    // Wait for connection indicator to appear
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Should not show any ping warnings
    await expect(page.locator("text=⚠️ Unknown message type: ping")).not.toBeVisible();
  });

  test("should handle page visibility changes (mobile tab switching)", async ({ page }) => {
    await page.goto("/");

    // Wait for initial connection
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Simulate tab becoming hidden (mobile background)
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Wait a moment
    await page.waitForTimeout(1000);

    // Simulate tab becoming visible again (mobile foreground)
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Connection should remain or be re-established
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 10000,
    });

    // Should not show any connection errors
    await expect(page.locator("text=⚠️ Unknown message type: ping")).not.toBeVisible();
  });

  test("should maintain stable connection without warnings", async ({ page }) => {
    await page.goto("/");

    // Wait for connection
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Wait a reasonable time to allow heartbeat messages
    await page.waitForTimeout(5000);

    // Connection should remain stable
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible();

    // Should not show any message type warnings
    await expect(page.locator("text=⚠️ Unknown message type: ping")).not.toBeVisible();
    await expect(page.locator("text=⚠️ Unknown message type: pong")).not.toBeVisible();

    // Should be able to interact with the app (check for game creation UI)
    await expect(
      page.locator("button").filter({ hasText: /create/i })
    ).toBeVisible();
  });
});
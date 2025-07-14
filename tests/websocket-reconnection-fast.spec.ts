import { test, expect } from "@playwright/test";

test.describe("WebSocket Reconnection - Essential Tests", () => {
  test("should establish WebSocket connection on page load", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for connection indicator to appear
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Should not show any ping warnings
    await expect(
      page.locator("text=⚠️ Unknown message type: ping"),
    ).not.toBeVisible();
  });

  test("should handle page visibility changes (mobile tab switching)", async ({
    page,
  }) => {
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
    await expect(
      page.locator("text=⚠️ Unknown message type: ping"),
    ).not.toBeVisible();
  });

  test("should maintain stable connection without warnings", async ({
    page,
  }) => {
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
    await expect(
      page.locator("text=⚠️ Unknown message type: ping"),
    ).not.toBeVisible();
    await expect(
      page.locator("text=⚠️ Unknown message type: pong"),
    ).not.toBeVisible();

    // Should be able to interact with the app (check for play button)
    await expect(page.locator("button:has-text('Play')")).toBeVisible();
  });

  test("should show reconnection attempt feedback when connection is lost", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for initial connection
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Simulate network interruption by evaluating code that closes the WebSocket
    await page.evaluate(() => {
      // Access the WebSocket through the global context if available
      // This is a test-specific approach to simulate connection loss
      if (window.WebSocket) {
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class extends originalWebSocket {
          constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols);
            // Close the connection immediately to simulate network loss
            setTimeout(() => this.close(1006, "Network error"), 100);
          }
        } as any;
      }
    });

    // Refresh the page to trigger a new connection with the modified WebSocket
    await page.reload();

    // Should show reconnection attempt feedback
    // Look for any reconnection messages (attempt 1, 2, etc.)
    const reconnectionFeedback = page.locator(
      "text=/🔄.*Reconnecting.*attempt \\d+ of \\d+/",
    );

    // Wait for reconnection feedback to appear (with extended timeout due to network simulation)
    await expect(reconnectionFeedback).toBeVisible({ timeout: 10000 });

    // Eventually should either reconnect or show specific error
    // We'll allow both successful reconnection or reaching max attempts
    await expect(
      page
        .locator("text=🟢 Connected to server")
        .or(page.locator("text=❌ Connection error")),
    ).toBeVisible({ timeout: 30000 });
  });
});

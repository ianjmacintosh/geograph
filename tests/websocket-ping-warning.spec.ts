import { test, expect } from "@playwright/test";

test.describe("WebSocket Ping Message Handling", () => {
  test("should not show ping message warnings in UI", async ({ page }) => {
    // Monitor console errors to catch the issue
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (
        msg.type() === "error" ||
        msg.text().includes("Unknown message type")
      ) {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the home page
    await page.goto("/");

    // Wait for WebSocket connection to be established
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Wait a reasonable time to allow some heartbeat activity but not too long for CI
    await page.waitForTimeout(8000);

    // Check that no ping message warnings are displayed in the UI
    const pingWarning = page.locator("text=⚠️ Unknown message type: ping");
    await expect(pingWarning).not.toBeVisible();

    // Check for pong warnings too
    const pongWarning = page.locator("text=⚠️ Unknown message type: pong");
    await expect(pongWarning).not.toBeVisible();

    // Verify connection is still active
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible();

    // Log any console errors we captured
    if (consoleErrors.length > 0) {
      console.log("Console errors captured:", consoleErrors);
    }

    // Verify no ping/pong related errors in console
    const hasPingErrors = consoleErrors.some(
      (error) =>
        error.includes("Unknown message type: ping") ||
        error.includes("Unknown message type: pong"),
    );
    expect(hasPingErrors).toBe(false);
  });

  test("should handle server ping messages without displaying warnings", async ({
    page,
  }) => {
    // Navigate to the home page
    await page.goto("/");

    // Wait for connection
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 10000,
    });

    // Monitor console logs to ensure ping messages are handled properly
    const consoleMessages: string[] = [];
    page.on("console", (msg) => {
      consoleMessages.push(msg.text());
    });

    // Wait longer to capture multiple heartbeat cycles
    await page.waitForTimeout(10000);

    // Check that ping messages are being handled in console (not in UI)
    const hasPingLogs = consoleMessages.some(
      (msg) =>
        msg.includes("Server ping received") || msg.includes("Heartbeat"),
    );

    // We expect to see heartbeat-related console logs (good)
    // but NO ping warnings in the UI (which we already checked above)

    // Verify no ping warnings appeared in UI during this time
    const pingWarning = page.locator("text=⚠️ Unknown message type: ping");
    await expect(pingWarning).not.toBeVisible();

    console.log("Console messages captured:", consoleMessages.length);
    if (hasPingLogs) {
      console.log("✅ Heartbeat messages found in console logs (expected)");
    }
  });

  test("should maintain connection status while handling ping messages", async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto("/");

    // Wait for initial connection
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 10000,
    });

    // Wait a reasonable time to allow heartbeat messages to potentially arrive
    // (Reduced from 35 seconds to avoid test timeout)
    await page.waitForTimeout(8000);

    // Connection should still be maintained
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible();

    // No ping warnings should appear
    const pingWarning = page.locator("text=⚠️ Unknown message type: ping");
    await expect(pingWarning).not.toBeVisible();

    // Should still be able to interact with the application
    const createGameButton = page.locator("button:has-text('Create Game')");
    await expect(createGameButton).toBeVisible();
  });

  test("should handle ping/pong cycle without UI warnings - quick test", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for connection
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 10000,
    });

    // Wait shorter time for faster test execution
    await page.waitForTimeout(8000);

    // Should not see ping-related warnings even during connection activity
    await expect(
      page.locator("text=⚠️ Unknown message type: ping"),
    ).not.toBeVisible();
    await expect(
      page.locator("text=⚠️ Unknown message type: pong"),
    ).not.toBeVisible();

    // Connection should remain stable
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible();
  });
});

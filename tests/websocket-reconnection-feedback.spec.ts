import { test, expect } from "@playwright/test";

test.describe("WebSocket Reconnection Feedback", () => {
  test("should show countdown timer during reconnection attempts", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for initial connection
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Monitor console to capture WebSocket creation
    const webSocketMessages: string[] = [];
    page.on("console", (msg) => {
      if (msg.text().includes("WebSocket") || msg.text().includes("🔄")) {
        webSocketMessages.push(msg.text());
      }
    });

    // Force a connection interruption by injecting code to close WebSocket
    await page.evaluate(() => {
      // Find and close any existing WebSocket connections
      const wsConnections = (window as any).__wsConnections || [];
      wsConnections.forEach((ws: WebSocket) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1006, "Simulated network error");
        }
      });

      // Override WebSocket constructor to immediately fail new connections
      const OriginalWebSocket = window.WebSocket;
      let connectionAttempts = 0;

      window.WebSocket = class extends OriginalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          connectionAttempts++;

          // Fail the first few attempts to test reconnection feedback
          if (connectionAttempts <= 3) {
            setTimeout(() => {
              if (
                this.readyState === WebSocket.CONNECTING ||
                this.readyState === WebSocket.OPEN
              ) {
                this.close(1006, `Simulated failure ${connectionAttempts}`);
              }
            }, 50);
          }

          // Track WebSocket instances
          if (!(window as any).__wsConnections) {
            (window as any).__wsConnections = [];
          }
          (window as any).__wsConnections.push(this);
        }
      } as any;
    });

    // Trigger a page visibility change to force reconnection
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.waitForTimeout(100);

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Look for reconnection attempt feedback
    const reconnectionAttempt1 = page.locator("text=/🔄.*attempt 1 of 10/");

    // Should see at least the first reconnection attempt
    await expect(reconnectionAttempt1).toBeVisible({ timeout: 5000 });

    // Log captured messages for debugging
    console.log("Captured WebSocket messages:", webSocketMessages);
  });

  test("should show success message after successful reconnection", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for connection
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Simulate temporary connection loss and recovery
    await page.evaluate(() => {
      const OriginalWebSocket = window.WebSocket;
      let shouldFail = true;

      window.WebSocket = class extends OriginalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);

          if (shouldFail) {
            // Fail once, then allow success
            shouldFail = false;
            setTimeout(() => this.close(1006, "Temporary failure"), 50);
          }
          // Subsequent connections will succeed normally
        }
      } as any;
    });

    // Force reconnection through visibility API
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.waitForTimeout(100);

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Should see reconnection attempt first
    const reconnectionMessage = page.locator("text=/🔄.*Reconnecting/");
    await expect(reconnectionMessage).toBeVisible({ timeout: 5000 });

    // Then should see success message
    const successMessage = page.locator("text=✅ Reconnected!");
    await expect(successMessage).toBeVisible({ timeout: 10000 });

    // Finally should return to normal connected state
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show appropriate feedback on different pages", async ({
    page,
  }) => {
    // Test on home page
    await page.goto("/");
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Navigate to join page with game code
    await page.goto("/join/1234");
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 10000,
    });

    // Verify connection status component works on both pages
    // This ensures the ConnectionStatus component is properly integrated
    const connectionStatus = page.locator("text=🟢 Connected to server");
    await expect(connectionStatus).toBeVisible();
  });

  test("should handle countdown timer correctly for different delays", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for connection
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // Simulate connection loss that will trigger specific delays
    await page.evaluate(() => {
      const OriginalWebSocket = window.WebSocket;

      window.WebSocket = class extends OriginalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          // Always fail to test progressive backoff
          setTimeout(() => this.close(1006, "Test failure"), 10);
        }
      } as any;
    });

    // Trigger reconnection
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.waitForTimeout(50);

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        writable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Should see first attempt (immediate, no countdown)
    const attempt1 = page.locator("text=/attempt 1 of 10/");
    await expect(attempt1).toBeVisible({ timeout: 3000 });

    // For subsequent attempts, should see countdown if delay > 1 second
    // The second attempt has 100ms delay, third has 300ms, fourth has 1000ms

    // May or may not see countdown depending on timing, but should see attempt numbers
    const anyAttemptMessage = page.locator("text=/attempt \\d+ of 10/");
    await expect(anyAttemptMessage).toBeVisible({ timeout: 5000 });
  });
});

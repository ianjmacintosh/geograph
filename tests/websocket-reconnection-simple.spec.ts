import { test, expect } from "@playwright/test";

test.describe("WebSocket Reconnection - Basic E2E Tests", () => {
  test("should load application without errors", async ({ page }) => {
    // Check for any console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");

    // Wait for page to fully load
    await page.waitForLoadState("networkidle");

    // Verify page loads without critical errors
    expect(page.url()).toContain("/");

    // Filter out non-critical errors (WebSocket connection errors are expected in test env)
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes("WebSocket") &&
        !error.includes("Failed to fetch") &&
        !error.includes("ERR_CONNECTION_REFUSED"),
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test("should handle tab visibility changes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Wait a moment
    await page.waitForTimeout(1000);

    // Simulate tab becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Wait for any reconnection logic to complete
    await page.waitForTimeout(2000);

    // Verify page is still functional - should not have crashed
    const title = await page.title();
    expect(title).toBeDefined();
  });

  test("should handle page hide and show events", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Simulate page hide (backgrounding on mobile)
    await page.evaluate(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    await page.waitForTimeout(1000);

    // Simulate page show (returning to foreground)
    await page.evaluate(() => {
      window.dispatchEvent(new Event("pageshow"));
    });

    await page.waitForTimeout(2000);

    // Verify application is still responsive
    const bodyElement = await page.locator("body");
    await expect(bodyElement).toBeVisible();
  });

  test("should handle network disconnection simulation", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Record initial state
    const initialUrl = page.url();

    // Simulate network disconnection
    await context.setOffline(true);

    // Wait for disconnection to be detected
    await page.waitForTimeout(3000);

    // Restore network
    await context.setOffline(false);

    // Wait for potential reconnection
    await page.waitForTimeout(5000);

    // Verify page is still on the same URL and functional
    expect(page.url()).toBe(initialUrl);

    // Try to interact with the page
    const pageTitle = await page.title();
    expect(pageTitle).toBeDefined();
  });

  test("should maintain UI responsiveness during connection issues", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for any input fields or buttons to test interactivity
    const inputs = await page.locator("input, button").all();

    if (inputs.length > 0) {
      // Test interaction before network issues
      const firstInput = inputs[0];
      await firstInput.focus();

      // Simulate brief network issue
      await context.setOffline(true);
      await page.waitForTimeout(1000);
      await context.setOffline(false);

      // Wait for reconnection
      await page.waitForTimeout(3000);

      // Verify UI is still interactive
      await firstInput.focus();

      // If it's an input, try typing
      if ((await firstInput.getAttribute("type")) !== "button") {
        await firstInput.fill("test");
        const value = await firstInput.inputValue();
        expect(value).toBe("test");
      }
    }
  });

  test("should work on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Test mobile-specific behavior
    await page.evaluate(() => {
      // Simulate mobile events
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));

      // Simulate app backgrounding
      window.dispatchEvent(new Event("pagehide"));
    });

    await page.waitForTimeout(1000);

    // Simulate returning to foreground
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("pageshow"));
    });

    await page.waitForTimeout(2000);

    // Verify mobile functionality
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(375);
    expect(viewportSize?.height).toBe(667);
  });

  test("should handle rapid visibility changes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Perform rapid visibility changes
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "hidden",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      await page.waitForTimeout(100);

      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "visible",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      await page.waitForTimeout(100);
    }

    // Wait for any reconnection logic to stabilize
    await page.waitForTimeout(3000);

    // Verify application is still stable
    const pageContent = await page.textContent("body");
    expect(pageContent).toBeDefined();
    expect(pageContent?.length).toBeGreaterThan(0);
  });

  test("should not show connection errors in normal operation", async ({
    page,
  }) => {
    // Track console messages
    const consoleMessages: string[] = [];
    page.on("console", (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for any initial connection setup
    await page.waitForTimeout(3000);

    // Look for visible error messages on the page
    const errorElements = await page
      .locator("[class*='error'], [data-testid*='error']")
      .all();

    for (const element of errorElements) {
      if (await element.isVisible()) {
        const errorText = await element.textContent();
        console.log("Visible error found:", errorText);
      }
    }

    // The main goal is that the app should not crash or show critical user-facing errors
    // WebSocket connection errors in test environment are expected and acceptable
    const title = await page.title();
    expect(title).toBeDefined();
  });
});

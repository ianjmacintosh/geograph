import { test, expect } from "@playwright/test";

test.describe("WebSocket Reconnection UI", () => {
  test("should display correct UI feedback during disconnection and reconnection", async ({
    page,
    context,
  }) => {
    // 1. Navigate to the app and wait for initial connection
    await page.goto("/");
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 15000,
    });

    // 2. Simulate network disconnection
    await context.setOffline(true);

    // 3. Verify "Reconnecting" message is shown
    // The app immediately starts reconnecting when the connection is lost,
    // so the "Disconnected" state is typically very brief and hard to catch
    await expect(
      page.locator("text=🔄 Connection lost. Reconnecting"),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/attempt \d+ of \d+/)).toBeVisible({
      timeout: 10000,
    });

    // 4. Simulate network reconnection
    await context.setOffline(false);

    // 5. Verify "Reconnected!" message is shown
    await expect(page.locator("text=✅ Reconnected!")).toBeVisible({
      timeout: 20000,
    });

    // 6. Verify it settles back to "Connected"
    await expect(page.locator("text=🟢 Connected to server")).toBeVisible({
      timeout: 10000,
    });
  });
});

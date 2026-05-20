import { expect, test } from "@playwright/test";

test("dashboard surfaces WSL Codex runner readiness from the backend capability API", async ({ page }) => {
  await page.route("**/api/runner/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        simulated: { available: true, reasons: [] },
        codex: { available: true, reasons: [], target: "WSL Ubuntu Codex CLI" }
      })
    });
  });

  await page.goto("/");

  await expect(page.getByText("WSL Ubuntu Codex CLI")).toBeVisible();
  await expect(page.getByText("Real runner ready")).toBeVisible();
});

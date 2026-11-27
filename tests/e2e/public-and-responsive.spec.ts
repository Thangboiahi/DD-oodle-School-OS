import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
}

async function assertNoSeriousAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const seriousOrCritical = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );

  expect(
    seriousOrCritical,
    `Unexpected critical/serious WCAG AA violations on ${label}: ${JSON.stringify(seriousOrCritical, null, 2)}`,
  ).toEqual([]);
}

test.describe("Public surface, PWA, themes, responsive viewports & WCAG AA", () => {
  test("public landing renders cleanly with zero private tenant data", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Structured school operations and lifelong academic continuity/i,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Shell Preview", exact: true }),
    ).toHaveAttribute("href", "/shell-preview");
    await expect(
      page.getByRole("link", { name: "Sign In", exact: true }),
    ).toHaveAttribute("href", "/sign-in");

    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("Sunrise Synthetic");
    expect(bodyText).not.toContain("Valley Synthetic");
    expect(bodyText).not.toContain("sunrise-cbse");
    expect(bodyText).not.toContain("valley-cbse");
  });

  test("health, webmanifest, service worker headers & offline fallback work over HTTP", async ({
    request,
  }) => {
    const healthResponse = await request.get("/api/health");
    expect(healthResponse.status()).toBe(200);
    expect(healthResponse.headers()["cache-control"] ?? "").toContain(
      "no-store",
    );
    await expect(healthResponse.json()).resolves.toMatchObject({
      status: "ok",
      app: "dd-oodle",
    });

    const manifestResponse = await request.get("/manifest.webmanifest");
    expect(manifestResponse.status()).toBe(200);
    await expect(manifestResponse.json()).resolves.toMatchObject({
      short_name: "DD-oodle",
      display: "standalone",
    });

    const swResponse = await request.get("/sw.js");
    expect(swResponse.status()).toBe(200);
    expect(swResponse.headers()["content-type"] ?? "").toContain("javascript");
    expect(swResponse.headers()["cache-control"] ?? "").toContain("no-store");
    expect(swResponse.headers()["service-worker-allowed"]).toBe("/");

    const offlineResponse = await request.get("/offline.html");
    expect(offlineResponse.status()).toBe(200);
    const offlineHtml = await offlineResponse.text();
    expect(offlineHtml).toContain("You are currently offline");
  });

  test("theme family, dark mode & compact density persist across reloads on /shell-preview", async ({
    page,
  }) => {
    await page.goto("/shell-preview");

    await page.getByRole("button", { name: "Calm", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "calm");

    await page.getByRole("button", { name: "Focus", exact: true }).click();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await page.getByRole("button", { name: "Compact", exact: true }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "focus");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    await expect(page.locator("html")).toHaveAttribute(
      "data-density",
      "compact",
    );

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "focus");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    await expect(page.locator("html")).toHaveAttribute(
      "data-density",
      "compact",
    );
  });

  test("4-viewport responsive layout & zero horizontal overflow audit", async ({
    page,
  }) => {
    // 1. Mobile Portrait (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await assertNoHorizontalOverflow(page);

    await page.goto("/shell-preview");
    await assertNoHorizontalOverflow(page);
    await expect(
      page.getByRole("navigation", { name: "Primary mobile navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Workspace navigation" }),
    ).toBeHidden();

    // 2. Mobile Landscape (844x390)
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/");
    await assertNoHorizontalOverflow(page);

    await page.goto("/shell-preview");
    await assertNoHorizontalOverflow(page);
    await expect(
      page.getByRole("navigation", { name: "Primary mobile navigation" }),
    ).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Compact landscape navigation" }),
    ).toBeVisible();

    // 3. Tablet (820x1180)
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/");
    await assertNoHorizontalOverflow(page);

    await page.goto("/shell-preview");
    await assertNoHorizontalOverflow(page);
    const openDrawerButton = page.getByRole("button", {
      name: "Open navigation drawer",
    });
    await expect(openDrawerButton).toBeVisible();
    await openDrawerButton.click();
    const drawerDialog = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawerDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawerDialog).toBeHidden();

    // 4. Desktop (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await assertNoHorizontalOverflow(page);

    await page.goto("/shell-preview");
    await assertNoHorizontalOverflow(page);
    await expect(
      page.getByRole("complementary", { name: "Workspace navigation" }),
    ).toBeVisible();
  });

  test("WCAG 2.0/2.1 AA axe-core audit passes with zero critical/serious violations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto("/");
    await assertNoSeriousAxeViolations(page, "Landing (/)");

    await page.goto("/shell-preview");
    const lightBtn = page.getByRole("button", { name: "Light", exact: true });
    const darkBtn = page.getByRole("button", { name: "Dark", exact: true });
    const systemBtn = page.getByRole("button", { name: "System", exact: true });

    await lightBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
    await expect(lightBtn).toHaveCSS("background-color", "rgb(29, 78, 216)");
    await expect(systemBtn).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await assertNoSeriousAxeViolations(page, "Shell Preview (Light)");

    await darkBtn.click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    await expect(darkBtn).toHaveCSS("background-color", "rgb(96, 165, 250)");
    await expect(lightBtn).toHaveCSS("background-color", "rgb(17, 24, 39)");
    await assertNoSeriousAxeViolations(page, "Shell Preview (Dark)");

    await page.goto("/sign-in");
    await assertNoSeriousAxeViolations(page, "Sign In (/sign-in)");
  });
});

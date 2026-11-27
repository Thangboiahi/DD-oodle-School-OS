import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const requireSupabase = process.env.E2E_REQUIRE_SUPABASE === "true";
const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

const SYNTHETIC_PASSWORD =
  process.env.E2E_SYNTHETIC_PASSWORD ?? "DdOodleTest#2026!";

const AARAV_STUDENT_PROFILE_ID = "88888888-8888-4888-8888-888888880101";
const SECTION_XI_A_ID = "99999999-9999-4999-8999-999999994101";

function appAlert(page: Page): Locator {
  return page.locator('[role="alert"]:not(#__next-route-announcer__)');
}

async function signInThroughUi(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In to DD-oodle" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
}

async function assertNoHorizontalOverflow(page: Page, routeLabel: string) {
  const dims = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    dims.scrollWidth,
    `Horizontal overflow detected on ${routeLabel}: scrollWidth=${dims.scrollWidth} > innerWidth=${dims.innerWidth}`,
  ).toBeLessThanOrEqual(dims.innerWidth);
}

async function assertNoSeriousAxeViolations(page: Page, routeLabel: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  const seriousOrCritical = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );

  expect(
    seriousOrCritical,
    `Critical/serious WCAG AA violations on ${routeLabel}: ${JSON.stringify(seriousOrCritical, null, 2)}`,
  ).toEqual([]);
}

test.describe("Phase 2 Exit Gate: CBSE XI-XII Academics, Relationship RLS, Staged Imports, Responsive & WCAG AA", () => {
  test.beforeEach(() => {
    if (requireSupabase && !hasSupabaseEnv) {
      throw new Error(
        "E2E_REQUIRE_SUPABASE=true requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
    }

    test.skip(
      !hasSupabaseEnv,
      "Skipping live Phase 2 E2E: NEXT_PUBLIC_SUPABASE_URL not configured locally.",
    );
  });

  test("1. Principal views CBSE XI-XII reference model, cross-section TG, allocations, and confidential fields", async ({
    page,
  }) => {
    await signInThroughUi(
      page,
      "principal.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    await page.goto("/t/sunrise-cbse/academics");
    const academicsBody = page.locator("main");
    await expect(academicsBody).toContainText("Academic Session 2026-27");
    await expect(academicsBody).toContainText("AY-2026-27");
    await expect(academicsBody).toContainText("Senior Secondary");
    await expect(academicsBody).toContainText("XI-A");
    await expect(academicsBody).toContainText("XI-B");
    await expect(academicsBody).toContainText("Science");
    await expect(academicsBody).toContainText("Commerce");
    await expect(academicsBody).toContainText("Applied Mathematics");
    await expect(academicsBody).toContainText("Computer Science");

    await page.goto("/t/sunrise-cbse/academics/teaching-groups");
    const tgBody = page.locator("main");
    await expect(tgBody).toContainText("TG-XI-APPMATH-1");
    await expect(tgBody).toContainText("Synthetic Dual Member");
    await expect(tgBody).toContainText("Cross-Section");
    await expect(tgBody).toContainText("Aarav Verma");
    await expect(tgBody).toContainText("XI-A");
    await expect(tgBody).toContainText("Rohan Sen");
    await expect(tgBody).toContainText("XI-B");

    await page.goto("/t/sunrise-cbse/academics/allocations");
    const allocBody = page.locator("main");
    await expect(allocBody).toContainText("hod");
    await expect(allocBody).toContainText("class_teacher");
    await expect(allocBody).toContainText("subject_teacher");
    await expect(allocBody).toContainText("monitor");
    await expect(allocBody).toContainText("2026-04-01");
    await expect(allocBody).toContainText("2027-03-31");

    await page.goto("/t/sunrise-cbse/people");
    const peopleBody = page.locator("main");
    await expect(peopleBody).toContainText("Aarav Verma");
    await expect(peopleBody).toContainText("Diya Nair");
    await expect(peopleBody).toContainText("Rohan Sen");
    await expect(peopleBody).toContainText("Meera Das");
    await expect(peopleBody).not.toContainText("Kabir Rao");
    await expect(peopleBody).not.toContainText("ADM-VL-2026-001");

    await page.goto(`/t/sunrise-cbse/people/students/${AARAV_STUDENT_PROFILE_ID}`);
    await expect(page.getByLabel("House Name")).toHaveValue("Tagore House");
    await expect(page.getByLabel("Pastoral Counseling Note")).toHaveValue(
      "Synthetic confidential counseling observation for RLS testing",
    );
  });

  test("2. Principal executes staged bulk import, dry-run preview, idempotent valid-only commit, and CSV report download", async ({
    page,
  }) => {
    await signInThroughUi(
      page,
      "principal.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    const uniqueKey = `e2e-p2-m05-${Date.now()}`;
    const csvPayload = [
      "admission_number,full_name,email,gender",
      "ADM-E2E-9001,Zara E2E Student,zara.e2e@example.test,female",
      "ADM-SR-2026-001,Aarav Duplicate,aarav.dup@example.test,male",
      "ADM-E2E-BAD,,bad.row@example.test,other",
    ].join("\n");

    await page.goto("/t/sunrise-cbse/imports");
    await page.getByLabel("Target Registry").selectOption("students");
    await page.getByLabel("Idempotency Key").fill(uniqueKey);
    await page.getByLabel("Spreadsheet File (.csv or .xlsx)").setInputFiles({
      name: "phase2-e2e-students.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvPayload, "utf8"),
    });
    await page.getByRole("button", { name: "Upload & Stage Batch" }).click();

    await expect(page).toHaveURL(/\/t\/sunrise-cbse\/imports\/[0-9a-f-]+$/i);
    const batchUrl = page.url();

    await page
      .getByRole("button", { name: "Validate & Preview Dry-Run" })
      .click();

    await expect(page.locator("main")).toContainText(
      "Dry-run complete (3 rows): 1 valid, 1 duplicate, 1 error(s).",
    );

    await page
      .getByRole("button", { name: "Authorize & Commit 1 Valid Row(s)" })
      .click();

    await expect(page.locator("main")).toContainText("Batch Committed");
    await expect(page.locator("main")).toContainText("1 valid rows committed");

    const reportRes = await page.request.get(`${batchUrl}/report`);
    expect(reportRes.status()).toBe(200);
    expect(reportRes.headers()["content-type"] ?? "").toContain("text/csv");
    expect(reportRes.headers()["cache-control"] ?? "").toContain("no-store");
    const reportCsv = await reportRes.text();
    expect(reportCsv).toContain("ADM-E2E-9001");
    expect(reportCsv).toContain("committed");

    await page.goto("/t/sunrise-cbse/people");
    const roster = page.locator("main");
    await expect(roster).toContainText("ADM-E2E-9001");
    await expect(roster).toContainText("Zara E2E Student");
    await expect(roster).not.toContainText("ADM-E2E-BAD");
    await expect(roster).not.toContainText("Aarav Duplicate");
  });

  test("3. Dual Member enforces relationship-scoped TG isolation, confidential redaction, import denial, and Valley ward switching", async ({
    page,
  }) => {
    await signInThroughUi(
      page,
      "dual.member@example.test",
      SYNTHETIC_PASSWORD,
    );

    await page.goto("/t/sunrise-cbse/people");
    const sunriseRoster = page.locator("main");
    await expect(sunriseRoster).toContainText("Aarav Verma");
    await expect(sunriseRoster).toContainText("Rohan Sen");
    await expect(sunriseRoster).not.toContainText("Diya Nair");
    await expect(sunriseRoster).not.toContainText("Meera Das");

    await page.goto(`/t/sunrise-cbse/people/students/${AARAV_STUDENT_PROFILE_ID}`);
    const aaravDetail = page.locator("main");
    await expect(aaravDetail).toContainText("Tagore House");
    await expect(aaravDetail).not.toContainText(
      "Synthetic confidential counseling observation for RLS testing",
    );
    await expect(aaravDetail).not.toContainText("Pastoral Counseling Note");

    await page.goto("/t/sunrise-cbse/imports");
    await expect(appAlert(page)).toContainText(
      "Bulk import authorization required",
    );

    await page
      .getByLabel("Switch verified workspace")
      .selectOption("/t/valley-cbse");
    await expect(page).toHaveURL(/\/t\/valley-cbse$/);

    await page.goto("/t/valley-cbse/people");
    const valleyRoster = page.locator("main");
    await expect(valleyRoster).toContainText("Kabir Rao");
    await expect(valleyRoster).toContainText("ADM-VL-2026-001");
    await expect(valleyRoster).not.toContainText("Aarav Verma");
    await expect(valleyRoster).not.toContainText("Rohan Sen");
  });

  test("4. Class Monitor XI-A is restricted to read-only coordination view with zero edit forms, confidential fields, or imports access", async ({
    page,
  }) => {
    await signInThroughUi(
      page,
      "monitor.11a.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    await page.goto("/t/sunrise-cbse/academics");
    await expect(page.locator("main")).toContainText("Academic Session 2026-27");
    await expect(page.locator("main")).toContainText("XI-A");
    await expect(
      page.getByRole("button", { name: "Create Planned Session" }),
    ).toHaveCount(0);
    await expect(page.locator("main form button[type='submit']")).toHaveCount(
      0,
    );

    await page.goto(`/t/sunrise-cbse/academics/sections/${SECTION_XI_A_ID}`);
    const sectionBody = page.locator("main");
    await expect(sectionBody).toContainText(
      "Monitor / Monitress Read-Only Coordination View",
    );
    await expect(sectionBody).toContainText("Aarav Verma");
    await expect(sectionBody).toContainText("Diya Nair");
    await expect(
      page.getByRole("button", { name: "Enrol Student in Section" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Enrol in Subject Offering" }),
    ).toHaveCount(0);
    await expect(page.locator("main form button[type='submit']")).toHaveCount(
      0,
    );

    await page.goto(`/t/sunrise-cbse/people/students/${AARAV_STUDENT_PROFILE_ID}`);
    await expect(page.locator("main")).toContainText("Tagore House");
    await expect(page.locator("main")).not.toContainText(
      "Synthetic confidential counseling observation for RLS testing",
    );

    await page.goto("/t/sunrise-cbse/imports");
    await expect(appAlert(page)).toContainText(
      "Bulk import authorization required",
    );
  });

  test("5. Phase 2 routes pass 4-viewport overflow and WCAG 2.0/2.1 AA axe-core audits", async ({
    page,
  }) => {
    await signInThroughUi(
      page,
      "principal.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    const routes = [
      "/t/sunrise-cbse/people",
      "/t/sunrise-cbse/academics",
      "/t/sunrise-cbse/academics/teaching-groups",
      "/t/sunrise-cbse/imports",
    ];

    const viewports = [
      { name: "desktop", width: 1280, height: 800 },
      { name: "tablet", width: 820, height: 1180 },
      { name: "mobile-portrait", width: 390, height: 844 },
      { name: "mobile-landscape", width: 844, height: 390 },
    ];

    await page.setViewportSize({ width: 1280, height: 800 });
    for (const route of routes) {
      await page.goto(route);
      await assertNoSeriousAxeViolations(page, route);
    }

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const route of routes) {
        await page.goto(route);
        await assertNoHorizontalOverflow(page, `${route} (${vp.name})`);
      }
    }
  });
});

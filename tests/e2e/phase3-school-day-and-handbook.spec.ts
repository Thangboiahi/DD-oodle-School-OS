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
const AARAV_ENROLMENT_ID = "99999999-9999-4999-8999-999999998101";
const KABIR_STUDENT_PROFILE_ID = "88888888-8888-4888-8888-888888880201";
const SECTION_XI_A_ID = "99999999-9999-4999-8999-999999994101";
const EMP_SR_001_STAFF_ID = "88888888-8888-4888-8888-888888881101";
const TG_APPMATH_ID = "99999999-9999-4999-8999-999999999101";

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

async function switchAccount(page: Page, email: string) {
  await page.context().clearCookies();
  await signInThroughUi(page, email, SYNTHETIC_PASSWORD);
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

test.describe("Phase 3 Exit Gate: School-Day Reconstruction, Offline Replay, Role Privacy & WCAG AA", () => {
  test.beforeEach(() => {
    if (requireSupabase && !hasSupabaseEnv) {
      throw new Error(
        "E2E_REQUIRE_SUPABASE=true requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
    }

    test.skip(
      !hasSupabaseEnv,
      "Skipping live Phase 3 E2E: NEXT_PUBLIC_SUPABASE_URL not configured locally.",
    );
  });

  test("1. Full school-day roll, verification, sign-off, audited correction, staff attendance & ledger reconstruction", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await signInThroughUi(
      page,
      "classteacher.11a.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    await page.goto(
      `/t/sunrise-cbse/attendance?date=2026-11-28&section=${SECTION_XI_A_ID}`,
    );
    await page
      .getByLabel("Attendance status for Aarav Verma")
      .selectOption("present");
    await page
      .getByLabel("Attendance status for Diya Nair")
      .selectOption("present");
    await page.getByRole("button", { name: "Save Daily Roll" }).click();

    await expect(page.locator("main")).toContainText("Section State: Draft");

    await page.getByRole("button", { name: "Verify Section Roll" }).click();
    await expect(page.locator("main")).toContainText(
      "Section State: Class Teacher Verified",
    );

    await switchAccount(page, "principal.sunrise@example.test");
    await page.goto(
      `/t/sunrise-cbse/attendance?date=2026-11-28&section=${SECTION_XI_A_ID}`,
    );

    await page.getByRole("button", { name: "Sign Off Roll" }).click();
    await expect(page.locator("main")).toContainText(
      "Section State: Signed Off",
    );
    await expect(
      page.getByRole("button", { name: "Save Daily Roll" }),
    ).toHaveCount(0);

    const aaravOptionValue = await page
      .locator("#correct-student-attendance-id option", {
        hasText: "Aarav Verma",
      })
      .first()
      .getAttribute("value");
    expect(aaravOptionValue).toBeTruthy();

    await page
      .locator("#correct-student-attendance-id")
      .selectOption(aaravOptionValue!);
    await page.locator("#correct-student-new-status").selectOption("late");
    await page
      .locator("#correct-student-reason")
      .fill("Late arrival verified by front desk");
    await page
      .getByRole("button", { name: "Submit Audited Correction" })
      .click();

    await expect(page.locator("main")).toContainText(
      "Late arrival verified by front desk",
    );

    await page.goto("/t/sunrise-cbse/attendance/staff?date=2026-11-28");
    await page
      .locator("#staff-profile-select")
      .selectOption(EMP_SR_001_STAFF_ID);
    await page.locator("#staff-status-select").selectOption("present");
    await page.getByRole("button", { name: "Save Staff Attendance" }).click();

    const empRow = page
      .locator("tbody tr", { hasText: "EMP-SR-001" })
      .first();
    await expect(empRow).toContainText("draft");
    await empRow.getByRole("button", { name: "Sign Off" }).click();
    await expect(empRow).toContainText("signed_off");

    await page.goto("/t/sunrise-cbse/attendance/ledger?date=2026-11-28");
    const ledgerMain = page.locator("main");
    await expect(ledgerMain).toContainText("Disabled by default");
    await expect(ledgerMain).toContainText("day_roll");
    await expect(ledgerMain).toContainText("correction");
    await expect(ledgerMain).toContainText(
      "Late arrival verified by front desk",
    );
    await expect(ledgerMain).toContainText("staff");
  });

  test("2. Idempotent offline-queue sync replay & unauthorized API denial", async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);

    const idempotencyKey = `e2e-p3-m05-offline-${Date.now()}`;
    const payload = {
      events: [
        {
          idempotencyKey,
          subjectKind: "student" as const,
          studentProfileId: AARAV_STUDENT_PROFILE_ID,
          studentEnrolmentId: AARAV_ENROLMENT_ID,
          sectionId: SECTION_XI_A_ID,
          attendanceDate: "2026-11-29",
          eventType: "day_roll" as const,
          attendanceStatus: "present" as const,
          occurredAt: "2026-11-29T03:30:00.000Z",
          remarks: "Offline bus sync test",
          source: "offline_queue" as const,
        },
      ],
    };

    const unauthRes = await request.post(
      "/api/t/sunrise-cbse/attendance/sync",
      { data: payload },
    );
    expect(unauthRes.status()).toBe(401);

    await signInThroughUi(
      page,
      "classteacher.11a.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    const firstRes = await page.request.post(
      "/api/t/sunrise-cbse/attendance/sync",
      { data: payload },
    );
    expect(firstRes.status()).toBe(200);
    expect(firstRes.headers()["cache-control"] ?? "").toContain("no-store");
    const firstJson = (await firstRes.json()) as {
      accepted: number;
      deduplicated: number;
    };
    expect(firstJson.accepted).toBeGreaterThanOrEqual(1);

    const replayRes = await page.request.post(
      "/api/t/sunrise-cbse/attendance/sync",
      { data: payload },
    );
    expect(replayRes.status()).toBe(200);
    const replayJson = (await replayRes.json()) as {
      accepted: number;
      deduplicated: number;
    };
    expect(replayJson.deduplicated).toBeGreaterThanOrEqual(1);
    expect(replayJson.accepted).toBe(0);

    const crossTenantRes = await page.request.post(
      "/api/t/valley-cbse/attendance/sync",
      { data: payload },
    );
    expect(crossTenantRes.status()).toBe(403);

    await switchAccount(page, "monitor.11a.sunrise@example.test");
    const monitorRes = await page.request.post(
      "/api/t/sunrise-cbse/attendance/sync",
      { data: payload },
    );
    expect(monitorRes.status()).toBe(403);
  });

  test("3. Leave workflows, guardian parent notice & verified monitor daily summary", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await signInThroughUi(
      page,
      "dual.member@example.test",
      SYNTHETIC_PASSWORD,
    );
    await page.goto("/t/valley-cbse/leave/notices");

    const wardSelectText = await page.locator("#parent-notice-ward").innerText();
    expect(wardSelectText).toContain("Kabir Rao");
    expect(wardSelectText).not.toContain("Aarav Verma");
    expect(wardSelectText).not.toContain("Diya Nair");

    await page.locator("#parent-notice-date").fill("2026-11-29");
    await page.locator("#parent-notice-kind").selectOption("late_arrival");
    await page
      .locator("#parent-notice-message")
      .fill("Morning bus delayed near Ring Road");
    await page.getByRole("button", { name: "Submit Parent Notice" }).click();

    await expect(page.locator("main")).toContainText(
      "Morning bus delayed near Ring Road",
    );

    await switchAccount(page, "principal.sunrise@example.test");
    await page.goto("/t/sunrise-cbse/leave");

    const aaravLeaveRow = page
      .locator("tbody tr", { hasText: "Aarav Verma" })
      .first();
    await expect(aaravLeaveRow).toContainText(
      "Synthetic family travel leave request",
    );
    await aaravLeaveRow
      .getByLabel("Approval note for Aarav Verma")
      .fill("Approved by Principal for E2E");
    await aaravLeaveRow.getByRole("button", { name: "Approve" }).click();

    await expect(aaravLeaveRow).toContainText("approved");
    await expect(aaravLeaveRow).toContainText("Approved by Principal for E2E");

    await page.goto(
      `/t/sunrise-cbse/attendance/summary?date=2026-11-27&section=${SECTION_XI_A_ID}`,
    );
    const principalSummary = page.locator("main");
    await expect(principalSummary).toContainText("Present");
    await expect(principalSummary).toContainText("Verification Coverage");
    await expect(principalSummary).toContainText(
      "Active & Pending Section Leaves",
    );
    await expect(principalSummary).toContainText("Parent Attendance Notices");

    await switchAccount(page, "monitor.11a.sunrise@example.test");
    await page.goto("/t/sunrise-cbse/attendance?date=2026-11-27");
    const monitorDaily = page.locator("main");
    await expect(monitorDaily).toContainText(
      "Monitor / Monitress Read-Only Verified Attendance View",
    );
    await expect(monitorDaily).toContainText("Aarav Verma");
    await expect(monitorDaily).toContainText("Diya Nair");
    await expect(monitorDaily).not.toContainText("Rohan Sen");
    await expect(monitorDaily).not.toContainText("XI-B");
    await expect(
      page.getByRole("button", { name: "Save Daily Roll" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Verify Section Roll" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Sign Off Roll" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Submit Audited Correction" }),
    ).toHaveCount(0);

    await page.goto("/t/sunrise-cbse/attendance/summary?date=2026-11-27");
    const monitorSummary = page.locator("main");
    await expect(monitorSummary).toContainText(
      "Monitor / Monitress Read-Only Board Summary",
    );
    await expect(monitorSummary).toContainText("Aarav Verma");
    await expect(monitorSummary).toContainText("Diya Nair");
    await expect(monitorSummary).not.toContainText("Rohan Sen");
    await expect(monitorSummary).not.toContainText(
      "Active & Pending Section Leaves",
    );
    await expect(monitorSummary).not.toContainText("Parent Attendance Notices");

    await page.goto("/t/sunrise-cbse/attendance/staff");
    await expect(appAlert(page)).toContainText(
      "Staff attendance access restricted",
    );
    await expect(page.locator("main")).not.toContainText("EMP-SR-001");

    await page.goto("/t/sunrise-cbse/attendance/ledger");
    await expect(appAlert(page)).toContainText(
      "Attendance ledger access restricted",
    );

    await page.goto("/t/sunrise-cbse/leave");
    await expect(appAlert(page)).toContainText("Leave workflows restricted");
    await expect(page.locator("main")).not.toContainText("Aarav Verma");

    await page.goto("/t/sunrise-cbse/leave/notices");
    await expect(appAlert(page)).toContainText(
      "Parent attendance notices restricted",
    );
  });

  test("4. Digital Student Handbook category/visibility privacy boundaries & guardian acknowledgement", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await signInThroughUi(
      page,
      "principal.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );
    await page.goto("/t/sunrise-cbse/handbook");
    await expect(page.locator("main")).toContainText("Aarav Verma");

    await page.goto(`/t/sunrise-cbse/handbook/${AARAV_STUDENT_PROFILE_ID}`);
    const principalHandbook = page.locator("main");
    await expect(principalHandbook).toContainText("Live Attendance Summary");
    await expect(principalHandbook).toContainText(
      "Live Leave & Parent Notices",
    );
    await expect(principalHandbook).toContainText(
      "Strong Applied Math Problem Solving",
    );
    await expect(principalHandbook).toContainText(
      "Class Teacher & Leadership Check-In",
    );
    await expect(principalHandbook).toContainText(
      "Leadership Confidential Conduct Record",
    );
    await expect(principalHandbook).toContainText("Assignments & Subject Work");
    await expect(principalHandbook).toContainText("Fee Receipts & Ledger");

    await switchAccount(page, "classteacher.11a.sunrise@example.test");
    await page.goto(`/t/sunrise-cbse/handbook/${AARAV_STUDENT_PROFILE_ID}`);
    const ctHandbook = page.locator("main");
    await expect(ctHandbook).toContainText(
      "Strong Applied Math Problem Solving",
    );
    await expect(ctHandbook).toContainText(
      "Class Teacher & Leadership Check-In",
    );
    await expect(ctHandbook).not.toContainText(
      "Leadership Confidential Conduct Record",
    );
    await expect(
      page.locator('#handbook-entry-visibility option[value="leadership_only"]'),
    ).toHaveCount(0);

    await switchAccount(page, "dual.member@example.test");
    await page.goto("/t/sunrise-cbse/handbook");
    const dualDir = page.locator("main");
    await expect(dualDir).toContainText("Aarav Verma");
    await expect(dualDir).toContainText("Rohan Sen");
    await expect(dualDir).not.toContainText("Diya Nair");
    await expect(dualDir).not.toContainText("Kabir Rao");

    await page.goto(`/t/sunrise-cbse/handbook/${AARAV_STUDENT_PROFILE_ID}`);
    const dualHandbook = page.locator("main");
    await expect(dualHandbook).toContainText(
      "Strong Applied Math Problem Solving",
    );
    await expect(dualHandbook).not.toContainText(
      "Class Teacher & Leadership Check-In",
    );
    await expect(dualHandbook).not.toContainText(
      "Leadership Confidential Conduct Record",
    );

    await page
      .locator("#handbook-entry-category")
      .selectOption("academic_observation");
    await page
      .locator("#handbook-entry-visibility")
      .selectOption("student_and_guardian");
    await page.locator("#handbook-entry-tg").selectOption(TG_APPMATH_ID);
    await page
      .locator("#handbook-entry-title")
      .fill("E2E Applied Math Progress Note");
    await page
      .locator("#handbook-entry-body")
      .fill("Demonstrated strong problem-solving in cross-section batch.");
    await page.getByRole("button", { name: "Record Handbook Entry" }).click();
    await expect(dualHandbook).toContainText("E2E Applied Math Progress Note");

    await switchAccount(page, "principal.valley@example.test");
    await page.goto(`/t/valley-cbse/handbook/${KABIR_STUDENT_PROFILE_ID}`);
    await page
      .locator("#handbook-entry-category")
      .selectOption("academic_observation");
    await page
      .locator("#handbook-entry-visibility")
      .selectOption("student_and_guardian");
    await page.locator("#handbook-entry-title").fill("Valley Guardian Ack Entry");
    await page
      .locator("#handbook-entry-body")
      .fill("Consistent participation in Grade XI science lab.");
    await page.getByRole("button", { name: "Record Handbook Entry" }).click();
    await expect(page.locator("main")).toContainText(
      "Valley Guardian Ack Entry",
    );

    await switchAccount(page, "dual.member@example.test");
    await page.goto("/t/valley-cbse/handbook");
    const valleyDir = page.locator("main");
    await expect(valleyDir).toContainText("Kabir Rao");
    await expect(valleyDir).not.toContainText("Aarav Verma");
    await expect(valleyDir).not.toContainText("Rohan Sen");

    await page.goto(`/t/valley-cbse/handbook/${KABIR_STUDENT_PROFILE_ID}`);
    const valleyEntry = page
      .locator("article", { hasText: "Valley Guardian Ack Entry" })
      .first();
    await valleyEntry
      .getByRole("button", { name: "Acknowledge as Guardian" })
      .click();
    await expect(valleyEntry).toContainText("Guardian acknowledged");

    await switchAccount(page, "monitor.11a.sunrise@example.test");
    await page.goto("/t/sunrise-cbse/handbook");
    const monitorDir = page.locator("main");
    await expect(monitorDir).toContainText(
      "Classmate handbooks are private — only your own student handbook is accessible",
    );
    await expect(monitorDir).toContainText("Diya Nair");
    await expect(monitorDir).not.toContainText("Aarav Verma");
    await expect(monitorDir).not.toContainText("Rohan Sen");

    await page.goto(`/t/sunrise-cbse/handbook/${AARAV_STUDENT_PROFILE_ID}`);
    await expect(appAlert(page)).toContainText("Student handbook access denied");
    await expect(page.locator("main")).not.toContainText("Aarav Verma");
    await expect(page.locator("main")).not.toContainText(
      "Strong Applied Math Problem Solving",
    );
    await expect(page.locator("main")).not.toContainText(
      "Live Attendance Summary",
    );
  });

  test("5. Phase 3 routes pass 4-viewport overflow and WCAG 2.0/2.1 AA axe-core audits", async ({
    page,
  }) => {
    test.setTimeout(150_000);

    await signInThroughUi(
      page,
      "principal.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    const routes = [
      "/t/sunrise-cbse/attendance",
      "/t/sunrise-cbse/attendance/summary",
      "/t/sunrise-cbse/attendance/periods",
      "/t/sunrise-cbse/attendance/staff",
      "/t/sunrise-cbse/attendance/ledger",
      "/t/sunrise-cbse/leave",
      "/t/sunrise-cbse/leave/notices",
      "/t/sunrise-cbse/handbook",
      `/t/sunrise-cbse/handbook/${AARAV_STUDENT_PROFILE_ID}`,
    ];

    const viewports = [
      { name: "desktop", width: 1280, height: 800 },
      { name: "tablet", width: 768, height: 1024 },
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

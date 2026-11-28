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
const TG_APPMATH_ID = "99999999-9999-4999-8999-999999999101";
const SUNRISE_INST_NOTICE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddd6101";
const VALLEY_INST_NOTICE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddd6201";
const SUNRISE_AARAV_ENQUIRY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddd7101";
const SUNRISE_SEEDED_ASSIGNMENT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddd4101";

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

test.describe("Phase 4 Exit Gate: Communication, Academic Planning, Hybrid Assignments, Handbook & WCAG AA", () => {
  test.beforeEach(() => {
    if (requireSupabase && !hasSupabaseEnv) {
      throw new Error(
        "E2E_REQUIRE_SUPABASE=true requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
    }

    test.skip(
      !hasSupabaseEnv,
      "Skipping live Phase 4 E2E: NEXT_PUBLIC_SUPABASE_URL not configured locally.",
    );
  });

  test("1. Subject Teacher independent notice publishing, academic planning, resources & hybrid auto_mcq assignment workflow", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await signInThroughUi(
      page,
      "dual.member@example.test",
      SYNTHETIC_PASSWORD,
    );

    // 1A. Communication: scope restricted to Teaching Group (no Institution), offline notice cache, contextual comment
    await page.goto("/t/sunrise-cbse/communication");
    await expect(
      page.locator('#create-notice-scope option[value="teaching_group"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('#create-notice-scope option[value="institution"]'),
    ).toHaveCount(0);

    await page
      .locator("#create-notice-title")
      .fill("TG-XI-APPMATH-1 E2E Offline Seminar Update");
    await page
      .locator("#create-notice-body")
      .fill("Bring modular arithmetic sheets for Friday Period 7.");
    await page.locator("#create-notice-offline").check();
    await page.getByRole("button", { name: "Save Official Notice" }).click();

    await expect(page.locator("main")).toContainText(
      "TG-XI-APPMATH-1 E2E Offline Seminar Update",
    );

    await page
      .getByRole("button", { name: /Sync \d+ Cacheable Notice\(s\) Offline/ })
      .click();
    const cachedNoticesRaw = await page.evaluate(() =>
      window.localStorage.getItem("dd-oodle:offline-notices:sunrise-cbse"),
    );
    expect(cachedNoticesRaw ?? "").toContain(
      "TG-XI-APPMATH-1 E2E Offline Seminar Update",
    );

    const newNoticeArticle = page
      .locator("article", {
        hasText: "TG-XI-APPMATH-1 E2E Offline Seminar Update",
      })
      .first();
    await newNoticeArticle.getByRole("link", { name: "Open Notice" }).click();
    await expect(page).toHaveURL(/\/t\/sunrise-cbse\/communication\/notices\//);

    await page
      .locator("#notice-comment-body")
      .fill("Reminder: bring geometry compass as well.");
    await page.getByRole("button", { name: "Post Contextual Note" }).click();
    await expect(page.locator("main")).toContainText(
      "Reminder: bring geometry compass as well.",
    );

    // 1B. Academic Planning: Syllabus, Lesson Plan creation, Learning Resource publishing & Oversight denial
    await page.goto("/t/sunrise-cbse/planning");
    await expect(page.locator("main")).toContainText(
      "Modular Arithmetic & Congruence Properties",
    );
    await expect(page.locator("main")).toContainText(
      "Extra remedial practice scheduled after CBSE Olympiad workshop",
    );

    await page.goto("/t/sunrise-cbse/planning/lessons");
    await page.locator("#lesson-date").fill("2026-12-03");
    await page.locator("#lesson-week").fill("Week 35");
    await page.locator("#lesson-title").fill("E2E Modular Inverse Practice");
    await page
      .locator("#lesson-objectives")
      .fill("Practice modular inverses and remainders with CBSE sample questions.");
    await page.getByRole("button", { name: "Create Lesson Plan" }).click();
    await expect(page.locator("main")).toContainText(
      "E2E Modular Inverse Practice",
    );

    await page.goto("/t/sunrise-cbse/planning/resources");
    await page.locator("#res-visibility").selectOption("teaching_group");
    await page.locator("#res-group").selectOption(TG_APPMATH_ID);
    await page.locator("#res-title").fill("E2E Applied Math Practice Link");
    await page
      .locator("#res-url")
      .fill("https://cbseacademic.nic.in/curriculum_2026.html");
    await page.getByRole("button", { name: "Save Learning Resource" }).click();
    await expect(page.locator("main")).toContainText(
      "E2E Applied Math Practice Link",
    );

    await page.goto("/t/sunrise-cbse/planning/oversight");
    await expect(appAlert(page)).toContainText(
      "HOD, Class Teacher & Leadership Oversight Only",
    );

    // 1C. Hybrid Assignments: publish auto_mcq quiz, mark Aarav completed offline, and evaluate seeded assignment
    await page.goto("/t/sunrise-cbse/assignments");
    await page.locator("#create-asg-type").selectOption("quiz");
    await page.locator("#create-asg-submode").selectOption("both");
    await page.locator("#create-asg-eval").selectOption("auto_mcq");
    await page.locator("#create-asg-marks").fill("5");
    await page.locator("#create-asg-status").selectOption("published");
    await page.locator("#create-asg-title").fill("E2E Auto-MCQ Modular Check");
    await page
      .locator("#create-asg-instructions")
      .fill("Answer the objective question online or show notebook work in class.");

    await page
      .locator("summary", { hasText: "Objective MCQ Questions JSON" })
      .click();
    await page.locator("#create-asg-mcq-json").fill(
      JSON.stringify([
        {
          id: "q1",
          prompt: "What is 14 mod 5?",
          options: ["2", "3", "4"],
          correctOptionIndex: 2,
          marks: 5,
        },
      ]),
    );
    await page.getByRole("button", { name: "Create Assignment" }).click();
    await expect(page.locator("main")).toContainText(
      "E2E Auto-MCQ Modular Check",
    );

    await page
      .getByRole("link", { name: "E2E Auto-MCQ Modular Check" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/t\/sunrise-cbse\/assignments\//);

    const aaravMcqRow = page
      .locator("tbody tr", { hasText: "Aarav Verma" })
      .first();
    await aaravMcqRow
      .getByLabel("Offline notebook check remark for Aarav Verma")
      .fill("Notebook verified in class");
    await aaravMcqRow
      .getByRole("button", { name: "Mark Completed Offline" })
      .click();
    await expect(aaravMcqRow).toContainText("completed offline");
    await expect(aaravMcqRow).toContainText("Notebook verified in class");

    await page.goto(`/t/sunrise-cbse/assignments/${SUNRISE_SEEDED_ASSIGNMENT_ID}`);
    const aaravSeededRow = page
      .locator("tbody tr", { hasText: "Aarav Verma" })
      .first();
    const aaravEvalDetails = aaravSeededRow.locator("details", {
      hasText: "Evaluate / Remarks",
    });
    await aaravEvalDetails.locator("summary").click();
    await aaravEvalDetails.locator('input[name="marksAwarded"]').fill("18");
    await aaravEvalDetails
      .locator('input[name="teacherRemarks"]')
      .fill("Clear modular proof steps");
    await aaravEvalDetails
      .getByRole("button", { name: "Save Evaluation" })
      .click();
    await expect(aaravSeededRow).toContainText("evaluated");
    await expect(aaravSeededRow).toContainText("18/20");
    await expect(aaravSeededRow).toContainText("Clear modular proof steps");
  });

  test("2. Class Teacher oversight, read-only lesson/assignment views, internal staff notes & enquiry triage", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await signInThroughUi(
      page,
      "classteacher.11a.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    await page.goto("/t/sunrise-cbse/planning/oversight");
    const oversightMain = page.locator("main");
    await expect(oversightMain).toContainText("Subject Progress Rollup");
    await expect(oversightMain).toContainText(
      "Delayed Items & Carry-Forward Watchlist",
    );
    await expect(oversightMain).toContainText("Applied Mathematics");
    await expect(oversightMain).toContainText(
      "Extra remedial practice scheduled after CBSE Olympiad workshop",
    );

    await page.goto("/t/sunrise-cbse/planning/lessons");
    const lessonsMain = page.locator("main");
    await expect(lessonsMain).toContainText("Congruence Modulo Worked Seminar");
    await expect(
      page.getByRole("button", { name: "Create Lesson Plan" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Update Lesson Plan" }),
    ).toHaveCount(0);

    await page.goto("/t/sunrise-cbse/assignments");
    await expect(page.locator("main")).toContainText(
      "HOD / Class Teacher Oversight (Read-Only)",
    );
    await expect(
      page.getByRole("button", { name: "Create Assignment" }),
    ).toHaveCount(0);

    await page.goto(`/t/sunrise-cbse/assignments/${SUNRISE_SEEDED_ASSIGNMENT_ID}`);
    const asgDetailMain = page.locator("main");
    await expect(asgDetailMain).toContainText(
      "HOD / Class Teacher Oversight (Read-Only)",
    );
    await expect(asgDetailMain).toContainText("Aarav Verma");
    await expect(
      page.getByRole("button", { name: "Mark Completed Offline" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Save Evaluation" }),
    ).toHaveCount(0);

    await page.goto("/t/sunrise-cbse/communication/enquiries");
    await expect(page.locator("main")).toContainText("Aarav Verma");

    await page.goto(
      `/t/sunrise-cbse/communication/enquiries/${SUNRISE_AARAV_ENQUIRY_ID}`,
    );
    const enquiryMain = page.locator("main");
    await expect(enquiryMain).toContainText(
      "Internal staff note: Class Teacher and Subject Teacher coordinating remedial sheet.",
    );

    await page
      .locator("#enquiry-comment-body")
      .fill("Internal follow-up logged by Class Teacher");
    await page.locator("#enquiry-comment-internal").check();
    await page.getByRole("button", { name: "Post Case Update" }).click();
    await expect(enquiryMain).toContainText(
      "Internal follow-up logged by Class Teacher",
    );
    await expect(enquiryMain).toContainText("Internal Staff Note");

    await page.locator("#triage-target-status").selectOption("resolved");
    await page
      .locator("#triage-resolution-summary")
      .fill("Remedial Olympiad worksheet shared with Aarav Verma during Period 7.");
    await page.getByRole("button", { name: "Update Case Status" }).click();
    await expect(enquiryMain).toContainText("resolved");
    await expect(enquiryMain).toContainText(
      "Remedial Olympiad worksheet shared with Aarav Verma during Period 7.",
    );
  });

  test("3. Guardian isolation, notice acknowledgement, learner MCQ answer-key protection & live Handbook Phase 4 wiring", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // 3A. Guardian cross-tenant & enquiry isolation in valley-cbse
    await signInThroughUi(
      page,
      "dual.member@example.test",
      SYNTHETIC_PASSWORD,
    );

    await page.goto("/t/valley-cbse/communication/enquiries");
    const valleyEnquiriesMain = page.locator("main");
    await expect(valleyEnquiriesMain).toContainText("Kabir Rao");
    await expect(valleyEnquiriesMain).toContainText(
      "Valley Route 4 Stop Timing Clarification",
    );
    await expect(valleyEnquiriesMain).not.toContainText("Aarav Verma");
    await expect(valleyEnquiriesMain).not.toContainText(
      "Applied Math Olympiad Extra Worksheet Query",
    );
    await expect(valleyEnquiriesMain).not.toContainText("Internal staff note");

    await page
      .locator("#enquiry-subject-input")
      .fill("Valley Lab Coat Requirement Query");
    await page
      .locator("#enquiry-body-input")
      .fill("Please confirm if Grade XI science lab coats are issued by school.");
    await page.getByRole("button", { name: "Submit Formal Enquiry" }).click();
    await expect(valleyEnquiriesMain).toContainText(
      "Valley Lab Coat Requirement Query",
    );

    await page.goto("/t/valley-cbse/communication");
    const valleyNoticesMain = page.locator("main");
    await expect(valleyNoticesMain).toContainText(
      "Valley Winter PTM Schedule Circular",
    );
    await expect(valleyNoticesMain).not.toContainText(
      "Winter Term Timetable Circular (Sunrise CBSE)",
    );
    await expect(valleyNoticesMain).not.toContainText("TG-XI-APPMATH-1");

    await page.goto(
      `/t/valley-cbse/communication/notices/${VALLEY_INST_NOTICE_ID}`,
    );
    if ((await page.locator("#ack-notice-note").count()) > 0) {
      await page.locator("#ack-notice-note").fill("PTM slot noted by guardian.");
      await page.getByRole("button", { name: "Acknowledge Notice" }).click();
    }
    await expect(page.locator("main")).toContainText("Acknowledged");

    // 3B. Learner MCQ answer-key protection & online submission (Rohan Sen in TG-XI-APPMATH-1)
    await switchAccount(page, "student.11b.sunrise@example.test");
    await page.goto("/t/sunrise-cbse/assignments");
    await expect(page.locator("main")).toContainText(
      "E2E Auto-MCQ Modular Check",
    );

    await page
      .getByRole("link", { name: "E2E Auto-MCQ Modular Check" })
      .first()
      .click();
    await expect(page).toHaveURL(/\/t\/sunrise-cbse\/assignments\//);

    const preSubmitHtml = await page.content();
    expect(preSubmitHtml).not.toContain("correctOptionIndex");
    expect(preSubmitHtml).not.toContain("correctIndex");

    await expect(page.locator("main")).toContainText("What is 14 mod 5?");
    await page.getByRole("radio", { name: "4" }).check();
    await page
      .locator('textarea[name="responseText"]')
      .fill("14 = 2*5 + 4 so remainder is 4");
    await page.getByRole("button", { name: "Submit Assignment" }).click();

    await expect(page.locator("main")).toContainText("submitted");
    await expect(page.locator("main")).toContainText(
      "Preliminary MCQ score (5/5)",
    );
    const postSubmitHtml = await page.content();
    expect(postSubmitHtml).not.toContain("correctOptionIndex");

    // 3C. Live Digital Student Handbook Phase 4 wiring on Aarav Verma
    await switchAccount(page, "principal.sunrise@example.test");
    await page.goto(`/t/sunrise-cbse/handbook/${AARAV_STUDENT_PROFILE_ID}`);
    const handbookMain = page.locator("main");
    await expect(handbookMain).toContainText(
      "Assignments & Subject Work (Phase 4 Live)",
    );
    await expect(handbookMain).toContainText(
      "Applied Math Modular Arithmetic Sheet 1",
    );
    await expect(handbookMain).toContainText("evaluated");
    await expect(handbookMain).toContainText("18 / 20");
    await expect(handbookMain).toContainText("Clear modular proof steps");
    await expect(handbookMain).toContainText("E2E Auto-MCQ Modular Check");
    await expect(handbookMain).toContainText("completed offline");
    await expect(handbookMain).toContainText("Notebook verified in class");
    await expect(handbookMain).toContainText(
      "Upcoming Handbook Sections (ADR-0006 Extension Seams)",
    );
    await expect(handbookMain).toContainText("Fee Receipts & Ledger");
    await expect(handbookMain).not.toContainText("Coming in Phase 4");
  });

  test("4. Monitor / Monitress read-only classroom board & strict Phase 4 privacy boundaries", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await signInThroughUi(
      page,
      "monitor.11a.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    await page.goto("/t/sunrise-cbse/assignments");
    const monitorAsgMain = page.locator("main");
    await expect(monitorAsgMain).toContainText(
      "Monitor / Monitress Read-Only Classroom Assignment Board",
    );
    await expect(monitorAsgMain).toContainText(
      "Applied Math Modular Arithmetic Sheet 1",
    );
    await expect(monitorAsgMain).not.toContainText(
      "Term 2 MCQ Checkpoint (Draft)",
    );
    await expect(
      page.getByRole("button", { name: "Create Assignment" }),
    ).toHaveCount(0);

    await page.goto(`/t/sunrise-cbse/assignments/${SUNRISE_SEEDED_ASSIGNMENT_ID}`);
    const monitorAsgDetail = page.locator("main");
    await expect(monitorAsgDetail).toContainText("Monitor Classroom Board View");
    await expect(monitorAsgDetail).not.toContainText("Teaching Group Roster");
    await expect(monitorAsgDetail).not.toContainText("Aarav Verma");
    await expect(monitorAsgDetail).not.toContainText("Rohan Sen");
    await expect(monitorAsgDetail).not.toContainText(
      "Clear modular proof steps",
    );
    await expect(monitorAsgDetail).not.toContainText("Internal Staff Note");
    expect(await page.content()).not.toContain("correctOptionIndex");

    await page.goto("/t/sunrise-cbse/communication");
    const monitorCommMain = page.locator("main");
    await expect(monitorCommMain).toContainText(
      "Monitor / Monitress Read-Only Notice Board View",
    );
    await expect(monitorCommMain).toContainText(
      "Winter Term Timetable Circular (Sunrise CBSE)",
    );
    await expect(
      page.getByRole("button", { name: "Save Official Notice" }),
    ).toHaveCount(0);
    await expect(page.locator("#notice-include-drafts")).toHaveCount(0);

    await page.goto("/t/sunrise-cbse/communication/enquiries");
    await expect(appAlert(page)).toContainText(
      "Parent enquiry workflows restricted",
    );
    await expect(page.locator("main")).not.toContainText("Aarav Verma");
    await expect(page.locator("main")).not.toContainText(
      "Applied Math Olympiad",
    );

    await page.goto("/t/sunrise-cbse/planning/lessons");
    await expect(appAlert(page)).toContainText(
      "Staff Teaching & Oversight Workspace Only",
    );
    await expect(page.locator("main")).not.toContainText(
      "Congruence Modulo Worked Seminar",
    );

    await page.goto("/t/sunrise-cbse/planning/oversight");
    await expect(appAlert(page)).toContainText(
      "HOD, Class Teacher & Leadership Oversight Only",
    );
    await expect(page.locator("main")).not.toContainText(
      "Extra remedial practice",
    );

    await page.goto("/t/sunrise-cbse/planning/resources");
    const monitorResMain = page.locator("main");
    await expect(monitorResMain).not.toContainText(
      "Publish or Draft Learning Resource",
    );
    await expect(monitorResMain).not.toContainText("staff only");

    await page.goto(`/t/sunrise-cbse/handbook/${AARAV_STUDENT_PROFILE_ID}`);
    await expect(appAlert(page)).toContainText("Student handbook access denied");
    await expect(page.locator("main")).not.toContainText(
      "Applied Math Modular Arithmetic Sheet 1",
    );
    await expect(page.locator("main")).not.toContainText(
      "Clear modular proof steps",
    );
  });

  test("5. Phase 4 routes pass 4-viewport horizontal overflow and WCAG 2.0/2.1 AA axe-core audits", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await signInThroughUi(
      page,
      "principal.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    const routes = [
      "/t/sunrise-cbse/communication",
      `/t/sunrise-cbse/communication/notices/${SUNRISE_INST_NOTICE_ID}`,
      "/t/sunrise-cbse/communication/enquiries",
      `/t/sunrise-cbse/communication/enquiries/${SUNRISE_AARAV_ENQUIRY_ID}`,
      "/t/sunrise-cbse/planning",
      "/t/sunrise-cbse/planning/lessons",
      "/t/sunrise-cbse/planning/resources",
      "/t/sunrise-cbse/planning/oversight",
      "/t/sunrise-cbse/assignments",
      `/t/sunrise-cbse/assignments/${SUNRISE_SEEDED_ASSIGNMENT_ID}`,
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

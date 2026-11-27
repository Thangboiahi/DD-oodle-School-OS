import { expect, test, type Page } from "@playwright/test";

const requireSupabase = process.env.E2E_REQUIRE_SUPABASE === "true";
const hasSupabaseEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

const SYNTHETIC_PASSWORD =
  process.env.E2E_SYNTHETIC_PASSWORD ?? "DdOodleTest#2026!";

async function signInThroughUi(page: Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In to DD-oodle" }).click();
}

async function signOutThroughUi(page: Page) {
  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
}

test.describe("Live multi-tenant auth, isolation, dual-member switching & platform boundary", () => {
  test.beforeEach(() => {
    if (requireSupabase && !hasSupabaseEnv) {
      throw new Error(
        "E2E_REQUIRE_SUPABASE=true requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
    }

    test.skip(
      !hasSupabaseEnv,
      "Skipping live Supabase auth E2E: NEXT_PUBLIC_SUPABASE_URL not configured locally.",
    );
  });

  test("unauthenticated visitors to protected routes redirect cleanly to /sign-in", async ({
    page,
  }) => {
    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fworkspace/);

    await page.goto("/t/sunrise-cbse");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Ft%2Fsunrise-cbse/);

    await page.goto("/platform");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fplatform/);
  });

  test("invalid credentials return generic error without disclosing account existence", async ({
    page,
  }) => {
    await signInThroughUi(
      page,
      "principal.sunrise@example.test",
      "WrongPassword#999!",
    );

    await expect(page).toHaveURL(/\/sign-in/);
    const errorAlert = page.locator("#sign-in-error");
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(
      "Invalid email or password. Please verify your credentials.",
    );
  });

  test("Sunrise Principal sees only Sunrise CBSE, is denied Valley/unknown slugs and /platform, and signs out cleanly", async ({
    page,
  }) => {
    await signInThroughUi(
      page,
      "principal.sunrise@example.test",
      SYNTHETIC_PASSWORD,
    );

    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByText("Sunrise Synthetic CBSE Academy")).toBeVisible();
    await expect(
      page.getByText("Valley Synthetic CBSE Senior Secondary"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Open Platform Console" }),
    ).toHaveCount(0);

    await page.goto("/t/sunrise-cbse");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Sunrise Synthetic CBSE Academy",
      }),
    ).toBeVisible();
    await expect(page.getByText("Principal (principal)")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Governance & Roles" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Audit & Security" }).first(),
    ).toBeVisible();

    await page.goto("/t/valley-cbse");
    const valleyDeniedAlert = page.getByRole("alert");
    await expect(valleyDeniedAlert).toContainText("Institution access denied");
    await expect(page.locator("body")).not.toContainText("Valley Synthetic");
    const valleyDeniedText = await valleyDeniedAlert.innerText();

    await page.goto("/t/nonexistent-school-xyz");
    const unknownDeniedAlert = page.getByRole("alert");
    await expect(unknownDeniedAlert).toContainText("Institution access denied");
    expect(await unknownDeniedAlert.innerText()).toBe(valleyDeniedText);

    await page.goto("/platform");
    await expect(page.getByRole("alert")).toContainText(
      "Platform operations access restricted",
    );

    await page.goto("/workspace");
    await signOutThroughUi(page);

    await page.goto("/workspace");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fworkspace/);
  });

  test("Dual Member switches between Sunrise CBSE (Teacher) and Valley CBSE (Parent) via WorkspaceSwitcher without re-auth", async ({
    page,
  }) => {
    await signInThroughUi(
      page,
      "dual.member@example.test",
      SYNTHETIC_PASSWORD,
    );

    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByText("Sunrise Synthetic CBSE Academy")).toBeVisible();
    await expect(
      page.getByText("Valley Synthetic CBSE Senior Secondary"),
    ).toBeVisible();

    await page.goto("/t/sunrise-cbse");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Sunrise Synthetic CBSE Academy",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Subject Teacher (subject_teacher)"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Governance & Roles" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Audit & Security" }),
    ).toHaveCount(0);

    await page
      .getByLabel("Switch verified workspace")
      .selectOption("/t/valley-cbse");

    await expect(page).toHaveURL(/\/t\/valley-cbse$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Valley Synthetic CBSE Senior Secondary",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Parent / Guardian (parent_guardian)"),
    ).toBeVisible();

    await page.goto("/platform");
    await expect(page.getByRole("alert")).toContainText(
      "Platform operations access restricted",
    );

    await page.goto("/workspace");
    await signOutThroughUi(page);
  });

  test("Platform Operator accesses /platform and has zero automatic school memberships or /t/[slug] access", async ({
    page,
  }) => {
    await signInThroughUi(
      page,
      "platform.ops@example.test",
      SYNTHETIC_PASSWORD,
    );

    await expect(page).toHaveURL(/\/workspace$/);
    await expect(
      page.getByText("No active school memberships linked"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open Platform Console" }),
    ).toBeVisible();

    await page.goto("/platform");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "DD-oodle Platform Console",
      }),
    ).toBeVisible();
    await expect(page.getByText("super_admin").first()).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(
      "Tenant Isolation Policy: Zero Automatic Access to School Records",
    );

    await page.goto("/t/sunrise-cbse");
    await expect(page.getByRole("alert")).toContainText(
      "Institution access denied",
    );

    await page.goto("/t/valley-cbse");
    await expect(page.getByRole("alert")).toContainText(
      "Institution access denied",
    );

    await page.goto("/workspace");
    await signOutThroughUi(page);
  });
});

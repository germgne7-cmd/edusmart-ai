import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox").selectOption("en");
});
test("public navigation, three languages and auth boundary", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: /A smarter way/ }),
  ).toBeVisible();
  await page.getByRole("combobox").selectOption("kk");
  await expect(
    page.getByRole("heading", { name: /Білім алудың/ }),
  ).toBeVisible();
  await page.getByRole("combobox").selectOption("ru");
  await expect(
    page.getByRole("heading", { name: /Новый уровень/ }),
  ).toBeVisible();
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL(/login/);
});
test("demo course, lesson, assignments and analytics", async ({ page }) => {
  await page.getByRole("button", { name: "Explore demo" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  await page.goto("/app/catalog");
  await expect(
    page.getByRole("heading", { name: "Course catalog", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search", exact: true })
    .last()
    .fill("Software");
  await expect(
    page.getByRole("heading", { name: "Software architecture", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Software architecture", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lessons", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: /01 Software/ }).click();
  await expect(
    page.getByRole("button", { name: "Completed", exact: true }),
  ).toBeDisabled();
  await page.goto("/app/assignments");
  await expect(
    page.getByRole("heading", { name: "Assignments", exact: true }),
  ).toBeVisible();
  await page.goto("/app/analytics");
  await expect(
    page.getByRole("heading", { name: "Learning analytics", exact: true }),
  ).toBeVisible();
});
test("calendar, documents, AI configuration and role protection", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Explore demo" }).click();
  await page.goto("/app/calendar");
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.goto("/app/documents");
  await expect(page.getByText("PDF, DOCX or TXT · Up to 10 MB")).toBeVisible();
  await page.goto("/app/assistant");
  await page
    .getByRole("textbox", { name: "Ask anything about your studies…" })
    .fill("Explain SOLID");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("status")).toContainText("AI is not configured");
  await page.goto("/app/admin");
  await expect(
    page.getByText("You do not have access to this action"),
  ).toBeVisible();
});
test("responsive layout, theme and settings", async ({ page }) => {
  await page.getByRole("button", { name: "Explore demo" }).click();
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  await expect(page.getByLabel("Full name")).toHaveValue("Aidana");
});
test("extracts real PDF DOCX TXT and rejects scanned-only text", async ({
  page,
}) => {
  const { readFileSync } = await import("node:fs");
  for (const name of ["lecture.pdf", "lecture.docx", "lecture.txt"]) {
    const bytes = Array.from(readFileSync("tests/fixtures/" + name));
    const result = await page.evaluate(
      async ({ bytes, name }) => {
        const modulePath = "/src/services/documents.ts";
        const module = await import(/* @vite-ignore */ modulePath);
        const file = new File([new Uint8Array(bytes)], name);
        return module.extractText(file);
      },
      { bytes, name },
    );
    expect(result.text).toContain("Architecture");
    expect(result.word_count).toBeGreaterThan(3);
    if (name.endsWith("pdf")) expect(result.page_count).toBe(1);
  }
});
test("capture ten documented screens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop documentation captures");
  await page.getByRole("button", { name: "Explore demo" }).click();
  const paths = [
    "dashboard",
    "catalog",
    "course/course-0",
    "lesson/lesson-0-0",
    "assignments",
    "analytics",
    "calendar",
    "documents",
    "assistant",
    "settings",
  ];
  for (const [i, path] of paths.entries()) {
    await page.goto("/app/" + path);
    await expect(page.locator("main h1").first()).toBeVisible();
    await expect(page.locator("main .loading")).toHaveCount(0);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `docs/screenshots/${String(i + 1).padStart(2, "0")}-${path.split("/")[0]}.png`,
      fullPage: true,
    });
  }
});

async function demo(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Explore demo" }).click();
  await expect(page.getByText("Active courses", { exact: true })).toBeVisible();
}
test("dashboard derives sample progress and grades", async ({ page }) => {
  await demo(page);
  await expect(page.getByText("88%", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekly activity" }),
  ).toBeVisible();
});
test("catalog filters and sorts authorized courses", async ({ page }) => {
  await demo(page);
  await page.goto("/app/catalog");
  await page.getByRole("combobox", { name: "Category" }).selectOption("Design");
  await expect(
    page.getByRole("heading", { name: "Interface design", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Software architecture", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("combobox", { name: "Sort by" }).selectOption("title");
});
test("new enrollment is read-only in demo", async ({ page }) => {
  await demo(page);
  await page.goto("/app/course/course-5");
  await page.getByRole("button", { name: "Enroll in course" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Demo data is read-only",
  );
});
test("student cannot access teacher management", async ({ page }) => {
  await demo(page);
  await page.goto("/app/manageCourses");
  await expect(
    page.getByText("You do not have access to this action"),
  ).toBeVisible();
});
test("assignment status filters submitted work", async ({ page }) => {
  await demo(page);
  await page.goto("/app/assignments");
  await page.getByRole("button", { name: "Submitted", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Software architecture/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Artificial intelligence/ }),
  ).toHaveCount(0);
});
test("calendar supports week navigation", async ({ page }) => {
  await demo(page);
  await page.goto("/app/calendar");
  await page
    .getByRole("combobox", { name: "Study calendar", exact: true })
    .selectOption("week");
  await expect(page.locator(".calendar-cell")).toHaveCount(7);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.locator(".calendar-cell.is-today")).toHaveCount(1);
});
test("personal profile cannot mutate demo records", async ({ page }) => {
  await demo(page);
  await page.goto("/app/profile");
  await page.getByRole("textbox", { name: "Full name" }).fill("Changed name");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Demo data is read-only",
  );
});
test("language persists across application routes", async ({ page }) => {
  await demo(page);
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("kk");
  await page.goto("/app/documents");
  await expect(
    page.getByRole("heading", { name: "Құжаттар кітапханасы", exact: true }),
  ).toBeVisible();
});
test("theme persists after reload", async ({ page }) => {
  await demo(page);
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
test("unknown route returns localized 404", async ({ page }) => {
  await page.goto("/unknown-page");
  await expect(page.getByText("Page not found")).toBeVisible();
  await page.getByRole("link", { name: "Go back" }).click();
  await expect(
    page.getByRole("heading", { name: /A smarter way/ }),
  ).toBeVisible();
});

test("does not claim a scanned PDF has readable text", async ({ page }) => {
  const { readFileSync } = await import("node:fs");
  const bytes = Array.from(readFileSync("tests/fixtures/scanned.pdf"));
  const error = await page.evaluate(async (bytes) => {
    const path = "/src/services/documents.ts";
    const module = await import(/* @vite-ignore */ path);
    try {
      await module.extractText(
        new File([new Uint8Array(bytes)], "scanned.pdf"),
      );
      return "";
    } catch (e) {
      return (e as Error).message;
    }
  }, bytes);
  expect(error).toBe("emptyFile");
});

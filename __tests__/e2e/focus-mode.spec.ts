import { test, expect } from "@playwright/test";

test.describe("Focus Mode — crash regression", () => {
  const setupPage = async (
    page: import("@playwright/test").Page,
    extraLocalStorage?: Record<string, string>
  ) => {
    await page.goto("/");
    await page.evaluate((extra) => {
      localStorage.setItem(
        "luminaSettings",
        JSON.stringify({
          fontSize: 32,
          translationIds: ["en.sahih"],
          reciterId: "alafasy",
          scriptType: "simple",
          showTranslation: true,
          autoPlay: false,
          theme: "light",
          userLanguage: "en",
        })
      );
      if (extra) {
        for (const [key, value] of Object.entries(extra)) {
          localStorage.setItem(key, value);
        }
      }
    }, extraLocalStorage);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector("header", { timeout: 30000 });
    // Wait for Surah 1 verses to load
    await page.waitForSelector('[id^="ayah-"]', { timeout: 15000 });
  };

  test("Focus Mode opens on Surah 1 verse 1 without crash (no notes)", async ({ page }) => {
    await setupPage(page);

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Detect page crash
    let crashed = false;
    page.on("crash", () => {
      crashed = true;
    });

    // Click first verse to select it (Surah 1, verse 1)
    const firstVerse = page.locator('[id^="ayah-"]').first();
    await firstVerse.click();

    // Click Focus Mode button in header
    const focusBtn = page.locator('button[title="Enter Focus Mode"]');
    await focusBtn.click();

    // Wait for Focus Mode overlay to appear (up to 10s for lazy load + render)
    const exitBtn = page.getByText("Exit Focus Mode");
    await expect(exitBtn).toBeVisible({ timeout: 10000 });

    // Verify page is still alive — interact with it
    expect(crashed).toBe(false);

    // Verify the BlockNote editor area rendered (the note section)
    const editorArea = page.locator(".bn-editor");
    await expect(editorArea).toBeVisible({ timeout: 5000 });

    // Close Focus Mode
    await exitBtn.click();
    await expect(exitBtn).not.toBeVisible({ timeout: 5000 });
  });

  test("Focus Mode opens on Surah 1 verse 1 without crash (with quranLink note)", async ({
    page,
  }) => {
    // Pre-populate a note for verse 1:1 that contains quranLink inline content
    const noteData = {
      "1:1": {
        verseKey: "1:1",
        blocks: [
          {
            id: "test-block-1",
            type: "paragraph",
            content: [
              { type: "text", text: "See also ", styles: {} },
              {
                type: "quranLink",
                props: { surahId: 2, verseStart: 255, verseEnd: 255 },
              },
              { type: "text", text: " for more context.", styles: {} },
            ],
            props: {},
            children: [],
          },
        ],
        updatedAt: "2025-01-01T00:00:00.000Z",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    };

    await setupPage(page, {
      luminaNotes: JSON.stringify(noteData),
    });

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Detect page crash
    let crashed = false;
    page.on("crash", () => {
      crashed = true;
    });

    // Click first verse to select it
    const firstVerse = page.locator('[id^="ayah-"]').first();
    await firstVerse.click();

    // Click Focus Mode button in header
    const focusBtn = page.locator('button[title="Enter Focus Mode"]');
    await focusBtn.click();

    // Wait for Focus Mode overlay
    const exitBtn = page.getByText("Exit Focus Mode");
    await expect(exitBtn).toBeVisible({ timeout: 10000 });

    expect(crashed).toBe(false);

    // Verify BlockNote editor rendered
    const editorArea = page.locator(".bn-editor");
    await expect(editorArea).toBeVisible({ timeout: 5000 });

    // Close Focus Mode
    await exitBtn.click();
    await expect(exitBtn).not.toBeVisible({ timeout: 5000 });
  });
});

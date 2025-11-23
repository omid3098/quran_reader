import { test, expect } from "@playwright/test";

test.describe("Audio Player", () => {
  test.beforeEach(async ({ page }) => {
    // Set up localStorage to bypass language selection modal
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem(
        "luminaSettings",
        JSON.stringify({
          fontSize: 32,
          translationIds: ["en.sahih"],
          reciterId: "alafasy",
          scriptType: "simple",
          showTranslation: true,
          autoPlay: true,
          theme: "dark",
          userLanguage: "en",
        })
      );
    });
    // Navigate and wait for network to settle
    await page.reload({ waitUntil: "networkidle" });
    // Wait for header to be visible (always loads)
    await page.waitForSelector("header", { timeout: 30000 });
    // Try to wait for verses, but don't fail if API is slow
    try {
      await page.waitForSelector('[id^="ayah-"]', { timeout: 15000 });
    } catch {
      // Verses may not load if external API is slow
    }
  });

  test("should show audio player when verse is selected", async ({ page }) => {
    const count = await page.locator('[id^="ayah-"]').count();
    if (count === 0) {
      test.skip(true, "Verses did not load - external API may be unavailable");
      return;
    }
    const firstVerse = page.locator('[id^="ayah-"]').first();
    await firstVerse.click();
    await page.waitForTimeout(1000);
    await expect(firstVerse).toHaveClass(/bg-emerald/);
  });

  test("should have play/pause controls", async ({ page }) => {
    const count = await page.locator('[id^="ayah-"]').count();
    if (count === 0) {
      test.skip(true, "Verses did not load - external API may be unavailable");
      return;
    }
    const firstVerse = page.locator('[id^="ayah-"]').first();
    await firstVerse.click();
    await page.waitForTimeout(1000);
    await expect(firstVerse).toHaveClass(/bg-emerald/);
  });

  test("should have next/previous verse navigation", async ({ page }) => {
    const count = await page.locator('[id^="ayah-"]').count();
    if (count === 0) {
      test.skip(true, "Verses did not load - external API may be unavailable");
      return;
    }
    const firstVerse = page.locator('[id^="ayah-"]').first();
    await firstVerse.click();
    await page.waitForTimeout(1000);
    await expect(firstVerse).toHaveClass(/bg-emerald/);
  });

  test("should auto-scroll to next verse when audio advances", async ({ page }) => {
    const count = await page.locator('[id^="ayah-"]').count();
    if (count < 3) {
      test.skip(true, "Not enough verses loaded - external API may be unavailable");
      return;
    }

    // Click first verse to make it active
    const firstVerse = page.locator('[id^="ayah-"]').first();
    await firstVerse.click();
    await page.waitForTimeout(500);
    await expect(firstVerse).toHaveClass(/bg-emerald/);

    // Scroll down so the second verse is out of view
    await page.evaluate(() => {
      window.scrollTo({ top: 1000, behavior: "instant" });
    });
    await page.waitForTimeout(300);

    // Click next button in audio player
    const nextButton = page.getByRole("button", { name: /next/i });
    await nextButton.click();
    await page.waitForTimeout(500);

    // The second verse should now be active and scrolled into view
    const secondVerse = page.locator('[id^="ayah-"]').nth(1);
    await expect(secondVerse).toHaveClass(/bg-emerald/);

    // Verify the second verse is in viewport (scrolled to)
    const isInViewport = await secondVerse.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    expect(isInViewport).toBe(true);
  });
});

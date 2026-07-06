import { test, expect } from '@playwright/test';

/**
 * Product-driven, READ-ONLY smoke test. The target comes from EZT_TARGET_URL
 * (set by the agent from the product config). This is the seed of the
 * autonomous web-testing track — it runs with zero human interaction.
 */
test.describe('smoke (read-only)', () => {
  test('homepage loads and responds', async ({ page }) => {
    const response = await page.goto('/');
    expect(response, 'navigation should return a response').toBeTruthy();
    expect(response!.status(), 'homepage should not be a server error').toBeLessThan(400);
  });

  test('page has a non-empty title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });
});

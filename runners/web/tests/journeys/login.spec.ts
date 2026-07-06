import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/login-page';

/**
 * EzBillify login journey. Auto-enables once a test account is set in .env
 * (EZT_EZBILLIFY_TEST_EMAIL / _PASSWORD). Run against a NON-prod target where
 * possible; against prod it uses the dedicated QA account only.
 */
const email = process.env.EZT_EZBILLIFY_TEST_EMAIL;
const password = process.env.EZT_EZBILLIFY_TEST_PASSWORD;

test.describe('EzBillify · login', () => {
  test.skip(
    !email || !password,
    'Set EZT_EZBILLIFY_TEST_EMAIL / EZT_EZBILLIFY_TEST_PASSWORD in .env to enable.',
  );

  test('a QA test user can sign in', async ({ page }) => {
    const login = new LoginPage(page);
    await login.open('/login'); // TODO: use product.web.auth.loginPath once confirmed
    await login.login(email!, password!);
    // TODO: replace with a confirmed post-login signal (URL or dashboard element).
    await expect(page).toHaveURL(/dashboard|home|app/i, { timeout: 15_000 });
  });
});

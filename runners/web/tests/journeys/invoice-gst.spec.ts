import { test, expect } from '@playwright/test';
import { computeGst } from '@ezt/core';
import { LoginPage } from '../../src/pages/login-page';
import { InvoicePage } from '../../src/pages/invoice-page';

/**
 * Invoice + GST correctness journey (skeleton). Enables once test creds are set.
 * The assertion trusts the INDEPENDENT computeGst() oracle, not the app's own
 * math — that is the whole point of validation. Selectors/paths are placeholders
 * pending confirmation against the real EzBillify UI.
 *
 * SAFETY: creating an invoice is a write. Only run against a NON-prod target, or
 * with an explicit read-write grant + guaranteed teardown (money-movement stays
 * blocked). Left skipped by default even when creds exist, until a target is set.
 */
const email = process.env.EZT_EZBILLIFY_TEST_EMAIL;
const password = process.env.EZT_EZBILLIFY_TEST_PASSWORD;
const writesAllowed = process.env.EZT_SAFETY_MODE === 'read-write';

test.describe('EzBillify · invoice GST', () => {
  test.skip(
    !email || !password || !writesAllowed,
    'Needs test creds + EZT_SAFETY_MODE=read-write against a non-prod target.',
  );

  test('invoice total matches the GST oracle (5 × 100 @ 18%)', async ({ page }) => {
    const expected = computeGst({ quantity: 5, unitPrice: 100, taxRatePct: 18 });
    // sanity: 500 taxable + 90 tax = 590
    expect(expected.grandTotal).toBe(590);

    await new LoginPage(page).open('/login');
    await new LoginPage(page).login(email!, password!);

    const invoice = new InvoicePage(page);
    await invoice.open('/invoices/new');
    await invoice.addLine({ item: 'Consulting', quantity: 5, unitPrice: 100 });

    expect(await invoice.grandTotal()).toBe(expected.grandTotal);
  });
});

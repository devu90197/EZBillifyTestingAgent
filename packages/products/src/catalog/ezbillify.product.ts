import type { Product } from '@ezt/core';

/**
 * First product under test. The billing software is already LIVE; we only ever
 * reach it read-only by default and never move real money.
 * NOTE: appPackage / bundleId below are placeholders — replace with the real
 * identifiers once the signed QA build artifacts are supplied.
 */
export const ezbillify: Product = {
  id: 'ezbillify',
  name: 'EzBillify Billing Software',
  platforms: ['web', 'android', 'ios'],
  web: {
    baseUrl: 'https://ezbillify.com',
    browsers: ['chromium', 'firefox', 'webkit'],
  },
  mobile: {
    android: { appPackage: 'com.ezbillify.pos', appActivity: '.MainActivity' },
    ios: { bundleId: 'com.ezbillify.pos' },
  },
  safety: { readOnly: true, blockPayments: true },
  tags: ['billing', 'fintech', 'gst', 'pos'],
};

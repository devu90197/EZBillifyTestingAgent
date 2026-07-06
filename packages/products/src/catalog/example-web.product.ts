import type { Product } from '@ezt/core';

/**
 * TEMPLATE — copy this file to onboard ANY website or app to the universal agent.
 * This is what makes the platform product-agnostic: a new product is just data.
 * Points at example.com so the foundation has a safe, non-production target.
 */
export const exampleWeb: Product = {
  id: 'example-web',
  name: 'Example Website (template)',
  platforms: ['web'],
  web: {
    baseUrl: 'https://example.com',
    browsers: ['chromium'],
  },
  safety: { readOnly: true, blockPayments: true },
  tags: ['template'],
};

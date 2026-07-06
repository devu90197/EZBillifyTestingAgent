import { ProductRegistry } from '@ezt/core';
import { ezbillify } from './catalog/ezbillify.product';
import { exampleWeb } from './catalog/example-web.product';

/** The registry every consumer imports. Add products by registering them here. */
export const registry = new ProductRegistry().register(ezbillify).register(exampleWeb);

export { ezbillify, exampleWeb };

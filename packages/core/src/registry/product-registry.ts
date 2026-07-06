import type { Product } from '../domain/product';

/** In-memory catalog of products the agent can test. */
export class ProductRegistry {
  private readonly products = new Map<string, Product>();

  register(product: Product): this {
    if (this.products.has(product.id)) {
      throw new Error(`Duplicate product id: ${product.id}`);
    }
    this.products.set(product.id, product);
    return this;
  }

  get(id: string): Product {
    const p = this.products.get(id);
    if (!p) {
      throw new Error(`Unknown product "${id}". Known: ${[...this.products.keys()].join(', ') || '(none)'}`);
    }
    return p;
  }

  has(id: string): boolean {
    return this.products.has(id);
  }

  all(): Product[] {
    return [...this.products.values()];
  }
}

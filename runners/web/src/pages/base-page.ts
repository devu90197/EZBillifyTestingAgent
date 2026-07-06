import type { Page } from '@playwright/test';

/** Base Page Object. Feature pages (login, invoice, …) extend this. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }
}

import type { Page } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Login page object. Locators use accessible, resilient queries as a starting
 * point — CONFIRM them against the real EzBillify DOM (or add `data-testid`
 * attributes in the app, which is the most robust option).
 */
export class LoginPage extends BasePage {
  private readonly email = () => this.page.getByLabel(/email|username/i);
  private readonly password = () => this.page.getByLabel(/password/i);
  private readonly submit = () =>
    this.page.getByRole('button', { name: /sign in|log ?in|login|continue/i });

  async open(loginPath = '/login'): Promise<void> {
    await this.page.goto(loginPath);
  }

  async login(email: string, password: string): Promise<void> {
    await this.email().fill(email);
    await this.password().fill(password);
    await this.submit().click();
  }
}

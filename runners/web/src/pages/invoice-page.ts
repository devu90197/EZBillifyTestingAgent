import type { Page } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Invoice creation page object (skeleton). Selectors are placeholders — confirm
 * against the real EzBillify invoice form before enabling the journey.
 */
export class InvoicePage extends BasePage {
  async open(invoiceNewPath = '/invoices/new'): Promise<void> {
    await this.page.goto(invoiceNewPath);
  }

  async addLine(opts: { item: string; quantity: number; unitPrice: number }): Promise<void> {
    await this.page.getByLabel(/item|description|product/i).first().fill(opts.item);
    await this.page.getByLabel(/qty|quantity/i).first().fill(String(opts.quantity));
    await this.page.getByLabel(/price|rate|unit price/i).first().fill(String(opts.unitPrice));
  }

  /** Reads the displayed grand total as a number (strips currency symbols). */
  async grandTotal(): Promise<number> {
    const text = (await this.page.getByTestId('grand-total').innerText()).replace(/[^0-9.]/g, '');
    return Number(text);
  }
}

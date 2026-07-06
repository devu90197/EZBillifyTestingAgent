/**
 * Reference GST oracle (India) — the seed of the Phase 6 tax oracle.
 * This is an INDEPENDENT reference calculation the tests trust as ground truth,
 * then compare against what EzBillify actually renders/returns.
 *
 * NOTE: rounding rules vary by configuration (per-line vs per-invoice, and
 * half-up vs banker's). This uses per-line half-up to 2 decimals. Confirm the
 * exact rule EzBillify uses and adjust before asserting on real invoices.
 */
export interface GstInput {
  quantity: number;
  unitPrice: number;
  taxRatePct: number;
  discountPct?: number;
  /** true = inter-state (IGST); false/undefined = intra-state (CGST+SGST). */
  interState?: boolean;
}

export interface GstResult {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeGst(input: GstInput): GstResult {
  const gross = input.quantity * input.unitPrice;
  const discount = (gross * (input.discountPct ?? 0)) / 100;
  const taxable = round2(gross - discount);
  const tax = round2((taxable * input.taxRatePct) / 100);

  const igst = input.interState ? tax : 0;
  const cgst = input.interState ? 0 : round2(tax / 2);
  const sgst = input.interState ? 0 : round2(tax - cgst);
  const totalTax = input.interState ? igst : round2(cgst + sgst);

  return { taxable, cgst, sgst, igst, totalTax, grandTotal: round2(taxable + totalTax) };
}

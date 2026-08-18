/**
 * split.ts: split a restaurant bill between friends.
 *
 * Given the subtotal, a tax rate, a tip percentage and a head count, work out
 * the grand total and what each person owes. About as simple as business logic
 * gets, which is exactly why nobody writes tests for code like this.
 */

export interface BillInput {
  /** Pre-tax, pre-tip amount in dollars, e.g. 48.50 */
  subtotal: number;
  /** Sales tax as a fraction, e.g. 0.0825 for 8.25% */
  taxRate: number;
  /** Tip as a percentage of the subtotal, e.g. 18 for 18% */
  tipPercent: number;
  /** How many people are splitting it */
  people: number;
}

export interface BillResult {
  tax: number;
  tip: number;
  total: number;
  /** One entry per person, in dollars */
  perPerson: number[];
}

/** Round to cents. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function splitBill(input: BillInput): BillResult {
  const tax = input.subtotal * input.taxRate;
  const tip = input.subtotal * (input.tipPercent / 100);
  const total = input.subtotal + tax + tip;
  const each = round2(total / input.people);

  return {
    tax: round2(tax),
    tip: round2(tip),
    total: round2(total),
    perPerson: Array(input.people).fill(each),
  };
}

/**
 * split.ts: split a restaurant bill between friends.
 *
 * Given the subtotal, a tax rate, a tip percentage and a head count, work out
 * the grand total and what each person owes.
 *
 * v2: the tests found three things v1 got wrong.
 *   1. Shares did not add up to the total ($10 three ways gave 3 x $3.33 =
 *      $9.99). Fixed by working in whole cents and handing the leftover
 *      pennies to the first few people, so the sum is exact by construction.
 *   2. $1.005 rounded DOWN to $1.00 because 1.005 * 100 is 100.49999... in
 *      floating point. Fixed by rounding with an epsilon nudge.
 *   3. Nonsense input (0 people, negative amounts, NaN) produced Infinity or
 *      NaN instead of an error. Fixed by validating up front.
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

/** Dollars to whole cents, rounding half up (1.005 -> 101, not 100). */
function toCents(dollars: number): number {
  return Math.round(dollars * 100 + Number.EPSILON * 1000);
}

export function splitBill(input: BillInput): BillResult {
  const { subtotal, taxRate, tipPercent, people } = input;

  if (![subtotal, taxRate, tipPercent, people].every(Number.isFinite)) {
    throw new Error('All inputs must be finite numbers.');
  }
  if (subtotal < 0 || taxRate < 0 || tipPercent < 0) {
    throw new Error('Subtotal, tax rate and tip cannot be negative.');
  }
  if (!Number.isInteger(people) || people < 1) {
    throw new Error('People must be a whole number of at least 1.');
  }

  const subtotalC = toCents(subtotal);
  const taxC = Math.round(subtotalC * taxRate);
  const tipC = Math.round(subtotalC * (tipPercent / 100));
  const totalC = subtotalC + taxC + tipC;

  // Everyone pays the floor share; the first `remainder` people pay one cent
  // more. Sum is exactly totalC, no matter what.
  const base = Math.floor(totalC / people);
  const remainder = totalC - base * people;
  const perPersonC = Array.from({ length: people }, (_, i) => base + (i < remainder ? 1 : 0));

  return {
    tax: taxC / 100,
    tip: tipC / 100,
    total: totalC / 100,
    perPerson: perPersonC.map(c => c / 100),
  };
}

/**
 * split.ts: split a restaurant bill between friends.
 *
 * Given the subtotal, a tax rate, a tip percentage and a head count, work out
 * the grand total and what each person owes.
 *
 * v3: refactor. v2 was correct but everything lived in one function. This
 * version pulls out three named helpers (validate, toCents, distributeCents),
 * does all arithmetic on a small `cents` type, and adds an optional feature
 * (choose who eats the extra pennies). Not one line of tests/split.test.ts
 * changed between v2 and v3, and all 18 stayed green throughout. That is what
 * the tests are for: they let you rearrange the furniture without wondering
 * whether you broke the plumbing.
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
  /**
   * Who pays the leftover pennies when the total does not divide evenly.
   * 'first' (default): people 1..r pay one cent more. 'last': people n-r+1..n.
   * The sum is exact either way; this only decides whose share is bigger.
   */
  pennyOrder?: 'first' | 'last';
}

export interface BillResult {
  tax: number;
  tip: number;
  total: number;
  /** One entry per person, in dollars */
  perPerson: number[];
}

/** Whole cents. A plain number, named so the intent is visible at call sites. */
type Cents = number;

/** Throw a readable error for input that cannot be split. */
function validate(input: BillInput): void {
  const { subtotal, taxRate, tipPercent, people, pennyOrder = 'first' } = input;
  if (![subtotal, taxRate, tipPercent, people].every(Number.isFinite)) {
    throw new Error('All inputs must be finite numbers.');
  }
  if (subtotal < 0 || taxRate < 0 || tipPercent < 0) {
    throw new Error('Subtotal, tax rate and tip cannot be negative.');
  }
  if (!Number.isInteger(people) || people < 1) {
    throw new Error('People must be a whole number of at least 1.');
  }
  if (pennyOrder !== 'first' && pennyOrder !== 'last') {
    throw new Error("pennyOrder must be 'first' or 'last'.");
  }
}

/**
 * Dollars to whole cents, rounding half up. The epsilon nudge is there because
 * 1.005 * 100 is 100.49999999999999 in IEEE-754, and Math.round would send it
 * the wrong way. Cashiers round half up; so do we.
 */
export function toCents(dollars: number): Cents {
  return Math.round(dollars * 100 + Number.EPSILON * 1000);
}

/** Cents back to dollars for the caller. */
export function fromCents(c: Cents): number {
  return c / 100;
}

/**
 * Split `total` cents into `n` whole-cent shares that sum to exactly `total`.
 * Everyone gets floor(total / n); the `remainder` leftover cents go one each
 * to the first (or last) `remainder` people. Exported because it is the
 * reusable idea in this file: it works for cents, seats, or anything else that
 * must be shared without loss.
 */
export function distributeCents(total: Cents, n: number, order: 'first' | 'last' = 'first'): Cents[] {
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => {
    const getsExtra = order === 'first' ? i < remainder : i >= n - remainder;
    return base + (getsExtra ? 1 : 0);
  });
}

export function splitBill(input: BillInput): BillResult {
  validate(input);
  const { subtotal, taxRate, tipPercent, people, pennyOrder = 'first' } = input;

  const subtotalC = toCents(subtotal);
  const taxC: Cents = Math.round(subtotalC * taxRate);
  const tipC: Cents = Math.round(subtotalC * (tipPercent / 100));
  const totalC: Cents = subtotalC + taxC + tipC;

  return {
    tax: fromCents(taxC),
    tip: fromCents(tipC),
    total: fromCents(totalC),
    perPerson: distributeCents(totalC, people, pennyOrder).map(fromCents),
  };
}

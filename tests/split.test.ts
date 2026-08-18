/**
 * split.test.ts: what splitBill() is supposed to do, written down.
 *
 * Read the test names as a spec. Each one is a sentence a customer would agree
 * with before seeing any code. When one of these goes red, that is not the test
 * being difficult; that is the test doing the one job it has, which is telling
 * you the code and the sentence disagree.
 */
import { splitBill } from '../src/split';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const cents = (n: number) => Math.round(n * 100);

describe('the easy cases', () => {
  it('adds tax and tip to the subtotal', () => {
    const r = splitBill({ subtotal: 100, taxRate: 0.10, tipPercent: 20, people: 1 });
    expect(r.tax).toBe(10);
    expect(r.tip).toBe(20);
    expect(r.total).toBe(130);
    expect(r.perPerson).toEqual([130]);
  });

  it('splits an even total evenly', () => {
    const r = splitBill({ subtotal: 90, taxRate: 0, tipPercent: 0, people: 3 });
    expect(r.perPerson).toEqual([30, 30, 30]);
  });

  it('handles zero tax and zero tip', () => {
    const r = splitBill({ subtotal: 42, taxRate: 0, tipPercent: 0, people: 2 });
    expect(r.total).toBe(42);
    expect(r.perPerson).toEqual([21, 21]);
  });

  it('gives one entry per person', () => {
    const r = splitBill({ subtotal: 50, taxRate: 0.08, tipPercent: 15, people: 7 });
    expect(r.perPerson).toHaveLength(7);
  });
});

describe('the money actually adds up', () => {
  // This is the one that matters. If the shares do not sum to the total,
  // somebody at the table is quietly paying (or pocketing) the difference.
  it('shares sum to the total: $10 three ways', () => {
    const r = splitBill({ subtotal: 10, taxRate: 0, tipPercent: 0, people: 3 });
    expect(cents(sum(r.perPerson))).toBe(cents(r.total));
  });

  it('shares sum to the total: a realistic dinner', () => {
    const r = splitBill({ subtotal: 48.5, taxRate: 0.0825, tipPercent: 18, people: 3 });
    expect(cents(sum(r.perPerson))).toBe(cents(r.total));
  });

  it('shares sum to the total: 200 random bills', () => {
    // Deterministic pseudo-random so a failure is reproducible.
    let seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (let i = 0; i < 200; i++) {
      const input = {
        subtotal: Math.round(rnd() * 50000) / 100,
        taxRate: Math.round(rnd() * 1500) / 10000,
        tipPercent: Math.round(rnd() * 30),
        people: 1 + Math.floor(rnd() * 12),
      };
      const r = splitBill(input);
      expect(cents(sum(r.perPerson)), JSON.stringify(input)).toBe(cents(r.total));
    }
  });

  it('spreads leftover pennies deterministically (first people pay the extra cent)', () => {
    const r = splitBill({ subtotal: 10, taxRate: 0, tipPercent: 0, people: 3 });
    expect(r.perPerson).toEqual([3.34, 3.33, 3.33]);
  });

  it('never gives anyone more than one cent above anyone else', () => {
    const r = splitBill({ subtotal: 99.99, taxRate: 0.07, tipPercent: 17, people: 9 });
    const max = Math.max(...r.perPerson);
    const min = Math.min(...r.perPerson);
    expect(cents(max) - cents(min)).toBeLessThanOrEqual(1);
  });
});

describe('rounding is honest', () => {
  it('rounds half a cent up, the way a cashier would', () => {
    // 1.005 is the classic floating-point trap: Math.round(1.005 * 100) === 100.
    const r = splitBill({ subtotal: 1.005, taxRate: 0, tipPercent: 0, people: 1 });
    expect(r.total).toBe(1.01);
  });

  it('never returns fractions of a cent', () => {
    const r = splitBill({ subtotal: 33.33, taxRate: 0.0725, tipPercent: 15, people: 4 });
    for (const v of [r.tax, r.tip, r.total, ...r.perPerson]) {
      expect(v).toBe(Math.round(v * 100) / 100);
    }
  });
});

describe('bad input is refused, not silently mangled', () => {
  it('rejects zero people', () => {
    expect(() => splitBill({ subtotal: 10, taxRate: 0, tipPercent: 0, people: 0 })).toThrow();
  });

  it('rejects a fractional head count', () => {
    expect(() => splitBill({ subtotal: 10, taxRate: 0, tipPercent: 0, people: 2.5 })).toThrow();
  });

  it('rejects a negative subtotal', () => {
    expect(() => splitBill({ subtotal: -5, taxRate: 0, tipPercent: 0, people: 2 })).toThrow();
  });

  it('rejects a negative tip', () => {
    expect(() => splitBill({ subtotal: 10, taxRate: 0, tipPercent: -10, people: 2 })).toThrow();
  });

  it('rejects NaN anywhere', () => {
    expect(() => splitBill({ subtotal: NaN, taxRate: 0, tipPercent: 0, people: 2 })).toThrow();
    expect(() => splitBill({ subtotal: 10, taxRate: NaN, tipPercent: 0, people: 2 })).toThrow();
  });
});

describe('it behaves like a function', () => {
  it('does not mutate its input', () => {
    const input = { subtotal: 20, taxRate: 0.1, tipPercent: 10, people: 2 };
    const copy = { ...input };
    splitBill(input);
    expect(input).toEqual(copy);
  });

  it('is deterministic', () => {
    const input = { subtotal: 77.77, taxRate: 0.0625, tipPercent: 22, people: 5 };
    expect(splitBill(input)).toEqual(splitBill(input));
  });
});

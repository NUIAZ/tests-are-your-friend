/**
 * split.test.ts: what splitBill() is supposed to do, written down.
 *
 * Read the test names as a spec. Each one is a sentence a customer would agree
 * with before seeing any code. When one goes red, that is not the test being
 * difficult; that is the test doing the one job it has, which is telling you
 * the code and the sentence disagree.
 *
 * How this file is organised, and why:
 *   - "the easy cases"           sanity checks. If these fail, something is
 *                                 badly wrong and the rest is noise.
 *   - "the money actually adds up"  the tests that matter. Two of them found the
 *                                 penny bug in v1 that no amount of clicking
 *                                 around would have shown.
 *   - "rounding is honest"        one classic floating-point trap, pinned so
 *                                 it can never come back.
 *   - "bad input is refused"      the function must complain, not return
 *                                 Infinity or NaN and let the caller carry on.
 *   - "it behaves like a function"  purity: no mutation, deterministic. Cheap
 *                                 to assert, expensive to debug when violated.
 *
 * What is deliberately NOT here: any test that knows how splitBill is built.
 * Nothing asserts that a helper was called, or how many times, or what the
 * intermediate values were. That is why v3 could rewrite the whole
 * implementation without touching this file: the tests pin behaviour, not
 * structure. If you find yourself wanting to test a private helper, export it
 * and test it as its own unit (distributeCents in v3 is an example) rather than
 * reaching through splitBill to get at it.
 *
 * Every test uses fixed inputs and exact expectations. No "roughly", no
 * toBeCloseTo. Money is integers in disguise, and the tests treat it that way
 * via the cents() helper.
 */
import { splitBill } from '../src/split';

/** Sum a list of dollar amounts. */
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Compare money in whole cents, never in floating-point dollars. 3.33 + 3.33 +
 * 3.34 is 10.000000000000002 in IEEE-754; comparing cents sidesteps that and
 * makes assertion messages read as "expected 999 to be 1000", which is exactly
 * the bug report you want.
 */
const cents = (n: number) => Math.round(n * 100);

describe('the easy cases', () => {
  // A single person, round numbers: if this fails nothing else is trustworthy.
  it('adds tax and tip to the subtotal', () => {
    const r = splitBill({ subtotal: 100, taxRate: 0.10, tipPercent: 20, people: 1 });
    expect(r.tax).toBe(10);
    expect(r.tip).toBe(20);
    expect(r.total).toBe(130);
    expect(r.perPerson).toEqual([130]);
  });

  // The happy path everyone assumes is the only path.
  it('splits an even total evenly', () => {
    const r = splitBill({ subtotal: 90, taxRate: 0, tipPercent: 0, people: 3 });
    expect(r.perPerson).toEqual([30, 30, 30]);
  });

  // Zeroes are legal inputs, not edge cases to reject.
  it('handles zero tax and zero tip', () => {
    const r = splitBill({ subtotal: 42, taxRate: 0, tipPercent: 0, people: 2 });
    expect(r.total).toBe(42);
    expect(r.perPerson).toEqual([21, 21]);
  });

  // Shape check: the UI renders one line per person and relies on this.
  it('gives one entry per person', () => {
    const r = splitBill({ subtotal: 50, taxRate: 0.08, tipPercent: 15, people: 7 });
    expect(r.perPerson).toHaveLength(7);
  });
});

describe('the money actually adds up', () => {
  // This is the one that matters. If the shares do not sum to the total,
  // somebody at the table is quietly paying (or pocketing) the difference.
  // v1 failed it: $10 / 3 -> 3 x $3.33 = $9.99.
  it('shares sum to the total: $10 three ways', () => {
    const r = splitBill({ subtotal: 10, taxRate: 0, tipPercent: 0, people: 3 });
    expect(cents(sum(r.perPerson))).toBe(cents(r.total));
  });

  // Same property with realistic tax and tip, so it is clearly not a
  // "divide by three" special case.
  it('shares sum to the total: a realistic dinner', () => {
    const r = splitBill({ subtotal: 48.5, taxRate: 0.0825, tipPercent: 18, people: 3 });
    expect(cents(sum(r.perPerson))).toBe(cents(r.total));
  });

  // Property-style: the same invariant across a spread of inputs. A hand-
  // picked example proves the bug exists; two hundred show how common it is
  // (v1 failed on the very first random bill). The generator is a fixed-seed
  // LCG rather than Math.random so a failure reproduces on the next run and the
  // failing input is printed in the assertion message.
  it('shares sum to the total: 200 random bills', () => {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    for (let i = 0; i < 200; i++) {
      const input = {
        subtotal: Math.round(rnd() * 50000) / 100,   // $0.00 .. $500.00
        taxRate: Math.round(rnd() * 1500) / 10000,   // 0% .. 15%
        tipPercent: Math.round(rnd() * 30),          // 0 .. 30
        people: 1 + Math.floor(rnd() * 12),          // 1 .. 12
      };
      const r = splitBill(input);
      expect(cents(sum(r.perPerson)), JSON.stringify(input)).toBe(cents(r.total));
    }
  });

  // Once shares must sum exactly, SOMEONE gets the extra pennies. Pin who, so
  // the answer is predictable and the UI can explain it. (v3 made this
  // configurable with pennyOrder; the default is still "first".)
  it('spreads leftover pennies deterministically (first people pay the extra cent)', () => {
    const r = splitBill({ subtotal: 10, taxRate: 0, tipPercent: 0, people: 3 });
    expect(r.perPerson).toEqual([3.34, 3.33, 3.33]);
  });

  // Fairness bound: the extra pennies are spread one each, never piled on one
  // person. Nine people and an awkward total make a good stress case.
  it('never gives anyone more than one cent above anyone else', () => {
    const r = splitBill({ subtotal: 99.99, taxRate: 0.07, tipPercent: 17, people: 9 });
    const max = Math.max(...r.perPerson);
    const min = Math.min(...r.perPerson);
    expect(cents(max) - cents(min)).toBeLessThanOrEqual(1);
  });
});

describe('rounding is honest', () => {
  // The classic floating-point trap: 1.005 * 100 is 100.49999999999999, so
  // Math.round sends it DOWN to 100. A cashier rounds half up. v1 failed this.
  // Pinned here so nobody "simplifies" the rounding later and reintroduces it.
  it('rounds half a cent up, the way a cashier would', () => {
    const r = splitBill({ subtotal: 1.005, taxRate: 0, tipPercent: 0, people: 1 });
    expect(r.total).toBe(1.01);
  });

  // Every number that leaves the function must be a whole number of cents.
  // A value like 3.3300000000000001 renders fine but breaks equality checks
  // downstream and is a smell that some arithmetic happened in dollars.
  it('never returns fractions of a cent', () => {
    const r = splitBill({ subtotal: 33.33, taxRate: 0.0725, tipPercent: 15, people: 4 });
    for (const v of [r.tax, r.tip, r.total, ...r.perPerson]) {
      expect(v).toBe(Math.round(v * 100) / 100);
    }
  });
});

describe('bad input is refused, not silently mangled', () => {
  // v1 returned Infinity for zero people (x / 0) and carried on. A function
  // that cannot do its job must say so; the caller decides what to do about it.
  it('rejects zero people', () => {
    expect(() => splitBill({ subtotal: 10, taxRate: 0, tipPercent: 0, people: 0 })).toThrow();
  });

  // Two and a half people is not a thing. Number inputs in a form make this
  // an easy mistake to let through.
  it('rejects a fractional head count', () => {
    expect(() => splitBill({ subtotal: 10, taxRate: 0, tipPercent: 0, people: 2.5 })).toThrow();
  });

  it('rejects a negative subtotal', () => {
    expect(() => splitBill({ subtotal: -5, taxRate: 0, tipPercent: 0, people: 2 })).toThrow();
  });

  it('rejects a negative tip', () => {
    expect(() => splitBill({ subtotal: 10, taxRate: 0, tipPercent: -10, people: 2 })).toThrow();
  });

  // NaN is what you get from Number('') when a form field is empty. Without
  // this check it propagates through every calculation and renders as "$NaN".
  it('rejects NaN anywhere', () => {
    expect(() => splitBill({ subtotal: NaN, taxRate: 0, tipPercent: 0, people: 2 })).toThrow();
    expect(() => splitBill({ subtotal: 10, taxRate: NaN, tipPercent: 0, people: 2 })).toThrow();
  });
});

describe('it behaves like a function', () => {
  // The caller's object must come back untouched. Cheap to assert; miserable
  // to debug when a "pure" function has been quietly editing its argument.
  it('does not mutate its input', () => {
    const input = { subtotal: 20, taxRate: 0.1, tipPercent: 10, people: 2 };
    const copy = { ...input };
    splitBill(input);
    expect(input).toEqual(copy);
  });

  // Same input, same output, every time. Rules out hidden state and any
  // accidental Math.random or Date.now creeping in.
  it('is deterministic', () => {
    const input = { subtotal: 77.77, taxRate: 0.0625, tipPercent: 22, people: 5 };
    expect(splitBill(input)).toEqual(splitBill(input));
  });
});

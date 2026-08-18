/**
 * main.ts: wires the demo form to splitBill() and renders the answer.
 *
 * Deliberately boring, and deliberately untested. Everything in here is
 * "read four inputs, call the function, write the result into the page". There
 * is no branching worth a test, and a screenshot proves it works faster than a
 * DOM test would. All the logic, and therefore all the tests, live in split.ts
 * and tests/split.test.ts. Keeping the wiring this thin is what makes that
 * split honest: if this file ever grows an if-statement about money, that
 * if-statement belongs in split.ts where it can be tested.
 *
 * The "Shares add up to ..." line at the bottom of the result exists for the
 * demo: at v1 it says $9.99 under a $10.00 total, which is the whole story of
 * this repo in one screenshot.
 */
import { splitBill } from './split';

/** Typed shorthand for getElementById; the ids are fixed in index.html. */
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>('form');
const result = $<HTMLElement>('result');
const error = $<HTMLElement>('error');

/** Format dollars in the user's locale ("$3.34"). */
const money = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

/**
 * Read the form, run the split, paint the result. Any error thrown by
 * splitBill (bad input) is shown in the red line instead of the result, so the
 * validation added in v2 is visible in the UI: type 0 people and watch.
 */
function render() {
  try {
    const out = splitBill({
      subtotal: Number($<HTMLInputElement>('subtotal').value),
      // The form takes tax as a percentage (8.25); the function wants a
      // fraction (0.0825). This is the only arithmetic in this file.
      taxRate: Number($<HTMLInputElement>('taxRate').value) / 100,
      tipPercent: Number($<HTMLInputElement>('tipPercent').value),
      people: Number($<HTMLInputElement>('people').value),
    });
    error.hidden = true;
    const sum = out.perPerson.reduce((a, b) => a + b, 0);
    // The values are numbers we produced, not user input, so innerHTML is safe
    // here. If this ever renders anything typed by the user, escape it.
    result.innerHTML = `
      <dl>
        <dt>Tax</dt><dd>${money(out.tax)}</dd>
        <dt>Tip</dt><dd>${money(out.tip)}</dd>
        <dt>Total</dt><dd><strong>${money(out.total)}</strong></dd>
      </dl>
      <h2>Each person pays</h2>
      <ol>${out.perPerson.map(p => `<li>${money(p)}</li>`).join('')}</ol>
      <p class="check">Shares add up to ${money(sum)}</p>
    `;
  } catch (e) {
    result.innerHTML = '';
    error.hidden = false;
    error.textContent = (e as Error).message;
  }
}

// Recalculate on every keystroke; the function is far too cheap to debounce.
form.addEventListener('input', render);
form.addEventListener('submit', e => { e.preventDefault(); render(); });
render();

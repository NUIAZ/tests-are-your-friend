/**
 * main.ts: wires the form to splitBill() and renders the answer.
 * Deliberately boring. The interesting file is split.ts, and the interesting
 * *thing* is tests/split.test.ts.
 */
import { splitBill } from './split';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>('form');
const result = $<HTMLElement>('result');
const error = $<HTMLElement>('error');

const money = (n: number) =>
  n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

function render() {
  try {
    const out = splitBill({
      subtotal: Number($<HTMLInputElement>('subtotal').value),
      taxRate: Number($<HTMLInputElement>('taxRate').value) / 100,
      tipPercent: Number($<HTMLInputElement>('tipPercent').value),
      people: Number($<HTMLInputElement>('people').value),
    });
    error.hidden = true;
    const sum = out.perPerson.reduce((a, b) => a + b, 0);
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

form.addEventListener('input', render);
form.addEventListener('submit', e => { e.preventDefault(); render(); });
render();

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrice, parseStay } from '../src/utils/bookingMath.js';

test('calculates the stay length from date-only values without timezone drift', () => {
  const stay = parseStay('2099-05-10', '2099-05-13');
  assert.equal(stay.nights, 3);
});

test('rejects a checkout that is not after check-in', () => {
  assert.throws(() => parseStay('2099-05-13', '2099-05-13'), { statusCode: 400, message: 'Check-out must be after check-in.' });
});

test('rejects a stay longer than 60 nights', () => {
  assert.throws(() => parseStay('2099-05-01', '2099-07-02'), { statusCode: 400 });
});

test('calculates subtotal, tax, and total with currency-safe rounding', () => {
  assert.deepEqual(calculatePrice(189.5, 3, 0.1), { subtotal: 568.5, tax: 56.85, total: 625.35 });
});

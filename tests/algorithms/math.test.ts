import test from 'node:test';
import assert from 'node:assert/strict';
import { probabilities, hhi, effectiveSize, entropy, normalizedEntropy, jsd, topShare, jaccard, retention } from '../../packages/algorithms/src/features/math.js';
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
test('uniform 100-song distribution preserves probability, ESS, entropy and TopK', () => {
  const p = probabilities(Array(100).fill(10));
  close(hhi(p), 0.01); close(effectiveSize(p), 100); close(entropy(p), Math.log(100)); close(normalizedEntropy(p), 1); close(topShare(p, 10), 0.1);
});
test('single-song and empty distributions remain finite', () => {
  close(effectiveSize(probabilities([10, 0, 0])), 1);
  close(normalizedEntropy([1]), 0); close(topShare([], 10), 0); close(effectiveSize([]), 0);
  assert.deepEqual(probabilities([-1, null as unknown as number, NaN, Infinity]), [0, 0, 0, 0]);
  assert.deepEqual(probabilities([1e308, 1e308]), [0.5, 0.5]);
});
test('JSD identity, disjoint supports, symmetry and stable zeros', () => {
  close(jsd({ a: 10, b: 0 }, { a: 1 }), 0);
  close(jsd({ a: 1 }, { b: 1 }), 1);
  close(jsd({ a: 1, b: 3 }, { b: 1, c: 2 }), jsd({ b: 1, c: 2 }, { a: 1, b: 3 }));
  close(jaccard(['a', 'a', 'b'], ['b', 'c']), 1 / 3); close(retention(['a', 'b'], ['b', 'c']), 0.5);
});

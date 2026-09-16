export const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));
export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export function probabilities(xs: number[]): number[] {
  const valid = xs.map(x => Number.isFinite(x) && x > 0 ? x : 0);
  // Scale first to avoid overflow for large finite counts.
  const max = Math.max(0, ...valid);
  if (!max) return valid;
  const scaled = valid.map(x => x / max), total = sum(scaled);
  return scaled.map(x => x / total);
}
export const hhi = (p: number[]) => sum(p.map(x => x * x));
export const effectiveSize = (p: number[]) => hhi(p) ? 1 / hhi(p) : 0;
export const entropy = (p: number[]) => -sum(p.filter(x => x > 0).map(x => x * Math.log(x)));
export const normalizedEntropy = (p: number[]) => p.filter(x => x > 0).length > 1 ? clamp(entropy(p) / Math.log(p.filter(x => x > 0).length)) : 0;
export const topShare = (p: number[], k: number) => sum([...p].sort((a, b) => b - a).slice(0, k));
export function jaccard(a: string[], b: string[]): number {
  const left = new Set(a), right = new Set(b), union = new Set([...a, ...b]);
  return union.size ? [...left].filter(x => right.has(x)).length / union.size : 0;
}
export function retention(a: string[], b: string[]): number {
  const left = new Set(a), right = new Set(b);
  return left.size ? [...left].filter(x => right.has(x)).length / left.size : 0;
}
export function jsd(a: Record<string, number>, b: Record<string, number>): number {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  const p = probabilities(keys.map(k => a[k] ?? 0)), q = probabilities(keys.map(k => b[k] ?? 0));
  if (!sum(p) || !sum(q)) return 0; // Callers treat empty distributions as unavailable.
  return clamp(sum(p.map((x, i) => {
    const y = q[i], m = (x + y) / 2;
    return (x ? x * Math.log2(x / m) : 0) / 2 + (y ? y * Math.log2(y / m) : 0) / 2;
  })));
}

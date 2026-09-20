export function pct(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? (value * 100).toFixed(digits) + '%' : '—';
}

export function date(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '未知';
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '未知';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface BarRow {
  id: string;
  name: string;
  value: number;
  display: string;
}

export function bars(
  rows: ReadonlyArray<{ id?: string; name: string; value?: number | null; share?: number | null; count?: number | null }>,
  options: { max?: number } = {},
): BarRow[] {
  const max = options.max ?? 10;
  return (rows || [])
    .slice(0, max)
    .map((row, index) => {
      const raw = row.value ?? row.share ?? row.count ?? 0;
      const v = typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
      return {
        id: row.id ?? String(index),
        name: row.name,
        value: v,
        display: pct(v),
      };
    });
}

export function union<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>): ReadonlyArray<T> {
  return Array.from(new Set([...a, ...b]));
}

export function stripUnknown(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return s.replace(/未知|资料不足|无法确认/g, '').trim();
}

export function percent(counts: ReadonlyArray<number>): number | null {
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total <= 0) return null;
  return total > 0 ? total / counts.length / 100 : null;
}

export function total(counts: ReadonlyArray<number>): number {
  return counts.reduce((sum, n) => sum + n, 0);
}

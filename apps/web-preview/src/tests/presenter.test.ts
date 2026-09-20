import { describe, expect, it } from 'vitest';
import { bars, date, pct } from '../shared/format.js';

describe('display format parity', () => {
  it('keeps unknown distinct from zero', () => { expect(pct(null)).toBe('—'); expect(pct(0)).toBe('0.0%'); });
  it('rejects invalid dates', () => expect(date('not-a-date')).toBe('未知'));
  it('caps bars at ten and clamps values', () => {
    const rows = bars(Array.from({length:12},(_,i)=>({id:String(i),name:`row ${i}`,share:i===0?2:.1})));
    expect(rows).toHaveLength(10); expect(rows[0].value).toBe(1);
  });
});

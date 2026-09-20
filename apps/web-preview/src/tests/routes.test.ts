import { describe, expect, it } from 'vitest';
import { PAGE_ROUTES, parseHash, toHash } from '../preview/routes.js';

describe('preview routes', () => {
  it('registers all 17 native pages', () => expect(PAGE_ROUTES).toHaveLength(17));
  it('round trips a route and query', () => {
    const hash = toHash('card', { id: 'center', snapshotId: 'demo' });
    const parsed = parseHash(hash);
    expect(parsed.id).toBe('card');
    expect(parsed.params.get('id')).toBe('center');
  });
});

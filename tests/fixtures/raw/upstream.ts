// Synthetic protocol fixtures, not exported from any real account.
export const rawSong = (id: number) => ({ id, name: `Fixture song ${id}`, ar: [{ id: Math.floor(id / 5) + 1, name: 'Fixture artist' }], al: { id: Math.floor(id / 4) + 1, name: 'Fixture album' }, dt: 180000 });
export const accountPayload = { data: { code: 200, profile: { userId: 777, nickname: 'Fixture user' }, cookie: 'must-not-be-kept' } };
export const longPayload = { code: 200, allData: Array.from({ length: 70 }, (_, i) => ({ song: rawSong(i + 1), playCount: 100 - i, score: 100 })) };
export const weekPayload = { code: 200, weekData: Array.from({ length: 20 }, (_, i) => ({ song: rawSong(i + 1), playCount: 20 - i })) };
export const recentPayload = { code: 200, data: { list: Array.from({ length: 30 }, (_, i) => ({ data: rawSong(60 + i), playTime: 1789574400000 - i * 1000 })) } };
export const likesPayload = { code: 200, ids: [1, 3, 5, 7, 9] };

import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Account } from '../../../../../packages/contracts/src/index.js';
import type { MusicProvider } from '../netease-api/provider.js';
import { AppError } from '../../common/errors.js';
import { tokenHash } from './crypto.js';

type Result = { status: 'waiting' | 'scanned' | 'expired' | 'authenticated'; token?: string; account?: Account };
interface Attempt {
  key: string; proofHash: string; expiresAt: number; nextPollAt: number;
  result: Result; pending?: Promise<Result>; cancelled: boolean;
}
export class QrLogin {
  private attempts = new Map<string, Attempt>();
  constructor(private provider: MusicProvider, private grant: (cookie: string, active: () => boolean) => Promise<{ token: string; account: Account }>, private now = Date.now) {}
  cleanup() { for (const [id, attempt] of this.attempts) if (attempt.expiresAt <= this.now()) { attempt.cancelled = true; this.attempts.delete(id); } }
  async create() {
    if (!this.provider.createQr || !this.provider.checkQr || this.provider.mode !== 'netease') throw new AppError(409, 'QR_UNAVAILABLE', '请启用真实网易云数据源');
    this.cleanup();
    if (this.attempts.size >= 128) throw new AppError(429, 'QR_CAPACITY', '登录会话过多，请稍后重试');
    const qr = await this.provider.createQr();
    const loginId = randomUUID(), pollToken = randomBytes(32).toString('base64url'), expiresAt = this.now() + 120000;
    this.attempts.set(loginId, { key: qr.key, proofHash: tokenHash(pollToken), expiresAt, nextPollAt: 0, result: { status: 'waiting' }, cancelled: false });
    return { loginId, pollToken, qrImage: qr.image, expiresAt: new Date(expiresAt).toISOString(), pollIntervalMs: 2000 };
  }
  private authorize(id: string, proof: string): Attempt | undefined {
    const attempt = this.attempts.get(id);
    if (!attempt) return undefined;
    if (!timingSafeEqual(Buffer.from(attempt.proofHash, 'hex'), Buffer.from(tokenHash(proof), 'hex'))) throw new AppError(401, 'QR_PROOF_INVALID', '二维码查询凭证无效');
    return attempt;
  }
  async check(id: string, proof: string): Promise<Result> {
    const attempt = this.authorize(id, proof);
    if (!attempt || attempt.cancelled || attempt.expiresAt <= this.now()) { this.attempts.delete(id); return { status: 'expired' }; }
    if (attempt.result.status === 'authenticated') return attempt.result;
    if (attempt.pending) return attempt.pending;
    if (attempt.nextPollAt > this.now()) return attempt.result;
    attempt.nextPollAt = this.now() + 2000;
    attempt.pending = (async () => {
      const result = await this.provider.checkQr!(attempt.key);
      if (attempt.cancelled || attempt.expiresAt <= this.now()) return { status: 'expired' } as Result;
      if (result.code === 800) { attempt.cancelled = true; attempt.result = { status: 'expired' }; return attempt.result; }
      if (result.code === 803) {
        if (!result.cookie) throw new AppError(502, 'QR_COOKIE_MISSING', '上游确认登录但未返回会话，请重新扫码');
        const granted = await this.grant(result.cookie, () => !attempt.cancelled && attempt.expiresAt > this.now());
        attempt.result = { status: 'authenticated', ...granted };
        // Same requester can recover a lost response without creating more sessions.
        attempt.expiresAt = this.now() + 30000;
        attempt.key = '';
      } else attempt.result = { status: result.code === 802 ? 'scanned' : 'waiting' };
      return attempt.result;
    })().finally(() => { attempt.pending = undefined; });
    return attempt.pending;
  }
  cancel(id: string, proof: string) { const attempt = this.authorize(id, proof); if (attempt) { attempt.cancelled = true; this.attempts.delete(id); } return { ok: true }; }
  close() { for (const attempt of this.attempts.values()) attempt.cancelled = true; this.attempts.clear(); }
}

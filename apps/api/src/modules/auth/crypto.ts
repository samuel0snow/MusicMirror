import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
export class Vault {
  private key: Buffer;
  constructor(dataDir: string, hexKey?: string) {
    mkdirSync(dataDir, { recursive: true });
    const path = join(dataDir, 'encryption.key');
    if (hexKey) this.key = Buffer.from(hexKey, 'hex');
    else {
      if (!existsSync(path)) writeFileSync(path, randomBytes(32), { flag: 'wx', mode: 0o600 });
      this.key = readFileSync(path);
    }
    if (this.key.length !== 32) throw new Error('Encryption key must contain 32 bytes');
  }
  encrypt(value: string): string {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
  }
  decrypt(value: string): string {
    const bytes = Buffer.from(value, 'base64'), decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
  }
}

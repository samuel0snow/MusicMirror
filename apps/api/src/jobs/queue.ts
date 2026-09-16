import type { Run } from '../../../../packages/contracts/src/index.js';
import { AppError, safeError } from '../common/errors.js';
import type { Store } from '../database/store.js';

interface Job { run: Run; controller: AbortController; done: Promise<void>; finish: () => void }
export class JobQueue {
  private jobs = new Map<string, Job>();
  private pending: Job[] = [];
  private running = false;
  private stopped = false;
  constructor(private store: Store, private execute: (run: Run, signal: AbortSignal) => Promise<void>, private cooldownMs: number) {
    for (const run of store.recoverRuns()) this.schedule(run);
  }
  refresh(userId: string, key?: string): Run {
    if (this.stopped) throw new AppError(503, 'SHUTTING_DOWN', '服务正在关闭');
    const previousKey = key ? this.store.findRun(userId, key) : undefined;
    if (previousKey) return previousKey;
    const active = this.store.findRun(userId);
    if (active) return active;
    const previous = this.store.lastRun(userId);
    if (previous && Date.now() - Date.parse(previous.startedAt) < this.cooldownMs) throw new AppError(429, 'REFRESH_COOLDOWN', '刷新过于频繁，请稍后再试');
    const run = this.store.createRun(userId, key);
    this.schedule(run);
    return run;
  }
  private schedule(run: Run) {
    let finish!: () => void;
    const job: Job = { run, controller: new AbortController(), done: new Promise<void>(resolve => { finish = resolve; }), finish: () => finish() };
    this.jobs.set(run.runId, job);
    this.pending.push(job);
    setImmediate(() => { void this.drain(); });
  }
  private async drain() {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      while (this.pending.length && !this.stopped) {
        const job = this.pending.shift()!;
        try {
          job.controller.signal.throwIfAborted();
          this.store.setRun(job.run.userId, job.run.runId, 'processing');
          await this.execute(job.run, job.controller.signal);
        } catch (error) {
          const status = this.stopped ? 'queued' : job.controller.signal.aborted ? 'cancelled' : 'failed';
          this.store.setRun(job.run.userId, job.run.runId, status, null, false, status === 'failed' ? safeError(error) : null);
        } finally { this.jobs.delete(job.run.runId); job.finish(); }
      }
    } finally { this.running = false; }
  }
  async cancelUser(userId: string) {
    const jobs = [...this.jobs.values()].filter(j => j.run.userId === userId);
    for (const job of jobs) {
      job.controller.abort();
      const index = this.pending.indexOf(job);
      if (index >= 0) {
        this.pending.splice(index, 1);
        this.store.setRun(userId, job.run.runId, 'cancelled');
        this.jobs.delete(job.run.runId); job.finish();
      }
    }
    await Promise.all(jobs.map(j => j.done));
  }
  async idle() { await Promise.all([...this.jobs.values()].map(j => j.done)); }
  async close() {
    this.stopped = true;
    const jobs = [...this.jobs.values()];
    for (const job of jobs) {
      job.controller.abort();
      if (this.pending.includes(job)) { this.jobs.delete(job.run.runId); job.finish(); }
    }
    this.pending = [];
    await Promise.all(jobs.map(j => j.done));
  }
}

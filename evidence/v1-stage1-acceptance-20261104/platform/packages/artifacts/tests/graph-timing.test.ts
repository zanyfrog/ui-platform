import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import type { FileHandle } from 'node:fs/promises';
const h = vi.hoisted(() => ({ clock: 0, file: '', opens: 0, unlinks: 0, callbacks: 0, realDelay: false,
  requests: [] as Array<{ ms: number; at: number; done: boolean }>, notify: undefined as undefined | (() => void),
  handles: [] as FileHandle[], afterRm: undefined as undefined | (() => Promise<void>),
  afterWrite: undefined as undefined | (() => Promise<void>), afterRead: undefined as undefined | (() => Promise<void>),
}));
vi.mock('node:timers/promises', async original => {
  const timers = await original<typeof import('node:timers/promises')>();
  return { ...timers, setTimeout: (ms: number, value: unknown, options: { signal?: AbortSignal } = {}) => {
    const record = { ms, at: h.clock, done: false }; h.requests.push(record);
    const pending = h.realDelay ? timers.setTimeout(ms, value, options) : new Promise((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(Object.assign(new Error('The operation was aborted', { cause: options.signal?.reason }), { name: 'AbortError', code: 'ABORT_ERR' })); };
      const timer = setTimeout(() => { options.signal?.removeEventListener('abort', abort); resolve(value); }, ms);
      if (options.signal?.aborted) abort(); else options.signal?.addEventListener('abort', abort, { once: true });
    });
    const result = pending.finally(() => { record.done = true; });
    h.notify?.(); h.notify = undefined; return result;
  } };
});
vi.mock('node:fs/promises', async original => {
  const fs = await original<typeof import('node:fs/promises')>();
  return { ...fs,
    open: async (...args: Parameters<typeof fs.open>) => {
      if (String(args[0]) !== h.file) return fs.open(...args);
      h.opens++; const handle = await fs.open(...args); h.handles.push(handle);
      return new Proxy(handle, { get(target, key) {
        const value = Reflect.get(target, key, target);
        if (typeof value !== 'function') return value;
        return async (...input: unknown[]) => {
          const result = await value.apply(target, input);
          if (key === 'writeFile') await h.afterWrite?.();
          return result;
        };
      } });
    },
    rm: async (...args: Parameters<typeof fs.rm>) => {
      await fs.rm(...args);
      if (String(args[0]) === h.file) { h.unlinks++; const effect = h.afterRm; h.afterRm = undefined; await effect?.(); }
    },
    readFile: async (...args: Parameters<typeof fs.readFile>) => {
      const result = await fs.readFile(...args);
      if (String(args[0]) === h.file) { const effect = h.afterRead; h.afterRead = undefined; await effect?.(); }
      return result;
    },
  };
});
import { withArtifactLock, storageKey, ArtifactBusyError } from '../src/storage.js';
import { withRoleBundleGraph } from '../src/role-bundle.js';
const native = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
let root = '';
const rows: unknown[] = [];
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(performance, 'now').mockImplementation(() => h.clock);
});
afterEach(async context => {
  vi.useRealTimers(); vi.restoreAllMocks();
  if (root) {
    let bytes: string | null = null;
    try { bytes = await native.readFile(h.file, 'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    rows.push({ test: context.task.name, root, pid: process.pid, clock: h.clock, opens: h.opens, unlinks: h.unlinks, callbacks: h.callbacks,
      requests: h.requests.slice(), fds: h.handles.map(x => x.fd), residualOwnerText: bytes });
    for (const handle of h.handles) if (handle.fd >= 0) await handle.close();
    if (!path.basename(root).startsWith('ga-timing-') || path.dirname(root) !== os.tmpdir()) throw new Error('Disposable isolation failed');
    await native.rm(root, { recursive: true, force: true });
  }
  if (process.env.GRAPH_VERIFY_EVIDENCE) await native.writeFile(path.join(process.env.GRAPH_VERIFY_EVIDENCE, 'graph-timing.json'), JSON.stringify({ rows }, null, 2) + '\n');
  root = ''; Object.assign(h, { clock: 0, file: '', opens: 0, unlinks: 0, callbacks: 0, realDelay: false, requests: [], notify: undefined, handles: [], afterRm: undefined, afterWrite: undefined, afterRead: undefined });
});
async function fixture(live = false) {
  root = await native.mkdtemp(path.join(os.tmpdir(), 'ga-timing-'));
  expect(root.toLowerCase()).not.toContain('ui-platform\\components');
  await native.mkdir(path.join(root, '.uib', 'locks'), { recursive: true });
  h.file = path.join(root, '.uib', 'locks', storageKey('visual-runtime-graph-v1') + '.lock');
  if (live) { process.kill(process.pid, 0); await native.writeFile(h.file, String(process.pid)); }
}
function acquire(work: () => Promise<unknown> = async () => 42, options = {}) {
  return withArtifactLock(root, root, async () => { h.callbacks++; return work(); }, 'visual-runtime-graph-v1', { timeoutMs: 5000, ...options });
}
const gate = () => { let release!: () => void; const wait = new Promise<void>(r => { release = r; }); return { wait, release }; };
async function held() { const entered = gate(), finish = gate(); const result = acquire(async () => { entered.release(); await finish.wait; }); await entered.wait; return { result, finish }; }
async function request(index: number): Promise<{ ms: number; at: number; done: boolean }> {
  if (h.requests[index]) return h.requests[index];
  await new Promise<void>(r => { h.notify = r; }); return request(index);
}
async function advance(ms: number) { h.clock += ms; await vi.advanceTimersByTimeAsync(ms); }
const outcome = (p: Promise<unknown>) => p.then(value => ({ value, error: undefined as unknown, rejected: false }), error => ({ value: undefined, error: error as unknown, rejected: true }));

it('GA3 unqueued graph entry has no invented handoff', async () => {
  await fixture(); expect(await acquire()).toBe(42); expect(h.requests).toEqual([]); expect(h.opens).toBe(1); expect(h.callbacks).toBe(1);
});
it('GA3 queued graph handoff requests 50ms before another exclusive attempt', async () => {
  await fixture(); const holder = await held(); const pending = acquire();
  holder.finish.release(); await holder.result;
  expect((await request(0)).ms).toBe(50); expect(h.opens).toBe(1);
  await advance(49); expect(h.opens).toBe(1); expect(h.callbacks).toBe(1);
  await advance(1); expect(await pending).toBe(42); expect(h.opens).toBe(2);
});
it('GA3/GA5 handoff caps to remaining original queue deadline without admitting', async () => {
  await fixture(); const holder = await held(); const result = outcome(acquire());
  await advance(4975); holder.finish.release(); await holder.result;
  expect((await request(0)).ms).toBe(25); await advance(25);
  expect((await result).error).toBeInstanceOf(ArtifactBusyError); expect(h.opens).toBe(1); expect(h.callbacks).toBe(1);
});
it('GA4 live contention polls at 25ms and never removes an unowned file', async () => {
  await fixture(true); const pending = acquire(); expect((await request(0)).ms).toBe(25);
  await advance(24); expect(h.opens).toBe(1); expect(h.unlinks).toBe(0); expect(h.callbacks).toBe(0);
  expect(await native.readFile(h.file, 'utf8')).toBe(String(process.pid));
  await native.rm(h.file); await advance(1); expect(await pending).toBe(42); expect(h.opens).toBe(2);
});
it('GA4 polling caps to the remaining original deadline', async () => {
  await fixture(true); h.afterRead = () => advance(4988); const result = outcome(acquire());
  expect((await request(0)).ms).toBe(12); await advance(12);
  expect((await result).error).toBeInstanceOf(ArtifactBusyError); expect(h.callbacks).toBe(0); expect(h.unlinks).toBe(0);
});
it('GA5 queue plus handoff plus polling consume one 5000ms deadline', async () => {
  await fixture(); const holder = await held(); const result = outcome(acquire());
  h.afterRm = async () => { await native.writeFile(h.file, String(process.pid)); };
  await advance(4900); holder.finish.release(); await holder.result;
  expect((await request(0)).ms).toBe(50); await advance(50);
  expect((await request(1)).ms).toBe(25); await advance(25);
  expect((await request(2)).ms).toBe(25); await advance(25);
  expect((await result).error).toBeInstanceOf(ArtifactBusyError);
  expect(h.clock).toBe(5000); expect(h.callbacks).toBe(1); expect(h.opens).toBe(3); expect(h.unlinks).toBe(1);
  expect(await native.readFile(h.file, 'utf8')).toBe(String(process.pid));
});
it('GA5 publication cannot admit after spending the original deadline', async () => {
  await fixture(); h.afterWrite = () => advance(5000); const result = await outcome(acquire());
  expect(result.error).toBeInstanceOf(ArtifactBusyError); expect(h.callbacks).toBe(0); expect(h.unlinks).toBe(1);
});
it('GA6 pre-abort preserves exact reason without attempting a file', async () => {
  await fixture(); const controller = new AbortController(), reason = new Error('pre-abort'); controller.abort(reason);
  expect((await outcome(acquire(undefined, { signal: controller.signal }))).error).toBe(reason); expect(h.opens).toBe(0); expect(h.callbacks).toBe(0);
});
it('GA2/GA6 cancelled middle queue entry cannot bypass its predecessor', async () => {
  await fixture(); const holder = await held(), controller = new AbortController(), reason = new Error('queued abort');
  const middle = outcome(acquire(async () => { throw new Error('cancelled callback'); }, { signal: controller.signal }));
  const last = acquire(); controller.abort(reason); expect((await middle).error).toBe(reason);
  expect(h.opens).toBe(1); expect(h.callbacks).toBe(1); holder.finish.release(); await holder.result;
  expect((await request(0)).ms).toBe(50); await advance(50); expect(await last).toBe(42); expect(h.callbacks).toBe(2);
});
it('GA7 native handoff cancellation retains AbortError cause without admission', async () => {
  await fixture(); h.realDelay = true; const holder = await held(), controller = new AbortController(), reason = new Error('handoff abort');
  const result = outcome(acquire(undefined, { signal: controller.signal })); holder.finish.release(); await holder.result;
  expect((await request(0)).ms).toBe(50); controller.abort(reason);
  const error = (await result).error as Error & { code: string };
  expect(error.name).toBe('AbortError'); expect(error.code).toBe('ABORT_ERR'); expect(error.cause).toBe(reason); expect(h.opens).toBe(1); expect(h.callbacks).toBe(1);
});
it('GA7 contention cancellation retains the exact outer signal reason', async () => {
  await fixture(true); h.realDelay = true; const controller = new AbortController(), reason = new Error('poll abort');
  const result = outcome(acquire(undefined, { signal: controller.signal })); await request(0); controller.abort(reason);
  expect((await result).error).toBe(reason); expect(h.opens).toBe(1); expect(h.callbacks).toBe(0); expect(h.unlinks).toBe(0);
});
it('GA8 admitted busy rejection survives deadline and abort with no replay', async () => {
  await fixture(); const controller = new AbortController(), reason = new ArtifactBusyError();
  const result = await outcome(acquire(async () => { await advance(5000); controller.abort(); throw reason; }, { signal: controller.signal }));
  expect(result.error).toBe(reason); expect(h.callbacks).toBe(1); expect(h.opens).toBe(1); expect(h.unlinks).toBe(1);
});
it('GA10 graph admission never consumes an unrelated role journal', async () => {
  await fixture(); const dir = path.join(root, '.uib', 'transactions', storageKey('unrelated-role'));
  await native.mkdir(dir, { recursive: true }); const journal = path.join(dir, 'pending.json'), content = '{"diagnostic":"unrelated-role-journal"}';
  await native.writeFile(journal, content); expect(await withRoleBundleGraph(root, async () => 42)).toBe(42);
  expect(await native.readFile(journal, 'utf8')).toBe(content);
});
it('GA10 graph canonicalization refuses a disposable junction root', async () => {
  await fixture(); const link = path.join(root, 'root-alias'), target = path.join(root, 'target');
  await native.mkdir(target); await native.symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  expect((await native.lstat(link)).isSymbolicLink()).toBe(true);
  await expect(withRoleBundleGraph(link, async () => { throw new Error('must not admit'); })).rejects.toThrow('Source graph roots cannot contain symlinks');
  expect(h.opens).toBe(0);
});
